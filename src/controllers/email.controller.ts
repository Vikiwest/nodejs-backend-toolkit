import { Response } from 'express';
import { emailService } from '@/services/emailService';
import { ApiResponseUtil } from '@/utils/apiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { AuthRequest } from '@/types';

export class EmailController {
  /**
   * @swagger
   * /api/email/send:
   *   post:
   *     summary: Send email (authenticated)
   *     tags: [Email]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               to:
   *                 type: string
   *                 format: email
   *               subject:
   *                 type: string
   *               html:
   *                 type: string
   *     responses:
   *       200:
   *         description: Email sent
   */
  static sendEmail = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { to, subject, html, text } = req.body;

    await emailService.sendEmail({
      to,
      subject,
      html,
      text,
      from: req.user!.email,
    });

    ApiResponseUtil.success(res, null, 'Email sent successfully');
  });

  static getTemplates = asyncHandler(async (_req: AuthRequest, res: Response) => {
    // Stub templates
    const templates = ['welcome', 'passwordReset', 'verification', 'subscription'];

    ApiResponseUtil.success(res, templates);
  });

  static sendTemplate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, to, data = {} } = req.body;
    const template = await emailService.getTemplate(name, data);

    await emailService.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
    });

    ApiResponseUtil.success(res, null, 'Template email sent');
  });

  static sendBulk = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { recipients } = req.body;

    // Queue bulk emails
    for (const recipient of recipients) {
      // TODO: Implement bulk email queuing
      console.log(`Would send email to: ${recipient}`);
    }

    ApiResponseUtil.success(res, null, 'Bulk emails queued');
  });

  static getLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Stub email logs
    const logs: any[] = [];
    ApiResponseUtil.success(res, logs);
  });
}
