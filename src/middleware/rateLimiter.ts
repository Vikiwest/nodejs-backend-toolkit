import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redisConnection } from '@/config/redis';
import config from '@/config/env';

// General rate limiter
export const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
});

// API key rate limiter
export const apiKeyLimiter = (maxRequests: number = 1000) => {
  return rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: maxRequests,
    keyGenerator: (req) => (req.headers['x-api-key'] as string) || req.ip,
    message: {
      success: false,
      message: 'API rate limit exceeded.',
    },
  });
};

// Redis-based rate limiter for distributed systems
export const redisRateLimiter = (points: number, duration: number) => {
  return async (req: any, res: any, next: any) => {
    const client = await redisConnection.connect();
    if (!client) {
      return next();
    }

    const key = `rate_limit:${req.ip}`;
    const current = await client.incr(key);
    
    if (current === 1) {
      await client.expire(key, duration);
    }
    
    if (current > points) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later.',
      });
    }
    
    next();
  };
};