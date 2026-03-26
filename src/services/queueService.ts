import Queue from 'bull';
import Redis from 'ioredis';
import config from '@/config/env';
import { LoggerService } from '@/utils/logger';
import { JobData } from '@/types';

export class QueueService {
  private queues: Map<string, Queue.Queue> = new Map();
  private redisClient: Redis;

  constructor() {
    this.redisClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
    });
  }

  createQueue(name: string, defaultOptions?: Queue.QueueOptions): Queue.Queue {
    if (this.queues.has(name)) {
      return this.queues.get(name)!;
    }

    const queue = new Queue(name, {
      redis: {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
        ...defaultOptions,
      },
    });

    this.queues.set(name, queue);
    return queue;
  }

  async addJob(queueName: string, data: JobData): Promise<Queue.Job> {
    const queue = this.createQueue(queueName);
    return await queue.add(data, data.options);
  }

  async processQueue(
    queueName: string,
    handler: (job: Queue.Job) => Promise<any>
  ): Promise<void> {
    const queue = this.createQueue(queueName);
    queue.process(async (job) => {
      try {
        LoggerService.info(`Processing job ${job.id} from ${queueName}`);
        const result = await handler(job);
        LoggerService.info(`Job ${job.id} completed successfully`);
        return result;
      } catch (error) {
        LoggerService.error(`Job ${job.id} failed`, error as Error);
        throw error;
      }
    });
  }

  async getQueueMetrics(queueName: string): Promise<any> {
    const queue = this.createQueue(queueName);
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  async cleanQueue(queueName: string, gracePeriod: number = 3600000): Promise<void> {
    const queue = this.createQueue(queueName);
    await queue.clean(gracePeriod, 'completed');
    await queue.clean(gracePeriod, 'failed');
  }

  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.createQueue(queueName);
    await queue.pause();
    LoggerService.info(`Queue ${queueName} paused`);
  }

  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.createQueue(queueName);
    await queue.resume();
    LoggerService.info(`Queue ${queueName} resumed`);
  }
}

export const queueService = new QueueService();