import { RequestHandler } from 'express';

/**
 * Wrapper for async route handlers to eliminate try-catch blocks
 * @param fn - Async function to wrap
 * @returns Express middleware function
 */
export const asyncHandler = (fn: (...args: any[]) => Promise<any>): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncHandler;

