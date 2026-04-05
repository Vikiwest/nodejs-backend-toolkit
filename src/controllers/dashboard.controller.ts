import { Response } from 'express';
import { UserModel } from '../models/user.model';
import { AuditModel } from '../models/audit.model';
import { ApiResponseUtil } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthRequest } from '../types';

export class DashboardController {
  /**
   * @swagger
   * /api/dashboard/stats:
   *   get:
   *     summary: Get dashboard statistics
   *     tags: [Dashboard]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Dashboard stats
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
   * /api/dashboard/realtime:
   *   get:
   *     summary: Get real-time metrics
   *     tags: [Dashboard]
   */
  static getRealtime = asyncHandler(async (_req: AuthRequest, res: Response) => {
    // Stub - websocket or recent activity
    ApiResponseUtil.success(res, {
      activeConnections: 0,
      recentRequests: 0,
      timestamp: new Date().toISOString(),
    });
  });

  static getActivity = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Recent audit logs
    const recent = await AuditModel.find()
      .sort({ timestamp: -1 })
      .limit(50)
      .populate('userId', 'name email');

    ApiResponseUtil.success(res, recent);
  });

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

  static getApiUsage = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Stub - from metrics
    ApiResponseUtil.success(res, { endpoints: [], calls: 0 });
  });

  static getErrors = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Stub - from logs
    ApiResponseUtil.success(res, { errors: [] });
  });
}
