# Milestone 8: E2E Tests with Playwright

## Overview

Milestone 8 implements comprehensive end-to-end testing using Playwright. Tests cover the complete user journey from merchant registration through customer purchase and review, plus error handling and edge cases.

## Test Setup

### Playwright Configuration

**File**: `apps/web/playwright.config.ts`
- Multi-browser testing (Chrome, Firefox, Safari)
- Screenshots on failure
- Parallel execution
- Automatic server startup (web + API)
- HTML report generation

**Commands**:
```bash
pnpm test:e2e              # Run all E2E tests
pnpm test:e2e --headed    # Run with visible browser
pnpm test:e2e:debug       # Debug mode with inspector
pnpm test:e2e:report      # View HTML report
```

### Test Helpers

**File**: `apps/web/e2e/helpers.ts`
- Reusable test utilities
- Data fixtures (test user, store, product, coupon)
- Common operations (register, login, create store, etc.)
- File operations
- Cleanup functions

**Helpers**:
- `registerMerchant(page)` - Create new account
- `loginMerchant(page)` - Authenticate
- `createStore(page, store)` - Create merchant store
- `createProduct(page, product)` - Create product
- `uploadProductFile(page, productId, filePath)` - Upload file
- `publishProduct(page, productId)` - Publish product
- `createCoupon(page, coupon)` - Create discount coupon
- `buyProduct(page, productId, couponCode?)` - Checkout flow
- `simulatePayment(page, address, amount)` - Mock payment
- `waitForPaymentConfirmation(page)` - Poll for confirmation
- `submitReview(page, review)` - Post review
- `checkDashboardMetrics(page)` - Verify analytics

## Test Suites

### Full User Flow Test

**File**: `apps/web/e2e/full-flow.spec.ts`

**Test Scenarios**:

#### 1. Complete Merchant & Customer Journey
```
Steps:
1. Register as merchant
2. Login to dashboard
3. Create store
4. Create product
5. Upload product file
6. Publish product
7. Create discount coupon
8. Browse stores as customer
9. View product details
10. Checkout with coupon
11. Simulate payment
12. Download file
13. Submit review
14. Verify dashboard metrics updated
15. Request payout
```

**Duration**: ~60 seconds per run

**Coverage**:
- User registration and auth flow
- Merchant store/product creation
- File upload and encryption
- Checkout with idempotency
- Payment polling (2-second intervals)
- Download with signed URL
- Review submission and rating
- Dashboard analytics updates

#### 2. Payment Flow with Polling
```
Steps:
1. Navigate to checkout
2. Create checkout (get QR + address)
3. Simulate payment
4. Poll for status every 2 seconds
5. Verify confirmation
```

**Tests**:
- Polling continues until confirmed
- Timeout after 15 minutes
- Download URL generated
- Rate limiting headers present

#### 3. Product Reviews
```
Steps:
1. Visit product page
2. View reviews section
3. Check rating display
4. Submit review (if purchased)
5. Verify review appears
```

**Tests**:
- 1-5 star ratings
- Customer name validation
- Comment length validation
- Duplicate prevention
- Soft delete (moderation)

#### 4. API Key Management
```
Steps:
1. Login to merchant account
2. Navigate to settings
3. Create new API key
4. Display secret key once
5. Delete API key
```

**Tests**:
- API key creation success
- Secret key not displayed again
- API key authentication works
- Revoked keys return 401

### Error Handling Tests

#### Validation Errors
- Invalid email format
- Password too short
- Missing required fields
- Duplicate email address
- Invalid product category

#### Network Errors
- Offline mode recovery
- Timeout handling
- Retry logic
- Error messages displayed

#### Rate Limiting
- 100 req/min limit enforced
- 429 response status
- Rate limit headers present
- Reset after window expires

## Test Data

### Fixtures

```typescript
TEST_USER = {
  email: `test-${Date.now()}@example.com`,
  password: 'TestPassword123!',
}

TEST_STORE = {
  name: 'Test Store',
  slug: `test-store-${Date.now()}`,
}

TEST_PRODUCT = {
  title: 'Test E-Book',
  description: 'A great e-book for testing',
  price: '1000000000', // 10 MBITE
  category: 'ebook',
  downloadLimit: '3',
}

TEST_COUPON = {
  code: `TEST${random}`,
  discountType: 'percentage',
  discountValue: '20',
  maxUsage: 10,
}
```

