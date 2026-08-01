# Milestone 5: Merchant Dashboard

## Overview

Milestone 5 builds a complete merchant dashboard with analytics, transaction management, payout requests, and coupon management. Includes revenue charts, sales metrics, top products, filterable transactions with CSV export, and comprehensive settings management.

## Implemented Features

### Dashboard Overview

**Metrics Cards**:
- Total Revenue (all-time confirmed transactions)
- Total Checkouts (pending + confirmed + failed)
- Conversion Rate (confirmed ÷ total × 100%)
- Average Order Value (total revenue ÷ confirmed count)

**Revenue Chart**:
- Line chart showing daily revenue
- Toggleable 30-day / 90-day views
- Displays transaction count per day
- Interactive tooltips with MBITE amounts

**Top Products**:
- Ranked by total revenue (highest first)
- Shows sales count per product
- Links to products page
- Displays top 5 by default

**Recent Transactions**:
- Last 10 transactions (configurable)
- Status badges (pending/confirmed/failed)
- Product name, store name, amount, date
- One-click CSV export of all transactions

### Analytics Service

```typescript
AnalyticsService {
  getRevenueChart(merchantId, storeId?, days)    // Daily revenue data
  getSalesMetrics(merchantId, storeId?)           // Overall metrics
  getTopProducts(merchantId, storeId?, limit)     // Top N products
  getTransactionHistory(merchantId, filters, options) // Filterable list
  exportTransactionsToCSV(transactions)           // Export to CSV
}
```

**Revenue Chart Data**:
```
{
  date: "2024-08-01",
  revenue: "1000000000",  // BigInt as string (100 MBITE)
  count: 5                // Transactions that day
}
```

**Filters for Transaction History**:
- `storeId`: Filter by store
- `status`: pending | confirmed | failed
- `productId`: Filter by product
- `startDate` / `endDate`: Date range
- Pagination: limit (default 50) + offset

### Payouts Management

**PayoutService**:
```typescript
PayoutService {
  getMerchantBalance(merchantId)           // Available + pending + completed
  requestPayout(merchantId, amount, wallet, totpCode?) // Create payout
  getPayoutHistory(merchantId, options)    // Payout list with pagination
  getPayoutDetails(payoutId, merchantId)   // Single payout info
}
```

**Balance Calculation**:
```
availableBalance = totalRevenue - totalPayoutsRequested
```

**Payout Request Flow**:
1. Merchant enters amount (must be ≤ available balance)
2. Enters wallet address (validated, min 5 chars)
3. Optionally enters 2FA code (required if 2FA enabled)
4. Creates `payout` record with status='pending'
5. JobQueueService queues `queuePayout` job for processing
6. On successful blockchain send: status='processing' → 'completed'
7. Webhook: `payout.completed` fired to merchant's webhooks

**Payout Status States**:
- `pending`: Created, awaiting processing
- `processing`: In progress on blockchain
- `completed`: Sent successfully (has txHash)
- `failed`: Blockchain transaction failed

### Coupons Management

**CouponService**:
```typescript
CouponService {
  createCoupon(merchantId, input)          // Create percentage or fixed discount
  getCouponByCode(code)                    // Get coupon for checkout (public)
  listCoupons(merchantId, options)         // List all coupons
  updateCoupon(couponId, merchantId, input) // Update discount/usage
  toggleCoupon(couponId, merchantId)       // Enable/disable
  deleteCoupon(couponId, merchantId)       // Soft delete
  calculateDiscount(amount, type, value)   // Apply discount to amount
}
```

**Coupon Types**:
- `percentage`: Discount % (0-100%, e.g., 20% off)
- `fixed`: Fixed MBITE amount (e.g., 50000000 = 0.5 MBITE off)

**Coupon Input**:
```typescript
{
  code: string;                    // 3-50 chars, uppercase
  discountType: 'percentage' | 'fixed';
  discountValue: bigint;           // 0-100 for %, any amount for fixed
  maxUsage?: number;               // 0 = unlimited
  expiresAt?: Date;                // Optional expiration
  storeId?: string;                // Optional: apply to specific store
}
```

