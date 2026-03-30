import { Router } from 'express';
import Joi from 'joi';
import { DashboardController } from '@/controllers/dashboard.controller';
import { authMiddleware, requireRole } from '@/middleware/auth';
import { validate } from '@/middleware/validation';

const router = Router();

// All dashboard routes require admin authentication
router.use(authMiddleware());
router.use(requireRole('admin', 'super_admin'));

// Dashboard endpoints - ALL from task
router.get('/stats', DashboardController.getStats);
router.get('/realtime', DashboardController.getRealtime);
router.get('/activity', DashboardController.getActivity);
router.get(
  '/users-growth',
  validate({
    query: Joi.object({
      days: Joi.number().default(30),
    }),
  }),
  DashboardController.getUsersGrowth
);
router.get('/api-usage', DashboardController.getApiUsage);
router.get('/errors', DashboardController.getErrors);

export default router;
