import { Router } from 'express';
import Joi from 'joi';
import { UserController } from '@/controllers/user.controller';
import { authMiddleware, requireRole } from '@/middleware/auth';
import { validate, commonSchemas } from '@/middleware/validation';
import { rateLimiter } from '@/middleware/rateLimiter';

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

// All routes require authentication
router.use(authMiddleware());

// User profile routes
router.get('/profile', UserController.getProfile);
router.put('/profile', validate(updateProfileSchema), UserController.updateProfile);
router.delete('/profile', UserController.deleteAccount);
router.post('/change-email', validate(changeEmailSchema), UserController.changeEmail);

// User list and management (admin only)
router.get('/',
  requireRole('admin', 'super_admin'),
  validate(paginationSchema),
  UserController.getAllUsers
);

router.get('/:id',
  requireRole('admin', 'super_admin'),
  validate(userIdParamSchema),
  UserController.getUserById
);

router.put('/:id/role',
  requireRole('super_admin'),
  validate({
    params: userIdParamSchema,
    body: Joi.object({
      role: Joi.string().valid('user', 'admin', 'moderator').required(),
    }),
  }),
  UserController.updateUserRole
);

router.put('/:id/status',
  requireRole('admin', 'super_admin'),
  validate({
    params: userIdParamSchema,
    body: Joi.object({
      isActive: Joi.boolean().required(),
    }),
  }),
  UserController.toggleUserStatus
);

router.delete('/:id',
  requireRole('super_admin'),
  validate(userIdParamSchema),
  UserController.deleteUser
);

// Bulk operations (admin only)
router.post('/bulk/delete',
  requireRole('super_admin'),
  validate({
    body: Joi.object({
      userIds: Joi.array().items(commonSchemas.id).min(1).required(),
    }),
  }),
  UserController.bulkDeleteUsers
);

export default router;