**Coupon Validation**:
- Code must be 3-50 characters
- Code must be unique per merchant
- Discount value > 0
- Percentage ≤ 100%
- Max usage ≥ 0 (0 = unlimited)
- Expired coupons auto-disabled (expiresAt < now)

**Coupon Usage Tracking**:
- Coupon linked to transactions (couponId on transaction record)
- Usage count = transaction count referencing coupon
- Can't exceed maxUsage (returns error if over limit during checkout)
- Soft delete (deletedAt is set)

**Discount Calculation**:
```
if percentage: discount = amount * discountValue / 100
if fixed:      discount = min(discountValue, amount)
```

### Dashboard API Endpoints

**Analytics** (all require auth):
- `GET /dashboard/metrics?storeId=X` → Revenue, checkouts, conversion, AOV
- `GET /dashboard/revenue-chart?days=30|90&storeId=X` → Daily data for chart
- `GET /dashboard/top-products?limit=5&storeId=X` → Top N products
- `GET /dashboard/transactions?page=1&limit=50&storeId=X&status=X&productId=X&startDate=X&endDate=X` → Paginated list
- `POST /dashboard/transactions/export` → Download CSV

**Payouts** (all require auth):
- `GET /payouts/balance` → Available, requested, completed amounts
- `GET /payouts?page=1&limit=50` → Payout history
- `GET /payouts/:id` → Single payout details
- `POST /payouts` → Request payout (amount, wallet, optional totpCode)

**Coupons** (all require auth):
- `GET /coupons?page=1&limit=50` → List coupons
- `POST /coupons` → Create coupon
- `PUT /coupons/:id` → Update coupon (discount, maxUsage, expiresAt)
- `POST /coupons/:id/toggle` → Toggle active/inactive
- `DELETE /coupons/:id` → Soft delete

### Frontend Components

**Dashboard Layout**:
```
DashboardLayout
├─ DashboardSidebar (navigation)
│  ├─ Links: Overview, Products, Payouts, Coupons, Settings
│  └─ Logout button
└─ Main content area (page-specific)
```

**Dashboard Page** (`/dashboard`):
```
DashboardPage
├─ MetricsCard (4x: Revenue, Checkouts, Conversion, AOV)
├─ RevenueChart (line chart, 30/90d toggle)
├─ TopProducts (ranked list, top 5)
└─ TransactionTable (recent, CSV export button)
```

**Payouts Page** (`/dashboard/payouts`):
```
PayoutsPage
├─ PayoutBalance (available, total revenue, paid out)
├─ PayoutForm (amount input, wallet address, 2FA code)
└─ PayoutHistory (table: ID, amount, status, wallet, dates)
```

**Coupons Page** (`/dashboard/coupons`):
```
CouponsPage
├─ CouponForm (code, type, discount, max usage, expiry)
└─ CouponList (table with toggle/delete actions)
```

**Settings Page** (`/dashboard/settings`):
```
SettingsPage
├─ SettingsNav (sidebar: API Keys, Webhooks, Wallet, Security)
└─ Content area:
   ├─ APIKeysSettings (create, list, delete keys)
   ├─ WebhooksSettings (available events documentation)
   ├─ WalletSettings (default payout wallet address)
   └─ SecuritySettings (2FA toggle, password change, tips)
```

**Sidebar Navigation**:
- Overview → /dashboard
- Products → /dashboard/products
- Payouts → /dashboard/payouts
- Coupons → /dashboard/coupons
- Settings → /dashboard/settings
- Logout button

### API Client Library

```typescript
dashboardAPI {
  getMetrics(storeId?)
  getRevenueChart(days, storeId?)
  getTopProducts(limit, storeId?)
  getTransactions(page, limit, filters)
  exportTransactions(filters)
}

payoutAPI {
  getBalance()
  getPayouts(page, limit)
  getPayout(id)
  requestPayout(amount, wallet, totpCode?)
}

couponAPI {
  getCoupons(page, limit)
  createCoupon(input)
  updateCoupon(id, input)
  toggleCoupon(id)
  deleteCoupon(id)
}
```

