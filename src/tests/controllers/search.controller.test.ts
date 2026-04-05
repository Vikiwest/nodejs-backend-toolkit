import { searchService } from '../../services/searchService';
import { UserModel } from '../../models/user.model';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

describe('Search Service - Unit Tests', () => {
  let testUserId: string;

  beforeAll(async () => {
    const user = await UserModel.create({
      name: 'John Searcher',
      email: 'searcher@example.com',
      password: 'password123',
      bio: 'A test user for search',
      role: 'user',
    });
    testUserId = user._id.toString();
  });

  afterAll(async () => {
    await UserModel.deleteOne({ _id: testUserId });
  });

  describe('Search Service Methods', () => {
    it('should have search methods defined', () => {
      expect(searchService).toBeDefined();
      expect(searchService.searchUsers).toBeDefined();
      expect(searchService.globalSearch).toBeDefined();
      expect(searchService.getSuggestions).toBeDefined();
    });

    it('should generate suggestions', async () => {
      const suggestions = await searchService.getSuggestions('john');
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should return multiple suggestions', async () => {
      const suggestions = await searchService.getSuggestions('test');
      expect(suggestions.length).toBeGreaterThanOrEqual(1);
    });

    it('should return string suggestions', async () => {
      const suggestions = await searchService.getSuggestions('user');
      expect(suggestions.every((s) => typeof s === 'string')).toBe(true);
    });
  });

  describe('Search Operations', () => {
    it('should retrieve user from database', async () => {
      const user = await UserModel.findOne({ email: 'searcher@example.com' });
      expect(user).toBeDefined();
      expect(user?.name).toBe('John Searcher');
    });

    it('should find user by name pattern', async () => {
      const users = await UserModel.find({
        name: { $regex: 'John', $options: 'i' },
      });
      expect(users.length).toBeGreaterThan(0);
    });

    it('should perform case-insensitive search', async () => {
      const users = await UserModel.find({
        name: { $regex: 'john', $options: 'i' },
      });
      expect(users.length).toBeGreaterThan(0);
    });
  });
});
