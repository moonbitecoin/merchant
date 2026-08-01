'use client';

import { useState } from 'react';
import { payoutAPI, ApiError } from '@/lib/api';

interface PayoutFormProps {
  balance: any;
  onPayoutRequested: () => void;
}

export function PayoutForm({ balance, onPayoutRequested }: PayoutFormProps) {
  const [amount, setAmount] = useState('');
  const [wallet, setWallet] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const availableBalance = Number(balance?.availableBalance || 0) / 1e8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!amount || !wallet) {
      setError('Please fill in all fields');
      return;
    }

    const amountNum = Number(amount);
    if (amountNum > availableBalance) {
      setError(`Insufficient balance. Available: ${availableBalance.toFixed(2)} MBITE`);
      return;
    }

    try {
      setLoading(true);

      // Convert MBITE to smallest unit
      const amountInSmallestUnit = Math.floor(amountNum * 1e8).toString();

      await payoutAPI.requestPayout(amountInSmallestUnit, wallet, totpCode);

      setSuccess(true);
      setAmount('');
      setWallet('');
      setTotpCode('');

      // Refresh data
      setTimeout(() => onPayoutRequested(), 2000);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError('Failed to request payout');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="text-lg font-semibold mb-6">Request Payout</h2>

      {success && (
        <div className="mb-4 rounded-lg bg-green-100 border border-green-200 p-4">
          <p className="text-green-800 text-sm font-medium">
            ✓ Payout requested successfully! It will be processed shortly.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-red-100 border border-red-200 p-4">
          <p className="text-red-800 text-sm font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Amount */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Amount (MBITE)
            <span className="text-muted-foreground font-normal ml-1">
              (max: {availableBalance.toFixed(2)})
            </span>
          </label>
          <input
            type="number"
            step="0.00000001"
            max={availableBalance}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            disabled={loading}
          />
        </div>

        {/* Wallet Address */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Wallet Address
          </label>
          <input
            type="text"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="Enter your wallet address"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            disabled={loading}
          />
        </div>

        {/* 2FA Code (optional) */}
        <div>
          <label className="block text-sm font-medium mb-2">
            2FA Code <span className="text-muted-foreground font-normal">(if enabled)</span>
          </label>
          <input
            type="text"
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value)}
            placeholder="000000"
            maxLength={6}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            disabled={loading}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !amount || !wallet}
          className="w-full rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 mt-6"
        >
          {loading ? 'Processing...' : 'Request Payout'}
        </button>
      </form>
    </div>
  );
}
