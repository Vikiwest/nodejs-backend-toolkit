import Stripe from 'stripe';
import config from '@/config/env';
import { LoggerService } from '@/utils/logger';

export class PaymentService {
  private stripe: Stripe;

  constructor() {
    if (config.stripe.secretKey) {
      this.stripe = new Stripe(config.stripe.secretKey, {
        apiVersion: '2023-10-16',
      });
      LoggerService.info('Payment service initialized');
    } else {
      LoggerService.warn('Payment service not configured');
    }
  }

  async createPaymentIntent(amount: number, currency: string = 'usd', metadata?: any): Promise<Stripe.PaymentIntent> {
    if (!this.stripe) throw new Error('Payment service not configured');

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return paymentIntent;
    } catch (error) {
      LoggerService.error('Failed to create payment intent', error as Error);
      throw error;
    }
  }

  async confirmPayment(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    if (!this.stripe) throw new Error('Payment service not configured');

    try {
      return await this.stripe.paymentIntents.confirm(paymentIntentId);
    } catch (error) {
      LoggerService.error('Failed to confirm payment', error as Error);
      throw error;
    }
  }

  async refundPayment(paymentIntentId: string, amount?: number): Promise<Stripe.Refund> {
    if (!this.stripe) throw new Error('Payment service not configured');

    try {
      return await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
      });
    } catch (error) {
      LoggerService.error('Failed to refund payment', error as Error);
      throw error;
    }
  }

  async createCustomer(email: string, name?: string): Promise<Stripe.Customer> {
    if (!this.stripe) throw new Error('Payment service not configured');

    try {
      return await this.stripe.customers.create({
        email,
        name,
      });
    } catch (error) {
      LoggerService.error('Failed to create customer', error as Error);
      throw error;
    }
  }

  async createSubscription(customerId: string, priceId: string): Promise<Stripe.Subscription> {
    if (!this.stripe) throw new Error('Payment service not configured');

    try {
      return await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });
    } catch (error) {
      LoggerService.error('Failed to create subscription', error as Error);
      throw error;
    }
  }

  async handleWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        LoggerService.info('Payment succeeded', { paymentIntentId: paymentIntent.id });
        // Handle successful payment
        break;
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        LoggerService.error('Payment failed', { paymentIntentId: failedPayment.id });
        // Handle failed payment
        break;
      case 'customer.subscription.created':
        const subscription = event.data.object as Stripe.Subscription;
        LoggerService.info('Subscription created', { subscriptionId: subscription.id });
        // Handle subscription created
        break;
      default:
        LoggerService.info(`Unhandled event type: ${event.type}`);
    }
  }
}

export const paymentService = new PaymentService();