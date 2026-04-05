import { AuditModel } from '@/models/audit.model';
import { Request } from 'express';
import { LoggerService } from '@/utils/logger';

interface AuditLogData {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: any;
  req?: Request;
  metadata?: any;
}

export class AuditService {
  async log(data: AuditLogData): Promise<void> {
    try {
      const auditEntry = {
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        changes: data.changes,
        ip: data.req?.ip || data.req?.socket.remoteAddress,
        userAgent: data.req?.headers['user-agent'],
        metadata: data.metadata,
        timestamp: new Date(),
      };

      await AuditModel.create(auditEntry);
    } catch (error) {
      // Don't let audit logging failure affect the main operation
      LoggerService.error('Failed to create audit log', error as Error);
    }
  }

  async getAuditTrail(resource: string, resourceId: string): Promise<any[]> {
    return await AuditModel.find({ resource, resourceId })
      .sort({ timestamp: -1 })
      .populate('userId', 'name email')
      .lean();
  }

  async getUserActivity(userId: string, days: number = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const activities = await AuditModel.aggregate([
      { $match: { userId, timestamp: { $gte: startDate } } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const timeline = await AuditModel.aggregate([
      { $match: { userId, timestamp: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          count: { $sum: 1 },
          actions: { $push: '$action' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return { activities, timeline, period: `${days} days` };
  }
}

export const auditService = new AuditService();
