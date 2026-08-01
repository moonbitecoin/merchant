/**
 * Security utilities: password hashing, JWT, TOTP, encryption
 * CRITICAL: All money operations use BigInt only
 */

import crypto from 'crypto';
import { createHmac } from 'crypto';
import speakeasy from 'speakeasy';
import {
  JWT_ALGORITHM,
  JWT_EXPIRY_MINUTES,
  REFRESH_TOKEN_EXPIRY_DAYS,
  ENCRYPTION_ALGORITHM,
  ENCRYPTION_KEY_SIZE_BYTES,
  ENCRYPTION_IV_SIZE_BYTES,
} from '@moonbite/shared';

/**
 * Hash password with Argon2id (using native Node crypto for now)
 * Production: use @node-rs/argon2 or similar
 */
export async function hashPassword(password: string): Promise<string> {
  // Simple bcrypt replacement using PBKDF2
  // In production, use a dedicated argon2 library
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256');

  return salt.toString('hex') + ':' + hash.toString('hex');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [saltHex, hashHex] = hash.split(':');

  if (!saltHex || !hashHex) {
    return false;
  }

  const salt = Buffer.from(saltHex, 'hex');
  const hashBuffer = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256');

  return hashBuffer.toString('hex') === hashHex;
}

/**
 * Generate JWT token
 */
export function generateJWT(payload: Record<string, unknown>, expiresInSeconds: number): string {
  // Simplified JWT generation (production: use jsonwebtoken library)
  const header = btoa(JSON.stringify({ alg: JWT_ALGORITHM, typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const body = btoa(
    JSON.stringify({
      ...payload,
      iat: now,
      exp: now + expiresInSeconds,
    })
  );

  const secret = process.env.JWT_SECRET || 'development-secret-change-in-prod';
  const signature = createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');

  return `${header}.${body}.${signature}`;
}

/**
 * Verify JWT token
 */
export function verifyJWT(token: string): Record<string, unknown> | null {
  try {
    const [headerB64, bodyB64, signatureB64] = token.split('.');

    if (!headerB64 || !bodyB64 || !signatureB64) {
      return null;
    }

    const secret = process.env.JWT_SECRET || 'development-secret-change-in-prod';
    const expectedSignature = createHmac('sha256', secret)
      .update(`${headerB64}.${bodyB64}`)
      .digest('base64url');

    if (expectedSignature !== signatureB64) {
      return null;
    }

    const payload = JSON.parse(atob(bodyB64)) as Record<string, unknown>;

    // Check expiration
    const exp = payload.exp as number | undefined;
    if (exp && exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Generate TOTP secret and QR code
 */
export function generateTOTPSecret(email: string): {
  secret: string;
  qrCode: string;
} {
  const secret = speakeasy.generateSecret({
    name: `MoonBite (${email})`,
    issuer: 'MoonBite',
    length: 32,
  });

  if (!secret.otpauth_url) {
    throw new Error('Failed to generate TOTP secret');
  }

  return {
    secret: secret.base32,
    qrCode: secret.otpauth_url,
  };
}

/**
 * Verify TOTP code
 */
export function verifyTOTPCode(secret: string, code: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: code,
    window: 2, // Allow 2 time windows (60 seconds)
  });
}

/**
 * AES-256-GCM encryption for product files
 */
export function encryptData(plaintext: Buffer | string, masterKey?: Buffer): {
  ciphertext: Buffer;
  iv: Buffer;
  tag: Buffer;
} {
  const key = masterKey || Buffer.from(process.env.ENCRYPTION_KEY || '', 'hex');

  if (key.length !== ENCRYPTION_KEY_SIZE_BYTES) {
    throw new Error(`Encryption key must be ${ENCRYPTION_KEY_SIZE_BYTES} bytes`);
  }

  const iv = crypto.randomBytes(ENCRYPTION_IV_SIZE_BYTES);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  const data = typeof plaintext === 'string' ? Buffer.from(plaintext, 'utf-8') : plaintext;
  const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();

  return { ciphertext, iv, tag };
}

/**
 * AES-256-GCM decryption for product files
 */
export function decryptData(
  ciphertext: Buffer | string,
  iv: Buffer | string,
  tag: Buffer | string,
  masterKey?: Buffer
): Buffer {
  const key = masterKey || Buffer.from(process.env.ENCRYPTION_KEY || '', 'hex');

  if (key.length !== ENCRYPTION_KEY_SIZE_BYTES) {
    throw new Error(`Encryption key must be ${ENCRYPTION_KEY_SIZE_BYTES} bytes`);
  }

  const ciphertextBuffer = typeof ciphertext === 'string' ? Buffer.from(ciphertext, 'hex') : ciphertext;
  const ivBuffer = typeof iv === 'string' ? Buffer.from(iv, 'hex') : iv;
  const tagBuffer = typeof tag === 'string' ? Buffer.from(tag, 'hex') : tag;

  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, ivBuffer);
  decipher.setAuthTag(tagBuffer);

  const plaintext = Buffer.concat([decipher.update(ciphertextBuffer), decipher.final()]);

  return plaintext;
}

/**
 * Generate HMAC signature for webhook payloads
 */
export function generateWebhookSignature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = generateWebhookSignature(payload, secret);

  // Timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

/**
 * Generate API key pair
 */
export function generateAPIKey(isProduction: boolean = false): {
  publicKey: string;
  secretKey: string;
} {
  const prefix = isProduction ? 'pk_live_' : 'pk_test_';
  const publicKey = prefix + crypto.randomBytes(32).toString('hex');
  const secretKey = (isProduction ? 'sk_live_' : 'sk_test_') + crypto.randomBytes(32).toString('hex');

  return { publicKey, secretKey };
}

/**
 * Hash API secret key for storage
 */
export async function hashAPISecret(secret: string): Promise<string> {
  return await hashPassword(secret);
}

/**
 * Verify API secret key
 */
export async function verifyAPISecret(secret: string, hash: string): Promise<boolean> {
  return await verifyPassword(secret, hash);
}

/**
 * Generate random token for email verification
 */
export function generateVerificationToken(): { token: string; expires: Date } {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  return { token, expires };
}

/**
 * Generate signed download URL
 */
export function generateSignedDownloadURL(
  transactionId: string,
  expiresAt: Date,
  ipAddress: string
): {
  url: string;
  signature: string;
} {
  const secret = process.env.JWT_SECRET || 'development-secret-change-in-prod';
  const payload = `${transactionId}:${expiresAt.getTime()}:${ipAddress}`;
  const signature = createHmac('sha256', secret).update(payload).digest('hex');
  const url = `/api/v1/downloads/${transactionId}?sig=${signature}`;

  return { url, signature };
}

/**
 * Verify signed download URL
 */
export function verifySignedDownloadURL(
  transactionId: string,
  signature: string,
  expiresAt: Date,
  ipAddress: string
): boolean {
  const secret = process.env.JWT_SECRET || 'development-secret-change-in-prod';
  const payload = `${transactionId}:${expiresAt.getTime()}:${ipAddress}`;
  const expectedSignature = createHmac('sha256', secret).update(payload).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}
