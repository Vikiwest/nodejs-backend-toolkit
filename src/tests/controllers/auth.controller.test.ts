import { UserModel } from '@/models/user.model';
import JWTService from '@/utils/jwt';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

describe('Auth Controller - Unit Tests', () => {
  let testUser: any;
  let testUserId: string;

  beforeAll(async () => {
    // Create a test user
    testUser = await UserModel.create({
      name: 'Auth Test User',
      email: 'authtest@example.com',
      password: 'password123',
      role: 'user',
      isActive: true,
    });
    testUserId = testUser._id.toString();
  });

  afterAll(async () => {
    await UserModel.deleteMany({ email: { $regex: 'authtest' } });
  });

  describe('JWT Token Operations', () => {
    it('should generate access token', () => {
      const token = JWTService.generateAccessToken({
        userId: testUserId,
        role: 'user',
      });
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should generate refresh token', () => {
      const token = JWTService.generateRefreshToken({
        userId: testUserId,
        role: 'user',
      });
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should generate both tokens', () => {
      const tokens = JWTService.generateTokens({
        userId: testUserId,
        role: 'user',
      });
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
    });

    it('should verify access token', () => {
      const token = JWTService.generateAccessToken({
        userId: testUserId,
        role: 'user',
      });
      const decoded = JWTService.verifyAccessToken(token);
      expect(decoded.userId).toBe(testUserId);
      expect(decoded.role).toBe('user');
    });

    it('should verify refresh token', () => {
      const token = JWTService.generateRefreshToken({
        userId: testUserId,
        role: 'user',
      });
      const decoded = JWTService.verifyRefreshToken(token);
      expect(decoded.userId).toBe(testUserId);
    });
  });

  describe('User Authentication', () => {
    it('should find user by email', async () => {
      const user = await UserModel.findOne({ email: 'authtest@example.com' });
      expect(user).toBeDefined();
      expect(user?.email).toBe('authtest@example.com');
    });

    it('should verify user password', async () => {
      // Create fresh user with password
      const freshUser = await UserModel.create({
        name: 'Fresh Auth User',
        email: 'fresh-authtest@example.com',
        password: 'testpassword123',
        role: 'user',
      });
      const retrievedUser = await UserModel.findById(freshUser._id).select('+password');
      const isValid = await retrievedUser?.comparePassword('testpassword123');
      expect(isValid).toBe(true);
      await UserModel.deleteOne({ _id: freshUser._id });
    });

    it('should reject invalid password', async () => {
      // Create fresh user with password
      const freshUser = await UserModel.create({
        name: 'Fresh Auth User 2',
        email: 'fresh-authtest2@example.com',
        password: 'testpassword123',
        role: 'user',
      });
      const retrievedUser = await UserModel.findById(freshUser._id).select('+password');
      const isValid = await retrievedUser?.comparePassword('wrongpassword');
      expect(isValid).toBe(false);
      await UserModel.deleteOne({ _id: freshUser._id });
    });
  });
});
