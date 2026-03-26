import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '@/utils/logger';
import { ApiResponseUtil } from '@/utils/apiResponse';
import mongoose from 'mongoose';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error
  LoggerService.error('Error occurred', err, {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: (req as any).user?.id,
  });

  // Handle specific error types
  if (err instanceof AppError) {
    return ApiResponseUtil.error(res, err.message, err.statusCode);
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(err.errors).map(e => e.message);
    return ApiResponseUtil.validationError(res, errors);
  }

  if (err instanceof mongoose.Error.CastError) {
    return ApiResponseUtil.badRequest(res, `Invalid ${err.path}: ${err.value}`);
  }

  if ((err as any).code === 11000) {
    const field = Object.keys((err as any).keyPattern)[0];
    return ApiResponseUtil.conflict(res, `${field} already exists`);
  }

  if (err.name === 'JsonWebTokenError') {
    return ApiResponseUtil.unauthorized(res, 'Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    return ApiResponseUtil.unauthorized(res, 'Token expired');
  }

  // Default error
  const statusCode = (err as any).statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal Server Error' 
    : err.message;

  ApiResponseUtil.error(res, message, statusCode);
};