import { AuditModel } from '@/models/audit.model';
import { UserModel } from '@/models/user.model';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

describe('Audit Controller - Unit Tests', () => {
  let testUserId: string;

  beforeAll(async () => {
    const user = await UserModel.create({
      name: 'Audit Test User',
      email: 'audittest@example.com',
      password: 'password123',
      role: 'user',
    });
    testUserId = user._id.toString();

    // Create test audit logs
    await AuditModel.create([
      {
        userId: testUserId,
        action: 'LOGIN',
        resource: 'AUTH',
        resourceId: testUserId,
        description: 'User logged in',
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
      },
      {
        userId: testUserId,
        action: 'UPDATE_PROFILE',
        resource: 'USER',
        resourceId: testUserId,
        description: 'User updated profile',
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
      },
      {
        userId: testUserId,
        action: 'DELETE_ACCOUNT',
        resource: 'USER',
        resourceId: testUserId,
        description: 'User requested account deletion',
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
      },
    ]);
  });

  afterAll(async () => {
    await AuditModel.deleteMany({ userId: testUserId });
    await UserModel.deleteOne({ _id: testUserId });
  });

  describe('Audit Log Retrieval', () => {
    it('should retrieve audit logs', async () => {
      const logs = await AuditModel.find({ userId: testUserId });
      expect(logs.length).toBeGreaterThan(0);
      expect(logs.length).toBe(3);
    });

    it('should filter logs by action', async () => {
      const logs = await AuditModel.find({
        userId: testUserId,
        action: 'LOGIN',
      });
      expect(logs.length).toBe(1);
      expect(logs[0].action).toBe('LOGIN');
    });

    it('should filter logs by resource', async () => {
      const logs = await AuditModel.find({
        userId: testUserId,
        resource: 'USER',
      });
      expect(logs.length).toBe(2);
    });

    it('should retrieve log by ID', async () => {
      const logs = await AuditModel.find({ userId: testUserId });
      const log = await AuditModel.findById(logs[0]._id);
      expect(log).toBeDefined();
      expect(log?._id).toEqual(logs[0]._id);
    });
  });

  describe('Audit Log Aggregation', () => {
    it('should count total logs', async () => {
      const count = await AuditModel.countDocuments({ userId: testUserId });
      expect(count).toBe(3);
    });

    it('should aggregate logs by action', async () => {
      const allLogs = await AuditModel.find({ userId: testUserId });
      const actionGroups = new Map();
      allLogs.forEach((log) => {
        const count = actionGroups.get(log.action) || 0;
        actionGroups.set(log.action, count + 1);
      });
      expect(actionGroups.size).toBeGreaterThan(0);
    });
  });
});
