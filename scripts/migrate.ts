import mongoose from 'mongoose';
import { databaseConnection } from '../src/config/database';
import { LoggerService } from '../src/utils/logger';

const migrations = [
  {
    name: 'add-email-verification',
    up: async () => {
      const result = await mongoose.connection
        .collection('users')
        .updateMany({}, { $set: { isEmailVerified: false, emailVerifiedAt: null } });
      LoggerService.info(
        `Migration ${migrations[0].name} up: updated ${result.modifiedCount} users`
      );
    },
    down: async () => {
      const result = await mongoose.connection
        .collection('users')
        .updateMany({}, { $unset: { isEmailVerified: '', emailVerifiedAt: '' } });
      LoggerService.info(
        `Migration ${migrations[0].name} down: unset ${result.modifiedCount} users`
      );
    },
  },
  // Add more migrations here
];

async function runMigrations(direction: 'up' | 'down' = 'up') {
  try {
    await databaseConnection.connect();
    LoggerService.info(`Running migrations in ${direction} direction`);

    for (const migration of migrations) {
      await migration[direction]();
    }

    LoggerService.info('Migrations completed successfully');
  } catch (error) {
    LoggerService.error('Migration failed', error as Error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Run up migrations by default
runMigrations('up').catch(console.error);

export {};
