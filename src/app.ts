import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
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

    // Session management (optional) - RedisStore constructor issue fixed by disabling\n    // if (config.redis.host) {\n    //   const redisClient = createClient({\n    //     socket: {\n    //       host: config.redis.host,\n    //       port: config.redis.port,\n    //     },\n    //     password: config.redis.password,\n    //   });\n    //   \n    //   redisClient.connect().catch(console.error);\n    //   \n    //   this.app.use(session({\n    //     store: new RedisStore({ client: redisClient }),\n    //     secret: config.jwt.secret,\n    //     resave: false,\n    //     saveUninitialized: false,\n    //     cookie: {\n    //       secure: config.isProduction(),\n    //       httpOnly: true,\n    //       maxAge: 1000 * 60 * 60 * 24, // 1 day\n    //     },\n    //   }));\n    // }

    // Health check endpoint with Redis check
  }

  private setupRoutes(): void {
    this.app.use('/api', routes);

    // Swagger docs
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

    // Root landing page for project and docs
    this.app.get('/', (req: Request, res: Response) => {
      res.send(`
        <!doctype html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Node.js Backend Toolkit</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f4f6f8; }
              .container { background: #fff; padding: 2rem; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.12); max-width: 720px; width: 100%; }
              h1 { margin-top: 0; }
              .btn { display: inline-block; margin-top: 1rem; padding: 0.75rem 1.25rem; color: #fff; background: #007bff; border: none; border-radius: 8px; text-decoration: none; }
              .btn:hover { background: #0056b3; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Node.js Backend Toolkit</h1>
              <p>API server is running. Use the Swagger UI to explore all endpoints and schemas.</p>
              <p><a class="btn" href="/api-docs" target="_blank">Open Swagger UI</a></p>
              <p>Health check: <code>/health</code></p>
            </div>
          </body>
        </html>
      `);
    });

    // Metrics endpoint
    this.app.get('/metrics', metricsEndpoint);

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
