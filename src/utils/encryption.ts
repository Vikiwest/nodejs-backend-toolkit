import crypto from 'crypto';
import { config } from '../config/env';

class EncryptionService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly key: Buffer;
  private readonly iv: Buffer;

  constructor() {
    this.key = config.encryption.key
      ? Buffer.from(config.encryption.key, 'utf-8')
      : Buffer.from('default32bytekeyhere123456789012', 'utf-8');
    this.iv = config.encryption.iv
      ? Buffer.from(config.encryption.iv, 'utf-8')
      : Buffer.from('default16byteivhere', 'utf-8');
  }

  /**
   * Encrypt text
   */
  encrypt(text: string): string {
    const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  /**
   * Decrypt text
   */
  decrypt(encryptedText: string): string {
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, this.iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Hash password with bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcryptjs');
    const salt = await bcrypt.default.genSalt(10);
    return await bcrypt.default.hash(password, salt);
  }

  /**
   * Compare password with hash
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = await import('bcryptjs');
    return await bcrypt.default.compare(password, hash);
  }

  /**
   * Generate random token
   */
  generateRandomToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
}

// Create and export a singleton instance
export default new EncryptionService();
