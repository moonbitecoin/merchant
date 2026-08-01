# Milestone 2: Stores & Products

## Overview

Milestone 2 implements full store and product management with file uploads, encryption, and streaming.

## Implemented Endpoints

### Stores (9 endpoints)

**Authenticated (Merchant)**:
- `GET /api/v1/stores` - List all stores for merchant (paginated)
- `POST /api/v1/stores` - Create new store
- `GET /api/v1/stores/:id` - Get store details
- `PUT /api/v1/stores/:id` - Update store (name, description, logo)
- `POST /api/v1/stores/:id/publish` - Publish store (make visible)
- `POST /api/v1/stores/:id/suspend` - Suspend store (make inaccessible)
- `DELETE /api/v1/stores/:id` - Delete store (soft delete)

**Public (No Auth)**:
- `GET /api/v1/public/:slug` - Get store details by slug

### Products (11 endpoints)

**Authenticated (Merchant)**:
- `GET /api/v1/stores/:storeId/products` - List products for store (paginated, filterable by status)
- `POST /api/v1/stores/:storeId/products` - Create product (draft)
- `GET /api/v1/products/:id` - Get product details
- `PUT /api/v1/products/:id` - Update product (title, price, description, etc)
- `POST /api/v1/products/:id/publish` - Publish product (requires ≥1 file)
- `POST /api/v1/products/:id/archive` - Archive product
- `DELETE /api/v1/products/:id` - Delete product (soft delete)

**File Management** (Merchant):
- `POST /api/v1/products/:id/files` - Upload file (multipart form-data)
- `GET /api/v1/products/:id/files` - List files for product
- `DELETE /api/v1/products/:id/files/:fileId` - Delete file

**Public (No Auth)**:
- `GET /api/v1/public/store/:slug/products` - Get active products for store

## Services

### StoreService
```typescript
createStore(merchantId, input)        // Create store with name, slug, description
getStore(storeId, merchantId?)        // Get store details (with ownership check)
getStoresForMerchant(merchantId)      // List all stores for merchant
getStoreBySlug(slug)                  // Get public store by slug
updateStore(storeId, merchantId, input) // Update store
publishStore(storeId, merchantId)     // Make store visible
suspendStore(storeId, merchantId)     // Suspend store
deleteStore(storeId, merchantId)      // Soft delete store
```

### ProductService
```typescript
createProduct(merchantId, storeId, input)  // Create product (draft)
getProduct(productId, merchantId?)         // Get product (with ownership check)
getProductsForStore(storeId, options)      // List products for store
getProductsByStoreSlug(slug)               // Get active products by store slug
updateProduct(productId, merchantId, input) // Update product
publishProduct(productId, merchantId)      // Publish (requires ≥1 file)
archiveProduct(productId, merchantId)      // Archive product
deleteProduct(productId, merchantId)       // Soft delete product
```

### FileService
```typescript
uploadFile(options)           // Stream upload with encryption & hashing
getFile(fileId)              // Get file metadata
getFilesForProduct(productId) // List files for product
deleteFile(fileId, productId) // Delete file from MinIO & database
prepareDownload(fileId)       // Get file for download (with keys)
```

## Data Models

### Store
```typescript
{
  id: UUID,
  merchantId: UUID,
  name: string,
  slug: string (unique),
  description?: string,
  logoUrl?: string,
  status: 'active' | 'suspended' | 'archived',
  publishedAt?: Date,
  createdAt: Date,
  updatedAt: Date,
  deletedAt?: Date (soft delete)
}
```

### Product
```typescript
{
  id: UUID,
  storeId: UUID,
  title: string,
  slug: string,
  description: string (markdown),
  category: 'SOFTWARE' | 'EBOOK' | 'ART' | 'COURSE' | 'OTHER',
  price: BigInt (smallest unit, 10^-8 MBITE),
  downloadLimit: '1' | '3' | 'UNLIMITED',
  expiryDate?: Date,
  status: 'draft' | 'active' | 'archived',
  createdAt: Date,
  updatedAt: Date,
  deletedAt?: Date (soft delete)
}
```

### ProductFile
```typescript
{
  id: UUID,
  productId: UUID,
  filename: string,
  mimetype: string,
  size: BigInt (bytes),
  sha256Hash: string,
  minioPath: string,
  encryptionKey: string (hex, wrapped),
  iv: string (hex, 12 bytes),
  tag: string (hex, 16 bytes, auth tag),
  createdAt: Date
}
```

## File Upload Flow

### Upload Process

