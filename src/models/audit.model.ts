import { Schema, model, Document } from 'mongoose';

export interface IAuditLog extends Document {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: any;
  ip?: string;
  userAgent?: string;
  metadata?: any;
  timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    resource: {
      type: String,
      required: true,
      index: true,
    },
    resourceId: {
      type: String,
      index: true,
    },
    changes: {
      type: Schema.Types.Mixed,
    },
    ip: String,
    userAgent: String,
    metadata: Schema.Types.Mixed,
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

// Compound indexes for better query performance
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

export const AuditModel = model<IAuditLog>('AuditLog', auditLogSchema);