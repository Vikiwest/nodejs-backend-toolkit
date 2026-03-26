import { Response } from 'express';
import { UserModel } from '@/models/user.model';
import { ApiResponseUtil } from '@/utils/apiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { cacheService } from '@/services/cacheService';
import { auditService } from '@/services/auditService';
import { AuthRequest, PaginationQuery } from '@/types';

export class UserController {
  static getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    // Try cache first
    const cacheKey = `user:profile:${userId}`;
    let user = await cacheService.get(cacheKey);

    if (!user) {
      user = await UserModel.findById(userId).select('-password');
      if (!user) {
        return ApiResponseUtil.notFound(res, 'User not found');
      }
      await cacheService.set(cacheKey, user, 300); // Cache for 5 minutes
    }

    ApiResponseUtil.success(res, user);
  });

  static updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const updates = req.body;

    // Remove restricted fields
    delete updates.password;
    delete updates.email;
    delete updates.role;
    delete updates.isActive;

    const user = await UserModel.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return ApiResponseUtil.notFound(res, 'User not found');
    }

    // Clear cache
    await cacheService.del(`user:profile:${userId}`);

    // Audit log
    await auditService.log({
      userId,
      action: 'UPDATE_PROFILE',
      resource: 'User',
      resourceId: userId,
      changes: updates,
      req,
    });

    ApiResponseUtil.success(res, user, 'Profile updated successfully');
  });

  static deleteAccount = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const user = await UserModel.findById(userId);
    if (!user) {
      return ApiResponseUtil.notFound(res, 'User not found');
    }

    await user.softDelete();

    // Clear cache
    await cacheService.del(`user:profile:${userId}`);

    // Audit log
    await auditService.log({
      userId,
      action: 'DELETE_ACCOUNT',
      resource: 'User',
      resourceId: userId,
      req,
    });

    ApiResponseUtil.success(res, null, 'Account deleted successfully');
  });

  static changeEmail = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { newEmail, password } = req.body;

    const user = await UserModel.findById(userId).select('+password');
    if (!user) {
      return ApiResponseUtil.notFound(res, 'User not found');
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return ApiResponseUtil.unauthorized(res, 'Invalid password');
    }

    // Check if email is already taken
    const existingUser = await UserModel.findOne({ email: newEmail });
    if (existingUser && existingUser._id.toString() !== userId) {
      return ApiResponseUtil.conflict(res, 'Email already in use');
    }

    const oldEmail = user.email;
    user.email = newEmail;
    user.isEmailVerified = false;
    await user.save();

    // Clear cache
    await cacheService.del(`user:profile:${userId}`);

    // Audit log
    await auditService.log({
      userId,
      action: 'CHANGE_EMAIL',
      resource: 'User',
      resourceId: userId,
      changes: { oldEmail, newEmail },
      req,
    });

    ApiResponseUtil.success(res, null, 'Email changed successfully. Please verify your new email.');
  });

  static getAllUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search, role, isActive } = req.query as PaginationQuery & { role?: string; isActive?: string };

    const skip = (page - 1) * limit;
    const sort: any = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Build filter
    const filter: any = { isDeleted: false };
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      UserModel.find(filter)
        .select('-password')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      UserModel.countDocuments(filter),
    ]);

    ApiResponseUtil.paginated(res, users, total, page, limit);
  });

  static getUserById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const user = await UserModel.findById(id).select('-password');
    if (!user || user.isDeleted) {
      return ApiResponseUtil.notFound(res, 'User not found');
    }

    ApiResponseUtil.success(res, user);
  });

  static updateUserRole = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { role } = req.body;

    const user = await UserModel.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return ApiResponseUtil.notFound(res, 'User not found');
    }

    // Clear cache
    await cacheService.del(`user:profile:${id}`);

    // Audit log
    await auditService.log({
      userId: req.user!.id,
      action: 'UPDATE_USER_ROLE',
      resource: 'User',
      resourceId: id,
      changes: { role },
      req,
    });

    ApiResponseUtil.success(res, user, 'User role updated successfully');
  });

  static toggleUserStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await UserModel.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return ApiResponseUtil.notFound(res, 'User not found');
    }

    // Clear cache
    await cacheService.del(`user:profile:${id}`);

    // Audit log
    await auditService.log({
      userId: req.user!.id,
      action: isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
      resource: 'User',
      resourceId: id,
      changes: { isActive },
      req,
    });

    ApiResponseUtil.success(res, user, `User ${isActive ? 'activated' : 'deactivated'} successfully`);
  });

  static deleteUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const user = await UserModel.findById(id);
    if (!user) {
      return ApiResponseUtil.notFound(res, 'User not found');
    }

    await user.softDelete();

    // Clear cache
    await cacheService.del(`user:profile:${id}`);

    // Audit log
    await auditService.log({
      userId: req.user!.id,
      action: 'DELETE_USER',
      resource: 'User',
      resourceId: id,
      req,
    });

    ApiResponseUtil.success(res, null, 'User deleted successfully');
  });

  static bulkDeleteUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userIds } = req.body;

    const result = await UserModel.updateMany(
      { _id: { $in: userIds } },
      { isDeleted: true, deletedAt: new Date() }
    );

    // Clear cache for all deleted users
    await Promise.all(
      userIds.map((id: string) => cacheService.del(`user:profile:${id}`))
    );

    // Audit log
    await auditService.log({
      userId: req.user!.id,
      action: 'BULK_DELETE_USERS',
      resource: 'User',
      changes: { userIds, count: result.modifiedCount },
      req,
    });

    ApiResponseUtil.success(res, { deletedCount: result.modifiedCount }, 'Users deleted successfully');
  });
}