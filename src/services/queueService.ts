import { EventEmitter } from 'events';
import { LoggerService } from '../utils/logger';
import { JobData } from '../types';

interface Job<T = any> {
  id: string;
  name: string;
  data: T;
  options: any;
  processedAt?: number;
  result?: any;
  failed?: boolean;
}

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

export class QueueService extends EventEmitter {
  private queues: Map<string, Job[]> = new Map();
  private activeJobs: Set<string> = new Set();

  constructor() {
    super();
  }

  async addJob(queueName: string, data: JobData): Promise<Job> {
    const jobId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const job: Job = {
      id: jobId,
      name: queueName,
      data: data.data,
      options: data.options || {},
    };

    if (!this.queues.has(queueName)) {
      this.queues.set(queueName, []);
    }

    this.queues.get(queueName)!.unshift(job); // Add to front for immediate processing
    LoggerService.info(`Job ${jobId} added to queue ${queueName}`);

    // Auto-process if no active jobs in queue
    if (!this.activeJobs.has(jobId) && this.queues.get(queueName)!.length === 1) {
      this.processNext(queueName);
    }

    return job;
  }

  private async processNext(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue || queue.length === 0) return;

    const job = queue.shift()!; // Take first job
    this.activeJobs.add(job.id);

    try {
      // Simulate async processing
      await new Promise((resolve) => setImmediate(resolve));

      // Emit for job handlers to catch
      this.emit(`job:${queueName}`, job);

      job.processedAt = Date.now();
      job.result = 'completed'; // Placeholder

      LoggerService.info(`Job ${job.id} from ${queueName} completed`);
      this.emit('job:completed', job);
    } catch (error) {
      job.failed = true;
      job.result = error;
      LoggerService.error(`Job ${job.id} from ${queueName} failed`, error as Error);
      this.emit('job:failed', job);
    } finally {
      this.activeJobs.delete(job.id);
      // Process next
      this.processNext(queueName);
    }
  }

  async getQueueMetrics(queueName: string): Promise<QueueStats> {
    const queue = this.queues.get(queueName) || [];
    return {
      waiting: queue.filter((j) => !j.processedAt).length,
      active: 0, // Single threaded simulation
      completed: queue.filter((j) => j.processedAt && !j.failed).length,
      failed: queue.filter((j) => j.failed).length,
    };
  }

  async cleanQueue(queueName: string, maxAgeMs: number = 3600000): Promise<void> {
    const queue = this.queues.get(queueName) || [];
    const now = Date.now();
    const surviving = queue.filter((job) => now - (job.processedAt || 0) < maxAgeMs);
    this.queues.set(queueName, surviving);
    LoggerService.info(`Queue ${queueName} cleaned, kept ${surviving.length} jobs`);
  }

  async pauseQueue(queueName: string): Promise<void> {
    // In-memory pause not needed for this simulation
    LoggerService.info(`Queue ${queueName} pause requested (in-memory)`);
  }

  async resumeQueue(queueName: string): Promise<void> {
    LoggerService.info(`Queue ${queueName} resumed (in-memory)`);
  }
}

export const queueService = new QueueService();
