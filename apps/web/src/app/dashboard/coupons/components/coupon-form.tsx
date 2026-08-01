'use client';

import { useState } from 'react';
import { couponAPI, ApiError } from '@/lib/api';

interface CouponFormProps {
  onCouponCreated: () => void;
}

export function CouponForm({ onCouponCreated }: CouponFormProps) {
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [maxUsage, setMaxUsage] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!code || !discountValue) {
      setError('Please fill in required fields');
      return;
    }

    try {
      setLoading(true);

      await couponAPI.createCoupon({
        code: code.toUpperCase(),
        discountType,
        discountValue,
        maxUsage: maxUsage ? parseInt(maxUsage, 10) : undefined,
        expiresAt: expiresAt || undefined,
      });

      setSuccess(true);
      setCode('');
      setDiscountValue('');
      setMaxUsage('');
      setExpiresAt('');

      // Refresh list
      setTimeout(() => onCouponCreated(), 1500);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError('Failed to create coupon');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="text-lg font-semibold mb-6">Create Coupon</h2>

      {success && (
        <div className="mb-4 rounded-lg bg-green-100 border border-green-200 p-4">
          <p className="text-green-800 text-sm font-medium">
            ✓ Coupon created successfully!
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-red-100 border border-red-200 p-4">
          <p className="text-red-800 text-sm font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Code */}
        <div>
          <label className="block text-sm font-medium mb-2">Coupon Code</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="SAVE20"
            maxLength={50}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground mt-1">3-50 characters</p>
        </div>

        {/* Discount Type */}
        <div>
          <label className="block text-sm font-medium mb-2">Discount Type</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="percentage"
                checked={discountType === 'percentage'}
                onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                disabled={loading}
                className="w-4 h-4"
              />
              <span className="text-sm">Percentage (%)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="fixed"
                checked={discountType === 'fixed'}
                onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                disabled={loading}
                className="w-4 h-4"
              />
              <span className="text-sm">Fixed (MBITE)</span>
            </label>
          </div>
        </div>

        {/* Discount Value */}
        <div>
          <label className="block text-sm font-medium mb-2">
            {discountType === 'percentage' ? 'Discount %' : 'Discount Amount (MBITE)'}
          </label>
          <input
            type="number"
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            placeholder={discountType === 'percentage' ? '20' : '0.00'}
            step={discountType === 'percentage' ? '1' : '0.00000001'}
            max={discountType === 'percentage' ? '100' : undefined}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            disabled={loading}
          />
        </div>

        {/* Max Usage */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Max Usage <span className="text-muted-foreground font-normal">(leave empty for unlimited)</span>
          </label>
          <input
            type="number"
            value={maxUsage}
            onChange={(e) => setMaxUsage(e.target.value)}
            placeholder="10"
            min="1"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            disabled={loading}
          />
        </div>

        {/* Expires At */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Expires At <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            disabled={loading}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !code || !discountValue}
          className="w-full rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 mt-6"
        >
          {loading ? 'Creating...' : 'Create Coupon'}
        </button>
      </form>
    </div>
  );
}
