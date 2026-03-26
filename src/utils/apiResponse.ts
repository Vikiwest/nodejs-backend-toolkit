import { Response } from 'express';

/**
 * Standard API response formatter
 */
export class ApiResponseUtil {
  static success(
    res: Response,
    data: any,
    message: string = 'Success',
    statusCode: number = 200
  ): Response {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  static error(
    res: Response,
    error: Error,
    statusCode: number = 500,
    message: string = 'Internal Server Error'
  ): Response {
    const response = {
      success: false,
      message: error.message || message,
      statusCode,
      timestamp: new Date().toISOString(),
    };

    if (process.env.NODE_ENV === 'development') {
      response['error'] = error.stack;
    }

    return res.status(statusCode).json(response);
  }

  static created(
    res: Response,
    data: any,
    message: string = 'Resource created successfully'
  ): Response {
    return this.success(res, data, message, 201);
  }

  static badRequest(res: Response, message: string = 'Bad request'): Response {
    return this.error(res, new Error(message), 400, message);
  }

  static unauthorized(res: Response, message: string = 'Unauthorized'): Response {
    return this.error(res, new Error(message), 401, message);
  }

  static forbidden(res: Response, message: string = 'Forbidden'): Response {
    return this.error(res, new Error(message), 403, message);
  }

  static notFound(res: Response, message: string = 'Resource not found'): Response {
    return this.error(res, new Error(message), 404, message);
  }

  static paginated(res: Response, data: any, total: number, page: number, limit: number): Response {
    const totalPages = Math.ceil(total / limit);
    return this.success(res, {
      data,
      pagination: {
        currentPage: page,
        totalPages,
        total,
        limit,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  }
}