All methods:
- Handle auth token from localStorage
- Throw `ApiError` on failure (status + detail)
- Convert BigInt amounts to strings for transport
- Format currency display on frontend (÷ 1e8 for MBITE)

### Services Integration

**JobQueueService** extended:
- `queuePayout(payoutId, merchantId, amount, wallet)` → Queues for blockchain processing
- Worker logs payout status, fires webhook on completion

**WebhookService** integration:
- Fires `payment.received` on confirmed transaction
- Fires `file.downloaded` on download (via DownloadService)
- Fires `payout.completed` when payout processed
- All signed with HMAC-SHA256

**AuditService** integration:
- Logs payout requests (action='payout_request')
- Logs coupon creation/deletion/toggling
- Tracks merchant activity for compliance

### Database Updates

New/Enhanced Tables:
```typescript
// New: payout (already exists in schema)
Payout {
  id: UUID
  merchantId: UUID (FK)
  amount: BigInt
  wallet: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  txHash?: string (blockchain tx hash)
  requestedAt: DateTime
  completedAt?: DateTime
  createdAt: DateTime
}

// New: coupon
Coupon {
  id: UUID
  storeId?: UUID (optional, null = applies to all products)
  code: string (UNIQUE per store+merchant)
  discountType: 'percentage' | 'fixed'
  discountValue: BigInt
  maxUsage: Int (0 = unlimited)
  isActive: Boolean
  expiresAt?: DateTime
  createdAt: DateTime
  deletedAt?: DateTime (soft delete)

  // Relations
  transactions: Transaction[]  // Coupons used in transactions
}

// Enhanced: Transaction
Transaction {
  // ... existing fields
  couponId?: UUID (FK Coupon, optional)
  couponDiscount?: BigInt (discount applied, if any)
}
```

**Indexes**:
- `coupon.code` (unique)
- `coupon.storeId` (for querying by store)
- `transaction.couponId` (for usage tracking)
- `payout.merchantId` (for history)
- `payout.status` (for filtering)

### CSV Export Format

```csv
"Transaction ID","Status","Product","Store","Amount (MBITE)","Confirmed Date","TX Hash"
"uuid1","confirmed","TypeScript Course","My Store","1.50","Aug 1, 24","0xabc..."
"uuid2","pending","E-Book","My Store","0.25","",""
```

- Double-quoted fields (safe for commas in data)
- Amount formatted to 8 decimals (MBITE)
- Date format: "Aug 1, 24" (US locale, short year)
- TX Hash empty for non-confirmed transactions
- Max export: 10,000 transactions

### Validation Rules

**Payout Requests**:
- Amount > 0
- Amount ≤ available balance
- Wallet: 5+ characters (basic validation)
- 2FA code: 6 digits (if 2FA enabled)

**Coupons**:
- Code: 3-50 alphanumeric + hyphens
- Code: Unique per merchant
- Discount: > 0
- Percentage: ≤ 100%
- Max usage: ≥ 0
- Cannot update expired coupon (except toggle/delete)

**Checkout Integration**:
- Apply coupon: `const coupon = await couponAPI.getCouponByCode(code)`
- Check not expired: `expiresAt > now`
- Check not over limit: `usageCount < maxUsage`
- Calculate discount: `CouponService.calculateDiscount(amount, type, value)`
- Store couponId on transaction: `transaction.couponId = coupon.id`
- Track usage: `coupon.transactions.push(transaction)`

### Error Handling

**Validation Errors** (400):
- Missing required fields
- Invalid coupon code format
- Discount value exceeds 100% (for percentage)
- Insufficient balance for payout
- Wallet address too short

**Not Found** (404):
- Coupon not found
- Payout not found
- Transaction not found

**Business Logic** (409):
- Coupon already exists (by code)
- Coupon usage exceeded
- Coupon expired

**Auth** (401/403):
- Missing/invalid auth token
- Attempting to access another merchant's data

### Testing Scenarios

