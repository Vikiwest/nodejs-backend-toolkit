import { LoggerService } from '@/utils/logger';
import { CacheService as ICacheService } from '@/types';

interface CacheEntry {
  value: any;
  expiry: number;
}

export class CacheService implements ICacheService {
  private cache = new Map<string, CacheEntry>();
  private isReady = true;

  async get<T>(key: string): Promise<T | null> {
    try {
      const entry = this.cache.get(key);
      if (!entry) return null;

      if (Date.now() > entry.expiry) {
        this.cache.delete(key);
        return null;
      }

      return entry.value as T;
    } catch (error) {
      LoggerService.error('Cache get error', error as Error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<boolean> {
    try {
      this.cache.set(key, {
        value,
        expiry: Date.now() + ttlSeconds * 1000,
      });
      return true;
    } catch (error) {
      LoggerService.error('Cache set error', error as Error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      this.cache.delete(key);
      return true;
    } catch (error) {
      LoggerService.error('Cache delete error', error as Error);
      return false;
    }
  }

  async clearPattern(pattern: string): Promise<boolean> {
    try {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
      return true;
    } catch (error) {
      LoggerService.error('Cache clear pattern error', error as Error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const entry = this.cache.get(key);
      if (!entry) return false;

      if (Date.now() > entry.expiry) {
        this.cache.delete(key);
        return false;
      }
      return true;
    } catch (error) {
      LoggerService.error('Cache exists error', error as Error);
      return false;
    }
  }

  async increment(key: string, by: number = 1): Promise<number | null> {
    try {
      const entry = await this.get<number>(key);
      const newValue = (entry || 0) + by;
      await this.set(key, newValue);
      return newValue;
    } catch (error) {
      LoggerService.error('Cache increment error', error as Error);
      return null;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const value = await this.get(key);
      if (value !== null) {
        await this.set(key, value, seconds);
      }
      return true;
    } catch (error) {
      LoggerService.error('Cache expire error', error as Error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.cache.clear();
    logger.info('In-memory cache cleared');
  }
}

export const cacheService = new CacheService();
