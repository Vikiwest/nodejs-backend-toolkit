import { emailService } from '@/services/emailService';
import { describe, it, expect } from '@jest/globals';

describe('Email Service - Unit Tests', () => {
  describe('Email Templates', () => {
    it('should retrieve welcome template', async () => {
      const template = await emailService.getTemplate('welcome', {
        name: 'Test User',
      });
      expect(template).toBeDefined();
      expect(template.subject).toBeDefined();
      expect(template.html).toBeDefined();
    });

    it('should retrieve password reset template', async () => {
      const template = await emailService.getTemplate('passwordReset', {
        resetUrl: 'https://example.com/reset',
      });
      expect(template).toBeDefined();
      expect(template.subject).toBe('Password Reset');
    });

    it('should retrieve verification template', async () => {
      const template = await emailService.getTemplate('verification', {
        verifyUrl: 'https://example.com/verify',
      });
      expect(template).toBeDefined();
    });

    it('should throw on unknown template', async () => {
      await expect(emailService.getTemplate('unknown', {})).rejects.toThrow();
    });
  });

  describe('Email Content Generation', () => {
    it('should generate welcome email html', async () => {
      const template = await emailService.getTemplate('welcome', {
        name: 'John Doe',
      });
      expect(template.html).toContain('John Doe');
    });

    it('should generate reset email html', async () => {
      const resetUrl = 'https://example.com/reset/token123';
      const template = await emailService.getTemplate('passwordReset', {
        resetUrl: resetUrl,
      });
      expect(template.html).toContain(resetUrl);
    });

    it('should mark templates as defined', () => {
      expect(emailService).toBeDefined();
      expect(emailService.sendEmail).toBeDefined();
      expect(emailService.getTemplate).toBeDefined();
    });
  });
});
