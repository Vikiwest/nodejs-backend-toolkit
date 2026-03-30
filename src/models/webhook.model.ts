import { Schema, model } from 'mongoose';

const webhookSchema = new Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    events: [{ type: String, required: true }],
    secret: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    retryCount: { type: Number, default: 3 },
    lastTriggered: Date,
    failureCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const WebhookModel = model('Webhook', webhookSchema);
