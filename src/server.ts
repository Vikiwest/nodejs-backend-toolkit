import http from 'http';
import { App } from './app';
import config from './config/env';
import { logger } from './utils/logger';
import { cacheService } from './services/cacheService';
import { websocketService } from './services/websocketService';
import { databaseConnection } from './config/database';

class Server {
  private app: App;
  private httpServer: http.Server | null = null;

  constructor() {
    this.app = new App();
  }

  async start(): Promise<void> {
    try {
      logger.info(`Starting server in ${config.nodeEnv} environment...`);

      // Connect to MongoDB using the database connection manager
      await databaseConnection.connect();
      logger.info('MongoDB connected successfully');

      // Cache health check (in-memory)
      const success = await cacheService.set('health_check', 'OK', 10);
      if (success) {
        logger.info('Cache service ready');
      } else {
        logger.warn('Cache service not available');
      }

      // Create HTTP server
      this.httpServer = this.app.getApp().listen(config.port, () => {
        logger.info(`${config.appName} is running on port ${config.port}`);
        logger.info(`Environment: ${config.nodeEnv}`);
        logger.info(`API URL: http://localhost:${config.port}/api`);
        logger.info(`WebSocket URL: ws://localhost:${config.port}`);
      });

      // Initialize WebSocket service
      websocketService.initialize(this.httpServer);
      logger.info('WebSocket service initialized');

      // Graceful shutdown
      this.setupGracefulShutdown();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to start server: ${errorMessage}`, error as Error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const gracefulShutdown = async () => {
      logger.info('Shutting down gracefully...');

      // Close HTTP server
      if (this.httpServer) {
        this.httpServer.close(async () => {
          logger.info('HTTP server closed');

          try {
            // Close database connections
            await databaseConnection.disconnect();
            logger.info('MongoDB connection closed');

            // Close Redis connection
            await cacheService.disconnect?.();
            logger.info('Redis connection closed');

            process.exit(0);
          } catch (error) {
            logger.error('Error during shutdown', error as Error);
            process.exit(1);
          }
        });
      }

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  }
}

// Handle uncaught exceptions (synced with unhandledRejection)
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', {
    error,
    stack: error.stack,
  });
  // Perform cleanup before exiting
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection', {
    reason: reason || 'Unknown reason',
    promise,
    stack: reason?.stack || new Error().stack,
  });
  // TODO: Implement proper cleanup or error reporting service integration
  // For now, exit to prevent corrupted state
  process.exit(1);
});

// Start the server
const server = new Server();
server.start().catch((error) => {
  logger.error('Server startup failed', error);
  process.exit(1);
});
