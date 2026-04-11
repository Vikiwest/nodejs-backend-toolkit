import nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { LoggerService } from '../utils/logger';

interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
  }>;
}

export class EmailService {
  private transporter: Transporter | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: parseInt(process.env.EMAIL_PORT || '587') === 465,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
      LoggerService.info('Email service initialized');
    } else {
      LoggerService.warn('Email service not configured - missing credentials');
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      LoggerService.error('Email transporter not configured');
      return false;
    }

    try {
      const htmlContent = options.html
        ? options.html.trim().startsWith('<!DOCTYPE html>') ||
          options.html.trim().startsWith('<html')
          ? options.html
          : `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head><body>${options.html}</body></html>`
        : undefined;

      const defaultText = options.html ? options.html.replace(/<[^>]+>/g, '').trim() : undefined;
      const mailOptions: any = {
        from: options.from || process.env.EMAIL_FROM || 'no-reply@yourapp.com',
        to: Array.isArray(options.to) ? options.to.join(',') : options.to,
        subject: options.subject,
        cc: options.cc,
        bcc: options.bcc,
        attachments: options.attachments,
      };

      if (htmlContent) {
        mailOptions.html = htmlContent;
      }

      if (options.text) {
        mailOptions.text = options.text;
      } else if (!htmlContent) {
        mailOptions.text = defaultText;
      } else {
        mailOptions.text = defaultText;
      }

      const info = await this.transporter.sendMail(mailOptions);
      LoggerService.info(`Email sent to ${options.to}: ${info.messageId}`);
      return true;
    } catch (error) {
      LoggerService.error('Email send error', error as Error);
      return false;
    }
  }

  private getBaseTemplate(
    content: string,
    options: {
      title: string;
      headerColor?: string;
      buttonText?: string;
      buttonUrl?: string;
    }
  ): string {
    const headerColor = options.headerColor || '#4F46E5';
    const buttonText = options.buttonText || '';
    const buttonUrl = options.buttonUrl || '';

    return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${options.title}</title>
  <style>
    /* Client-specific styles */
    #outlook a { padding: 0; }
    .ReadMsgBody { width: 100%; }
    .ExternalClass { width: 100%; }
    .ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div { line-height: 100%; }
    table, td { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img, a img { border: 0; height: auto; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    body, table, td, p, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    
    /* Responsive styles */
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .mobile-padding { padding: 20px !important; }
      .mobile-stack { display: block !important; width: 100% !important; text-align: center !important; }
      .button { display: block !important; width: 100% !important; }
      h1 { font-size: 28px !important; }
      h2 { font-size: 24px !important; }
    }
    
    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .dark-mode-bg { background-color: #1a1a1a !important; }
      .dark-mode-text { color: #ffffff !important; }
      .dark-mode-card { background-color: #2d2d2d !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7fb; font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;">
  <div style="background-color: #f4f7fb; padding: 40px 20px;">
    <table role="presentation" align="center" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto;">
      <tr>
        <td>
          <!-- Header -->
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, ${headerColor} 0%, ${this.adjustColor(headerColor, -20)} 100%); border-radius: 20px 20px 0 0;">
            <tr>
              <td style="padding: 40px 30px; text-align: center;">
                <div style="font-size: 48px; margin-bottom: 10px;">🚀</div>
                <h1 style="color: #ffffff; font-size: 32px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">${options.title}</h1>
              </td>
            </tr>
          </table>
          
          <!-- Content Card -->
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border-radius: 0 0 20px 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <tr>
              <td class="mobile-padding" style="padding: 40px 30px;">
                ${content}
                
                ${
                  buttonUrl && buttonText
                    ? `
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${buttonUrl}" class="button" style="display: inline-block; background: linear-gradient(135deg, ${headerColor} 0%, ${this.adjustColor(headerColor, -20)} 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 50px; font-weight: 600; font-size: 16px; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    ${buttonText}
                  </a>
                </div>
                `
                    : ''
                }
              </td>
            </tr>
          </table>
          
          <!-- Footer -->
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 30px;">
            <tr>
              <td style="text-align: center; padding: 20px;">
                <p style="color: #6b7280; font-size: 12px; margin: 0 0 10px 0;">
                  &copy; ${new Date().getFullYear()} BackendToolkit. All rights reserved.
                </p>
                <p style="color: #6b7280; font-size: 12px; margin: 0;">
                  Built with ❤️ for developers
                </p>
                <div style="margin-top: 15px;">
                  <a href="#" style="color: #9ca3af; text-decoration: none; font-size: 11px; margin: 0 10px;">Privacy Policy</a>
                  <span style="color: #d1d5db;">|</span>
                  <a href="#" style="color: #9ca3af; text-decoration: none; font-size: 11px; margin: 0 10px;">Terms of Service</a>
                  <span style="color: #d1d5db;">|</span>
                  <a href="#" style="color: #9ca3af; text-decoration: none; font-size: 11px; margin: 0 10px;">Support</a>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
  }

  private adjustColor(color: string, _percent: number): string {
    // Simple color adjustment for gradients
    // For production, consider using a proper color manipulation library
    return color;
  }

  async sendWelcomeEmail(to: string, name: string): Promise<boolean> {
    const content = `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="font-size: 64px; margin-bottom: 20px;">🎉</div>
        <h2 style="color: #1f2937; font-size: 26px; font-weight: 700; margin: 0 0 10px 0;">Welcome aboard, ${name}! 👋</h2>
        <p style="color: #6b7280; font-size: 16px; margin: 0;">We're thrilled to have you join our community.</p>
      </div>
      
      <div style="border-top: 2px solid #f3f4f6; margin: 30px 0;"></div>
      
      <h3 style="color: #374151; font-size: 18px; font-weight: 600; margin: 0 0 15px 0;">✨ Here's what you can do next:</h3>
      
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0;">
        <tr>
          <td style="padding: 10px 0;">
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
              <div style="width: 40px; height: 40px; background: #eef2ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px;">📝</div>
              <div>
                <strong style="color: #1f2937; display: block;">Complete your profile</strong>
                <span style="color: #6b7280; font-size: 14px;">Add your details to personalize your experience</span>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
              <div style="width: 40px; height: 40px; background: #eef2ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px;">🔧</div>
              <div>
                <strong style="color: #1f2937; display: block;">Explore features</strong>
                <span style="color: #6b7280; font-size: 14px;">Discover all the tools and capabilities</span>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
              <div style="width: 40px; height: 40px; background: #eef2ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px;">👥</div>
              <div>
                <strong style="color: #1f2937; display: block;">Connect with community</strong>
                <span style="color: #6b7280; font-size: 14px;">Join discussions and share your ideas</span>
              </div>
            </div>
          </td>
        </tr>
      </table>
      
      <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
        <p style="color: #4b5563; font-size: 14px; margin: 0 0 10px 0;">Need help getting started?</p>
        <p style="color: #6b7280; font-size: 13px; margin: 0;">Check out our <a href="#" style="color: #4F46E5; text-decoration: none;">documentation</a> or <a href="#" style="color: #4F46E5; text-decoration: none;">contact support</a></p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: '🎉 Welcome to BackendToolkit!',
      html: this.getBaseTemplate(content, {
        title: 'Welcome!',
        headerColor: '#4F46E5',
        buttonText: 'Go to Dashboard',
        buttonUrl: `${process.env.APP_URL || 'http://localhost:3002'}/dashboard`,
      }),
    });
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<boolean> {
    const resetUrl = `${process.env.APP_URL || 'http://localhost:3002'}/api/auth/reset-password/${token}`;

    const content = `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="font-size: 64px; margin-bottom: 20px;">🔐</div>
        <h2 style="color: #1f2937; font-size: 26px; font-weight: 700; margin: 0 0 10px 0;">Password Reset Request</h2>
        <p style="color: #6b7280; font-size: 16px; margin: 0;">We received a request to reset your password</p>
      </div>
      
      <div style="border-top: 2px solid #f3f4f6; margin: 30px 0;"></div>
      
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Hello there! 👋
      </p>
      
      <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
        Someone (hopefully you) requested to reset the password for your BackendToolkit account. 
        If this was you, click the button below to set a new password.
      </p>
      
      <div style="background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 20px;">⚠️</span>
          <div>
            <strong style="color: #92400e; display: block;">Important Security Notice</strong>
            <span style="color: #78350f; font-size: 13px;">This link will expire in 1 hour for your security</span>
          </div>
        </div>
      </div>
      
      <div style="background: #f9fafb; border-radius: 12px; padding: 15px; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 13px; margin: 0 0 5px 0;">Link not working? Copy and paste this URL:</p>
        <code style="display: block; background: #e5e7eb; padding: 10px; border-radius: 6px; font-size: 12px; word-break: break-all; color: #374151;">${resetUrl}</code>
      </div>
      
      <div style="background: #fef2f2; border-radius: 8px; padding: 15px; margin: 20px 0;">
        <p style="color: #991b1b; font-size: 13px; margin: 0;">
          🔒 If you didn't request this, please ignore this email. Your password will remain unchanged.
        </p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: '🔒 Password Reset Request - BackendToolkit',
      html: this.getBaseTemplate(content, {
        title: 'Reset Your Password',
        headerColor: '#F59E0B',
        buttonText: 'Reset Password',
        buttonUrl: resetUrl,
      }),
    });
  }

  async sendVerificationEmail(to: string, token: string): Promise<boolean> {
    const baseUrl = process.env.APP_URL || 'http://localhost:3002';
    const verifyUrl = `${baseUrl}/api/auth/verify-email/${token}`;

    const content = `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="font-size: 64px; margin-bottom: 20px;">✉️</div>
        <h2 style="color: #1f2937; font-size: 26px; font-weight: 700; margin: 0 0 10px 0;">Verify Your Email Address</h2>
        <p style="color: #6b7280; font-size: 16px; margin: 0;">One more step to unlock all features</p>
      </div>
      
      <div style="border-top: 2px solid #f3f4f6; margin: 30px 0;"></div>
      
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Thanks for signing up! 🎉
      </p>
      
      <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
        Please verify your email address to activate your account and get full access to all features. 
        Just click the button below and you're all set!
      </p>
      
      <div style="background: linear-gradient(135deg, #e0e7ff 0%, #eef2ff 100%); border-radius: 12px; padding: 25px; text-align: center; margin: 20px 0;">
        <p style="color: #4338ca; font-size: 14px; font-weight: 600; margin: 0 0 10px 0;">Why verify your email?</p>
        <p style="color: #3730a3; font-size: 13px; margin: 0;">
          ✓ Secure your account<br>
          ✓ Receive important notifications<br>
          ✓ Access all premium features<br>
          ✓ Recover your account if needed
        </p>
      </div>
      
      <div style="background: #f9fafb; border-radius: 12px; padding: 15px; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 13px; margin: 0 0 5px 0;">Button not working? Copy and paste this URL:</p>
        <code style="display: block; background: #e5e7eb; padding: 10px; border-radius: 6px; font-size: 12px; word-break: break-all; color: #374151;">${verifyUrl}</code>
      </div>
      
      <div style="background: #f0fdf4; border-radius: 8px; padding: 15px; margin: 20px 0;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 20px;">💡</span>
          <div>
            <strong style="color: #166534; display: block;">Pro Tip</strong>
            <span style="color: #14532d; font-size: 13px;">After verification, you can update your profile and explore all features!</span>
          </div>
        </div>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: '✅ Verify Your Email - BackendToolkit',
      html: this.getBaseTemplate(content, {
        title: 'Email Verification',
        headerColor: '#3B82F6',
        buttonText: 'Verify Email Address',
        buttonUrl: verifyUrl,
      }),
    });
  }

  async getTemplate(name: string, data: any = {}): Promise<{ subject: string; html: string }> {
    const templates: { [key: string]: { subject: string; html: string } } = {
      welcome: {
        subject: '🎉 Welcome to BackendToolkit!',
        html: this.getBaseTemplate(
          `
          <h2>Welcome ${data.name || 'User'}! 👋</h2>
          <p>Thank you for joining us. We're excited to have you on board!</p>
        `,
          {
            title: 'Welcome!',
            headerColor: '#4F46E5',
            buttonText: 'Get Started',
            buttonUrl: data.dashboardUrl,
          }
        ),
      },
      passwordReset: {
        subject: '🔒 Password Reset Request',
        html: this.getBaseTemplate(
          `
          <h2>Reset Your Password</h2>
          <p>Click the button below to reset your password.</p>
        `,
          {
            title: 'Reset Password',
            headerColor: '#F59E0B',
            buttonText: 'Reset Password',
            buttonUrl: data.resetUrl,
          }
        ),
      },
      verification: {
        subject: '✅ Verify Your Email',
        html: this.getBaseTemplate(
          `
          <h2>Verify Your Email</h2>
          <p>Click the button below to verify your email address.</p>
        `,
          {
            title: 'Email Verification',
            headerColor: '#3B82F6',
            buttonText: 'Verify Email',
            buttonUrl: data.verifyUrl,
          }
        ),
      },
    };

    const template = templates[name];
    if (!template) {
      throw new Error(`Template ${name} not found`);
    }

    return template;
  }
}

export const emailService = new EmailService();
