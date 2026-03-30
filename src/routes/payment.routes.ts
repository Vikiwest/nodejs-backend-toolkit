import { Router } from 'express';
import { PaymentController } from '@/controllers/payment.controller';
import { authMiddleware } from '@/middleware/auth';
import { validate } from '@/middleware/validation';
import Joi from 'joi';

const router = Router();

// Validation schemas
const paymentIntentSchema = {
  body: Joi.object({
    amount: Joi.number().positive().required(),
    currency: Joi.string().default('usd'),
  }),
};

const confirmPaymentSchema = {
  body: Joi.object({
    paymentIntentId: Joi.string().required(),
  }),
};

const subscriptionSchema = {
  body: Joi.object({
    priceId: Joi.string().required(),
  }),
};

// Auth required for user payments
router.use(authMiddleware());

// Payments endpoints - ALL from task
router.post('/create-intent', validate(paymentIntentSchema), PaymentController.createIntent);
router.post('/confirm', validate(confirmPaymentSchema), PaymentController.confirmPayment);
router.get('/:id', PaymentController.getPayment);
router.post('/refund/:id', PaymentController.refundPayment);
router.post('/subscribe', validate(subscriptionSchema), PaymentController.createSubscription);
router.get('/subscription/status', PaymentController.subscriptionStatus);

// Webhooks - public
router.post('/webhook/stripe', PaymentController.stripeWebhook);
router.post('/webhook/paystack', PaymentController.paystackWebhook);

export default router;
