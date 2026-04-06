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
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>Node.js Backend Toolkit | Enterprise-Grade API Server</title>
  <meta name="description" content="Production-ready Node.js backend with authentication, payments, real-time features, monitoring, and enterprise architecture.">
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

    /* Navigation - Responsive */
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
      flex-wrap: wrap;
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

    /* Hero Section - Responsive */
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
      font-size: clamp(2rem, 6vw, 4.5rem);
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
      font-size: clamp(1rem, 4vw, 1.2rem);
      color: #9ca3af;
      max-width: 700px;
      margin: 0 auto 2rem;
      padding: 0 1rem;
    }

    .button-group {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
      margin-bottom: 3rem;
    }

    .btn-primary, .btn-secondary {
      padding: 0.75rem 1.5rem;
      border-radius: 40px;
      font-weight: 600;
      font-size: 0.9rem;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s ease;
    }

    .btn-primary {
      background: linear-gradient(95deg, #2563eb, #3b82f6);
      color: white;
      box-shadow: 0 8px 20px rgba(37,99,235,0.3);
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 28px rgba(37,99,235,0.4);
    }

    .btn-secondary {
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,0.15);
      color: #e2e8f0;
    }

    .btn-secondary:hover {
      background: rgba(255,255,255,0.12);
      border-color: rgba(59,130,246,0.5);
      color: white;
    }

    /* Status Dashboard - Responsive */
    .status-card {
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(12px);
      border-radius: 28px;
      border: 1px solid rgba(255,255,255,0.08);
      padding: 1rem 1.5rem;
      display: flex;
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

    /* Stats row - Responsive */
    .stats-row {
      display: flex;
      justify-content: center;
      gap: 2rem;
      margin: 2rem 0 1rem;
      flex-wrap: wrap;
    }

    .stat {
      text-align: center;
      flex: 1;
      min-width: 100px;
    }

    .stat-number {
      font-size: clamp(1.2rem, 5vw, 1.8rem);
      font-weight: 800;
      color: white;
    }

    .stat-label {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #6b7280;
    }

    /* Features Grid - Responsive */
    .section-title {
      font-size: clamp(1.5rem, 5vw, 2rem);
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
      padding: 0 1rem;
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
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

    /* Architecture block - Responsive */
    .architecture-block {
      background: linear-gradient(135deg, rgba(12, 20, 35, 0.8), rgba(5, 10, 22, 0.9));
      border-radius: 36px;
      border: 1px solid rgba(59,130,246,0.2);
      padding: 2rem;
      margin: 3rem 0;
    }

    .arch-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .arch-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
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
      font-size: 0.85rem;
      margin-bottom: 0.3rem;
      color: #e0e7ff;
    }

    .arch-item span {
      font-size: 0.7rem;
      color: #7f8ea3;
    }

    /* CTA Section - Responsive */
    .cta-section {
      text-align: center;
      margin: 5rem 0 4rem;
      background: radial-gradient(ellipse at 50% 50%, rgba(37,99,235,0.15), transparent);
      padding: 2rem 1.5rem;
      border-radius: 48px;
    }

    .cta-section h3 {
      font-size: clamp(1.3rem, 5vw, 1.8rem);
      margin-bottom: 0.75rem;
    }

    /* Footer - Responsive */
    .footer {
      border-top: 1px solid rgba(255,255,255,0.05);
      padding: 2rem 0 2rem;
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
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .footer-links a {
      color: #8192af;
      text-decoration: none;
      transition: color 0.2s;
    }

    .footer-links a:hover {
      color: #60a5fa;
    }

    /* Responsive Breakpoints */
    @media (max-width: 768px) {
      .container {
        padding: 0 1rem;
      }
      
      .navbar {
        flex-direction: column;
        text-align: center;
      }
      
      .nav-links {
        justify-content: center;
        gap: 1rem;
      }
      
      .hero {
        padding: 2rem 0;
      }
      
      .status-card {
        flex-direction: column;
        align-items: stretch;
        gap: 0.8rem;
      }
      
      .status-item {
        justify-content: space-between;
      }
      
      .features-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
      }
      
      .arch-grid {
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      }
      
      .footer {
        flex-direction: column;
        align-items: center;
        text-align: center;
      }
      
      .footer-links {
        justify-content: center;
      }
      
      .button-group {
        flex-direction: column;
        align-items: stretch;
        padding: 0 1rem;
      }
      
      .btn-primary, .btn-secondary {
        justify-content: center;
      }
    }

    @media (max-width: 480px) {
      .stats-row {
        gap: 1rem;
      }
      
      .stat {
        min-width: 80px;
      }
      
      .stat-number {
        font-size: 1rem;
      }
      
      .feature {
        padding: 1.2rem;
      }
      
      .architecture-block {
        padding: 1.2rem;
      }
      
      .arch-item strong {
        font-size: 0.75rem;
      }
      
      .arch-item span {
        font-size: 0.65rem;
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
      <a href="/metrics?dashboard=true">📊 Metrics</a>
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
      <a href="/metrics?dashboard=true" class="btn-secondary">
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
      <div class="arch-item"><strong>Database</strong><span>MongoDB + Mongoose</span></div>
      <div class="arch-item"><strong>Caching</strong><span>Redis</span></div>
      <div class="arch-item"><strong>Job Queues</strong><span>BullMQ + Redis</span></div>
      <div class="arch-item"><strong>Security</strong><span>Helmet, CORS, XSS</span></div>
      <div class="arch-item"><strong>Testing</strong><span>Jest / Supertest</span></div>
      <div class="arch-item"><strong>Deployment</strong><span>Docker + PM2 / K8s</span></div>
    </div>
  </div>

  <!-- CTA for developers -->
  <div class="cta-section">
    <h3>Ready to integrate?</h3>
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
      <a href="/metrics?dashboard=true">Metrics</a>
      <a href="https://github.com/Vikiwest/nodejs-backend-toolkit" target="_blank">Contribute</a>
    </div>
  </footer>
</div>

<script>
  (function() {
    fetch('/health?format=json')
      .then(res => res.json())
      .then(data => {
        if (data && data.services) {
          const statusItems = document.querySelectorAll('.status-item');
          if (statusItems[0]) {
            const dbSpan = statusItems[0].querySelector('span:last-child');
            if (dbSpan) dbSpan.innerText = data.services.database === 'connected' ? 'connected' : 'disconnected';
          }
          if (statusItems[1]) {
            const cacheSpan = statusItems[1].querySelector('span:last-child');
            if (cacheSpan) cacheSpan.innerText = data.services.cache === 'operational' ? 'operational' : 'degraded';
          }
        }
      })
      .catch(() => {});
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
        if (req.query.format === 'json') {
          res.status(200).json(healthData);
        } else if (req.query.dashboard === 'true' || req.headers.accept?.includes('text/html')) {
          // Use these variables in the HTML template
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const uptimeFormatted = this.formatUptime(healthData.uptime);
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const memoryUsagePercent = Math.round((memoryMB.heapUsed / memoryMB.heapTotal) * 100);

          res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>🩺 System Health Dashboard | Node.js Backend Toolkit</title>
  <meta name="description" content="Real-time system health monitoring dashboard with service status, memory metrics, and uptime tracking.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap" rel="stylesheet">
  <style>
    /* Your existing styles here - they are already responsive */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(145deg, #f1f5f9 0%, #e6edf4 100%);
      color: #0f172a;
      line-height: 1.5;
      min-height: 100vh;
      padding: 2rem 1rem;
    }

    .dashboard-container {
      max-width: 1400px;
      margin: 0 auto;
    }

    /* Header Section */
    .health-header {
      text-align: center;
      margin-bottom: 2.5rem;
    }

    .health-header h1 {
      font-size: clamp(1.8rem, 6vw, 2.5rem);
      font-weight: 800;
      background: linear-gradient(135deg, #0f172a, #2563eb);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      letter-spacing: -0.02em;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      justify-content: center;
    }

    .health-sub {
      color: #475569;
      font-size: 1rem;
      margin-top: 0.5rem;
    }

    .timestamp-badge {
      display: inline-block;
      background: rgba(37, 99, 235, 0.1);
      backdrop-filter: blur(8px);
      padding: 0.4rem 1.2rem;
      border-radius: 100px;
      font-size: 0.8rem;
      font-weight: 500;
      color: #2563eb;
      margin-top: 1rem;
      border: 1px solid rgba(37, 99, 235, 0.2);
    }

    .auto-refresh-badge {
      font-size: 0.7rem;
      background: #eef2ff;
      border-radius: 20px;
      padding: 0.2rem 0.8rem;
      display: inline-block;
      margin-left: 0.75rem;
    }

    /* KPI Cards Grid - Responsive */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .kpi-card {
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(4px);
      border-radius: 28px;
      padding: 1.5rem;
      border: 1px solid rgba(255, 255, 255, 0.6);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
      transition: all 0.2s ease;
    }

    .kpi-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 20px 30px -12px rgba(0, 0, 0, 0.12);
      background: white;
    }

    .kpi-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }

    .kpi-icon {
      width: 48px;
      height: 48px;
      background: linear-gradient(145deg, #eff6ff, #e0e7ff);
      border-radius: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.6rem;
    }

    .kpi-title {
      font-size: 0.85rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #475569;
    }

    .kpi-value {
      font-size: clamp(1.5rem, 5vw, 2.2rem);
      font-weight: 800;
      color: #0f172a;
      line-height: 1.2;
      margin-top: 0.25rem;
      word-break: break-word;
    }

    .kpi-badge {
      font-size: 0.7rem;
      font-weight: 500;
      padding: 0.2rem 0.7rem;
      border-radius: 30px;
      display: inline-block;
      margin-top: 0.5rem;
    }

    .badge-success { background: #10b98120; color: #047857; border: 1px solid #10b98140; }
    .badge-warning { background: #f59e0b20; color: #b45309; border: 1px solid #f59e0b40; }
    .badge-info { background: #3b82f620; color: #1e40af; border: 1px solid #3b82f640; }

    /* Services Row - Responsive */
    .section-title {
      font-size: 1.3rem;
      font-weight: 600;
      margin: 2rem 0 1rem 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .services-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .service-item {
      background: white;
      border-radius: 20px;
      padding: 1rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
      border: 1px solid #e2e8f0;
      transition: all 0.2s;
      flex-wrap: wrap;
    }

    .service-status-led {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .led-green { background: #10b981; box-shadow: 0 0 6px #10b981; }
    .led-red { background: #ef4444; box-shadow: 0 0 6px #ef4444; }
    .led-yellow { background: #f59e0b; box-shadow: 0 0 6px #f59e0b; }

    .service-info {
      flex: 1;
    }

    .service-name {
      font-weight: 700;
      color: #0f172a;
    }

    .service-desc {
      font-size: 0.75rem;
      color: #64748b;
    }

    .service-status-text {
      font-size: 0.75rem;
      font-weight: 600;
    }

    /* Memory section - Responsive */
    .memory-panel {
      background: white;
      border-radius: 28px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      border: 1px solid #e2e8f0;
      box-shadow: 0 8px 18px rgba(0, 0, 0, 0.04);
    }

    .memory-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }

    .memory-title {
      font-weight: 700;
      font-size: 1.2rem;
    }

    .memory-total {
      font-size: 0.85rem;
      color: #3b82f6;
      font-weight: 600;
      word-break: break-word;
    }

    .metric-bars {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .metric-row {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    .metric-label {
      font-size: 0.8rem;
      font-weight: 500;
      color: #334155;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .bar-bg {
      background: #e2e8f0;
      border-radius: 12px;
      height: 8px;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      border-radius: 12px;
      width: 0%;
      transition: width 0.4s ease;
    }

    .fill-primary { background: linear-gradient(90deg, #2563eb, #3b82f6); }
    .fill-success { background: linear-gradient(90deg, #059669, #10b981); }
    .fill-info { background: linear-gradient(90deg, #0891b2, #06b6d4); }
    .fill-warning { background: linear-gradient(90deg, #d97706, #f59e0b); }

    /* System details - Responsive */
    .system-panel {
      background: white;
      border-radius: 28px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      border: 1px solid #e2e8f0;
    }

    .sys-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 1rem;
      margin-top: 0.5rem;
    }

    .sys-card {
      background: #f8fafc;
      border-radius: 20px;
      padding: 0.9rem;
      text-align: center;
      border: 1px solid #eef2ff;
    }

    .sys-card h4 {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #475569;
      margin-bottom: 0.5rem;
    }

    .sys-card p {
      font-weight: 700;
      font-size: 0.95rem;
      color: #0f172a;
      word-break: break-word;
    }

    /* Action buttons - Responsive */
    .action-bar {
      display: flex;
      justify-content: center;
      gap: 1rem;
      flex-wrap: wrap;
      margin: 2rem 0 1rem;
    }

    .action-btn {
      background: white;
      border: 1px solid #cbd5e1;
      padding: 0.7rem 1.2rem;
      border-radius: 40px;
      font-weight: 500;
      font-size: 0.85rem;
      color: #1e293b;
      text-decoration: none;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .action-btn:hover {
      background: #f1f5f9;
      border-color: #3b82f6;
      transform: translateY(-1px);
    }

    /* Footer */
    .footer-note {
      text-align: center;
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid #cbd5e180;
    }

    /* Responsive Breakpoints */
    @media (max-width: 768px) {
      body {
        padding: 1rem;
      }
      
      .kpi-value {
        font-size: 1.5rem;
      }
      
      .kpi-card {
        padding: 1rem;
      }
      
      .service-item {
        flex-direction: column;
        text-align: center;
      }
      
      .service-status-led {
        width: 16px;
        height: 16px;
      }
      
      .memory-header {
        flex-direction: column;
        align-items: flex-start;
      }
      
      .sys-grid {
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      }
      
      .action-bar {
        flex-direction: column;
        align-items: stretch;
      }
      
      .action-btn {
        justify-content: center;
      }
    }

    @media (max-width: 480px) {
      .kpi-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
      }
      
      .services-grid {
        grid-template-columns: 1fr;
      }
      
      .sys-grid {
        grid-template-columns: 1fr 1fr;
      }
      
      .health-header h1 {
        font-size: 1.5rem;
      }
      
      .timestamp-badge {
        font-size: 0.7rem;
        padding: 0.3rem 1rem;
      }
      
      .auto-refresh-badge {
        display: block;
        margin: 0.5rem auto 0;
        width: fit-content;
      }
    }

    /* Animations */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .kpi-card, .service-item, .memory-panel, .system-panel {
      animation: fadeIn 0.5s ease-out;
    }
  </style>
</head>
<body>
<div class="dashboard-container">
  <!-- Header -->
  <div class="health-header">
    <h1>
      <span>🩺</span> System Health Dashboard
    </h1>
    <div class="health-sub">Real-time monitoring & service observability</div>
    <div>
      <div class="timestamp-badge" id="liveTimestamp">Loading timestamp...</div>
      <div class="auto-refresh-badge">⟳ Auto‑refresh every 30s</div>
    </div>
  </div>

  <!-- KPI Cards will be injected dynamically -->
  <div class="kpi-grid" id="kpiGrid"></div>

  <!-- Services Status Section -->
  <div class="section-title">
    <span>🔌</span> Core Services
  </div>
  <div class="services-grid" id="servicesGrid"></div>

  <!-- Memory & Performance -->
  <div class="memory-panel" id="memoryPanel">
    <div class="memory-header">
      <div class="memory-title">📈 Memory & Resource Usage</div>
      <div class="memory-total" id="memorySummary">—</div>
    </div>
    <div class="metric-bars" id="metricBars"></div>
  </div>

  <!-- System Information -->
  <div class="system-panel">
    <div class="section-title" style="margin-top:0; margin-bottom:1rem;">🖥️ Platform & Runtime</div>
    <div class="sys-grid" id="systemGrid"></div>
  </div>

  <!-- Action Buttons -->
  <div class="action-bar">
    <a href="/health?format=json" class="action-btn">📄 Raw JSON</a>
    <a href="/metrics?dashboard=true" class="action-btn">📊 Metrics Dashboard</a>
    <a href="/api-docs" class="action-btn">📘 API Docs</a>
    <a href="/" class="action-btn">🏠 Back to Home</a>
  </div>
  <div class="footer-note">
    ⚡ Node.js Backend Toolkit — Enterprise Health Monitor • Data refreshes every 30 seconds
  </div>
</div>

<script>
  function formatUptime(seconds) {
    if (!seconds && seconds !== 0) return '0m';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return days + 'd ' + hours + 'h ' + minutes + 'm';
    if (hours > 0) return hours + 'h ' + minutes + 'm';
    return minutes + 'm';
  }

  async function fetchAndRender() {
    try {
      const response = await fetch('/health?format=json&_t=' + Date.now());
      if (!response.ok) throw new Error('Health endpoint error');
      const data = await response.json();

      const timestampElem = document.getElementById('liveTimestamp');
      if (timestampElem && data.timestamp) {
        const date = new Date(data.timestamp);
        timestampElem.innerText = '📅 Last check: ' + date.toLocaleString();
      }

      const overallStatus = data.status === 'healthy' ? 'Healthy' : 'Unhealthy';
      const statusBadgeClass = data.status === 'healthy' ? 'badge-success' : 'badge-warning';
      const uptimeFormatted = formatUptime(data.uptime);
      const memPercent = data.memory && data.memory.heapUsed && data.memory.heapTotal
        ? Math.round((data.memory.heapUsed / data.memory.heapTotal) * 100)
        : 0;

      const kpiHtml = '<div class="kpi-card">' +
        '<div class="kpi-header">' +
          '<div class="kpi-icon">✅</div>' +
          '<div><div class="kpi-title">Overall Status</div></div>' +
        '</div>' +
        '<div class="kpi-value">' + overallStatus + '</div>' +
        '<span class="kpi-badge ' + statusBadgeClass + '">System ' + data.status + '</span>' +
      '</div>' +
      '<div class="kpi-card">' +
        '<div class="kpi-header">' +
          '<div class="kpi-icon">⏱️</div>' +
          '<div><div class="kpi-title">Uptime</div></div>' +
        '</div>' +
        '<div class="kpi-value">' + uptimeFormatted + '</div>' +
        '<span class="kpi-badge badge-info">since last start</span>' +
      '</div>' +
      '<div class="kpi-card">' +
        '<div class="kpi-header">' +
          '<div class="kpi-icon">💾</div>' +
          '<div><div class="kpi-title">Heap Usage</div></div>' +
        '</div>' +
        '<div class="kpi-value">' + memPercent + '%</div>' +
        '<span class="kpi-badge ' + (memPercent > 80 ? 'badge-warning' : 'badge-success') + '">' + (data.memory ? data.memory.heapUsed : '?') + ' MB / ' + (data.memory ? data.memory.heapTotal : '?') + ' MB</span>' +
      '</div>' +
      '<div class="kpi-card">' +
        '<div class="kpi-header">' +
          '<div class="kpi-icon">🌍</div>' +
          '<div><div class="kpi-title">Environment</div></div>' +
        '</div>' +
        '<div class="kpi-value" style="font-size:1.3rem;">' + (data.environment || 'development') + '</div>' +
        '<span class="kpi-badge badge-info">Node ' + (data.system?.nodeVersion?.slice(0,5) || 'v18+') + '</span>' +
      '</div>';
      document.getElementById('kpiGrid').innerHTML = kpiHtml;

      const dbStatus = data.services?.database || 'unknown';
      const cacheStatus = data.services?.cache || 'unknown';
      let dbLed = 'led-green', dbText = 'Operational';
      if (dbStatus === 'disconnected') { dbLed = 'led-red'; dbText = 'Disconnected'; }
      else if (dbStatus === 'connected') { dbLed = 'led-green'; dbText = 'Connected'; }
      
      let cacheLed = 'led-green', cacheText = 'Operational';
      if (cacheStatus === 'failed') { cacheLed = 'led-red'; cacheText = 'Failed'; }
      else if (cacheStatus === 'operational') { cacheLed = 'led-green'; cacheText = 'Operational'; }
      
      const servicesHtml = '<div class="service-item">' +
        '<div class="service-status-led ' + dbLed + '"></div>' +
        '<div class="service-info">' +
          '<div class="service-name">MongoDB Database</div>' +
          '<div class="service-desc">Primary data store</div>' +
        '</div>' +
        '<div class="service-status-text" style="color:' + (dbStatus === 'connected' ? '#10b981' : '#ef4444') + '">' + dbText + '</div>' +
      '</div>' +
      '<div class="service-item">' +
        '<div class="service-status-led ' + cacheLed + '"></div>' +
        '<div class="service-info">' +
          '<div class="service-name">Redis Cache</div>' +
          '<div class="service-desc">Session & queue backend</div>' +
        '</div>' +
        '<div class="service-status-text" style="color:' + (cacheStatus === 'operational' ? '#10b981' : '#ef4444') + '">' + cacheText + '</div>' +
      '</div>' +
      '<div class="service-item">' +
        '<div class="service-status-led led-green"></div>' +
        '<div class="service-info">' +
          '<div class="service-name">BullMQ Queue</div>' +
          '<div class="service-desc">Background jobs</div>' +
        '</div>' +
        '<div class="service-status-text" style="color:#10b981">Active</div>' +
      '</div>' +
      '<div class="service-item">' +
        '<div class="service-status-led led-green"></div>' +
        '<div class="service-info">' +
          '<div class="service-name">WebSocket Server</div>' +
          '<div class="service-desc">Real-time connections</div>' +
        '</div>' +
        '<div class="service-status-text" style="color:#10b981">Online</div>' +
      '</div>';
      document.getElementById('servicesGrid').innerHTML = servicesHtml;

      const mem = data.memory || { rss: 0, heapTotal: 0, heapUsed: 0, external: 0 };
      const rssMB = mem.rss || 0;
      const heapTotalMB = mem.heapTotal || 1;
      const heapUsedMB = mem.heapUsed || 0;
      const externalMB = mem.external || 0;
      
      const heapPercent = Math.min(100, Math.round((heapUsedMB / heapTotalMB) * 100));
      const rssPercent = Math.min(100, Math.round((rssMB / (heapTotalMB * 1.5)) * 100));
      const externalPercent = Math.min(100, Math.round((externalMB / heapTotalMB) * 100));
      
      document.getElementById('memorySummary').innerHTML = '🔹 Heap ' + heapUsedMB + ' MB / ' + heapTotalMB + ' MB &nbsp;| RSS ' + rssMB + ' MB';
      
      const metricHtml = '<div class="metric-row">' +
        '<div class="metric-label"><span>📦 RSS (Resident Set)</span><span>' + rssMB + ' MB</span></div>' +
        '<div class="bar-bg"><div class="bar-fill fill-primary" style="width: ' + rssPercent + '%;"></div></div>' +
      '</div>' +
      '<div class="metric-row">' +
        '<div class="metric-label"><span>🧠 Heap Used</span><span>' + heapUsedMB + ' MB / ' + heapTotalMB + ' MB</span></div>' +
        '<div class="bar-bg"><div class="bar-fill fill-success" style="width: ' + heapPercent + '%;"></div></div>' +
      '</div>' +
      '<div class="metric-row">' +
        '<div class="metric-label"><span>📤 External Memory</span><span>' + externalMB + ' MB</span></div>' +
        '<div class="bar-bg"><div class="bar-fill fill-info" style="width: ' + externalPercent + '%;"></div></div>' +
      '</div>' +
      '<div class="metric-row">' +
        '<div class="metric-label"><span>⚙️ Heap Total Limit</span><span>' + heapTotalMB + ' MB</span></div>' +
        '<div class="bar-bg"><div class="bar-fill fill-warning" style="width: 100%;"></div></div>' +
      '</div>';
      document.getElementById('metricBars').innerHTML = metricHtml;

      const sys = data.system || {};
      const sysHtml = '<div class="sys-card"><h4>Platform</h4><p>' + (sys.platform || 'linux') + '</p></div>' +
        '<div class="sys-card"><h4>Architecture</h4><p>' + (sys.arch || 'x64') + '</p></div>' +
        '<div class="sys-card"><h4>Node Version</h4><p>' + (sys.nodeVersion || '20.x') + '</p></div>' +
        '<div class="sys-card"><h4>Environment</h4><p>' + (data.environment || 'development') + '</p></div>';
      document.getElementById('systemGrid').innerHTML = sysHtml;
      
    } catch (error) {
      console.error('Health fetch error:', error);
      document.getElementById('kpiGrid').innerHTML = '<div class="kpi-card" style="grid-column:1/-1; text-align:center; color:#ef4444;">⚠️ Failed to load health data. Make sure server is running.</div>';
      document.getElementById('servicesGrid').innerHTML = '<div class="service-item">Unable to fetch service status</div>';
    }
  }

  fetchAndRender();
  setInterval(fetchAndRender, 30000);
</script>
</body>
</html>`);
        } else {
          res.status(200).json(healthData);
        }
      } catch (error) {
        logger.error('Health check failed', error as Error);

        if (req.query.format === 'json') {
          res.status(503).json({
            success: false,
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Service unavailable',
          });
        } else if (req.query.dashboard === 'true' || req.headers.accept?.includes('text/html')) {
          res.status(503).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>❌ System Health - Error</title>
  <style>
    body { font-family: 'Inter', sans-serif; text-align: center; padding: 50px; background: #f8fafc; }
    .error { color: #ef4444; font-size: 2rem; margin: 20px 0; }
    .message { color: #64748b; font-size: 1.1rem; }
    @media (max-width: 640px) {
      body { padding: 20px; }
      .error { font-size: 1.5rem; }
    }
  </style>
</head>
<body>
  <h1>❌ System Health Check Failed</h1>
  <div class="error">Service Unavailable</div>
  <div class="message">The system is currently experiencing issues. Please check the logs for more details.</div>
  <br>
  <a href="/health?format=json">View JSON Response</a> | <a href="/">Back to Home</a>
</body>
</html>`);
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

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        message: `Cannot ${req.method} ${req.url}`,
        timestamp: new Date().toISOString(),
      });
    });
  }

  private formatUptime(seconds: number): string {
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
