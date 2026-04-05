import axios from 'axios';
import crypto from 'node:crypto';
import { WebhookModel } from '../models/webhook.model';
import { queueService } from './queueService';
import { LoggerService } from '../utils/logger';

export class WebhookService {
  static async trigger(event: string, payload: any) {
    try {
      const webhooks = await WebhookModel.find({ events: event, isActive: true });

      for (const webhook of webhooks) {
        try {
          const signature = crypto
            .createHmac('sha256', webhook.secret)
            .update(JSON.stringify(payload))
            .digest('hex');

          await axios.post(webhook.url, payload, {
            headers: {
              'X-Webhook-Signature': signature,
              'Content-Type': 'application/json',
            },
            timeout: 5000,
          });

          await WebhookModel.findByIdAndUpdate(webhook._id, {
            lastTriggered: new Date(),
            failureCount: 0,
          });

          LoggerService.info(`Webhook triggered: ${webhook.name}`);
        } catch (error) {
          LoggerService.error(`Webhook ${webhook.name} failed`, error as Error);

          await WebhookModel.findByIdAndUpdate(webhook._id, {
            $inc: { failureCount: 1 },
          });

          // Queue retry
          if (webhook.failureCount < webhook.retryCount) {
            await queueService.addJob('webhook-retry', {
              type: 'webhook-retry',
              webhookId: webhook._id.toString(),
              data: payload,
              attempt: (webhook.failureCount || 0) + 1,
            });
          }
        }
      }
    } catch (error) {
      LoggerService.error('Webhook trigger error', error as Error);
    }
  }
}
