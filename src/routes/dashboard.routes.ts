import { Router } from 'express';
import Joi from 'joi';
import { DashboardController } from '../controllers/dashboard.controller';
import { authMiddleware, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

// All dashboard routes require admin authentication
router.use(authMiddleware());
router.use(requireRole('admin', 'super_admin'));

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     description: Aggregate stats (users, payments, activity)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: number
 *                     activeUsers:
 *                       type: number
 *                     totalPayments:
 *                       type: number
 *                     revenue:
 *                       type: number
 *                     recentActivity:
 *                       type: array
 */
router.get('/stats', DashboardController.getStats);

/**
 * @swagger
 * /api/dashboard/realtime:
 *   get:
 *     summary: Get real-time metrics
 *     description: Live metrics (active users, current load)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Real-time data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     activeUsers:
 *                       type: number
 *                     currentLoad:
 *                       type: number
 *                     queueLength:
 *                       type: number
 *                     memoryUsage:
 *                       type: number
 */
router.get('/realtime', DashboardController.getRealtime);

/**
 * @swagger
 * /api/dashboard/activity:
 *   get:
 *     summary: Get recent activity
 *     description: Last 24h user actions and system events
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           default: '24h'
 *     responses:
 *       200:
 *         description: Activity log
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                       user:
 *                         type: string
 *                       action:
 *                         type: string
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 */
router.get('/activity', DashboardController.getActivity);

/**
 * @swagger
 * /api/dashboard/users-growth:
 *   get:
 *     summary: Get user growth data
 *     description: User signups growth over time
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: Growth data points
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                       count:
 *                         type: number
 */
router.get(
  '/users-growth',
  validate({
    query: Joi.object({
      days: Joi.number().default(30),
    }),
  }),
  DashboardController.getUsersGrowth
);

/**
 * @swagger
 * /api/dashboard/api-usage:
 *   get:
 *     summary: Get API usage statistics
 *     description: Endpoint usage stats and trends
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           default: '30d'
 *     responses:
 *       200:
 *         description: Usage breakdown
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     endpoints:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           path:
 *                             type: string
 *                           method:
 *                             type: string
 *                           count:
 *                             type: number
 *                           avgResponseTime:
 *                             type: number
 */
router.get('/api-usage', DashboardController.getApiUsage);

/**
 * @swagger
 * /api/dashboard/errors:
 *   get:
 *     summary: Get error statistics
 *     description: Last errors and exceptions
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Error list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       message:
 *                         type: string
 *                       stack:
 *                         type: string
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                       url:
 *                         type: string
 *                       method:
 *                         type: string
 */
router.get('/errors', DashboardController.getErrors);

export default router;
