import Paystack from 'paystack';
import config from '@/config/env';
import { LoggerService } from '@/utils/logger';

interface PaystackPaymentData {
  reference: string;
  authorization_url: string;
  access_code: string;
  amount: number;
  currency: string;
  email: string;
}

export class PaymentService {
  private paystack: any;

  constructor() {
    if (config.paystack && config.paystack.secretKey) {
      this.paystack = Paystack(config.paystack.secretKey);
      LoggerService.info('Paystack payment service initialized');
    } else {
      LoggerService.warn('Paystack payment service not configured');
    }
  }

  async createPaymentIntent(
    amount: number,
    currency: string = 'ngn',
    email: string,
    metadata?: any
  ): Promise<PaystackPaymentData> {
    if (!this.paystack) throw new Error('Payment service not configured');

    try {
      const response: any = await new Promise((resolve, reject) => {
        this.paystack.transaction.initialize(
          {
            amount: Math.round(amount * 100),
            currency,
            email,
            metadata: metadata || {},
            channels: ['card', 'bank_transfer', 'ussd', 'qr'],
            callback_url: `${process.env.APP_URL || 'http://localhost:3002'}/payment/callback`,
            reference: 'ref_' + Math.random().toString(36).substr(2, 9),
          },
          (error: any, body: any) => {
            if (error) reject(error);
            resolve(body);
          }
        );
      });

      return response.data;
    } catch (error) {
      LoggerService.error('Failed to create payment intent', error as Error);
      throw error;
    }
  }

  async verifyPayment(reference: string): Promise<any> {
    if (!this.paystack) throw new Error('Payment service not configured');

    try {
      const response: any = await new Promise((resolve, reject) => {
        this.paystack.transaction.verify(reference, (error: any, body: any) => {
          if (error) reject(error);
          resolve(body);
        });
      });

      LoggerService.info('Payment verified', { reference });
      return response.data;
    } catch (error) {
      LoggerService.error('Failed to verify payment', error as Error);
      throw error;
    }
  }

  async refundPayment(transactionId: string): Promise<any> {
    if (!this.paystack) throw new Error('Payment service not configured');

    try {
      const response: any = await new Promise((resolve, reject) => {
        this.paystack.transaction.refund(transactionId, (error: any, body: any) => {
          if (error) reject(error);
          resolve(body);
        });
      });

      LoggerService.info('Refund processed', { transactionId });
      return response.data;
    } catch (error) {
      LoggerService.error('Failed to refund payment', error as Error);
      throw error;
    }
  }

  async createCustomer(email: string, name?: string): Promise<any> {
    if (!this.paystack) throw new Error('Payment service not configured');

    try {
      const response: any = await new Promise((resolve, reject) => {
        this.paystack.customer.create(
          {
            email,
            first_name: name ? name.split(' ')[0] : '',
            last_name: name ? name.split(' ').slice(1).join(' ') : '',
            phone: '',
            metadata: {},
          },
          (error: any, body: any) => {
            if (error) reject(error);
            resolve(body);
          }
        );
      });
      return response.data;
    } catch (error) {
      LoggerService.error('Failed to create customer', error as Error);
      throw error;
    }
  }

  async handleWebhook(event: any): Promise<void> {
    try {
      LoggerService.info('Paystack webhook', event);
      // Verify & process
    } catch (error) {
      LoggerService.error('Webhook error', error as Error);
    }
  }
}

export const paymentService = new PaymentService();
