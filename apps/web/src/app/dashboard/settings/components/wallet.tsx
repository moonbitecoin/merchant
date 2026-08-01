'use client';

import { useState } from 'react';

export function WalletSettings() {
  const [wallet, setWallet] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!wallet) {
      setError('Please enter a wallet address');
      return;
    }

    try {
      setLoading(true);

      // TODO: Call API to update wallet
      // await apiRequest('/auth/profile', {
      //   method: 'PUT',
      //   body: { payoutWallet: wallet },
      // });

      setSuccess('Wallet address updated successfully!');
    } catch (err) {
      setError('Failed to update wallet address');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Payout Wallet</h2>
        <p className="text-muted-foreground mt-2">
          Set your default wallet address for payout requests
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-100 border border-red-200 p-4">
          <p className="text-red-800 text-sm font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-100 border border-green-200 p-4">
          <p className="text-green-800 text-sm font-medium">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium mb-2">Wallet Address</label>
          <input
            type="text"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="Your wallet address"
            className="w-full rounded-lg border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Payouts will be sent to this address. Keep it secure!
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !wallet}
          className="rounded-lg bg-primary px-6 py-2 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Wallet'}
        </button>
      </form>
    </div>
  );
}
