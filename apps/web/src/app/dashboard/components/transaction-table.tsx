'use client';

import { useState } from 'react';
import { Download, ChevronRight } from 'lucide-react';
import { dashboardAPI, ApiError } from '@/lib/api';

interface TransactionTableProps {
  transactions: {
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
  };
}

export function TransactionTable({ transactions }: TransactionTableProps) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      setExporting(true);
      setError(null);

      const csv = await dashboardAPI.exportTransactions();
      // Create blob and trigger download
      const url = window.URL.createObjectURL(csv);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Export failed: ${err.detail}`);
      } else {
        setError('Failed to export transactions');
      }
    } finally {
      setExporting(false);
    }
  };

  const statusColor = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  };

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Recent Transactions</h2>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-500">{error}</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                ID
              </th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                Product
              </th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                Amount
              </th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                Status
              </th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.transactions.map((tx) => (
              <tr key={tx.id} className="border-b hover:bg-muted/50 transition-colors">
                <td className="py-4 px-4">
                  <span className="font-mono text-xs">{tx.id.slice(0, 8)}...</span>
                </td>
                <td className="py-4 px-4">
                  <div>
                    <p className="font-medium">{tx.productTitle}</p>
                    <p className="text-xs text-muted-foreground">{tx.storeName}</p>
                  </div>
                </td>
                <td className="py-4 px-4 font-semibold">
                  {(Number(tx.amount) / 1e8).toFixed(2)} MBITE
                </td>
                <td className="py-4 px-4">
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      statusColor[tx.status as keyof typeof statusColor] ||
                      'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {tx.status}
                  </span>
                </td>
                <td className="py-4 px-4 text-muted-foreground">
                  {tx.confirmedAt
                    ? new Date(tx.confirmedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: '2-digit',
                      })
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {transactions.transactions.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No transactions yet</p>
        </div>
      )}

      {transactions.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {transactions.pageSize} of {transactions.total} transactions
          </p>
          <div className="flex gap-2">
            <button className="px-3 py-1 rounded text-sm hover:bg-muted disabled:opacity-50">
              Previous
            </button>
            <span className="px-3 py-1 text-sm">
              Page {transactions.page} of {transactions.totalPages}
            </span>
            <button className="px-3 py-1 rounded text-sm hover:bg-muted disabled:opacity-50">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
