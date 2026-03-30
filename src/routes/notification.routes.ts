import { Router } from 'express';
import { NotificationController } from '@/controllers/notification.controller';
import { authMiddleware } from '@/middleware/auth';
import { validate } from '@/middleware/validation';
import Joi from 'joi';

const router = Router();

// Validation schemas
const preferencesSchema = {
  body: Joi.object({
    email: Joi.boolean(),
    push: Joi.boolean(),
    sms: Joi.boolean(),
  }),
};

const notificationIdSchema = {
  params: Joi.object({
    id: Joi.string().required(),
  }),
};

// Auth required for notifications
router.use(authMiddleware());

// Notification endpoints - ALL from task
router.get('/', NotificationController.getNotifications);
router.get('/unread', NotificationController.getUnreadCount);
router.put('/:id/read', validate(notificationIdSchema), NotificationController.markAsRead);
router.put('/read-all', NotificationController.markAllRead);
router.delete('/:id', validate(notificationIdSchema), NotificationController.deleteNotification);
router.post('/preferences', validate(preferencesSchema), NotificationController.updatePreferences);

export default router;
