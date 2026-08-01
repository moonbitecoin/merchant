# Payment Reconciliation Flow

## Overview

This document describes how payments are matched to transactions, including handling of all 5 edge cases.

## Happy Path (Exact Payment)

```
Customer initiates checkout
    ↓ POST /api/v1/checkout
API creates Transaction
    ├ id: uuid
    ├ depositAddress: derived (HD wallet)
    ├ expectedAmount: 10 MBITE (10^9 units)
    ├ status: 'pending'
    ├ expiresAt: now + 15 minutes
    └ txHash: null
    ↓
Return to customer
    ├ depositAddress
    ├ QR code
    └ 15 minute countdown
    ↓
Customer sends 10 MBITE to depositAddress
    ↓ (on blockchain)
PaymentListener detects deposit
    ├ Calls onDeposit(event)
    └ event.amount = 10 MBITE (10^9 units)
    ↓
Backend processes payment
    ├ PaymentMatcher.matchPayment()
    │   ├ Find Transaction by depositAddress ✓
    │   ├ Check: amount == expectedAmount ✓
    │   ├ Check: not expired ✓
    │   └ Status: 'confirmed'
    │
    ├ Calculate settlement
    │   ├ Platform fee = expectedAmount * 200 / 10000
    │   │  = 10^9 * 200 / 10000
    │   │  = 2 * 10^7 (0.2 MBITE)
    │   └ Merchant gets = 10^9 - 2*10^7 = 9.8 MBITE
    │
    ├ Update Transaction
    │   ├ txHash = "abc123..."
    │   ├ status = 'confirmed'
    │   └ confirmedAt = now
    │
    ├ Credit merchant balance
    │   └ balance += 9.8 MBITE
    │
    ├ Send payment.received webhook
    │   ├ URL: merchant's webhook endpoint
    │   ├ Payload: {event: "payment.received", transaction_id: "...", amount: 9.8}
    │   ├ Header: X-MoonBite-Signature: HMAC-SHA256(payload, secret)
    │   └ Retry: 1m, 5m, 30m, 2h (then dead-letter)
    │
    ├ Generate signed download URL
    │   ├ URL valid for 24 hours
    │   ├ Bound to customer's IP
    │   └ HMAC signature prevents tampering
    │
    ├ Send receipt email
    │   ├ To: customer email (if captured)
    │   └ Link: download URL
    │
    └ Enqueue delivery job
        └ Process file download requests
    ↓
Customer downloads file
    ├ GET /api/v1/downloads/{transactionId}?sig=...
    ├ Verify signature (timing-safe comparison)
    ├ Retrieve encrypted file from MinIO
    ├ Decrypt with stored encryption key
    └ Stream plaintext to customer
```

## Edge Case 1: Underpayment

```
Expected: 10 MBITE (10^9 units)
Received: 9 MBITE (9 * 10^8 units)  ← Short by 1 MBITE
    ↓
PaymentMatcher.matchPayment()
    ├ Find Transaction by depositAddress ✓
    ├ Check: amount < expectedAmount
    │   └ 9 * 10^8 < 10^9 ✓ UNDERPAID
    └ Return status: 'underpaid'
    ↓
Update Transaction
    ├ status = 'underpaid'
    ├ txHash = "abc123..."
    └ confirmedAt = null (NOT credited)
    ↓
Flag for merchant review
    ├ Email: "Underpayment received for order X"
    ├ Amount received: 9 MBITE
    ├ Amount required: 10 MBITE
    └ Merchant can accept partial or request refund
    ↓
No file delivery
```

## Edge Case 2: Overpayment

```
Expected: 10 MBITE (10^9 units)
Received: 11 MBITE (11 * 10^8 units)  ← Extra 1 MBITE
    ↓
PaymentMatcher.matchPayment()
    ├ Find Transaction by depositAddress ✓
    ├ Check: amount > expectedAmount
    │   └ 11 * 10^8 > 10^9 ✓ OVERPAID
    ├ Status: 'overpaid' (but continue delivery)
    └ Merchant still gets 9.8 MBITE (2% fee on expected)
    ↓
Update Transaction
    ├ status = 'confirmed' (still deliver)
    ├ txHash = "abc123..."
    ├ amount = 11 MBITE (actual received)
    ├ merchantAmount = 9.8 MBITE (based on expected)
    └ surplus = 0.2 MBITE (recorded for reconciliation)
    ↓
Deliver file
    ├ Customer gets download link
    └ File transfers successfully
    ↓
Reconciliation note
    └ Flag: "Overpayment of 1 MBITE received"
        (merchant can decide to refund, keep as tip, etc)
```

## Edge Case 3: Late Payment

```
Checkout created: 2024-01-01 10:00:00 UTC
    ├ expiresAt = 2024-01-01 10:15:00 UTC (15 minutes)
    └ depositAddress generated
    ↓
Customer sends payment: 2024-01-01 10:20:00 UTC  ← 5 minutes LATE
    ↓
PaymentListener detects deposit at 10:20
    ↓
PaymentMatcher.matchPayment()
    ├ Find Transaction ✓
    ├ Check: amount == expectedAmount ✓
    ├ Check: confirmedTime > expiresAt
    │   └ 2024-01-01 10:20:00 > 2024-01-01 10:15:00 ✓ LATE
    └ Status: 'late'
    ↓
Update Transaction
    ├ status = 'late'
    ├ txHash = "abc123..."
    └ confirmedAt = 10:20:00 (recorded for audit)
    ↓
Flag for review
    ├ Email: "Payment received after expiry"
    ├ Transaction expired at: 10:15:00
    ├ Payment received at: 10:20:00
    └ Merchant decides: accept or reject
    ↓
No automatic file delivery
    └ Merchant manually approves if desired
```

