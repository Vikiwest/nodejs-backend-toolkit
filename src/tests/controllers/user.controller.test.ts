import { UserModel } from '@/models/user.model';
import JWTService from '@/utils/jwt';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

describe('User Controller - Unit Tests', () => {
  let testUserId: string;
  let testUser: any;

  beforeAll(async () => {
    // Create a test user in the database
    testUser = await UserModel.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedpassword123',
      role: 'user',
      isActive: true,
    });
    testUserId = testUser._id.toString();
  });

  afterAll(async () => {
    await UserModel.deleteMany({});
  });

  describe('User Functions', () => {
    it('should create and retrieve user', async () => {
      const user = await UserModel.findById(testUserId);
      expect(user).toBeDefined();
      expect(user?.name).toBe('Test User');
      expect(user?.email).toBe('test@example.com');
    });

    it('should generate valid JWT token', () => {
      const token = JWTService.generateAccessToken({
        userId: testUserId,
        role: 'user',
      });
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should verify JWT token', () => {
      const token = JWTService.generateAccessToken({
        userId: testUserId,
        role: 'user',
      });
      const decoded = JWTService.verifyAccessToken(token);
      expect(decoded.userId).toBe(testUserId);
    });

    it('should hash and compare passwords', async () => {
      // Create a new user for password testing
      const pwdTestUser = await UserModel.create({
        name: 'Password Test User',
        email: 'pwdtest@example.com',
        password: 'mySecurePassword123', // Will be hashed by pre-save hook
        role: 'user',
      });

      // Compare the plaintext password with the hashed one
      const isPasswordCorrect = await pwdTestUser.comparePassword('mySecurePassword123');
      expect(isPasswordCorrect).toBe(true);

      // Cleanup
      await UserModel.deleteOne({ _id: pwdTestUser._id });
    });
  });
});
