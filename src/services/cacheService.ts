import { createClient, RedisClientType } from "redis";
import config from "@/config/env";
import { LoggerService } from "@/utils/logger";
import { CacheService as ICacheService } from "@/types";

export class CacheService implements ICacheService {
  private client: RedisClientType | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    try {
      this.client = createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port,
        },
        password: config.redis.password,
      });

      this.client.on("error", (err) => {
        LoggerService.error("Redis Client Error", err);
        this.isConnected = false;
      });

      this.client.on("connect", () => {
        LoggerService.info("Redis connected successfully");
        this.isConnected = true;
      });

      await this.client.connect();
    } catch (error) {
      LoggerService.error("Failed to connect to Redis", error as Error);
      this.isConnected = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.client) return null;

    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      LoggerService.error("Redis get error", error as Error);
      return null;
    }
  }

  async set(
    key: string,
    value: any,
    ttlSeconds: number = 3600,
  ): Promise<boolean> {
    if (!this.isConnected || !this.client) return false;

    try {
      await this.client.set(key, JSON.stringify(value), {
        EX: ttlSeconds,
      });
      return true;
    } catch (error) {
      LoggerService.error("Redis set error", error as Error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.isConnected || !this.client) return false;

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      LoggerService.error("Redis delete error", error as Error);
      return false;
    }
  }

  async clearPattern(pattern: string): Promise<boolean> {
    if (!this.isConnected || !this.client) return false;

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      LoggerService.error("Redis clear pattern error", error as Error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isConnected || !this.client) return false;

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      LoggerService.error("Redis exists error", error as Error);
      return false;
    }
  }

  async increment(key: string, by: number = 1): Promise<number | null> {
    if (!this.isConnected || !this.client) return null;

    try {
      return await this.client.incrBy(key, by);
    } catch (error) {
      LoggerService.error("Redis increment error", error as Error);
      return null;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.isConnected || !this.client) return false;

    try {
      return await this.client.expire(key, seconds);
    } catch (error) {
      LoggerService.error("Redis expire error", error as Error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      this.client = null;
      logger.info("Redis disconnected");
    }
  }
}

export const cacheService = new CacheService();
