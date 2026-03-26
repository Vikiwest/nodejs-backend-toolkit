import { queueService } from '@/services/queueService';
import { emailService } from '@/services/emailService';
import { LoggerService } from '@/utils/logger';

export class EmailJobs {
  static async setup(): Promise<void> {
    // Send welcome email job
    await queueService.processQueue('email-welcome', async (job) => {
      const { to, name } = job.data.payload;
      LoggerService.info(`Sending welcome email to ${to}`);
      return await emailService.sendWelcomeEmail(to, name);
    });

    // Send password reset email job
    await queueService.processQueue('email-password-reset', async (job) => {
      const { to, token } = job.data.payload;
      LoggerService.info(`Sending password reset email to ${to}`);
      return await emailService.sendPasswordResetEmail(to, token);
    });

    // Send verification email job
    await queueService.processQueue('email-verification', async (job) => {
      const { to, token } = job.data.payload;
      LoggerService.info(`Sending verification email to ${to}`);
      return await emailService.sendVerificationEmail(to, token);
    });

    // Bulk email job
    await queueService.processQueue('email-bulk', async (job) => {
      const { recipients, subject, template, data } = job.data.payload;
      LoggerService.info(`Sending bulk email to ${recipients.length} recipients`);
      
      const results = [];
      for (const recipient of recipients) {
        const result = await emailService.sendEmail({
          to: recipient,
          subject,
          html: this.renderTemplate(template, { ...data, name: recipient.name }),
        });
        results.push({ recipient, success: result });
      }
      
      return results;
    });
  }

  private static renderTemplate(template: string, data: any): string {
    // Simple template rendering
    let html = template;
    for (const [key, value] of Object.entries(data)) {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }
    return html;
  }
}