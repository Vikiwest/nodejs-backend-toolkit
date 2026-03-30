import { Router } from 'express';
import Joi from 'joi';
import { UserController } from '@/controllers/user.controller';
import { authMiddleware, requireRole } from '@/middleware/auth';
import { validate, commonSchemas } from '@/middleware/validation';

const router = Router();

// Validation schemas
const updateProfileSchema = {
  body: Joi.object({
    name: Joi.string().min(2).max(100),
    phone: Joi.string().pattern(/^[0-9]{10,15}$/),
    avatar: Joi.string().uri(),
    bio: Joi.string().max(500),
  }),
};

const changeEmailSchema = {
  body: Joi.object({
    newEmail: commonSchemas.email,
    password: Joi.string().required(),
  }),
};

const userIdParamSchema = {
  params: Joi.object({
    id: commonSchemas.id,
  }),
};

const paginationSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    search: Joi.string().optional(),
    role: Joi.string().valid('user', 'admin', 'moderator').optional(),
    isActive: Joi.boolean().optional(),
  }),
};

const exportSchema = {
  query: Joi.object({
    format: Joi.string().valid('csv', 'json').default('csv'),
  }),
};

const avatarSchema = {
  body: Joi.object({
    avatarUrl: Joi.string().uri().required(), // From upload
  }),
};

// All routes require authentication
router.use(authMiddleware());

/**
 * @summary Get current user profile
 * @description Get authenticated user's profile data (cached).
 * @tags User
 * @security bearerAuth
 * @response 200 - User profile
 * @response 404 - User not found
 */
router.get('/profile', UserController.getProfile);

/**
 * @summary Update current user profile
 * @description Update name, phone, bio. Avatar via separate endpoint.
 * @tags User
 * @security bearerAuth
 * @body updateProfileSchema
 * @response 200 - Updated profile
 */
router.put('/profile', validate(updateProfileSchema), UserController.updateProfile);

/**
 * @summary Update user avatar
 * @description Set user avatar URL (call upload/avatar first).
 * @tags User
 * @security bearerAuth
 * @body { avatarUrl: string }
 * @response 200 - Updated user
 */
router.put('/avatar', validate(avatarSchema), UserController.updateAvatar);

/**
 * @summary Delete current user account
 * @description Soft delete user account.
 * @tags User
 * @security bearerAuth
 * @response 200 - Deleted
 */
router.delete('/profile', UserController.deleteAccount);

/**
 * @summary Change user email
 * @description Change email with password verification.
 * @tags User
 * @security bearerAuth
 * @body changeEmailSchema
 * @response 200 - Email changed
 * @response 409 - Email in use
 */
router.post('/change-email', validate(changeEmailSchema), UserController.changeEmail);

// Admin routes - tag 'User-Admin'
/**
 * @summary Get all users (paginated)
 * @description Admin list of all users with search/filter.
 * @tags User-Admin
 * @security bearerAuth
 * @query paginationSchema
 * @response 200 - Paginated users
 */
router.get(
  '/',
  requireRole('admin', 'super_admin'),
  validate(paginationSchema),
  UserController.getAllUsers
);

/**
 * @summary Get user by ID
 * @tags User-Admin
 * @security bearerAuth
 * @param id path string.required
 * @response 200 - User details
 */
router.get(
  '/:id',
  requireRole('admin', 'super_admin'),
  validate(userIdParamSchema),
  UserController.getUserById
);

/**
 * @summary Update user role
 * @tags User-Admin
 * @security bearerAuth
 * @param id path string.required
 * @body { role: enum }
 * @response 200 - Updated user
 */
router.put(
  '/:id/role',
  requireRole('super_admin'),
  validate({
    params: userIdParamSchema,
    body: Joi.object({
      role: Joi.string().valid('user', 'admin', 'moderator').required(),
    }),
  }),
  UserController.updateUserRole
);

/**
 * @summary Toggle user status
 * @tags User-Admin
 * @security bearerAuth
 * @param id path string
 * @body { isActive: boolean }
 * @response 200 - Status updated
 */
router.put(
  '/:id/status',
  requireRole('admin', 'super_admin'),
  validate({
    params: userIdParamSchema,
    body: Joi.object({
      isActive: Joi.boolean().required(),
    }),
  }),
  UserController.toggleUserStatus
);

/**
 * @summary Get user activity logs
 * @description Admin view user audit logs.
 * @tags User-Admin
 * @security bearerAuth
 * @param id path string.required
 * @query paginationSchema
 * @response 200 - Activity logs
 */
router.get(
  '/:id/activity',
  requireRole('admin', 'super_admin'),
  validate({
    params: userIdParamSchema,
    query: paginationSchema.query,
  }),
  UserController.getUserActivity
);

/**
 * @summary Delete user
 * @tags User-Admin
 * @security bearerAuth
 * @param id path string
 * @response 200 - Deleted
 */
router.delete(
  '/:id',
  requireRole('super_admin'),
  validate(userIdParamSchema),
  UserController.deleteUser
);

/**
 * @summary Bulk delete users
 * @tags User-Admin
 * @security bearerAuth
 * @body { userIds: array }
 * @response 200 - Count deleted
 */
router.post(
  '/bulk-delete',
  requireRole('super_admin'),
  validate({
    body: Joi.object({
      userIds: Joi.array().items(commonSchemas.id).min(1).required(),
    }),
  }),
  UserController.bulkDeleteUsers
);

/**
 * @summary Export users
 * @tags User-Admin
 * @security bearerAuth
 * @query { format: 'csv'|'json' }
 * @response 200 - Export data/stream
 */
router.get(
  '/export',
  requireRole('admin', 'super_admin'),
  validate(exportSchema),
  UserController.exportUsers
);

/**
 * @summary Get user statistics
 * @tags User-Admin
 * @security bearerAuth
 * @response 200 - Stats (counts, growth)
 */
router.get('/stats', requireRole('admin', 'super_admin'), UserController.getUserStats);

export default router;
