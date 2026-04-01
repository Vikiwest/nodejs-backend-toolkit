// In your types file (e.g., @/types/index.ts)
import { Document } from 'mongoose';

// Add IUser interface
export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface UserPayload {
  id: string;
  email: string;
  role: string;
}

import { Request } from 'express';
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export type UserRole = 'user' | 'admin' | 'moderator' | 'super_admin';

export interface PaginationQuery {
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: string;
  search?: string;
}

export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: any, ttlSeconds?: number): Promise<boolean>;
  del(key: string): Promise<boolean>;
  clearPattern(pattern: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  increment(key: string, by?: number): Promise<number | null>;
  expire(key: string, seconds: number): Promise<boolean>;
  disconnect(): Promise<void>;
}

export interface JobData {
  type: string;
  data: any;
  userId?: string;
  priority?: number;
  options?: any;
}

export interface JWTService {
  generateAccessToken(payload: any): string;
  generateRefreshToken(payload: any): string;
  generateTokens(payload: any): { accessToken: string; refreshToken: string };
  verifyAccessToken(token: string): any;
  verifyRefreshToken(token: string): any;
  decodeToken(token: string): any;
}