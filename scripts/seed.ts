import mongoose from 'mongoose';
import { databaseConnection } from '../src/config/database';
import { UserModel } from '../src/models/user.model';
import { LoggerService } from '../src/utils/logger';

async function seed() {
  try {
    await databaseConnection.connect();
    LoggerService.info('Connected to MongoDB for seeding');

    // Create admin user
    const adminExists = await UserModel.findOne({ email: 'chidiolorunda@example.com' });
    if (!adminExists) {
      await UserModel.create({
        name: 'Victory West',
        email: 'chidiolorunda@example.com',
        password: 'toolkitAdminpassword!',
        role: 'super_admin',
        isEmailVerified: true,
      });
      LoggerService.info('Admin user created');
    }

    // Create test users
    for (let i = 1; i <= 10; i++) {
      const email = `user${i}@example.com`;
      let user = await UserModel.findOne({ email });
      if (!user) {
        user = await UserModel.create({
          name: `Test User ${i}`,
          email,
          password: 'Test123!',
          role: 'user',
          isEmailVerified: true,
        });
        LoggerService.info(`Test user ${i} created`);
      } else {
        // Update password if user exists (in case it was double-hashed)
        user.password = 'Test123!';
        await user.save();
        LoggerService.info(`Test user ${i} password updated`);
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
