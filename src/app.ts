import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import session from 'express-session';
import RedisStore from 'connect-redis';
import { createClient } from 'redis';
import config from '@/config/env';
import { logger } from '@/utils/logger';
import { errorHandler } from '@/middleware/errorHandler';
import { generalLimiter } from '@/middleware/rateLimiter';
import { compressionMiddleware } from '@/middleware/compression';
import routes from '@/routes';
import { websocketService } from '@/services/websocketService';
import { EmailJobs } from '@/jobs/email.job';
import { CleanupJobs } from '@/jobs/cleanup.job';

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
    this.app.use(helmet({
      contentSecurityPolicy: config.isProduction(),
      hsts: config.isProduction(),
      crossOriginEmbedderPolicy: false,
    }));

    // CORS
    this.app.use(cors({
      origin: config.isProduction() 
        ? process.env.ALLOWED_ORIGINS?.split(',') 
        : '*',
      credentials: true,
      optionsSuccessStatus: 200,
    }));

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
      this.app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
    }

    // Rate limiting
    this.app.use('/api', generalLimiter);

    // Session management (optional) - RedisStore constructor issue fixed by disabling\n    // if (config.redis.host) {\n    //   const redisClient = createClient({\n    //     socket: {\n    //       host: config.redis.host,\n    //       port: config.redis.port,\n    //     },\n    //     password: config.redis.password,\n    //   });\n    //   \n    //   redisClient.connect().catch(console.error);\n    //   \n    //   this.app.use(session({\n    //     store: new RedisStore({ client: redisClient }),\n    //     secret: config.jwt.secret,\n    //     resave: false,\n    //     saveUninitialized: false,\n    //     cookie: {\n    //       secure: config.isProduction(),\n    //       httpOnly: true,\n    //       maxAge: 1000 * 60 * 60 * 24, // 1 day\n    //     },\n    //   }));\n    // }

    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.nodeEnv,
        memory: process.memoryUsage(),
      });
    });
  }

  private setupRoutes(): void {
    this.app.use('/api', routes);

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