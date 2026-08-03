/**
 * Shared utility functions
 */

import { SMALLEST_UNIT_PER_MBITE, PLATFORM_FEE_BASIS_POINTS } from './constants.js';

/**
 * Calculate platform fee from amount in smallest unit
 * Fee is 200 basis points (2%) of the expected amount
 *
 * CRITICAL: Uses BigInt integer math only, never float
 */
export function calculatePlatformFee(amount: bigint): bigint {
  return (amount * PLATFORM_FEE_BASIS_POINTS) / 10000n;
}

/**
 * Calculate merchant amount after platform fee
 */
export function calculateMerchantAmount(amount: bigint): bigint {
  const fee = calculatePlatformFee(amount);
  return amount - fee;
}

/**
 * Verify amount is positive
 */
export function isValidAmount(amount: bigint): boolean {
  return amount > 0n;
}

/**
 * Convert MBITE (human-readable) to smallest unit (BigInt)
 */
export function mbiteToSmallestUnit(mbite: number | string): bigint {
  const num = typeof mbite === 'string' ? parseFloat(mbite) : mbite;

  if (!Number.isFinite(num) || num < 0) {
    throw new Error('Invalid MBITE amount');
  }

  return BigInt(Math.floor(num * Number(SMALLEST_UNIT_PER_MBITE)));
}

/**
 * Convert smallest unit (BigInt) to MBITE (human-readable)
 */
export function smallestUnitToMbite(smallest: bigint): number {
  return Number(smallest) / Number(SMALLEST_UNIT_PER_MBITE);
}

/**
 * Format smallest unit as MBITE string with 8 decimals
 */
export function formatMbite(smallest: bigint): string {
  const num = smallestUnitToMbite(smallest);
  return num.toFixed(8).replace(/\.?0+$/, '');
}

/**
 * Generate UUIDv7
 * Simple implementation - for production use uuid library v9
 */
export function generateUUIDv7(): string {
  const now = Date.now();
  const timestamp = now.toString(16).padStart(12, '0');
  const random = Array.from({ length: 20 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

  const uuid = `${timestamp.substring(0, 8)}-${timestamp.substring(8)}-7${random.substring(1, 4)}-${['8', '9', 'a', 'b'][Math.floor(Math.random() * 4)]}${random.substring(4, 7)}-${random.substring(7, 19)}`;

  return uuid;
}

/**
 * Hash a string using SHA-256
 * This is a placeholder - use crypto in Node.js for real implementation
 */
export async function sha256(data: string): Promise<string> {
  if (typeof window === 'undefined') {
    // Node.js environment
    const { createHash } = await import('crypto');
    return createHash('sha256').update(data).digest('hex');
  }

  // Browser environment
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(buffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate random string for tokens
 */
export function generateRandomToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  if (typeof window === 'undefined') {
    // Node.js
    const { randomBytes } = require('crypto');
    return randomBytes(length).toString('hex');
  }

  // Browser
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate wallet address format (basic check)
 * Different blockchains have different formats
 */
export function isValidWalletAddress(address: string): boolean {
  // Basic check: 26-35 alphanumeric characters
  return /^[a-zA-Z0-9]{26,35}$/.test(address);
}

/**
 * Validate slug format (lowercase, alphanumeric, hyphens)
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]{2,50}$/.test(slug);
}

/**
 * Parse pagination query parameters
 */
export function parsePaginationQuery(
  page?: unknown,
  limit?: unknown
): { page: number; limit: number } {
  const p = typeof page === 'string' ? parseInt(page, 10) : (typeof page === 'number' ? page : NaN);
  const l = typeof limit === 'string' ? parseInt(limit, 10) : (typeof limit === 'number' ? limit : NaN);

  const parsedPage = Number.isFinite(p) && p > 0 ? (p as number) : 1;
  const parsedLimit = Number.isFinite(l) && l > 0 && l <= 100 ? (l as number) : 20;

  return { page: parsedPage, limit: parsedLimit };
}

/**
 * Calculate total pages
 */
export function calculateTotalPages(total: number, limit: number): number {
  return Math.ceil(total / limit);
}

/**
 * Format error message for API response
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred';
}

/**
 * Extract IP address from request headers
 */
export function extractIpAddress(headers: Record<string, unknown>): string {
  const forwarded = headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    const ip = forwarded.split(',')[0]?.trim();
    if (ip) return ip;
  }

  const realIp = headers['x-real-ip'];
  if (typeof realIp === 'string') {
    return realIp;
  }

  return 'unknown';
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mask sensitive string (for logging)
 */
export function maskSensitive(value: string, revealEnd: number = 4): string {
  if (value.length <= revealEnd) {
    return '*'.repeat(value.length);
  }

  const masked = '*'.repeat(value.length - revealEnd);
  return masked + value.substring(value.length - revealEnd);
}

/**
 * Check if value is production URL
 */
export function isProductionUrl(url: string): boolean {
  return url.includes('merchant.moonbite.org') || url.includes('api.moonbite.org');
}
