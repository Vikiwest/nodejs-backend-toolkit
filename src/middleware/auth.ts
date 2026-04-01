import { Request, Response, NextFunction } from 'express';
import JWTService from '@/utils/jwt';
import { ApiResponseUtil } from '@/utils/apiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { AuthRequest, UserRole } from '@/types';

interface AuthOptions {
  required?: boolean;
  roles?: UserRole[];
}

export const authMiddleware = (options: AuthOptions = { required: true }) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (options.required) {
        return ApiResponseUtil.unauthorized(res, 'No token provided');
      }
      return next();
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = JWTService.verifyAccessToken(token);
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      };

      // Check role authorization
      if (options.roles && options.roles.length > 0) {
        if (!options.roles.includes(req.user.role as UserRole)) {
          return ApiResponseUtil.forbidden(res, 'Insufficient permissions');
        }
      }

      next();
    } catch (error) {
      if (options.required) {
        return ApiResponseUtil.unauthorized(res, (error as Error).message);
      }
      next();
    }
  });
};

export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return ApiResponseUtil.unauthorized(res, 'User not authenticated');
    }

    if (!roles.includes(req.user.role as UserRole)) {
      return ApiResponseUtil.forbidden(res, 'Access denied. Insufficient permissions.');
    }

    next();
  };
};

export const requirePermission = (resource: string, action: string) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // Implement permission checking logic here
    // This could check against a permissions system or RBAC
    next();
  });
};
