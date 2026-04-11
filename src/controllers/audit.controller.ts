import { Response } from 'express';
import { AuditModel } from '../models/audit.model';
import { ApiResponseUtil } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthRequest } from '../types';
import { Parser } from 'json2csv';

// Transform logs to include helpful metadata for frontend developers
const enrichAuditLog = (log: any, baseUrl: string = '/api/audit') => {
  const doc = log.toObject ? log.toObject() : log;
  return {
    ...doc,
    logId: doc._id.toString(), // Explicit ID field for fetching this log
    _links: {
      self: {
        href: `${baseUrl}/${doc._id.toString()}`,
        method: 'GET',
        description: 'Fetch this audit log',
      },
    },
  };
};

// Build userId filter - normalize to string format
const buildUserIdFilter = (userId: any) => {
  // Ensure userId is string format (req.params always gives string)
  return { userId: String(userId) };
};

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

    const enrichedLogs = logs.map((log) => enrichAuditLog(log));
    ApiResponseUtil.paginated(res, enrichedLogs, total, Number(page), Number(limit));
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
    ApiResponseUtil.success(res, enrichAuditLog(log));
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
        'logId',
        'timestamp',
        'userId.name',
        'userId.email',
        'action',
        'resource',
        'resourceId',
        'ip',
        'userAgent',
      ];
      const enrichedForCsv = logs.map((log) => ({ ...log, logId: log._id.toString() }));
      const json2csv = new Parser({ fields });
      const csv = json2csv.parse(enrichedForCsv);

      res.header('Content-Type', 'text/csv');
      res.attachment(`audit-logs-${Date.now()}.csv`);
      return res.send(csv);
    } else {
      const enrichedLogs = logs.map((log) => enrichAuditLog(log));
      res.header('Content-Type', 'application/json');
      res.attachment(`audit-logs-${Date.now()}.json`);
      return res.send(JSON.stringify(enrichedLogs, null, 2));
    }
  });

  static getUserAuditLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;
    const { page = 1, limit = 20, sortBy = 'timestamp', sortOrder = 'desc' } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const sort: any = { [sortBy as string]: sortOrder === 'desc' ? -1 : 1 };

    const userIdFilter = buildUserIdFilter(userId);

    const [logs, total] = await Promise.all([
      AuditModel.find(userIdFilter)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .populate('userId', 'name email'),
      AuditModel.countDocuments(userIdFilter),
    ]);

    const enrichedLogs = logs.map((log) => enrichAuditLog(log));
    ApiResponseUtil.paginated(res, enrichedLogs, total, Number(page), Number(limit));
  });

  static getResourceAuditLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { type, id } = req.params;
    const { page = 1, limit = 20, sortBy = 'timestamp', sortOrder = 'desc' } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const sort: any = { [sortBy as string]: sortOrder === 'desc' ? -1 : 1 };

    // Build flexible resource filter - ensure resourceId is string format
    const filter: any = { resource: type, resourceId: String(id) };

    const [logs, total] = await Promise.all([
      AuditModel.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .populate('userId', 'name email'),
      AuditModel.countDocuments(filter),
    ]);

    const enrichedLogs = logs.map((log) => enrichAuditLog(log));
    ApiResponseUtil.paginated(res, enrichedLogs, total, Number(page), Number(limit));
  });

  static cleanupAuditLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
    const days = Number(req.query.days ?? 30); // Changed default from 90 to 30 days
    if (!Number.isFinite(days) || days < 1) {
      return ApiResponseUtil.badRequest(res, 'The days query parameter must be a positive integer');
    }

    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const filter = {
      $or: [
        { timestamp: { $lt: cutoff } },
        { createdAt: { $lt: cutoff } },
        {
          $expr: {
            $lt: [{ $toDate: '$_id' }, cutoff],
          },
        },
      ],
    };

    const matchingCount = await AuditModel.countDocuments(filter);
    const result = await AuditModel.deleteMany(filter);

    ApiResponseUtil.success(
      res,
      {
        deletedCount: result.deletedCount ?? 0,
        matchingCount,
        cutoff: cutoff.toISOString(),
      },
      'Cleanup completed'
    );
  });
}
