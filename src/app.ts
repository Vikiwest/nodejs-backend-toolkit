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
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🚀 Node.js Backend Toolkit - Production-Ready API Server</title>
  <meta name="description" content="Complete Node.js backend toolkit with authentication, payments, real-time features, monitoring, and enterprise-grade architecture.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #3b82f6;
      --primary-dark: #1d4ed8;
      --secondary: #6366f1;
      --success: #10b981;
      --warning: #f59e0b;
      --error: #ef4444;
      --slate-50: #f8fafc;
      --slate-100: #f1f5f9;
      --slate-200: #e2e8f0;
      --slate-800: #1e293b;
      --slate-900: #0f172a;
      --white: #ffffff;
      --glass-bg: rgba(255,255,255,0.25);
      --glass-border: rgba(255,255,255,0.18);
      --shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
      --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1);
      --shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.1);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      line-height: 1.6;
      color: var(--slate-900);
      background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
      min-height: 100vh;
      overflow-x: hidden;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 2rem;
    }

    /* Header */
    .header {
      padding: 2rem 0;
      text-align: center;
    }

    .logo {
      font-size: 2.5rem;
      font-weight: 700;
      background: linear-gradient(135deg, var(--white), var(--slate-100));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 0.5rem;
    }

    .tagline {
      font-size: 1.1rem;
      color: var(--slate-100);
      opacity: 0.9;
    }

    /* Hero Section */
    .hero {
      text-align: center;
      padding: 4rem 0;
      backdrop-filter: blur(10px);
      background: var(--glass-bg);
      border-radius: 24px;
      margin: 2rem 0;
      border: 1px solid var(--glass-border);
    }

    .hero h1 {
      font-size: clamp(2.5rem, 5vw, 4rem);
      font-weight: 700;
      margin-bottom: 1rem;
      background: linear-gradient(135deg, var(--white), var(--slate-200));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero p {
      font-size: 1.25rem;
      max-width: 700px;
      margin: 0 auto 2rem;
      color: var(--slate-100);
      opacity: 0.9;
    }

    .hero-buttons {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
      margin-bottom: 2rem;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.875rem 1.75rem;
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: var(--white);
      border: none;
      border-radius: 12px;
      text-decoration: none;
      font-weight: 500;
      font-size: 1rem;
      transition: all 0.2s ease;
      box-shadow: 0 4px 15px rgba(59,130,246,0.4);
    }

    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(59,130,246,0.5);
    }

    .btn-secondary {
      background: linear-gradient(135deg, var(--secondary), #4f46e5);
      box-shadow: 0 4px 15px rgba(99,102,241,0.4);
    }

    .btn-secondary:hover {
      box-shadow: 0 8px 25px rgba(99,102,241,0.5);
    }

    /* Status Bar */
    .status-bar {
      background: var(--white);
      padding: 1rem 2rem;
      border-radius: 12px;
      margin: 2rem auto;
      max-width: 600px;
      box-shadow: var(--shadow-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
    }

    .status-indicator {
      width: 12px;
      height: 12px;
      background: var(--success);
      border-radius: 50%;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* Features Grid */
    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 2rem;
      margin: 4rem 0;
    }

    .feature-card {
      background: var(--glass-bg);
      backdrop-filter: blur(20px);
      border: 1px solid var(--glass-border);
      border-radius: 20px;
      padding: 2rem;
      transition: all 0.3s ease;
      box-shadow: var(--shadow);
    }

    .feature-card:hover {
      transform: translateY(-5px);
      box-shadow: var(--shadow-xl);
      border-color: rgba(59,130,246,0.3);
    }

    .feature-icon {
      font-size: 2rem;
      margin-bottom: 1rem;
      display: block;
    }

    .feature-card h3 {
      color: var(--primary);
      margin-bottom: 0.5rem;
      font-size: 1.25rem;
    }

    .feature-card p {
      color: var(--slate-100);
      opacity: 0.9;
      margin-bottom: 1rem;
    }

    .feature-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .tag {
      background: rgba(59,130,246,0.1);
      color: var(--primary);
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 500;
    }

    /* Architecture Section */
    .architecture {
      background: var(--glass-bg);
      backdrop-filter: blur(20px);
      border: 1px solid var(--glass-border);
      border-radius: 24px;
      padding: 3rem 2rem;
      margin: 4rem 0;
      text-align: center;
    }

    .architecture h2 {
      color: var(--white);
      margin-bottom: 2rem;
      font-size: 2rem;
    }

    .tech-stack {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-top: 2rem;
    }

    .tech-item {
      background: rgba(255,255,255,0.1);
      padding: 1rem;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.1);
    }

    .tech-item strong {
      color: var(--white);
      display: block;
      margin-bottom: 0.5rem;
    }

    .tech-item span {
      color: var(--slate-200);
      font-size: 0.9rem;
    }

    /* Footer */
    .footer {
      text-align: center;
      padding: 3rem 0 2rem;
      color: var(--slate-200);
      opacity: 0.8;
    }

    .footer-links {
      display: flex;
      justify-content: center;
      gap: 2rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }

    .footer-links a {
      color: var(--slate-200);
      text-decoration: none;
      transition: color 0.2s ease;
    }

    .footer-links a:hover {
      color: var(--primary);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .container { padding: 0 1rem; }
      .hero { padding: 2rem 1rem; margin: 1rem 0; }
      .hero-buttons { flex-direction: column; align-items: center; }
      .features { grid-template-columns: 1fr; }
      .tech-stack { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
      .footer-links { gap: 1rem; }
    }

    /* Animations */
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .feature-card, .hero, .architecture {
      animation: fadeInUp 0.6s ease-out;
    }
  </style>
</head>
<body>
  <header class="header">
    <div class="container">
      <div class="logo">🚀 Node.js Backend Toolkit</div>
      <div class="tagline">Enterprise-Grade API Server</div>
    </div>
  </header>

  <main class="container">
    <section class="hero">
      <h1>Production-Ready Backend API</h1>
      <p>Complete Node.js toolkit with authentication, payments, real-time features, monitoring, and enterprise-grade architecture. Built for scale, security, and performance.</p>

      <div class="hero-buttons">
        <a href="/api-docs" class="btn">📚 API Documentation</a>
        <a href="/health" class="btn btn-secondary">✅ Health Check</a>
        <a href="/metrics" class="btn btn-secondary">📊 Metrics Dashboard</a>
      </div>

      <div class="status-bar">
        <span class="status-indicator"></span>
        <strong>All Systems Operational</strong>
        <span>• Environment: ${process.env.NODE_ENV || 'development'}</span>
      </div>
    </section>

    <section class="features">
      <div class="feature-card">
        <span class="feature-icon">🔐</span>
        <h3>Secure Authentication</h3>
        <p>Complete user management with JWT tokens, 2FA, role-based access control, and comprehensive audit logging.</p>
        <div class="feature-tags">
          <span class="tag">JWT</span>
          <span class="tag">2FA</span>
          <span class="tag">RBAC</span>
          <span class="tag">Audit Logs</span>
        </div>
      </div>

      <div class="feature-card">
        <span class="feature-icon">💳</span>
        <h3>Payment Processing</h3>
        <p>Full Stripe integration with webhooks, subscription management, payment tracking, and secure transaction handling.</p>
        <div class="feature-tags">
          <span class="tag">Stripe</span>
          <span class="tag">Webhooks</span>
          <span class="tag">Subscriptions</span>
        </div>
      </div>

      <div class="feature-card">
        <span class="feature-icon">⚡</span>
        <h3>Real-Time Features</h3>
        <p>WebSocket connections, push notifications, background job queues, and instant messaging capabilities.</p>
        <div class="feature-tags">
          <span class="tag">WebSockets</span>
          <span class="tag">BullMQ</span>
          <span class="tag">Notifications</span>
        </div>
      </div>

      <div class="feature-card">
        <span class="feature-icon">📈</span>
        <h3>Monitoring & Observability</h3>
        <p>Comprehensive metrics, health checks, structured logging, rate limiting, and performance monitoring.</p>
        <div class="feature-tags">
          <span class="tag">Metrics</span>
          <span class="tag">Health Checks</span>
          <span class="tag">Logging</span>
        </div>
      </div>

      <div class="feature-card">
        <span class="feature-icon">📧</span>
        <h3>Communication Services</h3>
        <p>Email and SMS services with templates, queuing, delivery tracking, and multi-provider failover.</p>
        <div class="feature-tags">
          <span class="tag">Email</span>
          <span class="tag">SMS</span>
          <span class="tag">Templates</span>
        </div>
      </div>

      <div class="feature-card">
        <span class="feature-icon">🔍</span>
        <h3>Advanced Features</h3>
        <p>File uploads, search functionality, dashboard analytics, export services, and feature flag management.</p>
        <div class="feature-tags">
          <span class="tag">Search</span>
          <span class="tag">Uploads</span>
          <span class="tag">Analytics</span>
        </div>
      </div>
    </section>

    <section class="architecture">
      <h2>🏗️ Enterprise Architecture</h2>
      <p>Built with modern technologies and best practices for scalability and maintainability</p>

      <div class="tech-stack">
        <div class="tech-item">
          <strong>Runtime</strong>
          <span>Node.js + Express</span>
        </div>
        <div class="tech-item">
          <strong>Language</strong>
          <span>TypeScript</span>
        </div>
        <div class="tech-item">
          <strong>Database</strong>
          <span>MongoDB + Mongoose</span>
        </div>
        <div class="tech-item">
          <strong>Cache</strong>
          <span>Redis + In-Memory</span>
        </div>
        <div class="tech-item">
          <strong>Queue</strong>
          <span>BullMQ + Redis</span>
        </div>
        <div class="tech-item">
          <strong>Security</strong>
          <span>Helmet + CORS + Rate Limiting</span>
        </div>
        <div class="tech-item">
          <strong>Testing</strong>
          <span>Jest + Supertest</span>
        </div>
        <div class="tech-item">
          <strong>Deployment</strong>
          <span>Docker + PM2</span>
        </div>
      </div>
    </section>
  </main>

  <footer class="footer">
    <div class="footer-links">
      <a href="/api-docs">API Docs</a>
      <a href="/health">Health Check</a>
      <a href="/metrics">Metrics</a>
      <a href="https://github.com" target="_blank">GitHub</a>
    </div>
    <p>© 2024 Node.js Backend Toolkit • Built with ❤️ for developers</p>
  </footer>
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
