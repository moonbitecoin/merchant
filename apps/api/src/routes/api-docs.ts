/**
 * API Documentation routes
 * GET /docs - OpenAPI JSON schema
 * GET /docs/swagger - Swagger UI (static HTML)
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { openApiSchema } from '../lib/openapi-schema.js';

export default async function apiDocsRoutes(app: FastifyInstance) {
  /**
   * GET /docs
   * OpenAPI 3.1.0 JSON schema
   */
  app.get('/docs', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send(openApiSchema);
  });

  /**
   * GET /docs/swagger
   * Swagger UI (embedded)
   */
  app.get('/docs/swagger', async (request: FastifyRequest, reply: FastifyReply) => {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>MoonBite API Documentation</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@3/swagger-ui.css">
  <style>
    body { margin: 0; padding: 0; }
    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@3/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@3/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: '/api/v1/docs',
        dom_id: '#swagger-ui',
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "StandaloneLayout"
      });
      window.ui = ui;
    }
  </script>
</body>
</html>
    `;

    reply.type('text/html').send(html);
  });

  /**
   * GET /docs/quickstart
   * Curl quickstart examples
   */
  app.get('/docs/quickstart', async (request: FastifyRequest, reply: FastifyReply) => {
    const quickstart = `
# MoonBite Merchant API - Quickstart Guide

## Authentication

