/**
 * Centralized error handling (RFC 7807 Problem+JSON)
 * Never leak stack traces in production
 */

import { FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { HTTP_STATUS, ERROR_CODES } from '@moonbite/shared';

interface ProblemJson {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  errors?: Record<string, string[]>;
}

const ERROR_TYPE_MAPPING: Record<string, { status: number; title: string }> = {
  [ERROR_CODES.INVALID_CREDENTIALS]: { status: HTTP_STATUS.UNAUTHORIZED, title: 'Invalid Credentials' },
  [ERROR_CODES.EMAIL_NOT_VERIFIED]: { status: HTTP_STATUS.UNAUTHORIZED, title: 'Email Not Verified' },
  [ERROR_CODES.MFA_REQUIRED]: { status: HTTP_STATUS.UNAUTHORIZED, title: 'MFA Required' },
  [ERROR_CODES.UNAUTHORIZED]: { status: HTTP_STATUS.UNAUTHORIZED, title: 'Unauthorized' },
  [ERROR_CODES.TOKEN_EXPIRED]: { status: HTTP_STATUS.UNAUTHORIZED, title: 'Token Expired' },
  [ERROR_CODES.TOKEN_INVALID]: { status: HTTP_STATUS.UNAUTHORIZED, title: 'Token Invalid' },

  [ERROR_CODES.VALIDATION_ERROR]: { status: HTTP_STATUS.BAD_REQUEST, title: 'Validation Error' },
  [ERROR_CODES.INVALID_REQUEST]: { status: HTTP_STATUS.BAD_REQUEST, title: 'Invalid Request' },
  [ERROR_CODES.DUPLICATE_EMAIL]: { status: HTTP_STATUS.CONFLICT, title: 'Email Already Exists' },
  [ERROR_CODES.DUPLICATE_SLUG]: { status: HTTP_STATUS.CONFLICT, title: 'Slug Already Exists' },
  [ERROR_CODES.INVALID_WALLET_ADDRESS]: { status: HTTP_STATUS.BAD_REQUEST, title: 'Invalid Wallet Address' },
  [ERROR_CODES.INSUFFICIENT_BALANCE]: { status: HTTP_STATUS.BAD_REQUEST, title: 'Insufficient Balance' },

  [ERROR_CODES.NOT_FOUND]: { status: HTTP_STATUS.NOT_FOUND, title: 'Not Found' },
  [ERROR_CODES.MERCHANT_NOT_FOUND]: { status: HTTP_STATUS.NOT_FOUND, title: 'Merchant Not Found' },
  [ERROR_CODES.STORE_NOT_FOUND]: { status: HTTP_STATUS.NOT_FOUND, title: 'Store Not Found' },
  [ERROR_CODES.PRODUCT_NOT_FOUND]: { status: HTTP_STATUS.NOT_FOUND, title: 'Product Not Found' },
  [ERROR_CODES.TRANSACTION_NOT_FOUND]: { status: HTTP_STATUS.NOT_FOUND, title: 'Transaction Not Found' },
  [ERROR_CODES.FILE_NOT_FOUND]: { status: HTTP_STATUS.NOT_FOUND, title: 'File Not Found' },

  [ERROR_CODES.DOWNLOAD_LIMIT_EXCEEDED]: { status: HTTP_STATUS.CONFLICT, title: 'Download Limit Exceeded' },
  [ERROR_CODES.IP_RATE_LIMIT_EXCEEDED]: { status: HTTP_STATUS.TOO_MANY_REQUESTS, title: 'Rate Limit Exceeded' },
  [ERROR_CODES.COUPON_EXPIRED]: { status: HTTP_STATUS.BAD_REQUEST, title: 'Coupon Expired' },
  [ERROR_CODES.COUPON_USAGE_LIMIT_EXCEEDED]: { status: HTTP_STATUS.CONFLICT, title: 'Coupon Usage Limit Exceeded' },
  [ERROR_CODES.STORE_SUSPENDED]: { status: HTTP_STATUS.FORBIDDEN, title: 'Store Suspended' },
  [ERROR_CODES.PRODUCT_NOT_ACTIVE]: { status: HTTP_STATUS.BAD_REQUEST, title: 'Product Not Active' },
  [ERROR_CODES.PRODUCT_EXPIRED]: { status: HTTP_STATUS.BAD_REQUEST, title: 'Product Expired' },
  [ERROR_CODES.TRANSACTION_EXPIRED]: { status: HTTP_STATUS.BAD_REQUEST, title: 'Transaction Expired' },
  [ERROR_CODES.PAYMENT_ALREADY_RECEIVED]: { status: HTTP_STATUS.CONFLICT, title: 'Payment Already Received' },
  [ERROR_CODES.IDEMPOTENCY_KEY_CONFLICT]: { status: HTTP_STATUS.CONFLICT, title: 'Idempotency Conflict' },
  [ERROR_CODES.WALLET_NOT_SET]: { status: HTTP_STATUS.BAD_REQUEST, title: 'Wallet Not Set' },

  [ERROR_CODES.INTERNAL_SERVER_ERROR]: { status: HTTP_STATUS.INTERNAL_SERVER_ERROR, title: 'Internal Server Error' },
  [ERROR_CODES.DATABASE_ERROR]: { status: HTTP_STATUS.INTERNAL_SERVER_ERROR, title: 'Database Error' },
  [ERROR_CODES.ENCRYPTION_ERROR]: { status: HTTP_STATUS.INTERNAL_SERVER_ERROR, title: 'Encryption Error' },
  [ERROR_CODES.STORAGE_ERROR]: { status: HTTP_STATUS.INTERNAL_SERVER_ERROR, title: 'Storage Error' },
  [ERROR_CODES.WEBHOOK_DELIVERY_FAILED]: { status: HTTP_STATUS.INTERNAL_SERVER_ERROR, title: 'Webhook Delivery Failed' },
};

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    public detail?: string,
    public errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function sendProblemJson(reply: FastifyReply, error: unknown): FastifyReply {
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const errors: Record<string, string[]> = {};

    for (const issue of error.issues) {
      const path = issue.path.join('.');
      if (!errors[path]) {
        errors[path] = [];
      }

      errors[path].push(issue.message);
    }

    const problem: ProblemJson = {
      type: 'https://api.moonbite.org/errors/validation-error',
      title: 'Validation Error',
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
      detail: 'One or more fields failed validation',
      errors,
    };

    return reply.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).send(problem);
  }

  // Handle AppError
  if (error instanceof AppError) {
    const mapping = ERROR_TYPE_MAPPING[error.code];
    const status = mapping?.status || error.statusCode;
    const title = mapping?.title || error.message;

    const problem: ProblemJson = {
      type: `https://api.moonbite.org/errors/${error.code}`,
      title,
      status,
      detail: error.detail || error.message,
      errors: error.errors,
    };

    return reply.status(status).send(problem);
  }

  // Handle generic errors (never leak stack traces)
  if (error instanceof Error) {
    const problem: ProblemJson = {
      type: 'https://api.moonbite.org/errors/internal-server-error',
      title: 'Internal Server Error',
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined,
    };

    console.error('Unhandled error:', error);
    return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send(problem);
  }

  // Handle unknown errors
  const problem: ProblemJson = {
    type: 'https://api.moonbite.org/errors/internal-server-error',
    title: 'Internal Server Error',
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  };

  console.error('Unknown error:', error);
  return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send(problem);
}

export function createAppError(
  code: string,
  message: string,
  detail?: string,
  errors?: Record<string, string[]>
): AppError {
  const mapping = ERROR_TYPE_MAPPING[code];
  const statusCode = mapping?.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;

  return new AppError(code, message, statusCode, detail, errors);
}