### Test File

- Creates temporary file for upload
- Contains sample content
- Cleaned up after test

## Coverage

**User Journeys**:
- ✅ Register → Verify → Dashboard
- ✅ Create Store → Create Product → Publish
- ✅ Upload Encrypted File
- ✅ Create & Manage Coupons
- ✅ Browse Stores & Products
- ✅ Checkout with Payment Simulation
- ✅ Download File with Rate Limiting
- ✅ Submit & View Reviews
- ✅ Request Payout
- ✅ Manage API Keys

**Error Cases**:
- ✅ Validation errors (form inputs)
- ✅ Network failures (offline recovery)
- ✅ Rate limiting (429 responses)
- ✅ Authentication failures (invalid token)
- ✅ Resource not found (404)
- ✅ Duplicate resources (409)

**Features**:
- ✅ Idempotent checkout
- ✅ HMAC-signed download URLs
- ✅ Payment polling (live confirmation)
- ✅ Coupon discount calculation
- ✅ Download limits enforcement
- ✅ IP rate limiting
- ✅ Review duplicate prevention
- ✅ Soft delete (moderation)

## Running Tests

### Prerequisites
```bash
# Install dependencies
pnpm install

# Ensure Docker services running
docker compose up -d

# Start dev servers (handled by playwright.config.ts)
```

### Run All Tests
```bash
pnpm test:e2e
```

### Run Specific Suite
```bash
pnpm test:e2e full-flow
pnpm test:e2e error-handling
```

### Debug Mode
```bash
pnpm test:e2e:debug

# Opens Playwright Inspector
# Step through tests line by line
# Inspect DOM elements
# Modify selectors in real-time
```

### Headed Mode (See Browser)
```bash
pnpm test:e2e --headed

# Launches browser window
# Watch tests execute
# Interact with page (limited)
```

### Generate Report
```bash
pnpm test:e2e:report

# Opens HTML report with:
# - Test timings
# - Screenshots/videos on failure
# - Full trace of all actions
# - Network requests
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: password
      redis:
        image: redis:7

    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm db:migrate
      - run: pnpm test:e2e

      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Performance Metrics

**Expected Timings**:
- Full flow test: 60-90 seconds
- Payment polling: 5-10 seconds (with 2s intervals)
- Parallel run (3 browsers): 3-5 minutes total
- Cleanup/teardown: < 5 seconds per test

**Optimization**:
- Use `test.describe.only()` to run single test
- Parallel browser execution
- Retry failed tests (max 2 times)
- Cleanup removes test data quickly

## Troubleshooting

### Tests Timing Out
- Increase timeout in playwright.config.ts
- Check if servers are running
- Verify database migrations completed

### Selector Not Found
- Use `--headed` to see actual page
- Use `--debug` to inspect elements
- Update selectors if UI changed

### API Errors
- Check if API server running (port 3001)
- Verify database connections
- Check Redis is available

### File Upload Fails
- Ensure temp directory writable
- Check file size limit (2GB)
- Verify MIME types supported

## Best Practices

1. **Use helpers**: Reuse functions from `helpers.ts`
2. **Isolate tests**: Each test is independent
3. **Clean up**: Tests cleanup their own data
4. **Wait for navigation**: Use `waitForURL()` not just `goto()`
5. **Expect assertions**: Always verify success
6. **Use data-testid**: Add attributes for reliable selectors
7. **Mock external APIs**: Use mock payment endpoint
8. **Handle flakiness**: Use proper waits, not hardcoded sleeps

## Future Enhancements

- [ ] Visual regression testing (screenshots)
- [ ] Accessibility testing (axe plugin)
- [ ] Performance testing (Lighthouse integration)
- [ ] Load testing (k6/locust integration)
- [ ] Mobile testing (responsive design)
- [ ] Cross-browser testing expansion
- [ ] Video recording on failure
- [ ] Test parallelization improvements

## Documentation

**Related Files**:
- `playwright.config.ts` - Configuration
- `e2e/helpers.ts` - Test utilities
- `e2e/full-flow.spec.ts` - Main test suite
- `docs/TESTING.md` - General testing guide

## Next: Milestone 9 (Security Hardening)

With E2E tests complete:
- Security audit (OWASP top 10)
- Dependency scanning
- Helmet configuration
- Rate limit improvements
- API key rotation
- Security documentation

Production-ready platform! 🚀
