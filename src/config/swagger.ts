import swaggerJsdoc from 'swagger-jsdoc';
import config from './env';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: config.appName + ' API',
      version: '1.0.0',
      description:
        'Production-ready Node.js backend toolkit with advanced features. Complete API with authentication, payments, monitoring, and comprehensive documentation.',
    },
    servers: [
      {
        url: '/api',
        description: 'API Server',
      },
    ],
    tags: [
      { name: 'Auth', description: 'Authentication and user management endpoints' },
      {
        name: 'Auth-Basic',
        description: 'Basic authentication operations (register, login, logout, refresh)',
      },
      { name: 'Auth-Verification', description: 'Email verification endpoints' },
      { name: 'Auth-Password', description: 'Password management endpoints' },
      { name: 'Auth-2FA', description: 'Two-factor authentication endpoints' },
      { name: 'User', description: 'User profile and admin management' },
      { name: 'User-Admin', description: 'Admin-only user operations' },
      { name: 'Upload', description: 'File upload and management' },
      { name: 'Audit', description: 'Audit logs and compliance' },
      { name: 'Email', description: 'Email sending services' },
      { name: 'Notification', description: 'User notifications' },
      { name: 'Dashboard', description: 'Analytics and statistics' },
      { name: 'Monitoring', description: 'Health checks and metrics' },
      { name: 'Payment', description: 'Payment processing' },
      { name: 'Search', description: 'Search functionality' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string', minLength: 2, maxLength: 100 },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['user', 'admin', 'moderator', 'super_admin'] },
            isActive: { type: 'boolean', default: true },
            isEmailVerified: { type: 'boolean', default: false },
            lastLogin: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
          required: ['_id', 'name', 'email', 'role'],
        },
        AuthResponse: {
          type: 'object',
          properties: {
            user: {
              $ref: '#/components/schemas/User',
            },
            tokens: {
              type: 'object',
              properties: {
                accessToken: {
                  type: 'string',
                },
                refreshToken: {
                  type: 'string',
                },
              },
            },
          },
        },
        TokenResponse: {
          type: 'object',
          properties: {
            tokens: {
              type: 'object',
              properties: {
                accessToken: {
                  type: 'string',
                },
                refreshToken: {
                  type: 'string',
                },
              },
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            error: { type: 'string' },
            statusCode: { type: 'number' },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            message: { type: 'string' },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                docs: { type: 'array' },
                total: { type: 'number' },
                page: { type: 'number' },
                limit: { type: 'number' },
                pages: { type: 'number' },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.controller.ts'],
};

export const specs = swaggerJsdoc(options as any);
