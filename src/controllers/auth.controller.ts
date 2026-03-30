/**
 * @swagger
 * components:
 *   schemas:
 *     AuthResponse:
 *       type: object
 *       properties:
 *         user:
 *           $ref: '#/components/schemas/User'
 *         tokens:
 *           type: object
 *           properties:
 *             accessToken:
 *               type: string
 *             refreshToken:
 *               type: string
 *     TokenResponse:
 *       type: object
 *       properties:
 *         tokens:
 *           type: object
 *           properties:
 *             accessToken:
 *               type: string
 *             refreshToken:
 *               type: string
 */

import { Request, Response } from 'express';
import { UserModel } from '@/models/user.model';
import { JWTService } from '@/utils/jwt';
import { ApiResponseUtil } from '@/utils/apiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { emailService } from '@/services/emailService';
import { cacheService } from '@/services/cacheService';
import { EncryptionService } from '@/utils/encryption';
import { twoFactorService } from '@/services/twoFactorService';
import { AuthRequest } from '@/types';

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: User registration
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 */
export class AuthController {
  static register = asyncHandler(async (req: Request, res: Response) => {
    const { name, email, password } = req.body;

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return ApiResponseUtil.conflict(res, 'Email already registered');
    }

    const user = await UserModel.create({ name, email, password });

    const verificationToken = EncryptionService.generateRandomToken(32);
    await cacheService.set(`verify:${verificationToken}`, user._id.toString(), 86400);

    await emailService.sendVerificationEmail(email, verificationToken);

    const tokens = JWTService.generateTokens({ id: user._id.toString(), email, role: user.role });

    const userResponse = user.toObject();
    delete userResponse.password;

    ApiResponseUtil.created(res, { user: userResponse, tokens }, 'Registration successful. Please verify your email.');
  });

  /**
   * @swagger
   * /api/auth/login:
   *   post:
   *     summary: User login
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password]
   *     responses:
   *       200:
   *         description: Login successful
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AuthResponse'
   */
  static login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const user = await UserModel.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return ApiResponseUtil.unauthorized(res, 'Invalid credentials');
    }

    if (!user.isActive) {
      return ApiResponseUtil.forbidden(res, 'Account is disabled');
    }

    user.lastLogin = new Date();
    await user.save();

    const tokens = JWTService.generateTokens({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const userResponse = user.toObject();
    delete userResponse.password;

    ApiResponseUtil.success(res, { user: userResponse, tokens });
  });

  static logout = asyncHandler(async (_req: AuthRequest, res: Response) => {
    ApiResponseUtil.success(res, null, 'Logged out successfully');
  });

  /**
   * @swagger
   * /api/auth/refresh-token:
   *   post:
   *     summary: Refresh JWT token
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [refreshToken]
   *     responses:
   *       200:
   *         description: Token refreshed
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/TokenResponse'
   */
  static refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    const decoded = JWTService.verifyRefreshToken(refreshToken);
    const tokens = JWTService.generateTokens({
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    });

    ApiResponseUtil.success(res, { tokens });
  });

  static verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;

    const userId = await cacheService.get(`verify:${token}`);
    if (!userId) {
      return ApiResponseUtil.badRequest(res, 'Invalid or expired verification token');
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return ApiResponseUtil.notFound(res, 'User not found');
    }

    user.isEmailVerified = true;
    await user.save();

    await cacheService.del(`verify:${token}`);

    ApiResponseUtil.success(res, null, 'Email verified successfully');
  });

  static resendVerification = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    const user = await UserModel.findOne({ email });
    if (!user) {
      return ApiResponseUtil.notFound(res, 'User not found');
    }

    if (user.isEmailVerified) {
      return ApiResponseUtil.badRequest(res, 'Email already verified');
    }

    const verificationToken = EncryptionService.generateRandomToken(32);
    await cacheService.set(`verify:${verificationToken}`, user._id.toString(), 86400);

    await emailService.sendVerificationEmail(email, verificationToken);

    ApiResponseUtil.success(res, null, 'Verification email resent');
  });

  static forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    const user = await UserModel.findOne({ email });
    if (!user) {
      return ApiResponseUtil.success(res, null, 'Password reset email sent if account exists');
    }

    const resetToken = EncryptionService.generateRandomToken(32);
    await cacheService.set(`reset:${resetToken}`, user._id.toString(), 3600);

    await emailService.sendPasswordResetEmail(email, resetToken);

    ApiResponseUtil.success(res, null, 'Password reset email sent');
  });

  static resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;

    const userId = await cacheService.get(`reset:${token}`);
    if (!userId) {
      return ApiResponseUtil.badRequest(res, 'Invalid or expired reset token');
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return ApiResponseUtil.notFound(res, 'User not found');
    }

    user.password = newPassword;
    await user.save();

    await cacheService.del(`reset:${token}`);

    ApiResponseUtil.success(res, null, 'Password reset successful');
  });

  static changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.id;

    const user = await UserModel.findById(userId).select('+password');
    if (!user) {
      return ApiResponseUtil.notFound(res, 'User not found');
    }

    if (!(await user.comparePassword(currentPassword))) {
      return ApiResponseUtil.unauthorized(res, 'Invalid current password');
    }

    user.password = newPassword;
    await user.save();

    ApiResponseUtil.success(res, null, 'Password changed successfully');
  });

  // 2FA Endpoints
  static enable2FA = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { secret, qrCode } = await twoFactorService.enable2FA(userId);

    ApiResponseUtil.success(res, { secret, qrCode }, '2FA enabled. Scan QR code.');
  });

  static verify2FA = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { token } = req.body;

    const isValid = await twoFactorService.verifyToken(userId, token);
    if (!isValid) {
      return ApiResponseUtil.unauthorized(res, 'Invalid 2FA token');
    }

    await twoFactorService.confirm2FA(userId);

    ApiResponseUtil.success(res, null, '2FA verified successfully');
  });

  static disable2FA = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    await twoFactorService.disable2FA(userId);

    ApiResponseUtil.success(res, null, '2FA disabled');
  });
}

