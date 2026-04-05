import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';

export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  (req as any).correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);
  next();
};

export const loggerWithCorrelation = (_req: Request, _message: string, _meta?: any) => {
  // To be used in services, pass correlationId
  // LoggerService.info(message, { correlationId: req.correlationId, ...meta });
};
