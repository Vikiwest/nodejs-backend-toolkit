import mongoose from 'mongoose';
import { LoggerService } from '../utils/logger';

export class FeatureFlagService {
  private static instance: FeatureFlagService;

  private constructor() {}

  static getInstance(): FeatureFlagService {
    if (!FeatureFlagService.instance) {
      FeatureFlagService.instance = new FeatureFlagService();
    }
    return FeatureFlagService.instance;
  }

  async isEnabled(
    feature: string,
    context: { userId?: string; environment?: string } = {}
  ): Promise<boolean> {
    try {
      // Query from DB or Redis cache
      const flag = await mongoose.model('FeatureFlag').findOne({ name: feature });
      if (!flag) return false;

      // Check environment
      if (
        flag.environments.length > 0 &&
        !flag.environments.includes(context.environment || 'development')
      ) {
        return false;
      }

      // Rollout percentage
      if (flag.rollout < 1.0) {
        const userHash = this.hashCode(context.userId || Math.random().toString());
        return (userHash % 100) / 100 < flag.rollout;
      }

      return flag.enabled;
    } catch (error) {
      LoggerService.error('Feature flag check failed', error as Error);
      return false;
    }
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}
