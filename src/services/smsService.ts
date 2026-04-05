import twilio from 'twilio';
import { LoggerService } from '../utils/logger';

interface SMSOptions {
  to: string;
  body: string;
  from?: string;
}

export class SMSService {
  private client: twilio.Twilio | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      LoggerService.info('SMS service initialized');
    } else {
      LoggerService.warn('SMS service not configured - missing Twilio credentials');
    }
  }

  async sendSMS(options: SMSOptions): Promise<boolean> {
    if (!this.client) {
      LoggerService.error('SMS client not configured');
      return false;
    }

    try {
      await this.client.messages.create({
        body: options.body,
        from: options.from || process.env.TWILIO_PHONE_NUMBER,
        to: options.to,
      });
      LoggerService.info(`SMS sent to ${options.to}`);
      return true;
    } catch (error) {
      LoggerService.error('Failed to send SMS', error as Error);
      return false;
    }
  }

  async sendWelcomeSMS(to: string, name: string): Promise<boolean> {
    const body = `Welcome ${name}! Your account has been created successfully.`;
    return this.sendSMS({ to, body });
  }

  async sendVerificationSMS(to: string, code: string): Promise<boolean> {
    const body = `Your verification code is: ${code}`;
    return this.sendSMS({ to, body });
  }
}

export const smsService = new SMSService();
