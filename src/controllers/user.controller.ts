import { Request, Response } from 'express';
import { AuthRequest } from '@/types';
import { UserModel } from '@/models/user.model';
import { ApiResponseUtil } from '@/utils/apiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { cacheService } from '@/services/cacheService';
import { auditService } from '@/services/auditService';
import { ExportService } from '@/services/exportService';
import type { PaginationQuery } from '@/types';

export class UserController {
  static getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const cacheKey = `user:profile:${userId}`;
    let user = await cacheService.get(cacheKey);

    if (!user) {
      user = await UserModel.findById(userId).select('-password');
      if (!user) {
        return ApiResponseUtil.notFound(res, 'User not found');
      }
      await cacheService.set(cacheKey, user, 300);
    }

    ApiResponseUtil.success(res, user);
  });

  static updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const updates = req.body as any;

    if (updates.password) delete updates.password;
    if (updates.email) delete updates.email;
    if (updates.role) delete updates.role;
    if (updates.isActive) delete updates.isActive;

    const user = await UserModel.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!user) {
      return ApiResponseUtil.notFound(res, 'User not found');
    }

    await cacheService.del(`user:profile:${userId}`);

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

  static updateAvatar = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { avatarUrl } = req.body as any;

    const user = await UserModel.findByIdAndUpdate(
      userId,
      { avatar: avatarUrl },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return ApiResponseUtil.notFound(res, 'User not found');
    }

    await cacheService.del(`user:profile:${userId}`);

    await auditService.log({
      userId,
      action: 'UPDATE_AVATAR',
      resource: 'User',
      resourceId: userId,
      changes: { avatar: avatarUrl },
      req,
    });

    ApiResponseUtil.success(res, user, 'Avatar updated successfully');
  });

  static deleteAccount = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const user = await UserModel.findById(userId);
    if (!user) {
      return ApiResponseUtil.notFound(res, 'User not found');
    }

    await user.softDelete();

    await cacheService.del(`user:profile:${userId}`);

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
    const { newEmail, password } = req.body as any;

    const user = await UserModel.findById(userId).select('+password');
    if (!user) {
      return ApiResponseUtil.notFound(res, 'User not found');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return ApiResponseUtil.unauthorized(res, 'Invalid password');
    }

    const existingUser = await UserModel.findOne({ email: newEmail });
    if (existingUser && existingUser._id.toString() !== userId) {
      return ApiResponseUtil.conflict(res, 'Email already in use');
    }

    const oldEmail = user.email;
    user.email = newEmail;
    user.isEmailVerified = false;
    await user.save();

    await cacheService.del(`user:profile:${userId}`);

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
    const {
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      role,
      isActive,
    } = req.query as any;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort: any = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

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
      UserModel.find(filter).select('-password').sort(sort).skip(skip).limit(parseInt(limit)),
      UserModel.countDocuments(filter),
    ]);

    ApiResponseUtil.paginated(res, users, total, parseInt(page), parseInt(limit));
  });

  static getUserById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params as any;

    const user = await UserModel.findById(id).select('-password');
    if (!user || user.isDeleted) {
      return ApiResponseUtil.notFound(res, 'User not found');
    }

    ApiResponseUtil.success(res, user);
  });

  static updateUserRole = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params as any;
    const { role } = req.body as any;

    const user = await UserModel.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return ApiResponseUtil.notFound(res, 'User not found');
    }

    await cacheService.del(`user:profile:${id}`);

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
    const { id } = req.params as any;
    const { isActive } = req.body as any;

    const user = await UserModel.findByIdAndUpdate(id, { isActive }, { new: true }).select(
      '-password'
    );

    if (!user) {
      return ApiResponseUtil.notFound(res, 'User not found');
    }

    await cacheService.del(`user:profile:${id}`);

    await auditService.log({
      userId: req.user!.id,
      action: isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
      resource: 'User',
      resourceId: id,
      changes: { isActive },
      req,
    });

    ApiResponseUtil.success(
      res,
      user,
      `User ${isActive ? 'activated' : 'deactivated'} successfully`
    );
  });

  static getUserActivity = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params as any;
    const activity = await auditService.getUserActivity(id);

    ApiResponseUtil.success(res, activity);
  });

  static deleteUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params as any;

    const user = await UserModel.findById(id);
    if (!user) {
      return ApiResponseUtil.notFound(res, 'User not found');
    }

    await user.softDelete();

    await cacheService.del(`user:profile:${id}`);

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
    const { userIds } = req.body as any;

    const result = await UserModel.updateMany(
      { _id: { $in: userIds } },
      { isDeleted: true, deletedAt: new Date() }
    );

    await Promise.all(userIds.map((id: string) => cacheService.del(`user:profile:${id}`)));

    await auditService.log({
      userId: req.user!.id,
      action: 'BULK_DELETE_USERS',
      resource: 'User',
      changes: { userIds, count: result.modifiedCount },
      req,
    });

    ApiResponseUtil.success(
      res,
      { deletedCount: result.modifiedCount },
      'Users deleted successfully'
    );
  });

  static exportUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { format } = req.query as any;

    const users = await UserModel.find({ isDeleted: false }).select('-password');
    const data = format === 'csv' ? ExportService.exportToCSV(users, 'users') : users;
    res.set({
      'Content-Type': format === 'csv' ? 'text/csv' : 'application/json',
      'Content-Disposition': `attachment; filename="users.${format}"`,
    });
    res.send(data);
  });

  static getUserStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const stats = await UserModel.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: null,
          roles: { $push: { role: '$_id', count: '$count' } },
          total: { $sum: '$count' },
          active: {
            $sum: {
              $cond: [{ $eq: ['$isActive', true] }, 1, 0],
            },
          },
        },
      },
    ]);

    const growth = await UserModel.aggregate([
      {
        $match: {
          isDeleted: false,
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    ApiResponseUtil.success(res, {
      stats: stats[0] || { total: 0, active: 0, roles: [] },
      growth,
    });
  });
}
