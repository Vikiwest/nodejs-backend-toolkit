import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import JWTService from '@/utils/jwt';
import { LoggerService } from '@/utils/logger';

interface ConnectedUser {
  socketId: string;
  userId: string;
  rooms: Set<string>;
}

export class WebSocketService {
  private io!: Server;
  private connectedUsers: Map<string, ConnectedUser> = new Map();

  initialize(server: HttpServer): void {
    this.io = new Server(server, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
        credentials: true,
      },
    });

    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = JWTService.verifyAccessToken(token);
        (socket as any).userId = decoded.id;
        next();
      } catch {
        next(new Error('Invalid token'));
      }
    });

    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });

    LoggerService.info('WebSocket service initialized');
  }

  private handleConnection(socket: Socket): void {
    const userId = (socket as any).userId;
    LoggerService.info(`User connected: ${userId} (${socket.id})`);

    // Store connected user
    this.connectedUsers.set(userId, {
      socketId: socket.id,
      userId,
      rooms: new Set(),
    });

    // Join user's personal room
    socket.join(`user:${userId}`);
    this.connectedUsers.get(userId)?.rooms.add(`user:${userId}`);

    // Handle joining rooms
    socket.on('join-room', (room: string) => {
      socket.join(room);
      const user = this.connectedUsers.get(userId);
      if (user) {
        user.rooms.add(room);
      }
      LoggerService.info(`User ${userId} joined room: ${room}`);
    });

    // Handle leaving rooms
    socket.on('leave-room', (room: string) => {
      socket.leave(room);
      const user = this.connectedUsers.get(userId);
      if (user) {
        user.rooms.delete(room);
      }
      LoggerService.info(`User ${userId} left room: ${room}`);
    });

    // Handle private messages
    socket.on('private-message', (data: { to: string; message: any }) => {
      this.sendToUser(data.to, 'private-message', {
        from: userId,
        message: data.message,
        timestamp: new Date(),
      });
    });

    // Handle room messages
    socket.on('room-message', (data: { room: string; message: any }) => {
      this.sendToRoom(data.room, 'room-message', {
        from: userId,
        message: data.message,
        timestamp: new Date(),
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      this.connectedUsers.delete(userId);
      LoggerService.info(`User disconnected: ${userId}`);
    });
  }

  sendToUser(userId: string, event: string, data: any): boolean {
    const user = this.connectedUsers.get(userId);
    if (user) {
      this.io.to(user.socketId).emit(event, data);
      return true;
    }
    return false;
  }

  sendToRoom(room: string, event: string, data: any): void {
    this.io.to(room).emit(event, data);
  }

  broadcast(event: string, data: any): void {
    this.io.emit(event, data);
  }

  getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }
}

export const websocketService = new WebSocketService();
