import { Router } from 'express';
import Joi from 'joi';
import { PaymentController } from '@/controllers/payment.controller';
import { authMiddleware } from '@/middleware/auth';
import { validate } from '@/middleware/validation';

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

/**
 * @swagger
 * /api/payments/create-intent:
 *   post:
 *     summary: Create payment intent
 *     description: Create Stripe payment intent for one-time payment
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 1
 *               currency:
 *                 type: string
 *                 default: usd
 *     responses:
 *       201:
 *         description: Payment intent client secret
 *       400:
 *         description: Invalid amount
 */
router.post('/create-intent', validate(paymentIntentSchema), PaymentController.createIntent);

/**
 * @swagger
 * /api/payments/confirm:
 *   post:
 *     summary: Confirm payment
 *     description: Confirm payment using Stripe client secret or ID
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentIntentId]
 *             properties:
 *               paymentIntentId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment confirmed
 */
router.post('/confirm', validate(confirmPaymentSchema), PaymentController.confirmPayment);

/**
 * @swagger
 * /api/payments:
 *   get:
 *     summary: Get user's payments
 *     description: Get payment history for authenticated user
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: User payments
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
router.get(
  '/',
  (req, res, next) => {
    req.params.userId = (req as any).user?.id || 'current';
    next();
  },
  PaymentController.getUserPayments
);

/**
 * @swagger
 * /api/payments/history:
 *   get:
 *     summary: Get user payments history
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment history
 */
router.get(
  '/history',
  (req, res, next) => {
    req.params.userId = (req as any).user?.id || 'current';
    next();
  },
  PaymentController.getUserPayments
);

/**
 * @swagger
 * /api/payments/{id}:
 *   get:
 *     summary: Get payment details
 *     description: Get specific payment details by ID
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: Payment not found
 */
router.get('/:id', PaymentController.getPayment);

/**
 * @swagger
 * /api/payments/user/{userId}:
 *   get:
 *     summary: Get specific user payments
 *     description: Get payment history for a specific user (admin)
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User payments
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
router.get('/user/:userId', PaymentController.getUserPayments);

/**
 * @summary Refund payment
 * @description Refund a completed payment (partial or full)
 * @tags Payment
 * @security bearerAuth
 * @param id path string.required "Payment ID"
 * @response 200 - Refund initiated
 * @response 400 - Not refundable
 */
router.post('/refund/:id', PaymentController.refundPayment);

/**
 * @summary Create subscription
 * @description Create recurring subscription
 * @tags Payment
 * @security bearerAuth
 * @consumes application/json
 * @body subscriptionSchema
 * @response 201 - Subscription created
 */
router.post('/subscribe', validate(subscriptionSchema), PaymentController.createSubscription);

/**
 * @summary Get subscription status
 * @description Check current subscription status
 * @tags Payment
 * @security bearerAuth
 * @response 200 - Subscription details
 */
router.get('/subscription/status', PaymentController.subscriptionStatus);

/**
 * @summary Stripe webhook
 * @description Receive Stripe payment events (public)
 * @tags Payment
 * @consumes application/json
 * @response 200 - Event acknowledged
 */
router.post('/webhook/stripe', PaymentController.stripeWebhook);

/**
 * @summary Paystack webhook
 * @description Receive Paystack payment events (public)
 * @tags Payment
 * @consumes application/json
 * @response 200 - Event acknowledged
 */
router.post('/webhook/paystack', PaymentController.paystackWebhook);

export default router;
