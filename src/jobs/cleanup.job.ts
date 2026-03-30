import { queueService } from '@/services/queueService';
import { AuditModel } from '@/models/audit.model';
import { LoggerService } from '@/utils/logger';

export class CleanupJobs {
  static setup(): void {
    // Listen for cleanup jobs instead of processQueue
    queueService.on('job:cleanup-audit-logs', async (job: any) => {
      const { daysToKeep = 90 } = job.data.payload;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // Note: MongoDB not connected in this in-memory simulation
      LoggerService.info(
        `Cleanup audit logs older than ${daysToKeep} days (MongoDB: ${cutoffDate.toISOString()})`
      );
      return { simulated: true, cutoff: cutoffDate.toISOString() };
    });

    queueService.on('job:cleanup-sessions', async (job: any) => {
      LoggerService.info('Cleaning up expired sessions (simulated)');
      return { cleaned: 0, simulated: true };
    });

    queueService.on('job:cleanup-temp-files', async (job: any) => {
      LoggerService.info('Cleaning up temporary files (simulated)');
      return { cleaned: 0, simulated: true };
    });
  }
}
