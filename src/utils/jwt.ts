import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '@/config/env';

export interface JwtPayload {
  userId: string;
  email?: string;
  role?: string;
  [key: string]: any;
}

class JWTService {
  /**
   * Generate access token
   */
  static generateAccessToken(payload: JwtPayload): string {
    if (!config.jwt.secret) {
      throw new Error('JWT secret is not configured');
    }
    
    const options: SignOptions = {
      expiresIn: config.jwt.expiresIn as any, // Cast to any to bypass type checking
    };
    return jwt.sign(payload, config.jwt.secret, options);
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(payload: JwtPayload): string {
    if (!config.jwt.refreshSecret) {
      throw new Error('JWT refresh secret is not configured');
    }
    
    const options: SignOptions = {
      expiresIn: config.jwt.refreshExpiresIn as any, // Cast to any to bypass type checking
    };
    return jwt.sign(payload, config.jwt.refreshSecret, options);
  }

  /**
   * Generate both tokens
   */
  static generateTokens(payload: JwtPayload) {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): JwtPayload {
    try {
      if (!config.jwt.secret) {
        throw new Error('JWT secret is not configured');
      }
      return jwt.verify(token, config.jwt.secret) as JwtPayload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): JwtPayload {
    try {
      if (!config.jwt.refreshSecret) {
        throw new Error('JWT refresh secret is not configured');
      }
      return jwt.verify(token, config.jwt.refreshSecret) as JwtPayload;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Decode token without verification
   */
  static decodeToken(token: string): JwtPayload | null {
    return jwt.decode(token) as JwtPayload | null;
  }
}

export default JWTService;