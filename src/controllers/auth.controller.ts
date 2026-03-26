import { Request, Response } from 'express';
import { UserModel } from '@/models/user.model';
import { JWTService } from '@/utils/jwt';
import { ApiResponseUtil } from '@/utils/apiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { emailService } from '@/services/emailService';
import { cacheService } from '@/services/cacheService';
import { encryptionService } from '@/utils/encryption';
import { AuthRequest } from '@/types';

export class AuthController {
  static register = asyncHandler(async (req: Request, res: Response) => {
    const { name, email, password } = req.body;

    // Check if user exists
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return ApiResponseUtil.conflict(res, 'Email already registered');
    }

    // Create user
    const user = await UserModel.create({
      name,
      email,
      password,
    });

    // Generate verification token
    const verificationToken = encryptionService.generateRandomToken(32);
    await cacheService.set(`verify:${verificationToken}`, user._id, 86400); // 24 hours

    // Send verification email
    await emailService.sendVerificationEmail(email, verificationToken);

    // Generate tokens
    const tokens = JWTService.generateTokens({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    ApiResponseUtil.created(res, {
      user: userResponse,
      tokens,
    }, 'Registration successful. Please verify your email.');
  });

  static login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    // Find user with password
    const user = await UserModel.findOne({ email }).select('+password');
    if (!user) {
      return ApiResponseUtil.unauthorized(res, 'Invalid credentials');
    }

    // Check if account is active
    if (!user.isActive) {
      return ApiResponseUtil.forbidden(res, 'Account is disabled. Please contact support.');
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return ApiResponseUtil.unauthorized(res, 'Invalid credentials');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const tokens = JWTService.generateTokens({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    ApiResponseUtil.success(res, {
      user: userResponse,
      tokens,
    }, 'Login successful');
  });

  static refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return ApiResponseUtil.badRequest(res, 'Refresh token required');
    }

    try {
      const decoded = JWTService.verifyRefreshToken(refreshToken);
      const tokens = JWTService.generateTokens({
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      });

      ApiResponseUtil.success(res, { tokens }, 'Token refreshed successfully');
    } catch (error) {
      return ApiResponseUtil.unauthorized(res, 'Invalid or expired refresh token');
    }
  });

  static logout = asyncHandler(async (req: AuthRequest, res: Response) => {
    // In a real app, you might want to blacklist the token
    // For now, just return success
    ApiResponseUtil.success(res, null, 'Logged out successfully');
  });

  static verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;

    const userId = await cacheService.get<string>(`verify:${token}`);
    if (!userId) {
      return ApiResponseUtil.badRequest(res, 'Invalid or expired verification token');
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return ApiResponseUtil.notFound(res, 'User not found');
    }

    if (user.isEmailVerified) {
      return ApiResponseUtil.success(res, null, 'Email already verified');
    }

    user.isEmailVerified = true;
    await user.save();

    await cacheService.del(`verify:${token}`);

    ApiResponseUtil.success(res, null, 'Email verified successfully');
  });

  static forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    const user = await UserModel.findOne({ email });
    if (!user) {
      // Don't reveal that user doesn't exist for security
      return ApiResponseUtil.success(res, null, 'If your email is registered, you will receive a password reset link');
    }

    const resetToken = encryptionService.generateRandomToken(32);
    await cacheService.set(`reset:${resetToken}`, user._id.toString(), 3600); // 1 hour

    await emailService.sendPasswordResetEmail(email, resetToken);

    ApiResponseUtil.success(res, null, 'Password reset email sent');
  });

  static resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;

    const userId = await cacheService.get<string>(`reset:${token}`);
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

    ApiResponseUtil.success(res, null, 'Password reset successfully');
  });

  static changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.id;

    const user = await UserModel.findById(userId).select('+password');
    if (!user) {
      return ApiResponseUtil.notFound(res, 'User not found');
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return ApiResponseUtil.unauthorized(res, 'Current password is incorrect');
    }

    user.password = newPassword;
    await user.save();

    ApiResponseUtil.success(res, null, 'Password changed successfully');
  });
}