import { Request, Response } from 'express';
import { ParsedQs } from 'qs';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
      query: ParsedQs;
      params: Record<string, string>;
    }
  }
}

export {};