## Edge Case 4: Duplicate Listener Events

```
Blockchain produces block with transaction
    ├ First listener sees it
    ├ Processes and confirms
    └ Updates status to 'confirmed'
    ↓
Blockchain node reorganizes
    ├ Same transaction in new block
    └ Listener sees it AGAIN
    ↓
PaymentMatcher.matchPayment() called again
    ├ Find Transaction by depositAddress ✓
    ├ Check: status == 'confirmed'
    │   └ Payment already processed ✓
    └ IDEMPOTENT: Return "already confirmed"
    ↓
Update Transaction: SKIP (no changes)
    ├ Status already 'confirmed'
    └ No double-credit
    ↓
Result: Payment counted exactly once ✓
```

## Edge Case 5: Chain Reorg (Reverted Payment)

```
Initial chain:
    Block 100 [tx1: send to deposit address] ✓ confirmed
    Block 101 [...]
    Block 102 [...]
    ↓
PaymentListener marks as confirmed, credits merchant
    ↓
Chain reorganizes:
    Block 100' [different tx]
    Block 101' [...]
    Block 102' [...]
    ↓
Transaction tx1 NO LONGER in blockchain
    ├ confirmations drops from 5 to 0
    └ PaymentListener detects reorg
    ↓
Backend reverts confirmation
    ├ PaymentMatcher.handleChainReorg(transactionId)
    ├ Update Transaction
    │   ├ status = 'reverted'
    │   ├ confirmationCount = 0
    │   ├ confirmedAt = null
    │   └ txHash = null (or keep for audit)
    │
    └ Reverse merchant credit
        ├ balance -= 9.8 MBITE
        ├ Email: "Payment reversed due to chain reorg"
        └ Flag: "Requires customer action"
    ↓
Transaction status: 'reverted'
    ├ Not refunded automatically
    ├ Merchant notified
    └ Customer should re-send payment
```

## Idempotency

### Unique Constraints

```sql
-- Prevent duplicate transactions for same payment
ALTER TABLE transactions
ADD CONSTRAINT unique_tx_hash UNIQUE(tx_hash);

-- Prevent duplicate deposit addresses
ALTER TABLE transactions
ADD CONSTRAINT unique_deposit_address UNIQUE(depositAddress);
```

### Idempotency Keys (for API calls)

Merchant can include `Idempotency-Key` header:

```bash
POST /api/v1/checkout
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000

# If called again with same key, returns same result (no double-charge)
```

Implementation:
- Store (idempotencyKey, result) in database
- Check before processing
- Return cached result if already processed
- TTL: 24 hours

## Money Math (BigInt Only)

```typescript
// CRITICAL: Never use float for money

// Platform fee calculation (2% = 200 basis points)
const expectedAmount = 10n * 10n ** 8n; // 10 MBITE in smallest units
const platformFee = (expectedAmount * 200n) / 10000n;
// = (10^9 * 200) / 10000
// = 2 * 10^7 (0.2 MBITE)

const merchantAmount = expectedAmount - platformFee;
// = 10^9 - 2*10^7
// = 9.8 * 10^8 (9.8 MBITE)

// Sanity check
if (platformFee + merchantAmount !== expectedAmount) {
  throw new Error('Settlement calculation error');
}
```

## Confirmation Requirements

Default: 2 confirmations required

```
Confirmation 1:
    ├ Payment in mempool
    └ High risk (can be reorged)

Confirmation 2:
    ├ 1 more block after payment
    └ Low risk (~1 hour for Bitcoin, ~12 seconds for Ethereum)

Confirmation 3+:
    ├ Very safe
    └ Recommended for high-value transactions
```

Configuration:
```env
CONFIRMATIONS_REQUIRED=2  # Configurable per blockchain
```

## Testing Edge Cases

Unit tests in `apps/api/src/lib/payment-matcher.test.ts`:

```typescript
test('exact payment', () => {
  // amount === expectedAmount
  // Should return 'confirmed'
});

test('underpayment', () => {
  // amount < expectedAmount
  // Should return 'underpaid', no delivery
});

test('overpayment', () => {
  // amount > expectedAmount
  // Should return 'confirmed', deliver file
});

test('late payment', () => {
  // confirmedAt > expiresAt
  // Should return 'late', flag for review
});

test('duplicate events', () => {
  // Same tx_hash processed twice
  // Second should be idempotent, no double-credit
});

test('chain reorg', () => {
  // confirmations drops to 0
  // Should reverse confirmation, refund merchant
});
```

## Monitoring

Track in production:

```
- Payment confirmation rate: target >99%
- Average confirmation time
- Underpayment rate
- Overpayment rate
- Late payment rate
- Webhook delivery success rate
- Chain reorg detection rate
```

Red flags if:
- Confirmation rate < 95%
- Webhook delivery < 98%
- Reorg rate > 0.1%
