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
      res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Node.js Backend Toolkit | Enterprise-Grade API Server</title>
  <meta name="description" content="Production-ready Node.js backend with authentication, payments, real-time features, monitoring, and enterprise architecture. Built for scale, security, and performance.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0a0c10;
      color: #eef2ff;
      line-height: 1.5;
      overflow-x: hidden;
    }

    /* Modern gradient background with subtle noise */
    .bg-gradient {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: -2;
      background: radial-gradient(circle at 10% 20%, rgba(37, 99, 235, 0.15), rgba(6, 8, 15, 0.98));
    }

    .bg-gradient::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
      opacity: 0.4;
      pointer-events: none;
    }

    .container {
      max-width: 1280px;
      margin: 0 auto;
      padding: 0 2rem;
      position: relative;
    }

    /* Navigation */
    .navbar {
      padding: 1.5rem 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      background: linear-gradient(135deg, #fff, #a5b4fc);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }

    .logo-icon {
      font-size: 1.8rem;
    }

    .nav-links {
      display: flex;
      gap: 2rem;
      align-items: center;
    }

    .nav-links a {
      color: #cbd5e6;
      text-decoration: none;
      font-weight: 500;
      font-size: 0.9rem;
      transition: color 0.2s;
    }

    .nav-links a:hover {
      color: #60a5fa;
    }

    /* Hero Section */
    .hero {
      padding: 5rem 0 4rem;
      text-align: center;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(59,130,246,0.12);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(59,130,246,0.25);
      padding: 0.4rem 1rem;
      border-radius: 100px;
      font-size: 0.8rem;
      font-weight: 500;
      color: #93c5fd;
      margin-bottom: 2rem;
    }

    .hero h1 {
      font-size: clamp(2.8rem, 6vw, 4.5rem);
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.2;
      background: linear-gradient(to right, #ffffff, #c7d2fe, #a5b4fc);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      margin-bottom: 1.5rem;
    }

    .hero-description {
      font-size: 1.2rem;
      color: #9ca3af;
      max-width: 700px;
      margin: 0 auto 2rem;
    }

    .button-group {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
      margin-bottom: 3rem;
    }

    .btn-primary {
      background: linear-gradient(95deg, #2563eb, #3b82f6);
      border: none;
      padding: 0.75rem 1.8rem;
      border-radius: 40px;
      font-weight: 600;
      font-size: 0.95rem;
      color: white;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 8px 20px rgba(37,99,235,0.3);
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 28px rgba(37,99,235,0.4);
      background: linear-gradient(95deg, #1d4ed8, #2563eb);
    }

    .btn-secondary {
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,0.15);
      padding: 0.75rem 1.8rem;
      border-radius: 40px;
      font-weight: 600;
      font-size: 0.95rem;
      color: #e2e8f0;
      text-decoration: none;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-secondary:hover {
      background: rgba(255,255,255,0.12);
      border-color: rgba(59,130,246,0.5);
      color: white;
    }

    /* Status Dashboard */
    .status-card {
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(12px);
      border-radius: 28px;
      border: 1px solid rgba(255,255,255,0.08);
      padding: 1rem 1.8rem;
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 1.5rem;
      margin-top: 1rem;
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: #94a3b8;
    }

    .status-led {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
      animation: pulse 1.8s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1);}
      50% { opacity: 0.6; transform: scale(1.1);}
    }

    /* Stats row */
    .stats-row {
      display: flex;
      justify-content: center;
      gap: 2rem;
      margin: 2rem 0 1rem;
      flex-wrap: wrap;
    }

    .stat {
      text-align: center;
    }

    .stat-number {
      font-size: 1.8rem;
      font-weight: 800;
      color: white;
    }

    .stat-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #6b7280;
    }

    /* Features Grid */
    .section-title {
      font-size: 2rem;
      font-weight: 700;
      text-align: center;
      margin: 4rem 0 1rem;
      letter-spacing: -0.01em;
    }

    .section-sub {
      text-align: center;
      color: #8b9eb0;
      margin-bottom: 3rem;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.8rem;
      margin: 3rem 0;
    }

    .feature {
      background: rgba(18, 25, 45, 0.6);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 28px;
      padding: 1.8rem;
      transition: all 0.25s ease;
    }

    .feature:hover {
      border-color: rgba(59,130,246,0.3);
      transform: translateY(-4px);
      background: rgba(22, 31, 55, 0.7);
    }

    .feature-icon {
      font-size: 2.2rem;
      margin-bottom: 1rem;
    }

    .feature h3 {
      font-size: 1.3rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    .feature p {
      color: #b9c7d9;
      font-size: 0.9rem;
      margin-bottom: 1rem;
    }

    .tech-badge-group {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.75rem;
    }

    .tech-badge {
      background: rgba(59,130,246,0.15);
      padding: 0.2rem 0.7rem;
      border-radius: 40px;
      font-size: 0.7rem;
      font-weight: 500;
      color: #90cdf4;
    }

    /* Architecture block */
    .architecture-block {
      background: linear-gradient(135deg, rgba(12, 20, 35, 0.8), rgba(5, 10, 22, 0.9));
      border-radius: 36px;
      border: 1px solid rgba(59,130,246,0.2);
      padding: 2.5rem;
      margin: 3rem 0;
    }

    .arch-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .arch-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
    }

    .arch-item {
      background: rgba(0,0,0,0.3);
      border-radius: 20px;
      padding: 1rem;
      text-align: center;
      border: 1px solid rgba(255,255,255,0.05);
    }

    .arch-item strong {
      display: block;
      font-size: 0.9rem;
      margin-bottom: 0.3rem;
      color: #e0e7ff;
    }

    .arch-item span {
      font-size: 0.75rem;
      color: #7f8ea3;
    }

    /* CTA Section */
    .cta-section {
      text-align: center;
      margin: 5rem 0 4rem;
      background: radial-gradient(ellipse at 50% 50%, rgba(37,99,235,0.15), transparent);
      padding: 2.5rem;
      border-radius: 48px;
    }

    /* Footer */
    .footer {
      border-top: 1px solid rgba(255,255,255,0.05);
      padding: 2.5rem 0 2rem;
      margin-top: 2rem;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem;
      font-size: 0.8rem;
      color: #5b6e8c;
    }

    .footer-links {
      display: flex;
      gap: 2rem;
    }

    .footer-links a {
      color: #8192af;
      text-decoration: none;
      transition: color 0.2s;
    }

    .footer-links a:hover {
      color: #60a5fa;
    }

    @media (max-width: 768px) {
      .container {
        padding: 0 1.2rem;
      }
      .navbar {
        flex-direction: column;
        text-align: center;
      }
      .nav-links {
        gap: 1.2rem;
      }
      .hero {
        padding: 2rem 0;
      }
      .status-card {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.6rem;
      }
      .features-grid {
        grid-template-columns: 1fr;
      }
      .footer {
        flex-direction: column;
        align-items: center;
        text-align: center;
      }
    }

    /* Animations */
    @keyframes fadeSlideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .feature, .hero, .architecture-block, .cta-section {
      animation: fadeSlideUp 0.5s ease backwards;
    }

    .feature:nth-child(1) { animation-delay: 0.05s; }
    .feature:nth-child(2) { animation-delay: 0.1s; }
    .feature:nth-child(3) { animation-delay: 0.15s; }
    .feature:nth-child(4) { animation-delay: 0.2s; }
    .feature:nth-child(5) { animation-delay: 0.25s; }
    .feature:nth-child(6) { animation-delay: 0.3s; }
  </style>
</head>
<body>
<div class="bg-gradient"></div>

<div class="container">
  <!-- Navigation -->
  <nav class="navbar">
    <div class="logo">
      <span class="logo-icon">⚡</span>
      <span>Backend<span style="color:#3b82f6;">Core</span></span>
    </div>
    <div class="nav-links">
      <a href="/api-docs">📘 API Docs</a>
      <a href="/health?dashboard=true">🩺 Health</a>
      <a href="/metrics">📊 Metrics</a>
      <a href="https://github.com/Vikiwest/nodejs-backend-toolkit" target="_blank">🐙 GitHub</a>
    </div>
  </nav>

  <!-- Hero -->
  <section class="hero">
    <div class="badge">
      <span>✨ v3.0.0</span>
      <span>• Enterprise Ready</span>
    </div>
    <h1>Node.js Backend Toolkit</h1>
    <div class="hero-description">
      Production‑ready API server with authentication, payments, realtime, monitoring, and cloud‑native architecture. Built for developers who ship with confidence.
    </div>
    <div class="button-group">
      <a href="/api-docs" class="btn-primary">
        <span>📖</span> Explore API
      </a>
      <a href="/health?dashboard=true" class="btn-secondary">
        <span>✅</span> System Status
      </a>
      <a href="/metrics" class="btn-secondary">
        <span>📈</span> Live Metrics
      </a>
    </div>

    <div class="status-card">
      <div class="status-item"><span class="status-led"></span> <strong>Database</strong> <span style="color:#10b981;">connected</span></div>
      <div class="status-item"><span class="status-led"></span> <strong>Cache (Redis)</strong> <span style="color:#10b981;">operational</span></div>
      <div class="status-item"><span class="status-led"></span> <strong>Queue (BullMQ)</strong> <span style="color:#10b981;">active</span></div>
      <div class="status-item"><span class="status-led"></span> <strong>WebSocket</strong> <span style="color:#10b981;">online</span></div>
    </div>

    <div class="stats-row">
      <div class="stat"><div class="stat-number">99.99%</div><div class="stat-label">Uptime SLA</div></div>
      <div class="stat"><div class="stat-number">&lt;50ms</div><div class="stat-label">Avg Response</div></div>
      <div class="stat"><div class="stat-number">10k+</div><div class="stat-label">Concurrent</div></div>
    </div>
  </section>

  <!-- Features -->
  <div class="section-title">Enterprise‑grade capabilities</div>
  <div class="section-sub">Everything you need to build, secure, and scale your next product</div>

  <div class="features-grid">
    <div class="feature">
      <div class="feature-icon">🔐</div>
      <h3>Advanced Auth & RBAC</h3>
      <p>JWT, refresh tokens, 2FA, role-based access, audit logs, and session management out of the box.</p>
      <div class="tech-badge-group"><span class="tech-badge">JWT</span><span class="tech-badge">2FA</span><span class="tech-badge">RBAC</span><span class="tech-badge">Audit</span></div>
    </div>
    <div class="feature">
      <div class="feature-icon">💳</div>
      <h3>Payment Orchestration</h3>
      <p>Stripe integration, subscription billing, webhook sync, invoices, and payment analytics.</p>
      <div class="tech-badge-group"><span class="tech-badge">Stripe</span><span class="tech-badge">Webhooks</span><span class="tech-badge">Subscriptions</span></div>
    </div>
    <div class="feature">
      <div class="feature-icon">⚡</div>
      <h3>Real‑time & Queues</h3>
      <p>WebSocket (Socket.io) server, BullMQ background jobs, push notifications, and event-driven architecture.</p>
      <div class="tech-badge-group"><span class="tech-badge">WebSockets</span><span class="tech-badge">BullMQ</span><span class="tech-badge">Redis Streams</span></div>
    </div>
    <div class="feature">
      <div class="feature-icon">📊</div>
      <h3>Observability Stack</h3>
      <p>Prometheus metrics, structured logging (winston), distributed tracing, health probes, and alerting.</p>
      <div class="tech-badge-group"><span class="tech-badge">Prometheus</span><span class="tech-badge">OpenTelemetry</span><span class="tech-badge">Logs</span></div>
    </div>
    <div class="feature">
      <div class="feature-icon">📧</div>
      <h3>Multi‑channel Comms</h3>
      <p>Email (Nodemailer + templates), SMS (Twilio), in-app notifications with retries and failover.</p>
      <div class="tech-badge-group"><span class="tech-badge">Email</span><span class="tech-badge">SMS</span><span class="tech-badge">Queues</span></div>
    </div>
    <div class="feature">
      <div class="feature-icon">🚀</div>
      <h3>Scale & Performance</h3>
      <p>Horizontal scaling, cluster mode, Redis cache, CDN-ready static assets, and rate limiting with Redis.</p>
      <div class="tech-badge-group"><span class="tech-badge">Cluster</span><span class="tech-badge">Cache</span><span class="tech-badge">Rate Limiting</span></div>
    </div>
  </div>

  <!-- Architecture Highlight -->
  <div class="architecture-block">
    <div class="arch-header">
      <span style="font-size: 2rem;">🏗️</span>
      <h2 style="margin-top: 0.5rem; font-weight: 700;">Production Architecture</h2>
      <p style="color:#9aaebf;">Modern toolchain for reliability and developer velocity</p>
    </div>
    <div class="arch-grid">
      <div class="arch-item"><strong>Runtime</strong><span>Node.js 20+ / Express</span></div>
      <div class="arch-item"><strong>Language</strong><span>TypeScript</span></div>
      <div class="arch-item"><strong>Database</strong><span>MongoDB + Mongoose ODM</span></div>
      <div class="arch-item"><strong>Caching</strong><span>Redis (Upstash / self-hosted)</span></div>
      <div class="arch-item"><strong>Job Queues</strong><span>BullMQ + Redis</span></div>
      <div class="arch-item"><strong>Security</strong><span>Helmet, CORS, XSS, Rate-limit</span></div>
      <div class="arch-item"><strong>Testing</strong><span>Jest / Supertest / E2E</span></div>
      <div class="arch-item"><strong>Deployment</strong><span>Docker + PM2 / K8s ready</span></div>
    </div>
  </div>

  <!-- CTA for developers -->
  <div class="cta-section">
    <h3 style="font-size: 1.8rem; margin-bottom: 0.75rem;">Ready to integrate?</h3>
    <p style="color:#a0b3ce; max-width: 500px; margin: 0 auto 1.8rem;">Explore the interactive Swagger documentation and test endpoints immediately.</p>
    <div class="button-group">
      <a href="/api-docs" class="btn-primary">📚 Swagger UI</a>
      <a href="/health?dashboard=true" class="btn-secondary">🟢 Health Dashboard</a>
    </div>
  </div>

  <!-- Footer -->
  <footer class="footer">
    <div>© 2025 Node.js Backend Toolkit — MIT Licensed</div>
    <div class="footer-links">
      <a href="/api-docs">Documentation</a>
      <a href="/health?dashboard=true">System Health</a>
      <a href="/metrics">Prometheus Metrics</a>
      <a href="https://github.com/Vikiwest/nodejs-backend-toolkit" target="_blank">Contribute</a>
    </div>
  </footer>
</div>

<!-- Small script to fetch dynamic environment data (optional) -->
<script>
  (function() {
    // Update environment indicator and optionally fetch health status in real-time
    const envSpan = document.querySelector('.status-item:first-child span:last-child');
    if (envSpan) {
      // we can optionally fetch from /health endpoint for live data, but it's static fallback
      fetch('/health')
        .then(res => res.json())
        .then(data => {
          if (data && data.services) {
            const dbSpan = document.querySelector('.status-item:first-child span:last-child');
            const cacheSpan = document.querySelectorAll('.status-item span:last-child')[1];
            if (dbSpan && data.services.database) dbSpan.innerText = data.services.database === 'connected' ? 'connected' : 'disconnected';
            if (cacheSpan && data.services.cache) cacheSpan.innerText = data.services.cache === 'operational' ? 'operational' : 'degraded';
          }
        })
        .catch(() => {});
    }
  })();
</script>
</body>
</html>`);
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

        // Serve dashboard if requested
        if (req.query.dashboard === 'true' || req.headers.accept?.includes('text/html')) {
          const uptimeFormatted = formatUptime(healthData.uptime);
          const memoryUsagePercent = Math.round((memoryMB.heapUsed / memoryMB.heapTotal) * 100);

          res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🩺 System Health Dashboard - Node.js Backend Toolkit</title>
  <meta name="description" content="Real-time system health monitoring dashboard">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #3b82f6;
      --primary-dark: #1d4ed8;
      --success: #10b981;
      --warning: #f59e0b;
      --error: #ef4444;
      --info: #06b6d4;
      --slate-50: #f8fafc;
      --slate-100: #f1f5f9;
      --slate-200: #e2e8f0;
      --slate-300: #cbd5e1;
      --slate-800: #1e293b;
      --slate-900: #0f172a;
      --white: #ffffff;
      --glass-bg: rgba(255,255,255,0.95);
      --glass-border: rgba(255,255,255,0.2);
      --shadow: 0 1px 3px 0 rgba(0,0,0,0.1);
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
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      color: var(--slate-900);
      line-height: 1.6;
      min-height: 100vh;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    /* Header */
    .header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .header h1 {
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--slate-900);
      margin-bottom: 0.5rem;
    }

    .header p {
      color: var(--slate-600);
      font-size: 1.1rem;
    }

    .last-updated {
      color: var(--slate-500);
      font-size: 0.9rem;
      margin-top: 0.5rem;
    }

    /* Status Overview */
    .status-overview {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .status-card {
      background: var(--white);
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: var(--shadow-lg);
      border: 1px solid var(--slate-200);
      transition: all 0.2s ease;
    }

    .status-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-xl);
    }

    .status-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .status-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
    }

    .status-icon.healthy { background: var(--success); color: white; }
    .status-icon.warning { background: var(--warning); color: white; }
    .status-icon.error { background: var(--error); color: white; }
    .status-icon.info { background: var(--info); color: white; }

    .status-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--slate-900);
    }

    .status-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--slate-900);
      margin-bottom: 0.5rem;
    }

    .status-meta {
      color: var(--slate-600);
      font-size: 0.9rem;
    }

    /* Services Grid */
    .services-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .service-card {
      background: var(--white);
      border-radius: 12px;
      padding: 1.25rem;
      box-shadow: var(--shadow);
      border: 1px solid var(--slate-200);
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .service-status {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .service-status.operational { background: var(--success); }
    .service-status.failed { background: var(--error); }
    .service-status.disconnected { background: var(--warning); }

    .service-info h4 {
      font-weight: 600;
      color: var(--slate-900);
      margin-bottom: 0.25rem;
    }

    .service-info p {
      color: var(--slate-600);
      font-size: 0.9rem;
    }

    /* Memory Usage */
    .memory-section {
      background: var(--white);
      border-radius: 16px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      box-shadow: var(--shadow-lg);
      border: 1px solid var(--slate-200);
    }

    .memory-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }

    .memory-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--slate-900);
    }

    .memory-usage {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary);
    }

    .memory-bars {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .memory-bar {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .memory-bar label {
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--slate-700);
    }

    .progress-bar {
      height: 8px;
      background: var(--slate-200);
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .progress-fill.rss { background: var(--primary); }
    .progress-fill.heap-used { background: var(--success); }
    .progress-fill.heap-total { background: var(--info); }
    .progress-fill.external { background: var(--warning); }

    .memory-value {
      font-size: 0.8rem;
      color: var(--slate-600);
      text-align: right;
    }

    /* System Info */
    .system-info {
      background: var(--white);
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: var(--shadow-lg);
      border: 1px solid var(--slate-200);
    }

    .system-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .system-item {
      text-align: center;
      padding: 1rem;
      background: var(--slate-50);
      border-radius: 8px;
    }

    .system-item h4 {
      font-size: 0.9rem;
      color: var(--slate-600);
      margin-bottom: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .system-item p {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--slate-900);
    }

    /* Actions */
    .actions {
      text-align: center;
      margin-top: 2rem;
      padding-top: 2rem;
      border-top: 1px solid var(--slate-200);
    }

    .actions a {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      background: var(--primary);
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 500;
      transition: all 0.2s ease;
      margin: 0 0.5rem;
    }

    .actions a:hover {
      background: var(--primary-dark);
      transform: translateY(-1px);
    }

    .actions .secondary {
      background: var(--slate-600);
    }

    .actions .secondary:hover {
      background: var(--slate-800);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .container { padding: 1rem; }
      .status-overview { grid-template-columns: 1fr; }
      .services-grid { grid-template-columns: 1fr; }
      .memory-bars { grid-template-columns: 1fr; }
      .system-grid { grid-template-columns: repeat(2, 1fr); }
      .actions a { display: block; margin: 0.5rem 0; }
    }

    /* Animations */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .status-card, .service-card, .memory-section, .system-info {
      animation: fadeIn 0.5s ease-out;
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>🩺 System Health Dashboard</h1>
      <p>Real-time monitoring of your Node.js Backend Toolkit</p>
      <div class="last-updated">Last updated: ${new Date(healthData.timestamp).toLocaleString()}</div>
    </header>

    <div class="status-overview">
      <div class="status-card">
        <div class="status-header">
          <div class="status-icon healthy">✅</div>
          <div>
            <div class="status-title">Overall Status</div>
            <div class="status-meta">System Health</div>
          </div>
        </div>
        <div class="status-value">${healthData.status.charAt(0).toUpperCase() + healthData.status.slice(1)}</div>
      </div>

      <div class="status-card">
        <div class="status-header">
          <div class="status-icon info">⏱️</div>
          <div>
            <div class="status-title">Uptime</div>
            <div class="status-meta">System Runtime</div>
          </div>
        </div>
        <div class="status-value">${uptimeFormatted}</div>
      </div>

      <div class="status-card">
        <div class="status-header">
          <div class="status-icon info">💾</div>
          <div>
            <div class="status-title">Memory Usage</div>
            <div class="status-meta">Heap Memory</div>
          </div>
        </div>
        <div class="status-value">${memoryUsagePercent}%</div>
      </div>
    </div>

    <div class="services-grid">
      <div class="service-card">
        <div class="service-status ${healthData.services.database === 'connected' ? 'operational' : 'disconnected'}"></div>
        <div class="service-info">
          <h4>Database</h4>
          <p>${healthData.services.database.charAt(0).toUpperCase() + healthData.services.database.slice(1)}</p>
        </div>
      </div>

      <div class="service-card">
        <div class="service-status ${healthData.services.cache === 'operational' ? 'operational' : 'failed'}"></div>
        <div class="service-info">
          <h4>Cache Service</h4>
          <p>${healthData.services.cache.charAt(0).toUpperCase() + healthData.services.cache.slice(1)}</p>
        </div>
      </div>
    </div>

    <div class="memory-section">
      <div class="memory-header">
        <div class="memory-title">📊 Memory Usage</div>
        <div class="memory-usage">${memoryMB.heapUsed} MB / ${memoryMB.heapTotal} MB</div>
      </div>

      <div class="memory-bars">
        <div class="memory-bar">
          <label>RSS (Resident Set Size)</label>
          <div class="progress-bar">
            <div class="progress-fill rss" style="width: ${Math.min((memoryMB.rss / (memoryMB.heapTotal * 2)) * 100, 100)}%"></div>
          </div>
          <div class="memory-value">${memoryMB.rss} MB</div>
        </div>

        <div class="memory-bar">
          <label>Heap Used</label>
          <div class="progress-bar">
            <div class="progress-fill heap-used" style="width: ${memoryUsagePercent}%"></div>
          </div>
          <div class="memory-value">${memoryMB.heapUsed} MB</div>
        </div>

        <div class="memory-bar">
          <label>Heap Total</label>
          <div class="progress-bar">
            <div class="progress-fill heap-total" style="width: 100%"></div>
          </div>
          <div class="memory-value">${memoryMB.heapTotal} MB</div>
        </div>

        <div class="memory-bar">
          <label>External Memory</label>
          <div class="progress-bar">
            <div class="progress-fill external" style="width: ${Math.min((memoryMB.external / memoryMB.heapTotal) * 100, 100)}%"></div>
          </div>
          <div class="memory-value">${memoryMB.external} MB</div>
        </div>
      </div>
    </div>

    <div class="system-info">
      <h3 style="text-align: center; margin-bottom: 1.5rem; color: var(--slate-900);">🖥️ System Information</h3>
      <div class="system-grid">
        <div class="system-item">
          <h4>Environment</h4>
          <p>${healthData.environment}</p>
        </div>
        <div class="system-item">
          <h4>Node Version</h4>
          <p>${healthData.system.nodeVersion}</p>
        </div>
        <div class="system-item">
          <h4>Platform</h4>
          <p>${healthData.system.platform}</p>
        </div>
        <div class="system-item">
          <h4>Architecture</h4>
          <p>${healthData.system.arch}</p>
        </div>
      </div>
    </div>

    <div class="actions">
      <a href="/health?format=json" class="secondary">📄 JSON Response</a>
      <a href="/metrics">📊 Metrics Dashboard</a>
      <a href="/">🏠 Home</a>
      <a href="/api-docs">📚 API Docs</a>
    </div>
  </div>

  <script>
    // Auto-refresh every 30 seconds
    setTimeout(() => {
      window.location.reload();
    }, 30000);

    // Add loading state for manual refresh
    function refreshDashboard() {
      const btn = event.target;
      btn.textContent = '🔄 Refreshing...';
      btn.disabled = true;
      window.location.reload();
    }
  </script>
</body>
</html>
          `);
        } else {
          // Return JSON response
          res.status(200).json(healthData);
        }
      } catch (error) {
        logger.error('Health check failed', error as Error);

        if (req.query.dashboard === 'true' || req.headers.accept?.includes('text/html')) {
          res.status(503).send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>❌ System Health - Error</title>
  <style>
    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8fafc; }
    .error { color: #ef4444; font-size: 2rem; margin: 20px 0; }
    .message { color: #64748b; font-size: 1.1rem; }
  </style>
</head>
<body>
  <h1>❌ System Health Check Failed</h1>
  <div class="error">Service Unavailable</div>
  <div class="message">The system is currently experiencing issues. Please check the logs for more details.</div>
  <br>
  <a href="/health?format=json">View JSON Response</a> | <a href="/">Back to Home</a>
</body>
</html>
          `);
        } else {
          res.status(503).json({
            success: false,
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Service unavailable',
          });
        }
      }
    });

    // Helper function to format uptime
    function formatUptime(seconds: number): string {
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);

      if (days > 0) {
        return days + 'd ' + hours + 'h ' + minutes + 'm';
      } else if (hours > 0) {
        return hours + 'h ' + minutes + 'm';
      } else {
        return minutes + 'm';
      }
    }

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
