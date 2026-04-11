import { queueService } from '../services/queueService';
import { emailService } from '../services/emailService';
import { LoggerService } from '../utils/logger';

export class EmailJobs {
  static setup(): void {
    // Listen for email jobs instead of processQueue
    queueService.on('job:email-welcome', async (job: any) => {
      const { to, name } = job.data.payload;
      LoggerService.info(`Sending welcome email to ${to}`);
      try {
        await emailService.sendWelcomeEmail(to, name);
      } catch (error) {
        LoggerService.error(`Welcome email failed for ${to}`, error as Error);
        throw error;
      }
    });

    queueService.on('job:email-password-reset', async (job: any) => {
      const { to, token } = job.data.payload;
      LoggerService.info(`Sending password reset email to ${to}`);
      try {
        await emailService.sendPasswordResetEmail(to, token);
      } catch (error) {
        LoggerService.error(`Password reset email failed for ${to}`, error as Error);
        throw error;
      }
    });

    queueService.on('job:email-verification', async (job: any) => {
      const { to, token } = job.data.payload;
      LoggerService.info(`Sending verification email to ${to}`);
      try {
        await emailService.sendVerificationEmail(to, token);
      } catch (error) {
        LoggerService.error(`Verification email failed for ${to}`, error as Error);
        throw error;
      }
    });

    queueService.on('job:email-bulk', async (job: any) => {
      const { recipients, template, data } = job.data.payload;
      LoggerService.info(
        `Processing bulk email to ${recipients.length} recipients using template "${template}"`
      );

      const results = [];
      for (const recipient of recipients) {
        try {
          // Get the template with recipient-specific data
          const emailTemplate = await emailService.getTemplate(template, {
            ...data,
            recipient: recipient, // Add recipient info if needed
          });

          await emailService.sendEmail({
            to: recipient,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
          });
          results.push({ recipient, success: true });
        } catch (error) {
          LoggerService.error(`Bulk email failed for ${recipient}`, error as Error);
          results.push({ recipient, success: false, error: (error as Error).message });
        }
      }

      LoggerService.info(
        `Bulk email completed: ${results.filter((r) => r.success).length}/${recipients.length} successful`
      );
      return results;
    });
  }

  private static renderTemplate(template: string, data: any): string {
    let html = template;
    for (const [key, value] of Object.entries(data)) {
      html = html.replace(new RegExp(`{{${String(key)}}}`, 'g'), String(value));
    }
    return html;
  }
}