```
1. Client sends file via multipart form-data
   POST /api/v1/products/:id/files
   Content-Type: multipart/form-data

   [file stream]

2. Server receives stream
   - Do NOT buffer in memory
   - Stream directly to MinIO

3. While streaming:
   - Hash file with SHA-256
   - Encrypt with AES-256-GCM
     - Generate random 32-byte data key
     - Generate random 12-byte IV
     - Encrypt data with key + IV
     - Get 16-byte auth tag
   - Upload encrypted data to MinIO

4. Wrap data key with master key
   - Retrieve master key from env: ENCRYPTION_KEY
   - Encrypt data key with master key
   - Store wrapped key in database

5. Store metadata in Prisma
   - filename, mimetype, size
   - sha256Hash (plaintext, for integrity)
   - minioPath (location in S3)
   - encryptionKey (wrapped, hex)
   - iv (hex)
   - tag (hex, auth tag)

6. Return file metadata to client
```

### Download Process (Milestone 3)

```
1. Client requests download
   GET /api/v1/downloads/{transactionId}?sig=...

2. Verify signature & transaction confirmed

3. Retrieve encrypted file from MinIO

4. Return encrypted data + keys to client
   OR server-side decrypt and stream plaintext

5. Client receives file
   - If encrypted: decrypt with provided keys
   - If plaintext: save directly
```

## Security Features

✅ **File Encryption**: AES-256-GCM (authenticated encryption)
✅ **Streaming Upload**: Never buffered in memory (safe for 2GB files)
✅ **SHA-256 Hashing**: Integrity check on download
✅ **Ownership Checks**: Verify merchant owns store/product
✅ **Soft Deletes**: Recover deleted items if needed
✅ **Audit Logging**: Log store/product creation
✅ **MinIO Integration**: S3-compatible object storage

## Validation Rules

### Store Slug
- 2-50 characters
- Lowercase, alphanumeric, hyphens only
- Unique across all stores
- Example: `my-digital-shop`

### Product Slug
- Unique per store (not globally)
- Same format as store slug
- Example: `advanced-typescript-course`

### Product Price
- BigInt only (no floats)
- Smallest unit = 10^-8 MBITE
- Minimum: 0 (free products allowed)
- Example: 1000000000n = 10 MBITE

### Product Categories
- SOFTWARE
- EBOOK
- ART
- COURSE
- OTHER

### Download Limits
- `1` - Customer can download once
- `3` - Customer can download 3 times
- `UNLIMITED` - No limit

## Tests

### PaymentMatcher (All 5 Edge Cases)
✅ Exact payment
✅ Underpayment
✅ Overpayment
✅ Late payment
✅ Chain reorg (duplicate events)
✅ Money math (BigInt, no rounding errors)

### Product Service
✅ Price formatting (MBITE)
✅ Price conversion (smallest unit)
✅ Category validation
✅ Download limit validation
✅ Price validation (no negatives)
✅ Title validation

## Error Codes

```
STORE_NOT_FOUND          (404)
PRODUCT_NOT_FOUND        (404)
FILE_NOT_FOUND          (404)
DUPLICATE_SLUG          (409)
STORE_SUSPENDED         (403)
PRODUCT_NOT_ACTIVE      (400)
PRODUCT_EXPIRED         (400)
VALIDATION_ERROR        (422)
ENCRYPTION_ERROR        (500)
STORAGE_ERROR           (500)
```

## Usage Examples

### Create Store
```bash
curl -X POST http://localhost:3001/api/v1/stores \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Store",
    "slug": "my-store",
    "description": "Sell my digital products"
  }'
```

### Create Product
```bash
curl -X POST http://localhost:3001/api/v1/stores/{storeId}/products \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Advanced TypeScript",
    "slug": "advanced-typescript",
    "description": "Learn advanced TS patterns",
    "category": "COURSE",
    "price": "4900000000",
    "downloadLimit": "UNLIMITED"
  }'
```

### Upload File
```bash
curl -X POST http://localhost:3001/api/v1/products/{productId}/files \
  -H "Authorization: Bearer $JWT" \
  -F "file=@course.pdf"
```

### Publish Product
```bash
curl -X POST http://localhost:3001/api/v1/products/{productId}/publish \
  -H "Authorization: Bearer $JWT"
```

### Get Public Store
```bash
curl http://localhost:3001/api/v1/public/my-store
```

### Get Public Products
```bash
curl http://localhost:3001/api/v1/public/store/my-store/products
```

## Database Indexes

All schema has proper indexes for fast queries:

```sql
-- Store lookups
CREATE INDEX stores_merchant_id ON stores(merchant_id);
CREATE INDEX stores_slug ON stores(slug) UNIQUE;

-- Product lookups
CREATE INDEX products_store_id ON products(store_id);
CREATE INDEX products_store_id_active ON products(store_id, status);
CREATE INDEX products_category ON products(category);

-- File lookups
CREATE INDEX product_files_product_id ON product_files(product_id);
CREATE INDEX product_files_sha256 ON product_files(sha256_hash) UNIQUE;
```

## Next: Milestone 3 (Payments & Checkout)

With stores and products complete, Milestone 3 will:
1. Implement checkout flow
2. Create payment listener & reconciliation
3. Handle all 5 edge cases (already tested)
4. Generate signed download URLs
5. Fire webhooks
6. Send receipts

Ready to build?
