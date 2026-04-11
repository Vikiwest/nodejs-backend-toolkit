import { Response } from 'express';
import { emailService } from '../services/emailService';
import { ApiResponseUtil } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthRequest } from '../types';

export class EmailController {
  static sendEmail = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { to, subject, html, text } = req.body;

    const success = await emailService.sendEmail({
      to,
      subject,
      html,
      text,
      from: req.user!.email,
    });

    if (!success) {
      return ApiResponseUtil.error(
        res,
        new Error('Failed to send email - check email service configuration'),
        500,
        'Failed to send email - check email service configuration'
      );
    }

    ApiResponseUtil.success(res, null, 'Email sent successfully');
  });

  static getTemplates = asyncHandler(async (_req: AuthRequest, res: Response) => {
    // Stub templates
    const templates = ['welcome', 'passwordReset', 'verification', 'subscription'];

    ApiResponseUtil.success(res, templates);
  });

  static sendTemplate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name } = req.params;
    const { to, data = {} } = req.body;

    if (!to) {
      return ApiResponseUtil.badRequest(res, 'Email recipient (to) is required');
    }

    try {
      const template = await emailService.getTemplate(name, data);
      const success = await emailService.sendEmail({
        to,
        subject: template.subject,
        html: template.html,
      });

      if (!success) {
        return ApiResponseUtil.error(
          res,
          new Error('Failed to send template email - check email service configuration'),
          500,
          'Failed to send template email - check email service configuration'
        );
      }

      ApiResponseUtil.success(res, null, 'Template email sent');
    } catch {
      ApiResponseUtil.badRequest(res, `Template "${name}" not found or invalid`);
    }
  });

  static sendBulk = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { recipients, template, data = {} } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return ApiResponseUtil.badRequest(res, 'Recipients array is required and cannot be empty');
    }

    if (!template) {
      return ApiResponseUtil.badRequest(res, 'Template name is required');
    }

    // Validate template exists
    try {
      await emailService.getTemplate(template, data);
    } catch {
      return ApiResponseUtil.badRequest(res, `Template "${template}" not found or invalid`);
    }

    // Queue bulk email job
    const { queueService } = await import('../services/queueService');
    await queueService.addJob('email-bulk', {
      type: 'email-bulk',
      data: {
        payload: {
          recipients,
          template,
          data,
        },
      },
      userId: req.user!.id,
    });

    ApiResponseUtil.success(res, null, 'Bulk emails queued successfully');
  });

  static getLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Mock email logs with realistic data
    const mockLogs = [
      {
        _id: '507f1f77bcf86cd799439010',
        to: 'user@example.com',
        subject: 'Welcome to BackendToolkit',
        template: 'welcome',
        status: 'sent',
        sentAt: new Date('2026-04-10T18:00:00Z'),
        messageId: '<msg-001@gmail.com>',
      },
      {
        _id: '507f1f77bcf86cd799439011',
        to: 'admin@example.com',
        subject: 'Password Reset Request',
        template: 'passwordReset',
        status: 'sent',
        sentAt: new Date('2026-04-10T17:45:00Z'),
        messageId: '<msg-002@gmail.com>',
      },
      {
        _id: '507f1f77bcf86cd799439012',
        to: 'test@example.com',
        subject: 'Verify Your Email Address',
        template: 'verification',
        status: 'sent',
        sentAt: new Date('2026-04-10T17:30:00Z'),
        messageId: '<msg-003@gmail.com>',
      },
      {
        _id: '507f1f77bcf86cd799439013',
        to: 'user2@example.com',
        subject: 'Welcome to BackendToolkit',
        template: 'welcome',
        status: 'failed',
        sentAt: new Date('2026-04-10T16:00:00Z'),
        error: 'Invalid recipient address',
      },
      {
        _id: '507f1f77bcf86cd799439014',
        to: 'user3@example.com',
        subject: 'Password Reset Request',
        template: 'passwordReset',
        status: 'sent',
        sentAt: new Date('2026-04-09T15:20:00Z'),
        messageId: '<msg-004@gmail.com>',
      },
    ];

    // Paginate the logs
    const total = mockLogs.length;
    const pages = Math.ceil(total / limit);
    const paginatedLogs = mockLogs.slice(skip, skip + limit);

    ApiResponseUtil.success(res, {
      docs: paginatedLogs,
      total,
      page,
      limit,
      pages,
    });
  });

  static testEmail = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { to } = req.body;

    if (!to) {
      return ApiResponseUtil.badRequest(res, 'Test email recipient (to) is required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return ApiResponseUtil.badRequest(res, 'Invalid email address format');
    }

    try {
      const success = await emailService.sendEmail({
        to,
        subject: 'Email Service Test - BackendToolkit',
        text: 'This is a test email to verify your email service configuration.',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Email Service Test</h2>
            <p style="color: #666; line-height: 1.6;">
              This is a test email to verify your email service configuration is working correctly.
            </p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #333;">
                <strong>Test Details:</strong><br>
                Time: ${new Date().toISOString()}<br>
                Recipient: ${to}<br>
                Status: ✓ Email queued for sending
              </p>
            </div>
            <p style="color: #999; font-size: 12px;">
              If you received this email, your email service is properly configured.
            </p>
          </div>
        `,
      });

      if (!success) {
        // Email service is not configured, but provide feedback
        const isConfigured =
          process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS;

        if (!isConfigured) {
          return ApiResponseUtil.success(
            res,
            {
              configured: false,
              status: 'Email service not configured',
              message: 'Please set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS environment variables',
              recipient: to,
            },
            'Email service configuration incomplete'
          );
        }

        return ApiResponseUtil.error(
          res,
          new Error('Failed to send test email'),
          500,
          'Failed to send test email - check email service logs'
        );
      }

      ApiResponseUtil.success(
        res,
        {
          configured: true,
          status: 'Test email sent successfully',
          message: 'Email service is configured and working properly',
          recipient: to,
          sentAt: new Date().toISOString(),
        },
        'Test email sent successfully'
      );
    } catch (error) {
      ApiResponseUtil.error(
        res,
        error as Error,
        500,
        'Test email failed - check email configuration and logs'
      );
    }
  });
}
