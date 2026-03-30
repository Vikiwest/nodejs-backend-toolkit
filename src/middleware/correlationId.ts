import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
    }
  }
}

export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);
  next();
};

export const loggerWithCorrelation = (req: Request, message: string, meta?: any) => {
  // To be used in services, pass correlationId
  // LoggerService.info(message, { correlationId: req.correlationId, ...meta });
};
