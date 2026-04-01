import { Router } from 'express';
import Joi from 'joi';
import { EmailController } from '@/controllers/email.controller';
import { authMiddleware, requireRole } from '@/middleware/auth';
import { validate } from '@/middleware/validation';

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

/**
 * @swagger
 * /api/email/send:
 *   post:
 *     summary: Send email
 *     description: Send custom HTML email (authenticated users)
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [to, subject, html]
 *             properties:
 *               to:
 *                 type: string
 *                 format: email
 *               subject:
 *                 type: string
 *               html:
 *                 type: string
 *               text:
 *                 type: string
 *     responses:
 *       201:
 *         description: Email queued
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid recipient
 */
router.post('/send', validate(sendEmailSchema), EmailController.sendEmail);

/**
 * @swagger
 * /api/email/templates:
 *   get:
 *     summary: Get email templates
 *     description: List available email templates
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Available templates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       variables:
 *                         type: array
 *                         items:
 *                           type: string
 */
router.get('/templates', EmailController.getTemplates);

/**
 * @swagger
 * /api/email/templates/{name}:
 *   post:
 *     summary: Send template email
 *     description: Send pre-defined template email
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Template name
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [to]
 *             properties:
 *               to:
 *                 type: string
 *                 format: email
 *               data:
 *                 type: object
 *     responses:
 *       201:
 *         description: Template email sent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post('/templates/:name', validate(sendTemplateSchema), EmailController.sendTemplate);

/**
 * @swagger
 * /api/email/bulk:
 *   post:
 *     summary: Send bulk emails
 *     description: Send emails to multiple recipients (admin only)
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [recipients, template]
 *             properties:
 *               recipients:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: email
 *               template:
 *                 type: string
 *               data:
 *                 type: object
 *     responses:
 *       201:
 *         description: Bulk job queued
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post('/bulk', requireRole('admin'), validate(bulkSchema), EmailController.sendBulk);

/**
 * @swagger
 * /api/email/logs:
 *   get:
 *     summary: Get email sending logs
 *     description: View recent email sending logs
 *     tags: [Email]
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
 *           default: 20
 *     responses:
 *       200:
 *         description: Email logs
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
router.get('/logs', EmailController.getLogs);

export default router;
