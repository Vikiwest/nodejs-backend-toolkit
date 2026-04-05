import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import config from '../src/config/env';
import { logger } from '../src/utils/logger';

const execAsync = promisify(exec);

async function backupDatabase() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '..', 'backups');
    const backupPath = path.join(backupDir, `backup-${timestamp}`);

    // Ensure backup directory exists
    await execAsync(`mkdir -p ${backupDir}`);

    // Run mongodump
    const mongoUri = config.MONGODB_URI;
    const command = `mongodump --uri="${mongoUri}" --out="${backupPath}"`;

    await execAsync(command);

    logger.info(`Database backup completed: ${backupPath}`);
  } catch (error) {
    logger.error('Database backup failed:', error);
    process.exit(1);
  }
}

backupDatabase();
