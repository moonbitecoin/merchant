'use client';

import { useEffect, useState } from 'react';
import { dashboardAPI, ApiError } from '@/lib/api';
import { MetricsCard } from './components/metrics-card';
import { RevenueChart } from './components/revenue-chart';
import { TopProducts } from './components/top-products';
import { TransactionTable } from './components/transaction-table';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<any>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any>(null);
  const [chartDays, setChartDays] = useState<30 | 90>(30);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const [metricsRes, chartRes, productsRes, transRes] = await Promise.all([
          dashboardAPI.getMetrics(),
          dashboardAPI.getRevenueChart(chartDays),
          dashboardAPI.getTopProducts(5),
          dashboardAPI.getTransactions(1, 10),
        ]);

        setMetrics(metricsRes);
        setChartData(chartRes);
        setTopProducts(productsRes);
        setTransactions(transRes);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(`Failed to load dashboard: ${err.detail}`);
        } else {
          setError('An unexpected error occurred');
        }
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [chartDays]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-red-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-primary px-6 py-2 font-semibold text-primary-foreground hover:opacity-90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Welcome back! Here's your business overview.</p>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricsCard
            label="Total Revenue"
            value={`${Number(metrics.totalRevenue) / 1e8} MBITE`}
            icon="DollarSign"
          />
          <MetricsCard
            label="Total Checkouts"
            value={metrics.totalCheckouts.toString()}
            icon="ShoppingCart"
          />
          <MetricsCard
            label="Conversion Rate"
            value={`${metrics.conversionRate.toFixed(1)}%`}
            icon="TrendingUp"
          />
          <MetricsCard
            label="Avg. Order Value"
            value={`${Number(metrics.averageOrderValue) / 1e8} MBITE`}
            icon="Package"
          />
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        {chartData && (
          <div className="lg:col-span-2">
            <RevenueChart data={chartData} days={chartDays} onDaysChange={setChartDays} />
          </div>
        )}

        {/* Top Products */}
        {topProducts.length > 0 && (
          <div>
            <TopProducts products={topProducts} />
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      {transactions && (
        <div>
          <TransactionTable transactions={transactions} />
        </div>
      )}
    </div>
  );
}
