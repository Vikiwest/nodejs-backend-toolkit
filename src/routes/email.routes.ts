import { Router } from 'express';
import Joi from 'joi';
import { EmailController } from '../controllers/email.controller';
import { authMiddleware, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validation';

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
 * /email/send:
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
 *       200:
 *         description: Email sent
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
 * /email/templates:
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
 * /email/templates/{name}:
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
 *           enum: [welcome, passwordReset, verification]
 *         description: Template name
 *         examples:
 *           welcome:
 *             value: "welcome"
 *             summary: "Welcome email template"
 *           passwordReset:
 *             value: "passwordReset"
 *             summary: "Password reset email template"
 *           verification:
 *             value: "verification"
 *             summary: "Email verification template"
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
 *                 description: Recipient email address
 *                 example: "user@example.com"
 *               data:
 *                 type: object
 *                 description: Template variables for dynamic content
 *                 properties:
 *                   name:
 *                     type: string
 *                     description: User name (for welcome template)
 *                     example: "John Doe"
 *                   dashboardUrl:
 *                     type: string
 *                     format: uri
 *                     description: Dashboard URL (for welcome template)
 *                     example: "https://yourapp.com/dashboard"
 *                   resetUrl:
 *                     type: string
 *                     format: uri
 *                     description: Password reset URL (for passwordReset template)
 *                     example: "https://yourapp.com/reset-password/abc123"
 *                   verifyUrl:
 *                     type: string
 *                     format: uri
 *                     description: Email verification URL (for verification template)
 *                     example: "https://yourapp.com/verify-email/xyz789"
 *           example:
 *             to: "user@example.com"
 *             data:
 *               name: "John Doe"
 *               dashboardUrl: "https://yourapp.com/dashboard"
 *           examples:
 *             welcome:
 *               summary: "Send welcome email"
 *               value:
 *                 to: "user@example.com"
 *                 data:
 *                   name: "John Doe"
 *                   dashboardUrl: "https://yourapp.com/dashboard"
 *             passwordReset:
 *               summary: "Send password reset email"
 *               value:
 *                 to: "user@example.com"
 *                 data:
 *                   resetUrl: "https://yourapp.com/reset-password/abc123"
 *             verification:
 *               summary: "Send email verification"
 *               value:
 *                 to: "user@example.com"
 *                 data:
 *                   verifyUrl: "https://yourapp.com/verify-email/xyz789"
 *     responses:
 *       201:
 *         description: Template email sent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               data: {}
 *               message: "Template email sent"
 */
router.post('/templates/:name', validate(sendTemplateSchema), EmailController.sendTemplate);

/**
 * @swagger
 * /email/bulk:
 *   post:
 *     summary: Send bulk emails
 *     description: Send emails to multiple recipients using a template (admin only)
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
 *                 description: Array of recipient email addresses
 *                 example: ["user1@example.com", "user2@example.com", "user3@example.com"]
 *               template:
 *                 type: string
 *                 description: Template name to use
 *                 enum: [welcome, passwordReset, verification]
 *                 example: "welcome"
 *               data:
 *                 type: object
 *                 description: Template variables for dynamic content (same as single template)
 *                 properties:
 *                   name:
 *                     type: string
 *                     description: User name (for welcome template)
 *                   dashboardUrl:
 *                     type: string
 *                     format: uri
 *                     description: Dashboard URL (for welcome template)
 *                   resetUrl:
 *                     type: string
 *                     format: uri
 *                     description: Password reset URL (for passwordReset template)
 *                   verifyUrl:
 *                     type: string
 *                     format: uri
 *                     description: Email verification URL (for verification template)
 *           example:
 *             recipients: ["user1@example.com", "user2@example.com"]
 *             template: "welcome"
 *             data:
 *               name: "New User"
 *               dashboardUrl: "https://yourapp.com/dashboard"
 *           examples:
 *             welcome:
 *               summary: "Send welcome emails to multiple users"
 *               value:
 *                 recipients: ["user1@example.com", "user2@example.com", "user3@example.com"]
 *                 template: "welcome"
 *                 data:
 *                   name: "Team Member"
 *                   dashboardUrl: "https://yourapp.com/dashboard"
 *             passwordReset:
 *               summary: "Send password reset emails to multiple users"
 *               value:
 *                 recipients: ["user1@example.com", "user2@example.com"]
 *                 template: "passwordReset"
 *                 data:
 *                   resetUrl: "https://yourapp.com/reset-password/bulk-token"
 *             verification:
 *               summary: "Send verification emails to multiple users"
 *               value:
 *                 recipients: ["user1@example.com", "user2@example.com"]
 *                 template: "verification"
 *                 data:
 *                   verifyUrl: "https://yourapp.com/verify-email/bulk-token"
 *     responses:
 *       201:
 *         description: Bulk job queued
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               data: {}
 *               message: "Bulk emails queued"
 */
router.post('/bulk', requireRole('admin'), validate(bulkSchema), EmailController.sendBulk);

/**
 * @swagger
 * /email/logs:
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

/**
 * @swagger
 * /email/test:
 *   post:
 *     summary: Test email service
 *     description: Send a test email to verify email service configuration
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
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
 *                 description: Email address to send test to
 *     responses:
 *       200:
 *         description: Test email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       500:
 *         description: Email service test failed
 */
router.post('/test', EmailController.testEmail);

export default router;
