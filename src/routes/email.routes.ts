import { Router } from 'express';
import { EmailController } from '@/controllers/email.controller';
import { authMiddleware, requireRole } from '@/middleware/auth';
import { validate } from '@/middleware/validation';
import Joi from 'joi';

const router = Router();

// Validation schemas
const sendEmailSchema = {
  body: Joi.object({
    to: Joi.string().email().required(),
    subject: Joi.string().required(),
    html: Joi.string().required(),
    text: Joi.string().optional(),
  }),
};

const sendTemplateSchema = {
  body: Joi.object({
    name: Joi.string().required(),
    to: Joi.string().email().required(),
    data: Joi.object().optional(),
  }),
};

const bulkSchema = {
  body: Joi.object({
    recipients: Joi.array().items(Joi.string().email()).required(),
    template: Joi.string().required(),
    data: Joi.object().optional(),
  }),
};

// Auth required, admin for bulk
router.use(authMiddleware());

// Email endpoints - ALL from task
router.post('/send', validate(sendEmailSchema), EmailController.sendEmail);
router.get('/templates', EmailController.getTemplates);
router.post('/templates/:name', validate(sendTemplateSchema), EmailController.sendTemplate);
router.post('/bulk', requireRole('admin'), validate(bulkSchema), EmailController.sendBulk);
router.get('/logs', EmailController.getLogs);

export default router;
