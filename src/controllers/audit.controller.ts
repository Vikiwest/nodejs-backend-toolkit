import { Response } from 'express';
import { AuditModel } from '@/models/audit.model';
import { ApiResponseUtil } from '@/utils/apiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { AuthRequest } from '@/types';
import { Parser } from 'json2csv';

export class AuditController {
  static getAuditLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
    const {
      page = 1,
      limit = 20,
      sortBy = 'timestamp',
      sortOrder = 'desc',
      userId,
      action,
      resource,
      startDate,
      endDate,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const sort: any = { [sortBy as string]: sortOrder === 'desc' ? -1 : 1 };

    // Build filter
    const filter: any = {};
    if (userId) filter.userId = userId;
    if (action) filter.action = action;
    if (resource) filter.resource = resource;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate as string);
      if (endDate) filter.timestamp.$lte = new Date(endDate as string);
    }

    const [logs, total] = await Promise.all([
      AuditModel.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .populate('userId', 'name email'),
      AuditModel.countDocuments(filter),
    ]);

    ApiResponseUtil.paginated(res, logs, total, Number(page), Number(limit));
  });

  static getAuditStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalLogs, actionsByType, topUsers] = await Promise.all([
      AuditModel.countDocuments({ timestamp: { $gte: thirtyDaysAgo } }),
      AuditModel.aggregate([
        { $match: { timestamp: { $gte: thirtyDaysAgo } } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      AuditModel.aggregate([
        { $match: { timestamp: { $gte: thirtyDaysAgo } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        { $project: { userId: '$_id', name: '$user.name', email: '$user.email', count: 1 } },
      ]),
    ]);

    ApiResponseUtil.success(res, {
      totalLogs,
      actionsByType,
      topUsers,
      period: 'Last 30 days',
    });
  });

  static getAuditLogById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const log = await AuditModel.findById(id).populate('userId', 'name email');
    if (!log) {
      return ApiResponseUtil.notFound(res, 'Audit log not found');
    }
    ApiResponseUtil.success(res, log);
  });

  static exportAuditLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { startDate, endDate, format = 'csv' } = req.query;

    const filter: any = {};
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate as string);
      if (endDate) filter.timestamp.$lte = new Date(endDate as string);
    }

    const logs = await AuditModel.find(filter)
      .sort({ timestamp: -1 })
      .populate('userId', 'name email')
      .lean();

    if (format === 'csv') {
      const fields = [
        'timestamp',
        'userId.name',
        'userId.email',
        'action',
        'resource',
        'resourceId',
        'ip',
        'userAgent',
      ];
      const json2csv = new Parser({ fields });
      const csv = json2csv.parse(logs);

      res.header('Content-Type', 'text/csv');
      res.attachment(`audit-logs-${Date.now()}.csv`);
      return res.send(csv);
    } else {
      res.header('Content-Type', 'application/json');
      res.attachment(`audit-logs-${Date.now()}.json`);
      return res.send(JSON.stringify(logs, null, 2));
    }
  });

  static getUserAuditLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;
    const { page = 1, limit = 20, sortBy = 'timestamp', sortOrder = 'desc' } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const sort: any = { [sortBy as string]: sortOrder === 'desc' ? -1 : 1 };

    const [logs, total] = await Promise.all([
      AuditModel.find({ userId }).sort(sort).skip(skip).limit(Number(limit)),
      AuditModel.countDocuments({ userId }),
    ]);

    ApiResponseUtil.paginated(res, logs, total, Number(page), Number(limit));
  });

  static getResourceAuditLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { type, id } = req.params;
    const { page = 1, limit = 20, sortBy = 'timestamp', sortOrder = 'desc' } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const sort: any = { [sortBy as string]: sortOrder === 'desc' ? -1 : 1 };

    const filter: any = { resource: type, resourceId: id };

    const [logs, total] = await Promise.all([
      AuditModel.find(filter).sort(sort).skip(skip).limit(Number(limit)),
      AuditModel.countDocuments(filter),
    ]);

    ApiResponseUtil.paginated(res, logs, total, Number(page), Number(limit));
  });

  static cleanupAuditLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { days = 90 } = req.query;
    const cutoff = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

    const result = await AuditModel.deleteMany({ timestamp: { $lt: cutoff } });

    ApiResponseUtil.success(res, { deletedCount: result.deletedCount ?? 0 }, 'Cleanup completed');
  });
}
