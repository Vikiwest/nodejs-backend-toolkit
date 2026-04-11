import { Router, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import config from '../config/env';

const router = Router();

console.log('🔵 MONITORING ROUTES FILE IS BEING LOADED');

// Simple stubs for health checks
const checkDatabase = async () => true;
const checkRedis = async () => true;
const checkQueue = async () => true;
const getCacheStats = () => ({ hits: 0, misses: 0, connected: true });

/**
 * @swagger
 * /monitoring/health:
 *   get:
 *     summary: Basic health check
 *     description: Simple OK response for load balancers.
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get(
  '/health',
  asyncHandler(async (req, res) => {
    console.log('✅ /health endpoint hit');
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
  })
);

/**
 * @swagger
 * /monitoring/health/detailed:
 *   get:
 *     summary: Detailed health check
 *     description: Full system health with services status.
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Health report
 *       503:
 *         description: Degraded
 */
router.get(
  '/health/detailed',
  asyncHandler(async (req, res) => {
    console.log('✅ /health/detailed endpoint hit');
    const [db, redis, queue] = await Promise.all([checkDatabase(), checkRedis(), checkQueue()]);

    const health = {
      status: db && redis && queue ? 'healthy' : 'degraded',
      services: {
        database: db ? 'OK' : 'ERROR',
        redis: redis ? 'OK' : 'ERROR',
        queue: queue ? 'OK' : 'ERROR',
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
      app: config.appName,
    };

    res.status(db && redis && queue ? 200 : 503).json(health);
  })
);

/**
 * @swagger
 * /monitoring/metrics:
 *   get:
 *     summary: Prometheus metrics
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Metrics
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 */
router.get(
  '/metrics',
  asyncHandler(async (req, res: Response) => {
    console.log('✅ /metrics endpoint hit');
    res.set('Content-Type', 'text/plain');
    res.send(
      `
# HELP node_http_requests_total Total HTTP requests
# TYPE node_http_requests_total counter
node_http_requests_total 0
# HELP node_memory_usage_bytes Node memory usage
# TYPE node_memory_usage_bytes gauge
node_memory_usage_bytes{type="heapUsed"} ${process.memoryUsage().heapUsed}
node_memory_usage_bytes{type="external"} ${process.memoryUsage().external}
`.trim()
    );
  })
);

/**
 * @swagger
 * /monitoring/ready:
 *   get:
 *     summary: Readiness probe
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Ready
 */
router.get(
  '/ready',
  asyncHandler(async (req, res) => {
    console.log('✅ /ready endpoint hit');
    res.status(200).json({ status: 'ready' });
  })
);

/**
 * @swagger
 * /live:
 *   get:
 *     summary: Liveness probe
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Live
 */
router.get(
  '/live',
  asyncHandler(async (req, res) => {
    console.log('✅ /live endpoint hit');
    res.status(200).json({ status: 'live' });
  })
);

/**
 * @swagger
 * /monitoring/redis:
 *   get:
 *     summary: Redis status
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Redis OK
 *       503:
 *         description: Redis error
 */
router.get(
  '/redis',
  asyncHandler(async (req, res) => {
    const ok = await checkRedis();
    res.status(ok ? 200 : 503).json({ redis: ok ? 'OK' : 'ERROR' });
  })
);

/**
 * @swagger
 * /monitoring/mongodb:
 *   get:
 *     summary: MongoDB status
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: MongoDB OK
 *       503:
 *         description: MongoDB error
 */
router.get(
  '/mongodb',
  asyncHandler(async (req, res) => {
    const ok = await checkDatabase();
    res.status(ok ? 200 : 503).json({ mongodb: ok ? 'OK' : 'ERROR' });
  })
);

/**
 * @swagger
 * /monitoring/queue:
 *   get:
 *     summary: Queue status
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Queue OK
 *       503:
 *         description: Queue error
 */
router.get(
  '/queue',
  asyncHandler(async (req, res) => {
    const ok = await checkQueue();
    res.status(ok ? 200 : 503).json({ queue: ok ? 'OK' : 'ERROR' });
  })
);

/**
 * @swagger
 * /monitoring/cache-stats:
 *   get:
 *     summary: Cache statistics
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Cache stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hits:
 *                   type: number
 *                 misses:
 *                   type: number
 *                 connected:
 *                   type: boolean
 */
router.get(
  '/cache-stats',
  asyncHandler(async (req, res) => {
    const stats = getCacheStats();
    res.json(stats);
  })
);

export default router;
