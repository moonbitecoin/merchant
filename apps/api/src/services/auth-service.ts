/**
 * Authentication Service
 * Business logic for registration, login, email verification, 2FA
 */

import { PrismaClient } from '@moonbite/db';
import {
  ERROR_CODES,
  generateUUIDv7,
  maskSensitive,
} from '@moonbite/shared';
import {
  hashPassword,
  verifyPassword,
  generateJWT,
  verifyJWT,
  generateTOTPSecret,
  verifyTOTPCode,
  generateVerificationToken,
  generateAPIKey,
  hashAPISecret,
} from '../lib/security.js';
import { createAppError } from '../lib/error-handler.js';

const JWT_ACCESS_EXPIRES_IN = 15 * 60; // 15 minutes in seconds
const JWT_REFRESH_EXPIRES_IN = 7 * 24 * 60 * 60; // 7 days in seconds

export interface AuthServiceDependencies {
  prisma: PrismaClient;
  emailService: any; // EmailService, defined separately
  auditService?: any; // AuditService, optional
}

export class AuthService {
  constructor(private deps: AuthServiceDependencies) {}

  /**
   * Register a new merchant account
   */
  async register(email: string, password: string): Promise<{ merchantId: string; email: string }> {
    // Validate input
    if (!email || !password) {
      throw createAppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Email and password are required'
      );
    }

