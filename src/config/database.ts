import mongoose from 'mongoose';
import config from './env';
import { LoggerService } from '../utils/logger';

export class DatabaseConnection {
  private static instance: DatabaseConnection;

  private constructor() {}

  static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  async connect(): Promise<void> {
    try {
      // Validate MongoDB URI is configured
      if (!config.mongodb.uri) {
        const errorMsg = `MongoDB URI not configured. Expected ${config.isProduction() ? 'MONGODB_URI_PROD' : 'MONGODB_URI'} environment variable`;
        LoggerService.error(errorMsg);
        throw new Error(errorMsg);
      }

      LoggerService.info(`Connecting to MongoDB in ${config.nodeEnv} environment...`);

      await mongoose.connect(config.mongodb.uri, {
        ...config.mongodb.options,
        serverSelectionTimeoutMS: 10000, // 10 second timeout
        socketTimeoutMS: 45000,
      });

      LoggerService.info('MongoDB connected successfully');

      mongoose.connection.on('error', (error) => {
        LoggerService.error('MongoDB connection error', error);
      });

      mongoose.connection.on('disconnected', () => {
        LoggerService.warn('MongoDB disconnected');
      });

      process.on('SIGINT', async () => {
        await mongoose.connection.close();
        LoggerService.info('MongoDB connection closed through app termination');
        process.exit(0);
      });
    } catch (error) {
      LoggerService.error('Failed to connect to MongoDB', error as Error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await mongoose.disconnect();
  }
}

export const databaseConnection = DatabaseConnection.getInstance();
