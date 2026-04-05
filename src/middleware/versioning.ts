import { Request, Response, NextFunction } from 'express';

declare module 'express' {
  interface Request {
    apiVersion: string;
  }
}

export const apiVersioning = (req: Request, res: Response, next: NextFunction) => {
  const version = (req.headers['api-version'] as string) || (req.query.version as string) || 'v1';

  // Set version in request
  req.apiVersion = version;

  // Supported versions
  const supportedVersions = ['v1'];

  if (!supportedVersions.includes(version)) {
    return res.status(400).json({
      success: false,
      message: `Unsupported API version '${version}'. Supported: ${supportedVersions.join(', ')}`,
    });
  }

  next();
};
