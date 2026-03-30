import { queueService } from '@/services/queueService';
import { emailService } from '@/services/emailService';
import { LoggerService } from '@/utils/logger';

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
      const { recipients, subject, template, data } = job.data.payload;
      LoggerService.info(`Processing bulk email to ${recipients.length} recipients`);

      const results = [];
      for (const recipient of recipients) {
        try {
          const result = await emailService.sendEmail({
            to: recipient,
            subject,
            html: EmailJobs.renderTemplate(template, { ...data, name: recipient.name }),
          });
          results.push({ recipient, success: true });
        } catch (error) {
          results.push({ recipient, success: false, error });
        }
      }

      LoggerService.info(
        `Bulk email completed: ${results.filter((r) => r.success).length}/${recipients.length}`
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
