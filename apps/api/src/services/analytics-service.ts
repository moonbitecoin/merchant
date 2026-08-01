/**
 * Analytics Service
 * Dashboard metrics: revenue, sales, conversion, top products, transaction history
 */

import { PrismaClient } from '@moonbite/db';
import { ERROR_CODES } from '@moonbite/shared';
import { createAppError } from '../lib/error-handler.js';

export class AnalyticsService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get revenue chart data (30 or 90 days)
   */
  async getRevenueChart(
    merchantId: string,
    storeId?: string,
    days: 30 | 90 = 30
  ): Promise<{
    date: string;
    revenue: string; // BigInt as string
    count: number;
  }[]> {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const where: any = {
      store: { merchantId },
      status: 'confirmed',
      confirmedAt: { gte: startDate },
    };

    if (storeId) {
      where.storeId = storeId;
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      select: {
        amount: true,
        confirmedAt: true,
      },
      orderBy: { confirmedAt: 'asc' },
    });

    // Group by date
    const grouped = new Map<string, { revenue: bigint; count: number }>();

    for (const tx of transactions) {
      if (!tx.confirmedAt) continue;

      const dateKey = tx.confirmedAt.toISOString().split('T')[0];
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, { revenue: 0n, count: 0 });
      }

      const entry = grouped.get(dateKey)!;
      entry.revenue += tx.amount;
      entry.count += 1;
    }

    // Fill gaps and convert to array
    const result = [];
    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      const entry = grouped.get(dateKey) || { revenue: 0n, count: 0 };

      result.push({
        date: dateKey,
        revenue: entry.revenue.toString(),
        count: entry.count,
      });
    }

    return result;
  }

  /**
   * Get sales metrics
   */
  async getSalesMetrics(
    merchantId: string,
    storeId?: string
  ): Promise<{
    totalRevenue: string; // BigInt as string
    totalCheckouts: number;
    confirmedCheckouts: number;
    conversionRate: number; // 0-100
    averageOrderValue: string; // BigInt as string
  }> {
    const where: any = {
      store: { merchantId },
    };

    if (storeId) {
      where.storeId = storeId;
    }

    const [confirmed, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { ...where, status: 'confirmed' },
        select: { amount: true },
      }),
      this.prisma.transaction.findMany({
        where,
        select: { amount: true },
      }),
    ]);

    const totalRevenue = confirmed.reduce((sum, tx) => sum + tx.amount, 0n);
    const averageOrderValue =
      confirmed.length > 0 ? totalRevenue / BigInt(confirmed.length) : 0n;

    return {
      totalRevenue: totalRevenue.toString(),
      totalCheckouts: total.length,
      confirmedCheckouts: confirmed.length,
      conversionRate: total.length > 0 ? (confirmed.length / total.length) * 100 : 0,
      averageOrderValue: averageOrderValue.toString(),
    };
  }

  /**
   * Get top 5 products by revenue
   */
  async getTopProducts(
    merchantId: string,
    storeId?: string,
    limit: number = 5
  ): Promise<{
    productId: string;
    title: string;
    revenue: string; // BigInt as string
    sales: number;
  }[]> {
    const where: any = {
      store: { merchantId },
      status: 'confirmed',
    };

    if (storeId) {
      where.storeId = storeId;
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      select: {
        productId: true,
        product: { select: { title: true } },
        amount: true,
      },
    });

    const grouped = new Map<
      string,
      { title: string; revenue: bigint; sales: number }
    >();

    for (const tx of transactions) {
      if (!grouped.has(tx.productId)) {
        grouped.set(tx.productId, {
          title: tx.product.title,
          revenue: 0n,
          sales: 0,
        });
      }

      const entry = grouped.get(tx.productId)!;
      entry.revenue += tx.amount;
      entry.sales += 1;
    }

    return Array.from(grouped.entries())
      .map(([productId, data]) => ({
        productId,
        ...data,
        revenue: data.revenue.toString(),
      }))
      .sort((a, b) => BigInt(b.revenue) - BigInt(a.revenue))
      .slice(0, limit);
  }

  /**
   * Get transaction history with filtering
   */
  async getTransactionHistory(
    merchantId: string,
    filters?: {
      storeId?: string;
      status?: 'pending' | 'confirmed' | 'failed';
      productId?: string;
      startDate?: Date;
      endDate?: Date;
    },
    options?: { limit?: number; offset?: number }
  ): Promise<{
    transactions: {
      id: string;
      status: string;
      amount: string; // BigInt as string
      productTitle: string;
      storeName: string;
      confirmedAt?: string; // ISO string
      txHash?: string;
    }[];
    total: number;
  }> {
    const where: any = {
      store: { merchantId },
    };

    if (filters?.storeId) where.storeId = filters.storeId;
    if (filters?.status) where.status = filters.status;
    if (filters?.productId) where.productId = filters.productId;

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        select: {
          id: true,
          status: true,
          amount: true,
          product: { select: { title: true } },
          store: { select: { name: true } },
          confirmedAt: true,
          txHash: true,
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      transactions: transactions.map((tx) => ({
        id: tx.id,
        status: tx.status,
        amount: tx.amount.toString(),
        productTitle: tx.product.title,
        storeName: tx.store.name,
        confirmedAt: tx.confirmedAt?.toISOString(),
        txHash: tx.txHash || undefined,
      })),
      total,
    };
  }

  /**
   * Export transaction history to CSV
   */
  exportTransactionsToCSV(transactions: any[]): string {
    const headers = [
      'Transaction ID',
      'Status',
      'Product',
      'Store',
      'Amount (MBITE)',
      'Confirmed Date',
      'TX Hash',
    ];

    const rows = transactions.map((tx) => [
      tx.id,
      tx.status,
      tx.productTitle,
      tx.storeName,
      tx.amount,
      tx.confirmedAt || '',
      tx.txHash || '',
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');

    return csv;
  }
}
