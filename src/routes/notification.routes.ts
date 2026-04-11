import { Router } from 'express';
import Joi from 'joi';
import { NotificationController } from '../controllers/notification.controller';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validation';

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

router.get('/', NotificationController.getNotifications);

router.put('/read-all', NotificationController.markAllRead);

router.put('/preferences', validate(preferencesSchema), NotificationController.updatePreferences);

router.put('/:id/read', validate(notificationIdSchema), NotificationController.markAsRead);

router.delete('/:id', validate(notificationIdSchema), NotificationController.deleteNotification);

export default router;
