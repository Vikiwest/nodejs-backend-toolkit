import { Router } from 'express';
import Joi from 'joi';
import { AuthController } from '../controllers/auth.controller';
import { validate, commonSchemas } from '../middleware/validation';
import { generalLimiter } from '../middleware/rateLimiter';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Rate limit sensitive endpoints
router.use('/register', generalLimiter);
router.use('/login', generalLimiter);
router.use('/forgot-password', generalLimiter);

// Validation schemas
const registerSchema = {
  body: Joi.object({
    name: commonSchemas.name,
    email: commonSchemas.email,
    password: commonSchemas.password,
  }),
};

const loginSchema = {
  body: Joi.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
  }),
};

const refreshSchema = {
  body: Joi.object({
    refreshToken: Joi.string().required(),
  }),
};

const forgotSchema = {
  body: Joi.object({
    email: commonSchemas.email,
  }),
};

const resetSchema = {
  body: Joi.object({
    token: Joi.string().required(),
    newPassword: commonSchemas.password,
  }),
};

const changePasswordSchema = {
  body: Joi.object({
    currentPassword: commonSchemas.password,
    newPassword: commonSchemas.password,
  }),
};

const verify2faSchema = {
  body: Joi.object({
    token: Joi.string().required().length(6),
  }),
};

const resendVerificationSchema = {
  body: Joi.object({
    email: commonSchemas.email,
  }),
};

router.post('/register', validate(registerSchema), AuthController.register);

router.post('/login', validate(loginSchema), AuthController.login);

router.post('/logout', authMiddleware(), AuthController.logout);

router.post('/refresh-token', validate(refreshSchema), AuthController.refreshToken);

router.post('/forgot-password', validate(forgotSchema), AuthController.forgotPassword);

router.post('/reset-password', validate(resetSchema), AuthController.resetPassword);

router.post('/verify-email/:token', AuthController.verifyEmail);

router.post(
  '/resend-verification',
  validate(resendVerificationSchema),
  AuthController.resendVerification
);

router.post('/change-password', validate(changePasswordSchema), AuthController.changePassword);

router.post('/enable-2fa', AuthController.enable2FA);

router.post('/verify-2fa', validate(verify2faSchema), AuthController.verify2FA);

router.post('/disable-2fa', AuthController.disable2FA);

export default router;
