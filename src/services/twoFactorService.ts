import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { LoggerService } from '@/utils/logger';
import { UserModel } from '@/models/user.model';
import { cacheService } from '@/services/cacheService';

interface TwoFASecret {
  secret: string;
  qrCode: string;
}

export const twoFactorService = {
  /**
   * Enable 2FA for user - generate secret and QR code
   */
  async enable2FA(userId: string): Promise<TwoFASecret> {
    const secret = speakeasy.generateSecret({
      name: `MyApp (${userId})`,
      issuer: 'MyApp',
      length: 20,
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    // Store secret temporarily in cache (during setup)
    await cacheService.set(`2fa_setup:${userId}`, secret.base32, 300); // 5 min

    LoggerService.info(`2FA setup initiated for user ${userId}`);
    return {
      secret: secret.base32,
      qrCode,
    };
  },

  /**
   * Verify 2FA token during setup
   */
  async verifyToken(userId: string, token: string): Promise<boolean> {
    const tempSecret = await cacheService.get(`2fa_setup:${userId}`);
    if (!tempSecret) {
      LoggerService.warn(`No 2FA setup found for user ${userId}`);
      return false;
    }

    const verified = speakeasy.totp.verify({
      secret: tempSecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (verified) {
      // Store permanent secret in user document
      await UserModel.findByIdAndUpdate(userId, {
        twoFactorSecret: tempSecret,
        isTwoFactorEnabled: true,
      });

      // Clean up temp secret
      await cacheService.del(`2fa_setup:${userId}`);

      LoggerService.info(`2FA verified and enabled for user ${userId}`);
    } else {
      LoggerService.warn(`Invalid 2FA token for user ${userId}`);
    }

    return verified;
  },

  /**
   * Confirm 2FA setup (legacy, now handled in verifyToken)
   */
  async confirm2FA(userId: string) {
    LoggerService.info(`2FA confirmed for user ${userId}`);
  },

  /**
   * Disable 2FA for user
   */
  async disable2FA(userId: string) {
    await UserModel.findByIdAndUpdate(userId, {
      twoFactorSecret: null,
      isTwoFactorEnabled: false,
    });

    LoggerService.info(`2FA disabled for user ${userId}`);
  },

  /**
   * Verify 2FA token for login (for future use)
   */
  async verifyLoginToken(userId: string, token: string): Promise<boolean> {
    const user = await UserModel.findById(userId).select('twoFactorSecret');
    if (!user?.twoFactorSecret) return false;

    return speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1,
    });
  },
};
