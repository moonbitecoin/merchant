/**
 * API Client
 * Handles requests to backend API with auth token
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
    message: string = detail
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T = any>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const url = `${API_URL}${path}`;
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      error.detail || 'Request failed',
      error.title || 'API Error'
    );
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

/**
 * Dashboard API methods
 */
export const dashboardAPI = {
  getMetrics: (storeId?: string) =>
    apiRequest<{
      totalRevenue: string;
      totalCheckouts: number;
      confirmedCheckouts: number;
      conversionRate: number;
      averageOrderValue: string;
    }>('/dashboard/metrics', { ...(storeId && { method: 'GET' }) })
      .then(
        (res) =>
          new URLSearchParams({
            ...(storeId && { storeId }),
          })
      ),

  getRevenueChart: (days?: 30 | 90, storeId?: string) =>
    apiRequest<{
      data: Array<{ date: string; revenue: string; count: number }>;
      days: number;
    }>(`/dashboard/revenue-chart?days=${days || 30}${storeId ? `&storeId=${storeId}` : ''}`),

  getTopProducts: (limit?: number, storeId?: string) =>
    apiRequest<
      Array<{
        productId: string;
        title: string;
        revenue: string;
        sales: number;
      }>
    >(
      `/dashboard/top-products?limit=${limit || 5}${storeId ? `&storeId=${storeId}` : ''}`
    ),

  getTransactions: (
    page: number = 1,
    limit: number = 50,
    filters?: {
      storeId?: string;
      status?: string;
      productId?: string;
      startDate?: string;
      endDate?: string;
    }
  ) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }

    return apiRequest<{
      transactions: Array<{
        id: string;
        status: string;
        amount: string;
        productTitle: string;
        storeName: string;
        confirmedAt?: string;
        txHash?: string;
      }>;
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>(`/dashboard/transactions?${params}`);
  },

  exportTransactions: (filters?: any) =>
    apiRequest<Blob>('/dashboard/transactions/export', {
      method: 'POST',
      body: filters,
    }),
};

/**
 * Payout API methods
 */
export const payoutAPI = {
  getBalance: () =>
    apiRequest<{
      totalRevenue: string;
      totalPayoutsRequested: string;
      totalPayoutsCompleted: string;
      availableBalance: string;
    }>('/payouts/balance'),

  getPayouts: (page: number = 1, limit: number = 50) =>
    apiRequest<{
      payouts: Array<{
        id: string;
        amount: string;
        status: string;
        wallet: string;
        requestedAt: string;
        completedAt?: string;
      }>;
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>(`/payouts?page=${page}&limit=${limit}`),

  getPayout: (id: string) =>
    apiRequest<{
      id: string;
      amount: string;
      status: string;
      wallet: string;
      requestedAt: string;
      completedAt?: string;
      txHash?: string;
    }>(`/payouts/${id}`),

  requestPayout: (amount: string, wallet: string, totpCode?: string) =>
    apiRequest<{
      payoutId: string;
      status: string;
      amount: string;
    }>('/payouts', {
      method: 'POST',
      body: { amount, wallet, totpCode },
    }),
};

/**
 * Coupon API methods
 */
export const couponAPI = {
  getCoupons: (page: number = 1, limit: number = 50) =>
    apiRequest<{
      coupons: Array<{
        id: string;
        code: string;
        discountType: string;
        discountValue: string;
        maxUsage: number;
        usageCount: number;
        expiresAt?: string;
        isActive: boolean;
        createdAt: string;
      }>;
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>(`/coupons?page=${page}&limit=${limit}`),

  createCoupon: (input: {
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: string;
    maxUsage?: number;
    expiresAt?: string;
    storeId?: string;
  }) =>
    apiRequest<{
      id: string;
      code: string;
      discountType: string;
      discountValue: string;
      maxUsage?: number;
      expiresAt?: string;
    }>('/coupons', {
      method: 'POST',
      body: input,
    }),

  updateCoupon: (id: string, input: Partial<any>) =>
    apiRequest<{
      id: string;
      code: string;
      discountType: string;
      discountValue: string;
      isActive: boolean;
    }>(`/coupons/${id}`, {
      method: 'PUT',
      body: input,
    }),

  toggleCoupon: (id: string) =>
    apiRequest<{ isActive: boolean }>(`/coupons/${id}/toggle`, {
      method: 'POST',
    }),

  deleteCoupon: (id: string) =>
    apiRequest(`/coupons/${id}`, { method: 'DELETE' }),
};
