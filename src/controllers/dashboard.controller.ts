import { Response } from 'express';
import { UserModel } from '../models/user.model';
import { AuditModel } from '../models/audit.model';
import { ApiResponseUtil } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthRequest } from '../types';

export class DashboardController {
  /**
   * @swagger
   * /dashboard/stats:
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

  static getStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalUsers, activeUsers, verifiedUsers, usersLast30Days, totalAuditLogs] =
      await Promise.all([
        UserModel.countDocuments({ isDeleted: false }),
        UserModel.countDocuments({ isActive: true, isDeleted: false }),
        UserModel.countDocuments({ isEmailVerified: true, isDeleted: false }),
        UserModel.countDocuments({ createdAt: { $gte: thirtyDaysAgo }, isDeleted: false }),
        AuditModel.countDocuments({ timestamp: { $gte: thirtyDaysAgo } }),
      ]);

    ApiResponseUtil.success(res, {
      users: {
        total: totalUsers,
        active: activeUsers,
        verified: verifiedUsers,
        new30Days: usersLast30Days,
      },
      auditLogs: totalAuditLogs,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * @swagger
   * /dashboard/realtime:
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

  static getRealtime = asyncHandler(async (_req: AuthRequest, res: Response) => {
    // Stub - websocket or recent activity
    ApiResponseUtil.success(res, {
      activeConnections: 0,
      recentRequests: 0,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * @swagger
   * /dashboard/activity:
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

  static getActivity = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Recent audit logs
    const recent = await AuditModel.find()
      .sort({ timestamp: -1 })
      .limit(50)
      .populate('userId', 'name email');

    ApiResponseUtil.success(res, recent);
  });

  /**
   * @swagger
   * /dashboard/users-growth:
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

  static getUsersGrowth = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { days = 30 } = req.query as any;

    const growth = await UserModel.aggregate([
      {
        $match: { createdAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    ApiResponseUtil.success(res, growth);
  });

  /**
   * @swagger
   * /dashboard/api-usage:
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

  static getApiUsage = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Stub - from metrics
    ApiResponseUtil.success(res, { endpoints: [], calls: 0 });
  });

  /**
   * @swagger
   * /dashboard/errors:
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

  static getErrors = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Stub - from logs
    ApiResponseUtil.success(res, { errors: [] });
  });
}
