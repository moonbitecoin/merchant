'use client';

import { Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface PayoutHistoryProps {
  payouts: {
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
  };
}

export function PayoutHistory({ payouts }: PayoutHistoryProps) {
  const statusIcon = {
    pending: <Clock className="w-4 h-4 text-yellow-600" />,
    processing: <Clock className="w-4 h-4 text-blue-600" />,
    completed: <CheckCircle className="w-4 h-4 text-green-600" />,
    failed: <AlertCircle className="w-4 h-4 text-red-600" />,
  };

  const statusBg = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  };

  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="text-lg font-semibold mb-4">Payout History</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                ID
              </th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                Amount
              </th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                Wallet
              </th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                Status
              </th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                Requested
              </th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                Completed
              </th>
            </tr>
          </thead>
          <tbody>
            {payouts.payouts.map((payout) => (
              <tr key={payout.id} className="border-b hover:bg-muted/50 transition-colors">
                <td className="py-4 px-4">
                  <span className="font-mono text-xs">{payout.id.slice(0, 8)}...</span>
                </td>
                <td className="py-4 px-4 font-semibold">
                  {(Number(payout.amount) / 1e8).toFixed(2)} MBITE
                </td>
                <td className="py-4 px-4 text-xs font-mono text-muted-foreground">
                  {payout.wallet.slice(0, 10)}...
                </td>
                <td className="py-4 px-4">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                      statusBg[payout.status as keyof typeof statusBg] ||
                      'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {statusIcon[payout.status as keyof typeof statusIcon]}
                    {payout.status}
                  </span>
                </td>
                <td className="py-4 px-4 text-muted-foreground text-xs">
                  {new Date(payout.requestedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: '2-digit',
                  })}
                </td>
                <td className="py-4 px-4 text-muted-foreground text-xs">
                  {payout.completedAt
                    ? new Date(payout.completedAt).toLocaleDateString('en-US', {
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

      {payouts.payouts.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No payouts yet</p>
        </div>
      )}
    </div>
  );
}