```bash
# Dashboard metrics
curl http://localhost:3001/api/v1/dashboard/metrics \
  -H "Authorization: Bearer $JWT"

# Revenue chart (30 days)
curl http://localhost:3001/api/v1/dashboard/revenue-chart?days=30 \
  -H "Authorization: Bearer $JWT"

# Top products
curl http://localhost:3001/api/v1/dashboard/top-products?limit=5 \
  -H "Authorization: Bearer $JWT"

# Transactions with filters
curl "http://localhost:3001/api/v1/dashboard/transactions?status=confirmed&page=1" \
  -H "Authorization: Bearer $JWT"

# Export CSV
curl -X POST http://localhost:3001/api/v1/dashboard/transactions/export \
  -H "Authorization: Bearer $JWT" \
  -d '{}' > transactions.csv

# Get balance
curl http://localhost:3001/api/v1/payouts/balance \
  -H "Authorization: Bearer $JWT"

# Request payout
curl -X POST http://localhost:3001/api/v1/payouts \
  -H "Authorization: Bearer $JWT" \
  -d '{"amount":"1000000000","wallet":"0xabc...","totpCode":"123456"}'

# List coupons
curl http://localhost:3001/api/v1/coupons?page=1 \
  -H "Authorization: Bearer $JWT"

# Create coupon
curl -X POST http://localhost:3001/api/v1/coupons \
  -H "Authorization: Bearer $JWT" \
  -d '{
    "code":"SAVE20",
    "discountType":"percentage",
    "discountValue":"20",
    "maxUsage":100
  }'

# Toggle coupon
curl -X POST http://localhost:3001/api/v1/coupons/coupon-id/toggle \
  -H "Authorization: Bearer $JWT"

# Delete coupon
curl -X DELETE http://localhost:3001/api/v1/coupons/coupon-id \
  -H "Authorization: Bearer $JWT"
```

### Frontend Setup

**Environment Variables** (.env.local):
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

**Libraries Used**:
- recharts: Charts (LineChart for revenue)
- lucide-react: Icons (DollarSign, TrendingUp, etc.)
- next/link: Client navigation
- React hooks: useState, useEffect for state management

### Production Checklist

- [ ] Database migrations for coupon + payout updates
- [ ] Redis working for BullMQ payout jobs
- [ ] Blockchain integration for payout processing
- [ ] Email notification on payout completion
- [ ] Webhook delivery on payout.completed
- [ ] CSV export max size validated (10k rows)
- [ ] Rate limiting on export endpoint (prevent abuse)
- [ ] 2FA validation for payout requests with 2FA enabled
- [ ] Audit logging for coupon/payout operations
- [ ] Transaction search/filtering performance (add indexes)
- [ ] Balance calculation accuracy (audit trail)
- [ ] Expired coupon auto-disable on checkout

## Architecture

```
Merchant Dashboard (Next.js)
├─ /dashboard (Overview with charts)
├─ /dashboard/payouts (Payout requests + history)
├─ /dashboard/coupons (Coupon manager)
├─ /dashboard/settings (API keys, webhooks, wallet)
└─ /dashboard/products (Product management)

API Routes
├─ GET /dashboard/metrics
├─ GET /dashboard/revenue-chart
├─ GET /dashboard/top-products
├─ GET /dashboard/transactions
├─ POST /dashboard/transactions/export
├─ GET /payouts/balance
├─ GET /payouts
├─ POST /payouts
├─ GET /payouts/:id
├─ GET /coupons
├─ POST /coupons
├─ PUT /coupons/:id
├─ POST /coupons/:id/toggle
└─ DELETE /coupons/:id

Services
├─ AnalyticsService (revenue, metrics, products, history)
├─ PayoutService (balance, requests, history)
└─ CouponService (create, read, update, toggle, delete)

JobQueue
└─ queuePayout → blockchain → webhook: payout.completed
```

## Next: Milestone 6 (Public Storefront)

With dashboard and merchant tools complete, Milestone 6 will build:
- Product grid (by store slug)
- Product detail pages (with reviews)
- Shopping cart (multiple products)
- Checkout modal (inline payment flow)
- Live checkout status polling (pending → confirmed)
- Download button on confirmed
- Customer reviews & ratings
- Review submission on download

Fully functional payment system + merchant + customer dashboards ready! 🚀