### JWT Token (15 min TTL)
\`\`\`bash
# Login
curl -X POST http://localhost:3001/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email":"merchant@example.com",
    "password":"password123"
  }'

# Response:
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "merchant": { "id": "...", "email": "..." }
}

# Use token:
curl http://localhost:3001/api/v1/dashboard/metrics \\
  -H "Authorization: Bearer eyJhbGc..."
\`\`\`

### API Key (for programmatic access)
\`\`\`bash
# Create API key (requires auth)
curl -X POST http://localhost:3001/api/v1/auth/api-keys \\
  -H "Authorization: Bearer <JWT_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{}'

# Response:
{
  "publicKey": "pk_...",
  "secretKey": "sk_...",
  "message": "Save your secret key - you won't see it again!"
}

# Use API key:
curl http://localhost:3001/api/v1/dashboard/metrics \\
  -H "Authorization: Bearer sk_abc123..."
\`\`\`

## Create Product & Checkout

\`\`\`bash
# 1. Create store (requires auth)
curl -X POST http://localhost:3001/api/v1/stores \\
  -H "Authorization: Bearer <JWT_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "My Store",
    "slug": "my-store"
  }'

# 2. Create product
curl -X POST http://localhost:3001/api/v1/products/stores/<store-id> \\
  -H "Authorization: Bearer <JWT_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "My Product",
    "description": "Great product",
    "price": "1000000000",
    "category": "software",
    "downloadLimit": "UNLIMITED"
  }'

# 3. Upload file
curl -X POST http://localhost:3001/api/v1/products/<product-id>/files \\
  -H "Authorization: Bearer <JWT_TOKEN>" \\
  -F "file=@/path/to/file.zip"

# 4. Publish product
curl -X POST http://localhost:3001/api/v1/products/<product-id>/publish \\
  -H "Authorization: Bearer <JWT_TOKEN>"

# 5. Create checkout (idempotent)
curl -X POST http://localhost:3001/api/v1/checkout \\
  -H "Idempotency-Key: unique-key-123" \\
  -H "Content-Type: application/json" \\
  -d '{
    "productId": "<product-id>",
    "couponCode": "SAVE20"
  }'

# Response:
{
  "transactionId": "...",
  "depositAddress": "1A1z7agoat...",
  "amount": "1000000000",
  "qrCode": "data:image/png;base64,...",
  "expiresAt": "2024-08-01T12:30:00Z"
}

# 6. Poll for payment confirmation
curl http://localhost:3001/api/v1/checkout/<transaction-id>

# Response when confirmed:
{
  "id": "...",
  "status": "confirmed",
  "amount": "1000000000",
  "txHash": "0x...",
  "confirmedAt": "2024-08-01T12:25:00Z"
}

# 7. Get download link
curl http://localhost:3001/api/v1/transactions/<transaction-id>/downloads

# 8. Download file
curl "http://localhost:3001/api/v1/downloads/<transaction-id>?sig=<hmac>&expires=<timestamp>" \\
  -o file.zip
\`\`\`

## Manage Coupons

\`\`\`bash
# Create percentage coupon
curl -X POST http://localhost:3001/api/v1/coupons \\
  -H "Authorization: Bearer <JWT_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "code": "SAVE20",
    "discountType": "percentage",
    "discountValue": "20",
    "maxUsage": 100
  }'

# Create fixed-amount coupon
curl -X POST http://localhost:3001/api/v1/coupons \\
  -H "Authorization: Bearer <JWT_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "code": "FREE5",
    "discountType": "fixed",
    "discountValue": "500000000",
    "maxUsage": 50,
    "expiresAt": "2024-12-31T23:59:59Z"
  }'

# List coupons
curl http://localhost:3001/api/v1/coupons?page=1&limit=10 \\
  -H "Authorization: Bearer <JWT_TOKEN>"

# Toggle coupon active/inactive
curl -X POST http://localhost:3001/api/v1/coupons/<coupon-id>/toggle \\
  -H "Authorization: Bearer <JWT_TOKEN>"

# Delete coupon
curl -X DELETE http://localhost:3001/api/v1/coupons/<coupon-id> \\
  -H "Authorization: Bearer <JWT_TOKEN>"
\`\`\`

## View Dashboard Analytics

\`\`\`bash
# Get metrics (revenue, conversion rate, AOV)
curl http://localhost:3001/api/v1/dashboard/metrics \\
  -H "Authorization: Bearer <JWT_TOKEN>"

# Get revenue chart (30-day or 90-day)
curl "http://localhost:3001/api/v1/dashboard/revenue-chart?days=30" \\
  -H "Authorization: Bearer <JWT_TOKEN>"

# Get top 5 products
curl http://localhost:3001/api/v1/dashboard/top-products?limit=5 \\
  -H "Authorization: Bearer <JWT_TOKEN>"

# Get transaction history
curl "http://localhost:3001/api/v1/dashboard/transactions?page=1&status=confirmed" \\
  -H "Authorization: Bearer <JWT_TOKEN>"

# Export transactions to CSV
curl -X POST http://localhost:3001/api/v1/dashboard/transactions/export \\
  -H "Authorization: Bearer <JWT_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{}' > transactions.csv
\`\`\`

## Manage Payouts

\`\`\`bash
# Get account balance
curl http://localhost:3001/api/v1/payouts/balance \\
  -H "Authorization: Bearer <JWT_TOKEN>"

# Request payout
curl -X POST http://localhost:3001/api/v1/payouts \\
  -H "Authorization: Bearer <JWT_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": "5000000000",
    "wallet": "1A1z7agoat...",
    "totpCode": "123456"
  }'

# Get payout history
curl http://localhost:3001/api/v1/payouts?page=1 \\
  -H "Authorization: Bearer <JWT_TOKEN>"
\`\`\`

## Customer Reviews

\`\`\`bash
# Get product reviews (public)
curl "http://localhost:3001/api/v1/reviews/<product-id>?page=1&limit=10"

# Get review stats (public)
curl http://localhost:3001/api/v1/reviews/<product-id>/stats

# Submit review (after purchase)
curl -X POST http://localhost:3001/api/v1/reviews/<product-id> \\
  -H "Content-Type: application/json" \\
  -d '{
    "transactionId": "<transaction-id>",
    "rating": 5,
    "comment": "Amazing product, highly recommended!",
    "customerName": "John Doe"
  }'

# Merchant: List all reviews
curl http://localhost:3001/api/v1/reviews \\
  -H "Authorization: Bearer <JWT_TOKEN>"

# Merchant: Delete review (moderation)
curl -X DELETE http://localhost:3001/api/v1/reviews/<review-id> \\
  -H "Authorization: Bearer <JWT_TOKEN>"
\`\`\`

## Rate Limiting

All API key requests are rate-limited to **100 requests per minute**.

When rate-limited, responses include:
\`\`\`
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 5
X-RateLimit-Reset: 1693569600
\`\`\`

HTTP 429 (Too Many Requests) is returned when limit exceeded.

## Error Handling

All errors follow RFC 7807 Problem+JSON format:

\`\`\`json
{
  "type": "VALIDATION_ERROR",
  "status": 400,
  "title": "Validation error",
  "detail": "Email is required"
}
\`\`\`

Common error codes:
- 400: VALIDATION_ERROR, INVALID_REQUEST
- 401: UNAUTHORIZED
- 404: NOT_FOUND
- 409: CONFLICT (duplicate, usage exceeded, etc.)
- 429: TOO_MANY_REQUESTS (rate limited)
- 500: INTERNAL_SERVER_ERROR

## Idempotency

POST endpoints support idempotency via \`Idempotency-Key\` header:

\`\`\`bash
curl -X POST http://localhost:3001/api/v1/checkout \\
  -H "Idempotency-Key: my-unique-key" \\
  -H "Content-Type: application/json" \\
  -d '{"productId":"..."}'

# Same request (same idempotency key) returns same result
curl -X POST http://localhost:3001/api/v1/checkout \\
  -H "Idempotency-Key: my-unique-key" \\
  -H "Content-Type: application/json" \\
  -d '{"productId":"..."}'
\`\`\`

## Webhooks

Subscribe to events via dashboard:

Events:
- \`payment.received\` - Payment confirmed
- \`file.downloaded\` - File downloaded
- \`payout.completed\` - Payout sent

Payloads are signed with HMAC-SHA256:
\`\`\`
X-MoonBite-Signature: sha256=<hmac-hex>
\`\`\`

## Support

- API Status: https://status.moonbite.org
- Documentation: https://docs.moonbite.org
- Support: support@moonbite.org
    `;

    reply.type('text/plain').send(quickstart);
  });

  /**
   * GET /docs/examples
   * Code examples in multiple languages
   */
  app.get('/docs/examples', async (request: FastifyRequest, reply: FastifyReply) => {
    const examples = `
# MoonBite API - Code Examples

## Node.js

\`\`\`javascript
const API_KEY = 'sk_abc123...';
const BASE_URL = 'http://localhost:3001/api/v1';

// Fetch metrics
async function getMetrics() {
  const response = await fetch(\`\${BASE_URL}/dashboard/metrics\`, {
    headers: {
      'Authorization': \`Bearer \${API_KEY}\`
    }
  });
  return response.json();
}

// Create coupon
async function createCoupon(code, discountType, discountValue) {
  const response = await fetch(\`\${BASE_URL}/coupons\`, {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${API_KEY}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      code,
      discountType,
      discountValue,
      maxUsage: 100
    })
  });
  return response.json();
}

getMetrics().then(console.log);
\`\`\`

## Python

\`\`\`python
import requests
import json

API_KEY = 'sk_abc123...'
BASE_URL = 'http://localhost:3001/api/v1'
headers = {'Authorization': f'Bearer {API_KEY}'}

# Get metrics
response = requests.get(f'{BASE_URL}/dashboard/metrics', headers=headers)
metrics = response.json()
print(json.dumps(metrics, indent=2))

# Create coupon
coupon_data = {
    'code': 'SAVE20',
    'discountType': 'percentage',
    'discountValue': '20',
    'maxUsage': 100
}
response = requests.post(f'{BASE_URL}/coupons', json=coupon_data, headers=headers)
coupon = response.json()
print(json.dumps(coupon, indent=2))
\`\`\`

## Go

\`\`\`go
package main

import (
	"fmt"
	"io"
	"net/http"
)

const (
	apiKey  = "sk_abc123..."
	baseURL = "http://localhost:3001/api/v1"
)

func main() {
	// Get metrics
	req, _ := http.NewRequest("GET", baseURL+"/dashboard/metrics", nil)
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{}
	resp, _ := client.Do(req)
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	fmt.Println(string(body))
}
\`\`\`

## cURL (see /docs/quickstart)

All examples at: http://localhost:3001/api/v1/docs/quickstart
    `;

    reply.type('text/plain').send(examples);
  });
}
