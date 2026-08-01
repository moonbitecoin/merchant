/**
 * Authentication routes
 * POST /auth/register - Register new merchant
 * POST /auth/login - Login with email/password
 * POST /auth/verify-email - Verify email token
 * POST /auth/refresh - Refresh access token
 * POST /auth/logout - Logout (client-side only, stateless)
 * GET /auth/profile - Get merchant profile
 * PUT /auth/profile - Update merchant profile
 * POST /auth/password - Change password
 * POST /auth/2fa/enable - Enable 2FA
 * POST /auth/2fa/confirm - Confirm 2FA
 * POST /auth/2fa/disable - Disable 2FA
 * POST /auth/api-keys - Create API key
 */

import { FastifyInstance } from 'fastify';
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  VerifyEmailRequestSchema,
  RefreshTokenRequestSchema,
  UpdateMerchantProfileRequestSchema,
  Enable2FARequestSchema,
  Confirm2FARequestSchema,
  Disable2FARequestSchema,
  MerchantProfileResponseSchema,
} from '@moonbite/shared';
import { sendProblemJson, createAppError } from '../lib/error-handler.js';
import { ERROR_CODES } from '@moonbite/shared';
import { authGuard, requireAuth, extractToken } from '../lib/auth-guard.js';
import { AuthService } from '../services/auth-service.js';
import { createEmailService } from '../services/email-service.js';
import { PrismaClient } from '@moonbite/db';

export default async function authRoutes(app: FastifyInstance) {
  // Initialize services
  const prisma = app.prisma as PrismaClient;
  const emailService = createEmailService();
  const authService = new AuthService({ prisma, emailService });

  /**
   * POST /auth/register
   * Register a new merchant account
   */
  app.post('/register', async (request, reply) => {
    try {
      const data = RegisterRequestSchema.parse(request.body);
      const result = await authService.register(data.email, data.password);

      return reply.status(201).send({
        message: 'Registration successful. Please check your email to verify your account.',
        merchantId: result.merchantId,
        email: result.email,
      });
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * POST /auth/login
   * Login merchant account
   */
  app.post('/login', async (request, reply) => {
    try {
      const data = LoginRequestSchema.parse(request.body);
      const result = await authService.login(data.email, data.password, data.totpCode);

      // Set secure, HttpOnly cookies
      reply.cookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      reply.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return reply.status(200).send({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        merchant: result.merchant,
      });
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * POST /auth/verify-email
   * Verify email address with token
   */
  app.post('/verify-email', async (request, reply) => {
    try {
      const data = VerifyEmailRequestSchema.parse(request.body);
      const result = await authService.verifyEmail(data.token);

      return reply.status(200).send({
        message: 'Email verified successfully',
        merchantId: result.merchantId,
        email: result.email,
      });
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * POST /auth/refresh
   * Refresh access token with refresh token
   */
  app.post('/refresh', async (request, reply) => {
    try {
      const data = RefreshTokenRequestSchema.parse(request.body);
      const result = await authService.refreshAccessToken(data.refreshToken);

      // Update cookies
      reply.cookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000,
      });

      reply.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return reply.status(200).send({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * POST /auth/logout
   * Logout (clear cookies on client side)
   */
  app.post('/logout', async (request, reply) => {
    reply.clearCookie('accessToken');
    reply.clearCookie('refreshToken');

    return reply.status(200).send({
      message: 'Logged out successfully',
    });
  });

  /**
   * GET /auth/profile
   * Get authenticated merchant profile
   */
  app.get('/profile', async (request, reply) => {
    try {
      const merchantId = await requireAuth(request);
      const profile = await authService.getMerchantProfile(merchantId);

      return reply.status(200).send(profile);
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * PUT /auth/profile
   * Update merchant profile
   */
  app.put('/profile', async (request, reply) => {
    try {
      const merchantId = await requireAuth(request);
      const data = UpdateMerchantProfileRequestSchema.parse(request.body);
      const profile = await authService.updateMerchantProfile(merchantId, data);

      return reply.status(200).send(profile);
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * POST /auth/password
   * Change merchant password
   */
  app.post('/password', async (request, reply) => {
    try {
      const merchantId = await requireAuth(request);
      const data = request.body as { oldPassword: string; newPassword: string };

      await authService.changePassword(merchantId, data.oldPassword, data.newPassword);

      return reply.status(200).send({
        message: 'Password changed successfully',
      });
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * POST /auth/2fa/enable
   * Generate TOTP secret for 2FA setup
   */
  app.post('/2fa/enable', async (request, reply) => {
    try {
      const merchantId = await requireAuth(request);
      const result = await authService.enable2FA(merchantId);

      return reply.status(200).send(result);
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * POST /auth/2fa/confirm
   * Verify TOTP code and enable 2FA
   */
  app.post('/2fa/confirm', async (request, reply) => {
    try {
      const merchantId = await requireAuth(request);
      const data = Confirm2FARequestSchema.parse(request.body);

      await authService.confirm2FA(merchantId, data.secret, data.code);

      return reply.status(200).send({
        message: '2FA enabled successfully',
      });
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * POST /auth/2fa/disable
   * Disable 2FA (requires password + current 2FA code)
   */
  app.post('/2fa/disable', async (request, reply) => {
    try {
      const merchantId = await requireAuth(request);
      const data = Disable2FARequestSchema.parse(request.body);

      await authService.disable2FA(merchantId, data.password, data.code);

      return reply.status(200).send({
        message: '2FA disabled successfully',
      });
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * POST /auth/api-keys
   * Create new API key
   */
  app.post('/api-keys', async (request, reply) => {
    try {
      const merchantId = await requireAuth(request);
      const result = await authService.createAPIKey(merchantId);

      return reply.status(201).send({
        ...result,
        message: 'API key created. Save the secret key somewhere safe—you won\'t see it again.',
      });
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * DELETE /auth/api-keys/:publicKey
   * Revoke an API key
   */
  app.delete('/api-keys/:publicKey', async (request, reply) => {
    try {
      const merchantId = await requireAuth(request);
      const { publicKey } = request.params as { publicKey: string };

      await authService.revokeAPIKey(merchantId, publicKey);

      return reply.status(200).send({
        message: 'API key revoked',
      });
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });
}
