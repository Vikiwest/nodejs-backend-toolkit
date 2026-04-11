import { Router } from 'express';
import Joi from 'joi';
import { UserController } from '../controllers/user.controller';
import { authMiddleware, requireRole } from '../middleware/auth';
import { validate, commonSchemas } from '../middleware/validation';

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
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Get current user profile
 *     description: Get authenticated user's profile data (cached).
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 */
router.get('/profile', UserController.getProfile);

/**
 * @swagger
 * /users/profile:
 *   put:
 *     summary: Update current user profile
 *     description: Update name, phone, bio. Avatar via separate endpoint.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               phone:
 *                 type: string
 *                 pattern: '^[0-9]{10,15}$'
 *               avatar:
 *                 type: string
 *                 format: uri
 *               bio:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Updated profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.put('/profile', validate(updateProfileSchema), UserController.updateProfile);

/**
 * @swagger
 * /users/avatar:
 *   put:
 *     summary: Update user avatar
 *     description: Set user avatar URL (call upload/avatar first).
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               avatarUrl:
 *                 type: string
 *                 format: uri
 *             required:
 *               - avatarUrl
 *     responses:
 *       200:
 *         description: Updated user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
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
 * @swagger
 * /users/export-my-data:
 *   get:
 *     summary: Export my data
 *     description: Export user data for GDPR compliance.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Data exported
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/export-my-data', UserController.exportMyData);

/**
 * @swagger
 * /users/change-email:
 *   put:
 *     summary: Change user email
 *     description: Change email with password verification.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newEmail:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *             required:
 *               - newEmail
 *               - password
 *     responses:
 *       200:
 *         description: Email changed
 *       409:
 *         description: Email in use
 */
router.put(
  '/change-email',
  authMiddleware(),
  validate(changeEmailSchema),
  UserController.changeEmail
);

// Admin routes - tag 'User-Admin'
/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users (paginated)
 *     description: Admin list of all users with search/filter.
 *     tags: [User-Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, admin, moderator]
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Paginated users
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
router.get(
  '/',
  requireRole('admin', 'super_admin'),
  validate(paginationSchema),
  UserController.getAllUsers
);

/**
 * @swagger
 * /users/export:
 *   get:
 *     summary: Export users
 *     tags: [User-Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, json]
 *           default: csv
 *     responses:
 *       200:
 *         description: Export data/stream
 *         content:
 *           application/csv:
 *             schema:
 *               type: string
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
router.get(
  '/export',
  requireRole('admin', 'super_admin'),
  validate(exportSchema),
  UserController.exportUsers
);

/**
 * @swagger
 * /users/stats:
 *   get:
 *     summary: Get user statistics
 *     tags: [User-Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stats (counts, growth)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: number
 *                     activeUsers:
 *                       type: number
 *                     newUsersThisMonth:
 *                       type: number
 *                     userGrowth:
 *                       type: number
 */
router.get('/stats', requireRole('admin', 'super_admin'), UserController.getUserStats);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [User-Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 */
router.get(
  '/:id',
  requireRole('admin', 'super_admin'),
  validate({ params: Joi.object({ id: commonSchemas.id }) }),
  UserController.getUserById
);

/**
 * @swagger
 * /users/{id}/role:
 *   put:
 *     summary: Update user role
 *     tags: [User-Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, admin, moderator]
 *             required:
 *               - role
 *     responses:
 *       200:
 *         description: Updated user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.put(
  '/:id/role',
  requireRole('super_admin'),
  validate({
    params: Joi.object({ id: commonSchemas.id }),
    body: Joi.object({
      role: Joi.string().valid('user', 'admin', 'moderator').required(),
    }),
  }),
  UserController.updateUserRole
);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update user (general admin update)
 *     description: Admin can update user profile fields, role, status.
 *     tags: [User-Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               phone:
 *                 type: string
 *                 pattern: '^[0-9]{10,15}$'
 *               bio:
 *                 type: string
 *                 maxLength: 500
 *               avatar:
 *                 type: string
 *                 format: uri
 *               role:
 *                 type: string
 *                 enum: [user, admin, moderator]
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Updated user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.put(
  '/:id',
  requireRole('admin', 'super_admin'),
  validate({
    params: Joi.object({ id: commonSchemas.id }),
    body: Joi.object({
      name: Joi.string().min(2).max(100).optional(),
      phone: Joi.string()
        .pattern(/^[0-9]{10,15}$/)
        .optional(),
      bio: Joi.string().max(500).optional(),
      avatar: Joi.string().uri().optional(),
      role: Joi.string().valid('user', 'admin', 'moderator').optional(),
      isActive: Joi.boolean().optional(),
    }).min(1),
  }),
  UserController.updateUser
);

/**
 * @swagger
 * /users/{id}/status:
 *   put:
 *     summary: Toggle user status
 *     tags: [User-Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isActive:
 *                 type: boolean
 *             required:
 *               - isActive
 *     responses:
 *       200:
 *         description: Status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.put(
  '/:id/status',
  requireRole('admin', 'super_admin'),
  validate({
    params: Joi.object({ id: commonSchemas.id }),
    body: Joi.object({
      isActive: Joi.boolean().required(),
    }),
  }),
  UserController.toggleUserStatus
);

/**
 * @swagger
 * /users/{id}/activity:
 *   get:
 *     summary: Get user activity logs
 *     description: Admin view user audit logs.
 *     tags: [User-Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Activity logs
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
router.get(
  '/:id/activity',
  requireRole('admin', 'super_admin'),
  validate({
    params: Joi.object({ id: commonSchemas.id }),
    query: paginationSchema.query,
  }),
  UserController.getUserActivity
);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete user
 *     tags: [User-Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted
 *       404:
 *         description: User not found
 */
router.delete(
  '/:id',
  requireRole('super_admin'),
  validate({ params: Joi.object({ id: commonSchemas.id }) }),
  UserController.deleteUser
);

/**
 * @swagger
 * /users/bulk-delete:
 *   post:
 *     summary: Bulk delete users
 *     tags: [User-Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *             required:
 *               - userIds
 *     responses:
 *       200:
 *         description: Count deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     deletedCount:
 *                       type: number
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

export default router;
