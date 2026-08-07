/**
 * Zod schemas for all API boundaries
 * Single source of truth for request/response validation
 */
import { z } from 'zod';
export declare const IDSchema: z.ZodString;
export declare const MoneyBigIntSchema: z.ZodBigInt;
export declare const WalletAddressSchema: z.ZodString;
export declare const TxHashSchema: z.ZodString;
export declare const HTTPSUrlSchema: z.ZodString;
export declare const RegisterRequestSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email?: string;
    password?: string;
}, {
    email?: string;
    password?: string;
}>;
export declare const LoginRequestSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    totpCode: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email?: string;
    password?: string;
    totpCode?: string;
}, {
    email?: string;
    password?: string;
    totpCode?: string;
}>;
export declare const LoginResponseSchema: z.ZodObject<{
    accessToken: z.ZodString;
    refreshToken: z.ZodString;
    merchant: z.ZodObject<{
        id: z.ZodString;
        email: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        email?: string;
        id?: string;
        name?: string;
    }, {
        email?: string;
        id?: string;
        name?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    merchant?: {
        email?: string;
        id?: string;
        name?: string;
    };
    accessToken?: string;
    refreshToken?: string;
}, {
    merchant?: {
        email?: string;
        id?: string;
        name?: string;
    };
    accessToken?: string;
    refreshToken?: string;
}>;
export declare const RefreshTokenRequestSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refreshToken?: string;
}, {
    refreshToken?: string;
}>;
export declare const VerifyEmailRequestSchema: z.ZodObject<{
    token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token?: string;
}, {
    token?: string;
}>;
export declare const CreateStoreRequestSchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    slug?: string;
    description?: string;
}, {
    name?: string;
    slug?: string;
    description?: string;
}>;
export declare const UpdateStoreRequestSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    description?: string;
}, {
    name?: string;
    description?: string;
}>;
export declare const StoreResponseSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    slug: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    logoUrl: z.ZodNullable<z.ZodString>;
    status: z.ZodEnum<["active", "suspended", "archived"]>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    status?: "active" | "suspended" | "archived";
    id?: string;
    name?: string;
    slug?: string;
    description?: string;
    logoUrl?: string;
    createdAt?: Date;
    updatedAt?: Date;
}, {
    status?: "active" | "suspended" | "archived";
    id?: string;
    name?: string;
    slug?: string;
    description?: string;
    logoUrl?: string;
    createdAt?: Date;
    updatedAt?: Date;
}>;
export declare const CreateProductRequestSchema: z.ZodObject<{
    title: z.ZodString;
    slug: z.ZodString;
    description: z.ZodString;
    category: z.ZodEnum<["SOFTWARE", "EBOOK", "ART", "COURSE", "OTHER"]>;
    price: z.ZodBigInt;
    downloadLimit: z.ZodEnum<["1", "3", "UNLIMITED"]>;
    expiryDate: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
}, "strip", z.ZodTypeAny, {
    slug?: string;
    description?: string;
    title?: string;
    category?: "SOFTWARE" | "EBOOK" | "ART" | "COURSE" | "OTHER";
    price?: bigint;
    downloadLimit?: "1" | "3" | "UNLIMITED";
    expiryDate?: Date;
}, {
    slug?: string;
    description?: string;
    title?: string;
    category?: "SOFTWARE" | "EBOOK" | "ART" | "COURSE" | "OTHER";
    price?: bigint;
    downloadLimit?: "1" | "3" | "UNLIMITED";
    expiryDate?: Date;
}>;
export declare const UpdateProductRequestSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodEnum<["SOFTWARE", "EBOOK", "ART", "COURSE", "OTHER"]>>;
    price: z.ZodOptional<z.ZodBigInt>;
    downloadLimit: z.ZodOptional<z.ZodEnum<["1", "3", "UNLIMITED"]>>;
    expiryDate: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodDate>>>;
}, "strip", z.ZodTypeAny, {
    slug?: string;
    description?: string;
    title?: string;
    category?: "SOFTWARE" | "EBOOK" | "ART" | "COURSE" | "OTHER";
    price?: bigint;
    downloadLimit?: "1" | "3" | "UNLIMITED";
    expiryDate?: Date;
}, {
    slug?: string;
    description?: string;
    title?: string;
    category?: "SOFTWARE" | "EBOOK" | "ART" | "COURSE" | "OTHER";
    price?: bigint;
    downloadLimit?: "1" | "3" | "UNLIMITED";
    expiryDate?: Date;
}>;
export declare const ProductResponseSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    slug: z.ZodString;
    description: z.ZodString;
    category: z.ZodEnum<["SOFTWARE", "EBOOK", "ART", "COURSE", "OTHER"]>;
    price: z.ZodBigInt;
    downloadLimit: z.ZodEnum<["1", "3", "UNLIMITED"]>;
    expiryDate: z.ZodNullable<z.ZodDate>;
    status: z.ZodEnum<["draft", "active", "archived"]>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    status?: "active" | "archived" | "draft";
    id?: string;
    slug?: string;
    description?: string;
    createdAt?: Date;
    updatedAt?: Date;
    title?: string;
    category?: "SOFTWARE" | "EBOOK" | "ART" | "COURSE" | "OTHER";
    price?: bigint;
    downloadLimit?: "1" | "3" | "UNLIMITED";
    expiryDate?: Date;
}, {
    status?: "active" | "archived" | "draft";
    id?: string;
    slug?: string;
    description?: string;
    createdAt?: Date;
    updatedAt?: Date;
    title?: string;
    category?: "SOFTWARE" | "EBOOK" | "ART" | "COURSE" | "OTHER";
    price?: bigint;
    downloadLimit?: "1" | "3" | "UNLIMITED";
    expiryDate?: Date;
}>;
export declare const BulkImportProductsRequestSchema: z.ZodObject<{
    products: z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        slug: z.ZodString;
        description: z.ZodString;
        category: z.ZodEnum<["SOFTWARE", "EBOOK", "ART", "COURSE", "OTHER"]>;
        price: z.ZodString;
        downloadLimit: z.ZodEnum<["1", "3", "UNLIMITED"]>;
    }, "strip", z.ZodTypeAny, {
        slug?: string;
        description?: string;
        title?: string;
        category?: "SOFTWARE" | "EBOOK" | "ART" | "COURSE" | "OTHER";
        price?: string;
        downloadLimit?: "1" | "3" | "UNLIMITED";
    }, {
        slug?: string;
        description?: string;
        title?: string;
        category?: "SOFTWARE" | "EBOOK" | "ART" | "COURSE" | "OTHER";
        price?: string;
        downloadLimit?: "1" | "3" | "UNLIMITED";
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    products?: {
        slug?: string;
        description?: string;
        title?: string;
        category?: "SOFTWARE" | "EBOOK" | "ART" | "COURSE" | "OTHER";
        price?: string;
        downloadLimit?: "1" | "3" | "UNLIMITED";
    }[];
}, {
    products?: {
        slug?: string;
        description?: string;
        title?: string;
        category?: "SOFTWARE" | "EBOOK" | "ART" | "COURSE" | "OTHER";
        price?: string;
        downloadLimit?: "1" | "3" | "UNLIMITED";
    }[];
}>;
export declare const CheckoutRequestSchema: z.ZodObject<{
    productId: z.ZodString;
    couponCode: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodString;
}, "strip", z.ZodTypeAny, {
    productId?: string;
    couponCode?: string;
    idempotencyKey?: string;
}, {
    productId?: string;
    couponCode?: string;
    idempotencyKey?: string;
}>;
export declare const CheckoutResponseSchema: z.ZodObject<{
    transactionId: z.ZodString;
    depositAddress: z.ZodString;
    amount: z.ZodBigInt;
    qrCode: z.ZodString;
    expiresAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    transactionId?: string;
    depositAddress?: string;
    amount?: bigint;
    qrCode?: string;
    expiresAt?: Date;
}, {
    transactionId?: string;
    depositAddress?: string;
    amount?: bigint;
    qrCode?: string;
    expiresAt?: Date;
}>;
export declare const MockPaymentRequestSchema: z.ZodObject<{
    address: z.ZodString;
    amount: z.ZodBigInt;
    txHash: z.ZodString;
}, "strip", z.ZodTypeAny, {
    amount?: bigint;
    address?: string;
    txHash?: string;
}, {
    amount?: bigint;
    address?: string;
    txHash?: string;
}>;
export declare const TransactionResponseSchema: z.ZodObject<{
    id: z.ZodString;
    amount: z.ZodBigInt;
    expectedAmount: z.ZodBigInt;
    status: z.ZodEnum<["pending", "underpaid", "confirmed", "reverted", "late", "failed"]>;
    depositAddress: z.ZodString;
    txHash: z.ZodNullable<z.ZodString>;
    confirmedAt: z.ZodNullable<z.ZodDate>;
    confirmationCount: z.ZodNumber;
    expiresAt: z.ZodDate;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    status?: "pending" | "underpaid" | "confirmed" | "reverted" | "late" | "failed";
    id?: string;
    createdAt?: Date;
    depositAddress?: string;
    amount?: bigint;
    expiresAt?: Date;
    txHash?: string;
    expectedAmount?: bigint;
    confirmedAt?: Date;
    confirmationCount?: number;
}, {
    status?: "pending" | "underpaid" | "confirmed" | "reverted" | "late" | "failed";
    id?: string;
    createdAt?: Date;
    depositAddress?: string;
    amount?: bigint;
    expiresAt?: Date;
    txHash?: string;
    expectedAmount?: bigint;
    confirmedAt?: Date;
    confirmationCount?: number;
}>;
export declare const DownloadRequestSchema: z.ZodObject<{
    transactionId: z.ZodString;
    productFileId: z.ZodString;
    signedUrl: z.ZodString;
}, "strip", z.ZodTypeAny, {
    transactionId?: string;
    productFileId?: string;
    signedUrl?: string;
}, {
    transactionId?: string;
    productFileId?: string;
    signedUrl?: string;
}>;
export declare const DownloadResponseSchema: z.ZodObject<{
    filename: z.ZodString;
    size: z.ZodBigInt;
    contentType: z.ZodString;
}, "strip", z.ZodTypeAny, {
    filename?: string;
    size?: bigint;
    contentType?: string;
}, {
    filename?: string;
    size?: bigint;
    contentType?: string;
}>;
export declare const SetPayoutWalletRequestSchema: z.ZodObject<{
    wallet: z.ZodString;
}, "strip", z.ZodTypeAny, {
    wallet?: string;
}, {
    wallet?: string;
}>;
export declare const RequestPayoutRequestSchema: z.ZodObject<{
    amount: z.ZodBigInt;
    totpCode: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodString;
}, "strip", z.ZodTypeAny, {
    totpCode?: string;
    idempotencyKey?: string;
    amount?: bigint;
}, {
    totpCode?: string;
    idempotencyKey?: string;
    amount?: bigint;
}>;
export declare const PayoutResponseSchema: z.ZodObject<{
    id: z.ZodString;
    amount: z.ZodBigInt;
    status: z.ZodEnum<["pending", "processing", "completed", "failed"]>;
    txHash: z.ZodNullable<z.ZodString>;
    requestedAt: z.ZodDate;
    processedAt: z.ZodNullable<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    status?: "pending" | "failed" | "processing" | "completed";
    id?: string;
    amount?: bigint;
    txHash?: string;
    requestedAt?: Date;
    processedAt?: Date;
}, {
    status?: "pending" | "failed" | "processing" | "completed";
    id?: string;
    amount?: bigint;
    txHash?: string;
    requestedAt?: Date;
    processedAt?: Date;
}>;
export declare const CreateAPIKeyRequestSchema: z.ZodObject<{
    name: z.ZodString;
    permissions: z.ZodOptional<z.ZodArray<z.ZodEnum<["read", "write"]>, "many">>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    permissions?: ("read" | "write")[];
}, {
    name?: string;
    permissions?: ("read" | "write")[];
}>;
export declare const APIKeyResponseSchema: z.ZodObject<{
    id: z.ZodString;
    publicKey: z.ZodString;
    secretKey: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id?: string;
    createdAt?: Date;
    publicKey?: string;
    secretKey?: string;
}, {
    id?: string;
    createdAt?: Date;
    publicKey?: string;
    secretKey?: string;
}>;
export declare const CreateWebhookRequestSchema: z.ZodObject<{
    url: z.ZodString;
    events: z.ZodArray<z.ZodEnum<["payment.received", "file.downloaded", "payout.completed"]>, "many">;
}, "strip", z.ZodTypeAny, {
    url?: string;
    events?: ("payment.received" | "file.downloaded" | "payout.completed")[];
}, {
    url?: string;
    events?: ("payment.received" | "file.downloaded" | "payout.completed")[];
}>;
export declare const WebhookResponseSchema: z.ZodObject<{
    id: z.ZodString;
    url: z.ZodString;
    events: z.ZodArray<z.ZodString, "many">;
    status: z.ZodEnum<["active", "disabled", "deleted"]>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    status?: "active" | "disabled" | "deleted";
    id?: string;
    createdAt?: Date;
    updatedAt?: Date;
    url?: string;
    events?: string[];
}, {
    status?: "active" | "disabled" | "deleted";
    id?: string;
    createdAt?: Date;
    updatedAt?: Date;
    url?: string;
    events?: string[];
}>;
export declare const WebhookPayloadSchema: z.ZodObject<{
    event: z.ZodString;
    timestamp: z.ZodDate;
    data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    event?: string;
    timestamp?: Date;
    data?: Record<string, unknown>;
}, {
    event?: string;
    timestamp?: Date;
    data?: Record<string, unknown>;
}>;
export declare const CreateCouponRequestSchema: z.ZodObject<{
    code: z.ZodString;
    type: z.ZodEnum<["percent", "fixed"]>;
    value: z.ZodBigInt;
    usageLimit: z.ZodOptional<z.ZodNumber>;
    expiresAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    value?: bigint;
    code?: string;
    type?: "percent" | "fixed";
    expiresAt?: Date;
    usageLimit?: number;
}, {
    value?: bigint;
    code?: string;
    type?: "percent" | "fixed";
    expiresAt?: Date;
    usageLimit?: number;
}>;
export declare const CouponResponseSchema: z.ZodObject<{
    id: z.ZodString;
    code: z.ZodString;
    type: z.ZodEnum<["percent", "fixed"]>;
    value: z.ZodBigInt;
    usageLimit: z.ZodNullable<z.ZodNumber>;
    usageCount: z.ZodNumber;
    expiresAt: z.ZodNullable<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    value?: bigint;
    code?: string;
    type?: "percent" | "fixed";
    id?: string;
    expiresAt?: Date;
    usageLimit?: number;
    usageCount?: number;
}, {
    value?: bigint;
    code?: string;
    type?: "percent" | "fixed";
    id?: string;
    expiresAt?: Date;
    usageLimit?: number;
    usageCount?: number;
}>;
export declare const CreateReviewRequestSchema: z.ZodObject<{
    transactionId: z.ZodString;
    rating: z.ZodNumber;
    text: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    transactionId?: string;
    rating?: number;
    text?: string;
}, {
    transactionId?: string;
    rating?: number;
    text?: string;
}>;
export declare const ReviewResponseSchema: z.ZodObject<{
    id: z.ZodString;
    productId: z.ZodString;
    rating: z.ZodNumber;
    text: z.ZodNullable<z.ZodString>;
    merchantReply: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id?: string;
    createdAt?: Date;
    updatedAt?: Date;
    productId?: string;
    rating?: number;
    text?: string;
    merchantReply?: string;
}, {
    id?: string;
    createdAt?: Date;
    updatedAt?: Date;
    productId?: string;
    rating?: number;
    text?: string;
    merchantReply?: string;
}>;
export declare const ProblemJsonSchema: z.ZodObject<{
    type: z.ZodString;
    title: z.ZodString;
    status: z.ZodNumber;
    detail: z.ZodOptional<z.ZodString>;
    instance: z.ZodOptional<z.ZodString>;
    errors: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>>;
}, "strip", z.ZodTypeAny, {
    type?: string;
    status?: number;
    title?: string;
    detail?: string;
    instance?: string;
    errors?: Record<string, string[]>;
}, {
    type?: string;
    status?: number;
    title?: string;
    detail?: string;
    instance?: string;
    errors?: Record<string, string[]>;
}>;
export declare const PaginationQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    sort: z.ZodOptional<z.ZodString>;
    order: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
}, "strip", z.ZodTypeAny, {
    sort?: string;
    page?: number;
    limit?: number;
    order?: "asc" | "desc";
}, {
    sort?: string;
    page?: number;
    limit?: number;
    order?: "asc" | "desc";
}>;
export declare const PaginatedResponseSchema: <T extends z.ZodTypeAny>(itemSchema: T) => z.ZodObject<{
    items: z.ZodArray<T, "many">;
    total: z.ZodNumber;
    page: z.ZodNumber;
    limit: z.ZodNumber;
    totalPages: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    page?: number;
    limit?: number;
    items?: T["_output"][];
    total?: number;
    totalPages?: number;
}, {
    page?: number;
    limit?: number;
    items?: T["_input"][];
    total?: number;
    totalPages?: number;
}>;
export declare const UpdateMerchantProfileRequestSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    avatarUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    avatarUrl?: string;
}, {
    name?: string;
    avatarUrl?: string;
}>;
export declare const MerchantProfileResponseSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    name: z.ZodString;
    avatarUrl: z.ZodNullable<z.ZodString>;
    payoutWallet: z.ZodNullable<z.ZodString>;
    payoutWalletValidated: z.ZodBoolean;
    totpEnabled: z.ZodBoolean;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    email?: string;
    id?: string;
    name?: string;
    createdAt?: Date;
    avatarUrl?: string;
    payoutWallet?: string;
    payoutWalletValidated?: boolean;
    totpEnabled?: boolean;
}, {
    email?: string;
    id?: string;
    name?: string;
    createdAt?: Date;
    avatarUrl?: string;
    payoutWallet?: string;
    payoutWalletValidated?: boolean;
    totpEnabled?: boolean;
}>;
export declare const Enable2FARequestSchema: z.ZodObject<{
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    password?: string;
}, {
    password?: string;
}>;
export declare const Enable2FAResponseSchema: z.ZodObject<{
    secret: z.ZodString;
    qrCode: z.ZodString;
}, "strip", z.ZodTypeAny, {
    qrCode?: string;
    secret?: string;
}, {
    qrCode?: string;
    secret?: string;
}>;
export declare const Confirm2FARequestSchema: z.ZodObject<{
    secret: z.ZodString;
    code: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code?: string;
    secret?: string;
}, {
    code?: string;
    secret?: string;
}>;
export declare const Disable2FARequestSchema: z.ZodObject<{
    password: z.ZodString;
    code: z.ZodString;
}, "strip", z.ZodTypeAny, {
    password?: string;
    code?: string;
}, {
    password?: string;
    code?: string;
}>;
//# sourceMappingURL=schemas.d.ts.map