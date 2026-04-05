import { createClient, RedisClientType } from 'redis';
import config from './env';
import { LoggerService } from '@/utils/logger';

export class RedisConnection {
  private static instance: RedisConnection;
  private client: RedisClientType | null = null;

  private constructor() {}

  static getInstance(): RedisConnection {
    if (!RedisConnection.instance) {
      RedisConnection.instance = new RedisConnection();
    }
    return RedisConnection.instance;
  }

  async connect(): Promise<RedisClientType | null> {
    if (this.client) return this.client;

    try {
      this.client = createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port,
        },
        password: config.redis.password,
      });

      this.client.on('error', (err) => {
        LoggerService.error('Redis Client Error', err);
      });

      this.client.on('connect', () => {
        LoggerService.info('Redis connected successfully');
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      LoggerService.error('Failed to connect to Redis', error as Error);
      return null;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      LoggerService.info('Redis disconnected');
    }
  }

  getClient(): RedisClientType | null {
    return this.client;
  }
}

export const redisConnection = RedisConnection.getInstance();
