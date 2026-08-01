/**
 * OpenAPI 3.1.0 Schema for MoonBite Merchant API
 */

export const openApiSchema = {
  openapi: '3.1.0',
  info: {
    title: 'MoonBite Merchant API',
    description: 'Sell digital goods and accept MBITE cryptocurrency payments',
    version: '1.0.0',
    contact: {
      name: 'MoonBite Support',
      url: 'https://moonbite.org/support',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'http://localhost:3001/api/v1',
      description: 'Local development',
    },
    {
      url: 'https://api.moonbite.org/api/v1',
      description: 'Production',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token (15 min TTL)',
      },
      apiKey: {
        type: 'http',
        scheme: 'bearer',
        description: 'API Key (for programmatic access)',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            example: 'VALIDATION_ERROR',
          },
          status: {
            type: 'integer',
            example: 400,
          },
          title: {
            type: 'string',
            example: 'Validation error',
          },
          detail: {
            type: 'string',
            example: 'Invalid email format',
          },
        },
        required: ['type', 'status', 'title', 'detail'],
      },
      Product: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          title: {
            type: 'string',
          },
          description: {
            type: 'string',
          },
          price: {
            type: 'string',
            description: 'BigInt in smallest MBITE unit (1 MBITE = 10^8 units)',
            example: '1000000000',
          },
          category: {
            type: 'string',
            enum: ['software', 'ebook', 'course', 'art', 'music', 'video', 'template', 'other'],
          },
          downloadLimit: {
            type: 'string',
            enum: ['1', '3', 'UNLIMITED'],
          },
          status: {
            type: 'string',
            enum: ['draft', 'active', 'archived'],
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      Transaction: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          status: {
            type: 'string',
            enum: ['pending', 'confirmed', 'failed'],
          },
          amount: {
            type: 'string',
            description: 'BigInt in smallest MBITE unit',
          },
          depositAddress: {
            type: 'string',
          },
          txHash: {
            type: 'string',
            nullable: true,
          },
          confirmationCount: {
            type: 'integer',
            nullable: true,
          },
          confirmedAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      Coupon: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          code: {
            type: 'string',
            description: 'Uppercase coupon code (3-50 chars)',
          },
          discountType: {
            type: 'string',
            enum: ['percentage', 'fixed'],
          },
          discountValue: {
            type: 'string',
            description: 'For percentage: 0-100, for fixed: BigInt amount',
          },
          maxUsage: {
            type: 'integer',
            description: '0 = unlimited',
          },
          isActive: {
            type: 'boolean',
          },
          expiresAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      Review: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          rating: {
            type: 'integer',
            minimum: 1,
            maximum: 5,
          },
          comment: {
            type: 'string',
          },
          customerName: {
            type: 'string',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
    },
  },
  paths: {
    '/checkout': {
      post: {
        tags: ['Checkout'],
        summary: 'Create a checkout (idempotent)',
        description: 'Create a new checkout for a product. Use Idempotency-Key header to ensure idempotency.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  productId: {
                    type: 'string',
                    format: 'uuid',
                  },
                  couponCode: {
                    type: 'string',
                    nullable: true,
                  },
                },
                required: ['productId'],
              },
            },
          },
        },
        parameters: [
          {
            name: 'Idempotency-Key',
            in: 'header',
            required: true,
            schema: {
              type: 'string',
            },
            description: 'Unique key for idempotency (prevents duplicates)',
          },
        ],
        responses: {
          201: {
            description: 'Checkout created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    transactionId: { type: 'string', format: 'uuid' },
                    depositAddress: { type: 'string' },
                    amount: { type: 'string' },
                    qrCode: { type: 'string', description: 'Data URL' },
                    expiresAt: { type: 'string', format: 'date-time' },
                    expiresIn: { type: 'integer', description: 'Seconds until expiry' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Validation error or product not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/checkout/{id}': {
      get: {
        tags: ['Checkout'],
        summary: 'Get checkout status',
        description: 'Get the current status of a checkout transaction',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Checkout status',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/Transaction' },
                  ],
                },
              },
            },
          },
          404: {
            description: 'Checkout not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/reviews/{productId}': {
      get: {
        tags: ['Reviews'],
        summary: 'Get product reviews',
        description: 'Get paginated reviews for a product (public)',
        parameters: [
          {
            name: 'productId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 10, maximum: 50 },
          },
        ],
        responses: {
          200: {
            description: 'Product reviews',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    reviews: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Review' },
                    },
                    total: { type: 'integer' },
                    averageRating: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Reviews'],
        summary: 'Submit a review',
        description: 'Submit a review for a product (requires confirmed transaction)',
        parameters: [
          {
            name: 'productId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  transactionId: {
                    type: 'string',
                    format: 'uuid',
                  },
                  rating: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 5,
                  },
                  comment: {
                    type: 'string',
                    minLength: 5,
                    maxLength: 1000,
                  },
                  customerName: {
                    type: 'string',
                    minLength: 2,
                    maxLength: 100,
                  },
                },
                required: ['transactionId', 'rating', 'comment', 'customerName'],
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Review submitted',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Review' },
              },
            },
          },
          400: {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/coupons': {
      get: {
        tags: ['Coupons'],
        summary: 'List coupons',
        description: 'List all coupons for authenticated merchant',
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 50, maximum: 100 },
          },
        ],
        responses: {
          200: {
            description: 'Coupons list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    coupons: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Coupon' },
                    },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Coupons'],
        summary: 'Create coupon',
        description: 'Create a new coupon for authenticated merchant',
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  code: {
                    type: 'string',
                    minLength: 3,
                    maxLength: 50,
                  },
                  discountType: {
                    type: 'string',
                    enum: ['percentage', 'fixed'],
                  },
                  discountValue: {
                    type: 'string',
                    description: 'BigInt string',
                  },
                  maxUsage: {
                    type: 'integer',
                    nullable: true,
                  },
                  expiresAt: {
                    type: 'string',
                    format: 'date-time',
                    nullable: true,
                  },
                },
                required: ['code', 'discountType', 'discountValue'],
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Coupon created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Coupon' },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/dashboard/metrics': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get sales metrics',
        description: 'Get revenue, checkout count, and conversion rate',
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        parameters: [
          {
            name: 'storeId',
            in: 'query',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Sales metrics',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    totalRevenue: { type: 'string' },
                    totalCheckouts: { type: 'integer' },
                    confirmedCheckouts: { type: 'integer' },
                    conversionRate: { type: 'number' },
                    averageOrderValue: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
