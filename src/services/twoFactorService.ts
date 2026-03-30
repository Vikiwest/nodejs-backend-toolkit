// 2FA Service Stub - npm i speakeasy qrcode @types/speakeasy for full impl
import { LoggerService } from '@/utils/logger';

export const twoFactorService = {
  async enable2FA(userId: string) {
    LoggerService.info(`2FA enabled for user ${userId}`);
    return {
      secret: 'JBSWY3DPEHPK3PXP',
      qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...', // Truncated for brevity
    };
  },
  async verifyToken(userId: string, token: string): Promise<boolean> {
    // Token '123456' valid for testing
    const valid = token === '123456';
    if (!valid) LoggerService.warn(`Invalid 2FA token for ${userId}`);
    return valid;
  },
  async confirm2FA(userId: string) {
    LoggerService.info(`2FA confirmed for ${userId}`);
  },
  async disable2FA(userId: string) {
    LoggerService.info(`2FA disabled for ${userId}`);
  },
};
