import rateLimit from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix?: string;
  skipSuccessfulRequests?: boolean;
}

// Default config fallback
const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_MAX = 100;

// General rate limiter
export const generalLimiter = rateLimit({
  windowMs: DEFAULT_WINDOW_MS,
  max: DEFAULT_MAX,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Create customizable rate limiter
export const createRateLimiter = (options: RateLimitOptions) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    skipSuccessfulRequests: options.skipSuccessfulRequests,
    keyGenerator: (req: Request) => {
      const userId = (req as any).user?.id?.toString();
      return userId
        ? `${options.keyPrefix || ''}:user:${userId}`
        : `${options.keyPrefix || ''}:${req.ip || 'unknown'}`;
    },
    message: {
      success: false,
      message: 'Too many requests from this IP/user.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

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
export const apiKeyLimiter = (maxRequests: number = 1000) =>
  rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: maxRequests,
    keyGenerator: (req: Request) => (req.headers['x-api-key'] as string) || req.ip || 'unknown',
    message: {
      success: false,
      message: 'API rate limit exceeded.',
    },
  });

// Simple in-memory rate limiter (process restart resets)
export const memoryRateLimiter = (points: number, durationSeconds: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `rate_limit:${req.ip}`;
    const now = Date.now();
    const windowStart = now - durationSeconds * 1000;

    // Type assertion for global
    const globalData = (globalThis as any).rateLimitData;
    if (!globalData) {
      (globalThis as any).rateLimitData = new Map<string, { count: number; resetTime: number }>();
    }

    const data = (globalThis as any).rateLimitData!.get(key) || {
      count: 0,
      resetTime: windowStart,
    };

    if (now > data.resetTime) {
      data.count = 0;
      data.resetTime = now + durationSeconds * 1000;
    }

    data.count += 1;
    (globalThis as any).rateLimitData!.set(key, data);

    if (data.count > points) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later.',
      });
    }

    next();
  };
};
