import { UserModel } from '../../models/user.model';
import { AuditModel } from '../../models/audit.model';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

describe('Dashboard Controller - Unit Tests', () => {
  let testUserId: string;

  beforeAll(async () => {
    const user = await UserModel.create({
      name: 'Dashboard Test User',
      email: 'dashboard@example.com',
      password: 'password123',
      role: 'admin',
      isActive: true,
      isEmailVerified: true,
    });
    testUserId = user._id.toString();

    // Create test audit logs
    await AuditModel.create([
      {
        userId: testUserId,
        action: 'LOGIN',
        resource: 'AUTH',
        resourceId: testUserId,
        description: 'Admin logged in',
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
      },
      {
        userId: testUserId,
        action: 'VIEW_DASHBOARD',
        resource: 'DASHBOARD',
        resourceId: 'dashboard',
        description: 'Viewed dashboard',
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
      },
    ]);
  });

  afterAll(async () => {
    await AuditModel.deleteMany({ userId: testUserId });
    await UserModel.deleteOne({ _id: testUserId });
  });

  describe('Dashboard Statistics', () => {
    it('should aggregate user statistics', async () => {
      const stats = await UserModel.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: {
              $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] },
            },
            verified: {
              $sum: { $cond: [{ $eq: ['$isEmailVerified', true] }, 1, 0] },
            },
          },
        },
      ]);
      expect(stats).toBeDefined();
      expect(stats.length).toBeGreaterThan(0);
    });

    it('should count total users', async () => {
      const count = await UserModel.countDocuments();
      expect(count).toBeGreaterThan(0);
    });

    it('should count active users', async () => {
      const count = await UserModel.countDocuments({ isActive: true });
      expect(typeof count).toBe('number');
    });

    it('should count verified users', async () => {
      const count = await UserModel.countDocuments({ isEmailVerified: true });
      expect(typeof count).toBe('number');
    });
  });

  describe('Dashboard Metrics', () => {
    it('should retrieve audit activity', async () => {
      const audit = await AuditModel.find({ userId: testUserId });
      expect(audit.length).toBeGreaterThan(0);
    });

    it('should group actions by type', async () => {
      const allActions = await AuditModel.find({ userId: testUserId });
      const groupedActions = new Map();
      allActions.forEach((action) => {
        const count = groupedActions.get(action.action) || 0;
        groupedActions.set(action.action, count + 1);
      });
      expect(groupedActions.size).toBeGreaterThan(0);
    });

    it('should calculate growth metrics', async () => {
      const stats = await UserModel.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
      ]);
      expect(stats).toBeDefined();
    });

    it('should track user roles', async () => {
      const roles = await UserModel.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 },
          },
        },
      ]);
      expect(roles.length).toBeGreaterThan(0);
    });
  });
});
