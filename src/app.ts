import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import mongoose from 'mongoose';
import config from './config/env';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { generalLimiter, createRateLimiter } from './middleware/rateLimiter';
import { compressionMiddleware } from './middleware/compression';
import { correlationIdMiddleware } from './middleware/correlationId';
import { metricsMiddleware, metricsEndpoint } from './middleware/metrics';
import { apiVersioning } from './middleware/versioning';
import { securityHeaders } from './middleware/securityHeaders';
import { specs } from './config/swagger';
import swaggerUi from 'swagger-ui-express';
import routes from './routes';
import { cacheService } from './services/cacheService';
import { websocketService } from './services/websocketService';
import { EmailJobs } from './jobs/email.job';
import { CleanupJobs } from './jobs/cleanup.job';

export class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    this.setupJobs();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(
      helmet({
        contentSecurityPolicy: config.isProduction(),
        hsts: config.isProduction(),
        crossOriginEmbedderPolicy: false,
      })
    );

    // CORS
    this.app.use(
      cors({
        origin: config.isProduction() ? process.env.ALLOWED_ORIGINS?.split(',') : '*',
        credentials: true,
        optionsSuccessStatus: 200,
      })
    );

    // Compression
    this.app.use(compressionMiddleware);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Data sanitization against NoSQL injection
    this.app.use(mongoSanitize());

    // Data sanitization against XSS
    this.app.use(xss());

    // Prevent parameter pollution
    this.app.use(hpp());

    // Logging
    if (!config.isTest()) {
      this.app.use(
        morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } })
      );
    }

    // Rate limiting
    this.app.use('/api', generalLimiter);

    // New middleware stack
    this.app.use(correlationIdMiddleware);
    this.app.use(metricsMiddleware);
    this.app.use(apiVersioning);

    // Admin routes stricter rate limit
    this.app.use('/api/admin', createRateLimiter({ windowMs: 15 * 60 * 1000, max: 50 }));

    this.app.use(securityHeaders);
  }

  private setupRoutes(): void {
    this.app.use('/api', routes);

    // Swagger docs
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

    // Root landing page for project and docs
    this.app.get('/', (_req: Request, res: Response) => {
      res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>🚀 Node.js Backend Toolkit</title>
  <style>
    body { text-align: center; padding: 50px; font-family: Arial, sans-serif; }
    h1 { color: #3b82f6; }
    .links { margin: 20px 0; }
    .links a { margin: 0 10px; text-decoration: none; color: #3b82f6; }
  </style>
</head>
<body>
  <h1>🚀 Node.js Backend Toolkit</h1>
  <p>Production-ready API server with authentication, payments, real-time notifications, monitoring, and much more.</p>
  <div class="links">
    <a href="/api-docs">📚 API Docs</a> |
    <a href="/health">✅ Health Check</a> |
    <a href="/metrics">📊 Metrics</a>
  </div>
</body>
</html>
      `);
    });

    // Metrics endpoint
    this.app.get('/metrics', metricsEndpoint);

    // Health check endpoint
    this.app.get('/health', async (req: Request, res: Response) => {
      try {
        // Check database connectivity
        const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

        // Check cache service
        const cacheStatus = (await cacheService.set('health_check', 'OK', 10))
          ? 'operational'
          : 'failed';

        // Check memory usage
        const memUsage = process.memoryUsage();
        const memoryMB = {
          rss: Math.round(memUsage.rss / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024),
        };

        const healthData = {
          success: true,
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: config.nodeEnv,
          version: process.version,
          services: {
            database: dbStatus,
            cache: cacheStatus,
          },
          memory: memoryMB,
          system: {
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
          },
        };

        res.status(200).json(healthData);
      } catch (error) {
        logger.error('Health check failed', error as Error);
        res.status(503).json({
          success: false,
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: 'Service unavailable',
        });
      }
    });

    // GraphQL endpoint (placeholder for now)
    // this.app.use('/graphql', graphqlHandler);

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        message: `Cannot ${req.method} ${req.url}`,
        timestamp: new Date().toISOString(),
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  private async setupJobs(): Promise<void> {
    await EmailJobs.setup();
    await CleanupJobs.setup();
  }

  public getApp(): Application {
    return this.app;
  }

  public getWebSocketService() {
    return websocketService;
  }
}
