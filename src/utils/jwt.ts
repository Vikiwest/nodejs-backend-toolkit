import jwt from 'jsonwebtoken';
import { config } from '@/config/env';

class JWTService {
  /**
   * Generate access token
   */
  static generateAccessToken(payload: any) {
    return jwt.sign(payload, config.jwt.secret!, {
      expiresIn: config.jwt.expiresIn!,
    });
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(payload: any) {
    return jwt.sign(payload, config.jwt.refreshSecret!, {
      expiresIn: config.jwt.refreshExpiresIn!,
    });
  }

  /**
   * Generate both tokens
   */
  static generateTokens(payload: any) {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string) {
    try {
      return jwt.verify(token, config.jwt.secret!) as any;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string) {
    try {
      return jwt.verify(token, config.jwt.refreshSecret!) as any;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Decode token without verification
   */
  static decodeToken(token: string) {
    return jwt.decode(token);
  }
}

export const JWTService = new JWTService();
