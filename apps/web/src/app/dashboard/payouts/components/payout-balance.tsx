'use client';

import { DollarSign, TrendingUp, CheckCircle } from 'lucide-react';

interface PayoutBalanceProps {
  balance: {
    totalRevenue: string;
    totalPayoutsRequested: string;
    totalPayoutsCompleted: string;
    availableBalance: string;
  };
}

export function PayoutBalance({ balance }: PayoutBalanceProps) {
  const formatMBITE = (value: string) => (Number(value) / 1e8).toFixed(2);

  return (
    <div className="space-y-4">
      {/* Available Balance */}
      <div className="rounded-lg border-2 border-primary bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Available Balance</p>
            <p className="text-3xl font-bold mt-2">{formatMBITE(balance.availableBalance)}</p>
            <p className="text-xs text-muted-foreground mt-1">MBITE</p>
          </div>
          <div className="rounded-lg bg-primary/10 p-3">
            <DollarSign className="w-8 h-8 text-primary" />
          </div>
        </div>
      </div>

      {/* Total Revenue */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Revenue</p>
            <p className="text-xl font-bold mt-1">{formatMBITE(balance.totalRevenue)}</p>
          </div>
          <div className="rounded-lg bg-green-100 p-2">
            <TrendingUp className="w-5 h-5 text-green-700" />
          </div>
        </div>
      </div>

      {/* Completed Payouts */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Paid Out</p>
            <p className="text-xl font-bold mt-1">{formatMBITE(balance.totalPayoutsCompleted)}</p>
          </div>
          <div className="rounded-lg bg-blue-100 p-2">
            <CheckCircle className="w-5 h-5 text-blue-700" />
          </div>
        </div>
      </div>
    </div>
  );
}
