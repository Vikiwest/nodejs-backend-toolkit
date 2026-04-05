/**
 * @swagger
 * components:
 *   schemas:
 *     TwoFASecretResponse:
 *       type: object
 *       properties:
 *         secret:
 *           type: string
 *           description: 2FA secret key
 *         qrCode:
 *           type: string
 *           description: QR code data URL for scanning
 */

import { Request, Response } from 'express';
import { UserModel } from '../models/user.model';
import JWTService from '../utils/jwt';
import { ApiResponseUtil } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { emailService } from '../services/emailService';
import { cacheService } from '../services/cacheService';
import encryptionService from '../utils/encryption';
import { twoFactorService } from '../services/twoFactorService';
import { AuthRequest } from '../types';

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: User registration
 *     tags: [Auth-Basic]
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
 *       409:
 *         description: Conflict
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export class AuthController {
  static register = asyncHandler(async (req: Request, res: Response) => {
    const { name, email, password } = req.body;

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return ApiResponseUtil.conflict(res, 'Email already registered');
    }

    const user = await UserModel.create({ name, email, password });

    const verificationToken = encryptionService.generateRandomToken(32);
    await cacheService.set(`verify:${verificationToken}`, user._id.toString(), 86400);

    await emailService.sendVerificationEmail(email, verificationToken);

    const tokens = JWTService.generateTokens({
      userId: user._id.toString(),
      email,
      role: user.role,
    });

    const userResponse = user.toObject();

    ApiResponseUtil.created(
      res,
      { user: userResponse, tokens },
      'Registration successful. Please verify your email.'
    );
  });

  /**
   * @swagger
   * /api/auth/login:
   *   post:
   *     summary: User login
   *     tags: [Auth-Basic]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password]
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               password:
   *                 type: string
   *                 minLength: 6
   *     responses:
   *       200:
   *         description: Login successful
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AuthResponse'
   *       401:
   *         description: Invalid credentials
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       403:
   *         description: Account disabled
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
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
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const userResponse = user.toObject();

    ApiResponseUtil.success(res, { user: userResponse, tokens });
  });

  /**
   * @swagger
   * /api/auth/logout:
   *   post:
   *     summary: User logout
   *     tags: [Auth-Basic]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Logout successful
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SuccessResponse'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  static logout = asyncHandler(async (_req: AuthRequest, res: Response) => {
    ApiResponseUtil.success(res, null, 'Logged out successfully');
  });

  /**
   * @swagger
   * /api/auth/refresh-token:
   *   post:
   *     summary: Refresh JWT token
   *     tags: [Auth-Basic]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [refreshToken]
   *             properties:
   *               refreshToken:
   *                 type: string
   *     responses:
   *       200:
   *         description: Token refreshed
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/TokenResponse'
   *       401:
   *         description: Invalid refresh token
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  static refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return ApiResponseUtil.badRequest(res, 'Refresh token is required');
    }

    try {
      const decoded = JWTService.verifyRefreshToken(refreshToken);
      const tokens = JWTService.generateTokens({
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      });

      ApiResponseUtil.success(res, { tokens }, 'Token refreshed successfully');
    } catch {
      ApiResponseUtil.unauthorized(res, 'Invalid or expired refresh token');
    }
  });

  /**
   * @swagger
   * /api/auth/verify-email/{token}:
   *   post:
   *     summary: Verify email address
   *     tags: [Auth-Verification]
   *     parameters:
   *       - in: path
   *         name: token
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Email verified
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SuccessResponse'
   *       400:
   *         description: Invalid token
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       404:
   *         description: User not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
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

  /**
   * @swagger
   * /api/auth/resend-verification:
   *   post:
   *     summary: Resend verification email
   *     tags: [Auth-Verification]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email]
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *     responses:
   *       200:
   *         description: Verification email sent
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SuccessResponse'
   *       400:
   *         description: Already verified
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       404:
   *         description: User not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  static resendVerification = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    const user = await UserModel.findOne({ email });
    if (!user) {
      return ApiResponseUtil.notFound(res, 'User not found');
    }

    if (user.isEmailVerified) {
      return ApiResponseUtil.badRequest(res, 'Email already verified');
    }

    const verificationToken = encryptionService.generateRandomToken(32);
    await cacheService.set(`verify:${verificationToken}`, user._id.toString(), 86400);

    await emailService.sendVerificationEmail(email, verificationToken);

    ApiResponseUtil.success(res, null, 'Verification email resent');
  });

  /**
   * @swagger
   * /api/auth/forgot-password:
   *   post:
   *     summary: Request password reset
   *     tags: [Auth-Password]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email]
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *     responses:
   *       200:
   *         description: Reset email sent
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SuccessResponse'
   */
  static forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    const user = await UserModel.findOne({ email });
    if (!user) {
      return ApiResponseUtil.success(res, null, 'Password reset email sent if account exists');
    }

    const resetToken = encryptionService.generateRandomToken(32);
    await cacheService.set(`reset:${resetToken}`, user._id.toString(), 3600);

    await emailService.sendPasswordResetEmail(email, resetToken);

    ApiResponseUtil.success(res, null, 'Password reset email sent');
  });

  /**
   * @swagger
   * /api/auth/reset-password:
   *   post:
   *     summary: Reset password with token
   *     tags: [Auth-Password]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [token, newPassword]
   *             properties:
   *               token:
   *                 type: string
   *               newPassword:
   *                 type: string
   *                 minLength: 6
   *     responses:
   *       200:
   *         description: Password reset successful
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SuccessResponse'
   *       400:
   *         description: Invalid token
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       404:
   *         description: User not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
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

  /**
   * @swagger
   * /api/auth/change-password:
   *   post:
   *     summary: Change password (authenticated)
   *     tags: [Auth-Password]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [currentPassword, newPassword]
   *             properties:
   *               currentPassword:
   *                 type: string
   *                 minLength: 6
   *               newPassword:
   *                 type: string
   *                 minLength: 6
   *     responses:
   *       200:
   *         description: Password changed
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SuccessResponse'
   *       401:
   *         description: Invalid current password
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       404:
   *         description: User not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
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

  /**
   * @swagger
   * /api/auth/enable-2fa:
   *   post:
   *     summary: Enable 2FA
   *     tags: [Auth-2FA]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 2FA secret and QR code
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/TwoFASecretResponse'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  // 2FA Endpoints
  static enable2FA = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { secret, qrCode } = await twoFactorService.enable2FA(userId);

    ApiResponseUtil.success(res, { secret, qrCode }, '2FA enabled. Scan QR code.');
  });

  /**
   * @swagger
   * /api/auth/verify-2fa:
   *   post:
   *     summary: Verify 2FA token
   *     tags: [Auth-2FA]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [token]
   *             properties:
   *               token:
   *                 type: string
   *                 minLength: 6
   *                 maxLength: 6
   *     responses:
   *       200:
   *         description: 2FA verified
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SuccessResponse'
   *       401:
   *         description: Invalid 2FA token
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
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

  /**
   * @swagger
   * /api/auth/disable-2fa:
   *   post:
   *     summary: Disable 2FA
   *     tags: [Auth-2FA]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 2FA disabled
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SuccessResponse'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  static disable2FA = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    await twoFactorService.disable2FA(userId);

    ApiResponseUtil.success(res, null, '2FA disabled');
  });
}
