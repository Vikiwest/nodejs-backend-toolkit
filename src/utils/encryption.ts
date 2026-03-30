import crypto from 'crypto';
import { config } from '@/config/env';

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-cbc';
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
  encrypt(text) {
    const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  /**
   * Decrypt text
   */
  decrypt(encryptedText) {
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, this.iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Hash password with bcrypt
   */
  async hashPassword(password) {
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  }

  /**
   * Compare password with hash
   */
  async comparePassword(password, hash) {
    const bcrypt = require('bcryptjs');
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate random token
   */
  generateRandomToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }
}

export const EncryptionService = new EncryptionService();
