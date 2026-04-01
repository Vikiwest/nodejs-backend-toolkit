// Payment Controller Stub - Add STRIPE_SECRET_KEY to .env
import { Request, Response } from 'express';
import { ApiResponseUtil } from '@/utils/apiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { AuthRequest } from '@/types';

export class PaymentController {
  static createIntent = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { amount, currency = 'usd' } = req.body;
    // Stripe stub - add real impl with env vars
    ApiResponseUtil.success(res, { clientSecret: 'pi_stub_123_secret_456' });
  });

  static confirmPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
    ApiResponseUtil.success(res, { status: 'succeeded' });
  });

  static getPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    ApiResponseUtil.success(res, { id, status: 'succeeded' });
  });

  static getUserPayments = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;
    const { page = '1', limit = '10' } = req.query as any;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    // Stub data
    const payments = Array.from({ length: limitNum }, (_, i) => ({
      id: `pay_${userId}_${i + 1}`,
      amount: 100 + i * 5,
      currency: 'usd',
      status: 'succeeded',
      userId,
      createdAt: new Date().toISOString(),
    }));

    ApiResponseUtil.paginated(res, payments, 50, pageNum, limitNum);
  });

  static refundPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    ApiResponseUtil.success(res, { refunded: true });
  });

  static stripeWebhook = asyncHandler(async (req: Request, res: Response) => {
    // Verify signature stub
    res.json({ received: true });
  });

  static paystackWebhook = asyncHandler(async (req: Request, res: Response) => {
    res.json({ received: true });
  });

  static createSubscription = asyncHandler(async (req: AuthRequest, res: Response) => {
    ApiResponseUtil.success(res, { subscriptionId: 'sub_stub_123' });
  });

  static subscriptionStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    ApiResponseUtil.success(res, { status: 'active' });
  });
}
