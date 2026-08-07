/**
 * Shared utility functions
 */
/**
 * Calculate platform fee from amount in smallest unit
 * Fee is 200 basis points (2%) of the expected amount
 *
 * CRITICAL: Uses BigInt integer math only, never float
 */
export declare function calculatePlatformFee(amount: bigint): bigint;
/**
 * Calculate merchant amount after platform fee
 */
export declare function calculateMerchantAmount(amount: bigint): bigint;
/**
 * Verify amount is positive
 */
export declare function isValidAmount(amount: bigint): boolean;
/**
 * Convert MBITE (human-readable) to smallest unit (BigInt)
 */
export declare function mbiteToSmallestUnit(mbite: number | string): bigint;
/**
 * Convert smallest unit (BigInt) to MBITE (human-readable)
 */
export declare function smallestUnitToMbite(smallest: bigint): number;
/**
 * Format smallest unit as MBITE string with 8 decimals
 */
export declare function formatMbite(smallest: bigint): string;
/**
 * Generate UUIDv7
 * Simple implementation - for production use uuid library v9
 */
export declare function generateUUIDv7(): string;
/**
 * Hash a string using SHA-256
 * This is a placeholder - use crypto in Node.js for real implementation
 */
export declare function sha256(data: string): Promise<string>;
/**
 * Generate random string for tokens
 */
export declare function generateRandomToken(length?: number): string;
/**
 * Validate email format
 */
export declare function isValidEmail(email: string): boolean;
/**
 * Validate wallet address format (basic check)
 * Different blockchains have different formats
 */
export declare function isValidWalletAddress(address: string): boolean;
/**
 * Validate slug format (lowercase, alphanumeric, hyphens)
 */
export declare function isValidSlug(slug: string): boolean;
/**
 * Parse pagination query parameters
 */
export declare function parsePaginationQuery(page?: unknown, limit?: unknown): {
    page: number;
    limit: number;
};
/**
 * Calculate total pages
 */
export declare function calculateTotalPages(total: number, limit: number): number;
/**
 * Format error message for API response
 */
export declare function formatErrorMessage(error: unknown): string;
/**
 * Extract IP address from request headers
 */
export declare function extractIpAddress(headers: Record<string, unknown>): string;
/**
 * Sleep for specified milliseconds
 */
export declare function sleep(ms: number): Promise<void>;
/**
 * Mask sensitive string (for logging)
 */
export declare function maskSensitive(value: string, revealEnd?: number): string;
/**
 * Check if value is production URL
 */
export declare function isProductionUrl(url: string): boolean;
//# sourceMappingURL=utils.d.ts.map