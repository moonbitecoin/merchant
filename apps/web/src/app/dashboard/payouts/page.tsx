'use client';

import { useEffect, useState } from 'react';
import { payoutAPI, ApiError } from '@/lib/api';
import { PayoutBalance } from './components/payout-balance';
import { PayoutForm } from './components/payout-form';
import { PayoutHistory } from './components/payout-history';

export default function PayoutsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<any>(null);
  const [payouts, setPayouts] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const loadPayouts = async () => {
      try {
        setLoading(true);
        setError(null);

        const [balanceRes, payoutsRes] = await Promise.all([
          payoutAPI.getBalance(),
          payoutAPI.getPayouts(1, 50),
        ]);

        setBalance(balanceRes);
        setPayouts(payoutsRes);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(`Failed to load payouts: ${err.detail}`);
        } else {
          setError('An unexpected error occurred');
        }
      } finally {
        setLoading(false);
      }
    };

    loadPayouts();
  }, []);

  const handlePayoutRequested = async () => {
    setRefreshing(true);
    try {
      const [balanceRes, payoutsRes] = await Promise.all([
        payoutAPI.getBalance(),
        payoutAPI.getPayouts(1, 50),
      ]);
      setBalance(balanceRes);
      setPayouts(payoutsRes);
    } catch (err) {
      console.error('Failed to refresh payouts:', err);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-muted-foreground">Loading payouts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Payouts</h1>
        <p className="text-muted-foreground mt-2">Manage your merchant payouts and balance</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-100 border border-red-200 p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Balance and Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {balance && (
          <div className="lg:col-span-1">
            <PayoutBalance balance={balance} />
          </div>
        )}

        <div className="lg:col-span-2">
          <PayoutForm balance={balance} onPayoutRequested={handlePayoutRequested} />
        </div>
      </div>

      {/* Payout History */}
      {payouts && (
        <div>
          <PayoutHistory payouts={payouts} />
        </div>
      )}
    </div>
  );
}
