import mongoose from 'mongoose';
import { databaseConnection } from '../src/config/database';
import { UserModel } from '../src/models/user.model';
import encryptionService from '../src/utils/encryption';
import config from '../src/config/env';
import { LoggerService } from '../src/utils/logger';

async function seed() {
  try {
    await databaseConnection.connect();
    LoggerService.info('Connected to MongoDB for seeding');

    // Create admin user
    const adminExists = await UserModel.findOne({ email: 'admin@example.com' });
    if (!adminExists) {
      await UserModel.create({
        name: 'Admin User',
        email: 'admin@example.com',
        password: await encryptionService.hashPassword('Admin123!'),
        role: 'super_admin',
        isEmailVerified: true,
      });
      LoggerService.info('Admin user created');
    }

    // Create test users
    for (let i = 1; i <= 10; i++) {
      const exists = await UserModel.findOne({ email: `user${i}@example.com` });
      if (!exists) {
        await UserModel.create({
          name: `Test User ${i}`,
          email: `user${i}@example.com`,
          password: await encryptionService.hashPassword('Test123!'),
          role: 'user',
          isEmailVerified: true,
        });
      }
    }

    LoggerService.info('Database seeded successfully!');
  } catch (error) {
    LoggerService.error('Seeding failed', error as Error);
  } finally {
    await mongoose.disconnect();
  }
}

seed().catch(console.error);

export {};
