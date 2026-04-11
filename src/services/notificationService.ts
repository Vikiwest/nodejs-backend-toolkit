import { EventEmitter } from 'events';
import { emailService } from './emailService';
import { websocketService } from './websocketService';
import { LoggerService } from '../utils/logger';

interface Notification {
  id: string;
  userId: string;
  type: 'email' | 'push' | 'sms';
  title: string;
  body: string;
  data?: any;
  read: boolean;
  createdAt: string;
}

interface NotificationPreferences {
  email?: boolean;
  push?: boolean;
  sms?: boolean;
}

export class NotificationService extends EventEmitter {
  private notifications: Map<string, Notification[]> = new Map();
  private preferences: Map<string, NotificationPreferences> = new Map();

  async send(notification: Omit<Notification, 'id' | 'read' | 'createdAt'>): Promise<void> {
    const id = this.generateId();
    const fullNotification: Notification = {
      ...notification,
      id,
      read: false,
      createdAt: new Date().toISOString(),
    };

    if (!this.notifications.has(notification.userId)) {
      this.seedNotifications(notification.userId);
    }

    this.notifications.get(notification.userId)!.push(fullNotification);

    switch (notification.type) {
      case 'email':
        await emailService.sendEmail({
          to: notification.userId,
          subject: notification.title,
          text: notification.body,
        });
        break;
      case 'push':
        websocketService.sendToUser(notification.userId, 'notification', fullNotification);
        break;
      case 'sms':
        LoggerService.info(`SMS would be sent to ${notification.userId}`);
        break;
    }

    this.emit('notification-sent', fullNotification);
  }

  async getUserNotifications(
    userId: string,
    unreadFilter?: boolean,
    page: number = 1,
    limit: number = 20
  ): Promise<{ docs: Notification[]; total: number; page: number; limit: number; pages: number }> {
    if (!this.notifications.has(userId)) {
      this.seedNotifications(userId);
    }

    let userNotifications = this.notifications.get(userId)!;

    if (unreadFilter !== undefined) {
      userNotifications = userNotifications.filter(
        (notification) => notification.read === !unreadFilter
      );
    }

    const total = userNotifications.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    const startIndex = (page - 1) * limit;
    const docs = userNotifications.slice(startIndex, startIndex + limit);

    return {
      docs,
      total,
      page,
      limit,
      pages,
    };
  }

  async markAsRead(userId: string, notificationId: string): Promise<Notification | null> {
    const userNotifications = this.notifications.get(userId);
    if (userNotifications) {
      const notification = userNotifications.find((n) => n.id === notificationId);
      if (notification) {
        notification.read = true;
        this.emit('notification-read', notification);
        return notification;
      }
    }
    return null;
  }

  async markAllRead(userId: string): Promise<number> {
    if (!this.notifications.has(userId)) {
      this.seedNotifications(userId);
    }

    const userNotifications = this.notifications.get(userId)!;
    const unreadCount = userNotifications.filter((n) => !n.read).length;
    userNotifications.forEach((notification) => {
      notification.read = true;
    });
    return unreadCount;
  }

  async deleteNotification(userId: string, notificationId: string): Promise<boolean> {
    const userNotifications = this.notifications.get(userId);
    if (userNotifications) {
      const initialLength = userNotifications.length;
      this.notifications.set(
        userId,
        userNotifications.filter((notification) => notification.id !== notificationId)
      );
      return this.notifications.get(userId)!.length < initialLength;
    }
    return false;
  }

  async updatePreferences(
    userId: string,
    preferences: NotificationPreferences
  ): Promise<NotificationPreferences> {
    const current = this.preferences.get(userId) || {};
    const updated = { ...current, ...preferences };
    this.preferences.set(userId, updated);
    return updated;
  }

  private seedNotifications(userId: string): void {
    const defaultNotifications: Notification[] = [
      {
        id: this.generateId(),
        userId,
        type: 'email',
        title: 'Welcome to BackendToolkit',
        body: 'Thanks for joining BackendToolkit. Your account is ready to use.',
        read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      },
      {
        id: this.generateId(),
        userId,
        type: 'push',
        title: 'New feature available',
        body: 'Check out the new dashboard analytics feature now.',
        read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      },
      {
        id: this.generateId(),
        userId,
        type: 'sms',
        title: 'Security alert',
        body: 'A login from a new device was detected. If this was not you, please secure your account.',
        read: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
      },
    ];

    this.notifications.set(userId, defaultNotifications);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const notificationService = new NotificationService();