    if (password.length < 12) {
      throw createAppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Password must be at least 12 characters',
        'Security requirement'
      );
    }

    // Check if email already exists
    const existing = await this.deps.prisma.merchant.findUnique({
      where: { email },
      select: { id: true, deletedAt: true },
    });

    if (existing && !existing.deletedAt) {
      throw createAppError(
        ERROR_CODES.DUPLICATE_EMAIL,
        'Email already registered',
        'An account with this email already exists. Try logging in or use password recovery.'
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate verification token
    const { token: verificationToken, expires: verificationExpires } = generateVerificationToken();

    // Create merchant
    const merchant = await this.deps.prisma.merchant.create({
      data: {
        id: generateUUIDv7(),
        email,
        passwordHash,
        name: email.split('@')[0], // Default to email prefix
        emailVerificationToken: verificationToken,
        emailVerificationExpiresAt: verificationExpires,
      },
      select: { id: true, email: true },
    });

    // Send verification email
    await this.deps.emailService.sendVerificationEmail(email, verificationToken);

    return { merchantId: merchant.id, email: merchant.email };
  }

  /**
   * Verify email address
   */
  async verifyEmail(token: string): Promise<{ merchantId: string; email: string }> {
    if (!token) {
      throw createAppError(ERROR_CODES.INVALID_REQUEST, 'Verification token is required');
    }

    // Find merchant by token
    const merchant = await this.deps.prisma.merchant.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpiresAt: { gt: new Date() },
      },
      select: { id: true, email: true, emailVerified: true },
    });

    if (!merchant) {
      throw createAppError(
        ERROR_CODES.TOKEN_INVALID,
        'Invalid or expired verification token',
        'The verification link has expired. Request a new one.'
      );
    }

    // Already verified?
    if (merchant.emailVerified) {
      return { merchantId: merchant.id, email: merchant.email };
    }

    // Mark as verified
    await this.deps.prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      },
    });

    return { merchantId: merchant.id, email: merchant.email };
  }

  /**
   * Login with email and password
   */
  async login(
    email: string,
    password: string,
    totpCode?: string
  ): Promise<{ accessToken: string; refreshToken: string; merchant: any }> {
    if (!email || !password) {
      throw createAppError(
        ERROR_CODES.INVALID_CREDENTIALS,
        'Invalid email or password'
      );
    }

    // Find merchant
    const merchant = await this.deps.prisma.merchant.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        emailVerified: true,
        totpEnabled: true,
        totpSecret: true,
      },
    });

    if (!merchant) {
      throw createAppError(
        ERROR_CODES.INVALID_CREDENTIALS,
        'Invalid email or password'
      );
    }

    // Check email verified
    if (!merchant.emailVerified) {
      throw createAppError(
        ERROR_CODES.EMAIL_NOT_VERIFIED,
        'Please verify your email before logging in'
      );
    }

    // Verify password
    const passwordValid = await verifyPassword(password, merchant.passwordHash);
    if (!passwordValid) {
      throw createAppError(
        ERROR_CODES.INVALID_CREDENTIALS,
        'Invalid email or password'
      );
    }

    // Check 2FA
    if (merchant.totpEnabled) {
      if (!totpCode) {
        throw createAppError(
          ERROR_CODES.MFA_REQUIRED,
          '2FA code required',
          'This account has 2FA enabled. Provide a 6-digit code.'
        );
      }

      const totpValid = verifyTOTPCode(merchant.totpSecret as string, totpCode);
      if (!totpValid) {
        throw createAppError(
          ERROR_CODES.INVALID_MFA_CODE,
          'Invalid 2FA code'
        );
      }
    }

    // Generate tokens
    const accessToken = generateJWT(
      {
        sub: merchant.id,
        type: 'access',
        aud: 'merchant',
      },
      JWT_ACCESS_EXPIRES_IN
    );

    const refreshToken = generateJWT(
      {
        sub: merchant.id,
        type: 'refresh',
        aud: 'merchant',
      },
      JWT_REFRESH_EXPIRES_IN
    );

    // Store refresh token (for rotation/reuse detection)
    await this.deps.prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        // In production: store hash of refreshToken for reuse detection
      },
    });

    return {
      accessToken,
      refreshToken,
      merchant: {
        id: merchant.id,
        email: merchant.email,
        name: merchant.name,
      },
    };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    if (!refreshToken) {
      throw createAppError(ERROR_CODES.TOKEN_INVALID, 'Refresh token required');
    }

    // Verify refresh token
    const payload = verifyJWT(refreshToken);
    if (!payload || payload.type !== 'refresh') {
      throw createAppError(ERROR_CODES.TOKEN_INVALID, 'Invalid refresh token');
    }

    const merchantId = payload.sub as string;

    // Find merchant
    const merchant = await this.deps.prisma.merchant.findUniqueOrThrow({
      where: { id: merchantId },
      select: { id: true, deletedAt: true },
    });

    if (merchant.deletedAt) {
      throw createAppError(ERROR_CODES.UNAUTHORIZED, 'Account no longer exists');
    }

    // Generate new token pair (rotation)
    const newAccessToken = generateJWT(
      {
        sub: merchantId,
        type: 'access',
        aud: 'merchant',
      },
      JWT_ACCESS_EXPIRES_IN
    );

    const newRefreshToken = generateJWT(
      {
        sub: merchantId,
        type: 'refresh',
        aud: 'merchant',
      },
      JWT_REFRESH_EXPIRES_IN
    );

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  /**
   * Enable 2FA (TOTP)
   */
  async enable2FA(merchantId: string): Promise<{ secret: string; qrCode: string }> {
    const merchant = await this.deps.prisma.merchant.findUniqueOrThrow({
      where: { id: merchantId },
      select: { email: true },
    });

    const { secret, qrCode } = generateTOTPSecret(merchant.email);

    return { secret, qrCode };
  }

  /**
   * Confirm 2FA (verify code and enable)
   */
  async confirm2FA(merchantId: string, secret: string, code: string): Promise<void> {
    if (!secret || !code) {
      throw createAppError(ERROR_CODES.INVALID_REQUEST, 'Secret and code are required');
    }

    // Verify the code with the secret
    const valid = verifyTOTPCode(secret, code);
    if (!valid) {
      throw createAppError(ERROR_CODES.INVALID_MFA_CODE, 'Invalid 2FA code');
    }

    // Enable 2FA
    await this.deps.prisma.merchant.update({
      where: { id: merchantId },
      data: {
        totpSecret: secret,
        totpEnabled: true,
      },
    });
  }

  /**
   * Disable 2FA
   */
  async disable2FA(merchantId: string, password: string, code: string): Promise<void> {
    if (!password || !code) {
      throw createAppError(
        ERROR_CODES.INVALID_REQUEST,
        'Password and 2FA code are required'
      );
    }

    // Verify password
    const merchant = await this.deps.prisma.merchant.findUniqueOrThrow({
      where: { id: merchantId },
      select: { passwordHash: true, totpSecret: true },
    });

    const passwordValid = await verifyPassword(password, merchant.passwordHash);
    if (!passwordValid) {
      throw createAppError(ERROR_CODES.INVALID_CREDENTIALS, 'Invalid password');
    }

    // Verify 2FA code
    const codeValid = verifyTOTPCode(merchant.totpSecret as string, code);
    if (!codeValid) {
      throw createAppError(ERROR_CODES.INVALID_MFA_CODE, 'Invalid 2FA code');
    }

    // Disable 2FA
    await this.deps.prisma.merchant.update({
      where: { id: merchantId },
      data: {
        totpSecret: null,
        totpEnabled: false,
      },
    });
  }

  /**
   * Create API key for merchant
   */
  async createAPIKey(merchantId: string): Promise<{ publicKey: string; secretKey: string }> {
    const { publicKey, secretKey } = generateAPIKey(false); // false = test mode
    const secretKeyHash = await hashAPISecret(secretKey);

    await this.deps.prisma.aPIKey.create({
      data: {
        id: generateUUIDv7(),
        merchantId,
        publicKey,
        secretKeyHash,
      },
    });

    // Only return secretKey once
    return { publicKey, secretKey };
  }

  /**
   * Revoke API key
   */
  async revokeAPIKey(merchantId: string, publicKey: string): Promise<void> {
    const apiKey = await this.deps.prisma.aPIKey.findFirst({
      where: { publicKey, merchantId },
    });

    if (!apiKey) {
      throw createAppError(
        ERROR_CODES.NOT_FOUND,
        'API key not found'
      );
    }

    await this.deps.prisma.aPIKey.update({
      where: { id: apiKey.id },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Get merchant profile
   */
  async getMerchantProfile(merchantId: string): Promise<any> {
    const merchant = await this.deps.prisma.merchant.findUniqueOrThrow({
      where: { id: merchantId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        payoutWallet: true,
        payoutWalletValidated: true,
        totpEnabled: true,
        createdAt: true,
      },
    });

    return merchant;
  }

  /**
   * Update merchant profile
   */
  async updateMerchantProfile(
    merchantId: string,
    data: { name?: string; avatarUrl?: string | null }
  ): Promise<any> {
    const merchant = await this.deps.prisma.merchant.update({
      where: { id: merchantId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    return merchant;
  }

  /**
   * Change password
   */
  async changePassword(
    merchantId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    if (!oldPassword || !newPassword) {
      throw createAppError(
        ERROR_CODES.INVALID_REQUEST,
        'Old and new passwords are required'
      );
    }

    if (newPassword.length < 12) {
      throw createAppError(
        ERROR_CODES.VALIDATION_ERROR,
        'New password must be at least 12 characters'
      );
    }

    // Verify old password
    const merchant = await this.deps.prisma.merchant.findUniqueOrThrow({
      where: { id: merchantId },
      select: { passwordHash: true },
    });

    const valid = await verifyPassword(oldPassword, merchant.passwordHash);
    if (!valid) {
      throw createAppError(ERROR_CODES.INVALID_CREDENTIALS, 'Current password is incorrect');
    }

    // Hash new password
    const newHash = await hashPassword(newPassword);

    // Update
    await this.deps.prisma.merchant.update({
      where: { id: merchantId },
      data: { passwordHash: newHash },
    });
  }
}

/**
 * Extract merchant ID from JWT token
 */
export function extractMerchantIdFromToken(token: string): string | null {
  if (!token) return null;

  const payload = verifyJWT(token);
  if (!payload || payload.type !== 'access') return null;

  return (payload.sub as string) || null;
}
