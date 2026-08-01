'use client';

import { useState } from 'react';
import { Trash2, Toggle2 } from 'lucide-react';
import { couponAPI, ApiError } from '@/lib/api';

interface CouponListProps {
  coupons: {
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
  };
  onCouponDeleted: () => void;
  onCouponToggled: () => void;
}

export function CouponList({
  coupons,
  onCouponDeleted,
  onCouponToggled,
}: CouponListProps) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async (couponId: string) => {
    try {
      setToggling(couponId);
      setError(null);

      await couponAPI.toggleCoupon(couponId);
      onCouponToggled();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError('Failed to toggle coupon');
      }
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async (couponId: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) {
      return;
    }

    try {
      setDeleting(couponId);
      setError(null);

      await couponAPI.deleteCoupon(couponId);
      onCouponDeleted();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError('Failed to delete coupon');
      }
    } finally {
      setDeleting(null);
    }
  };

  const formatDiscount = (type: string, value: string) => {
    if (type === 'percentage') {
      return `${value}%`;
    }
    return `${(Number(value) / 1e8).toFixed(2)} MBITE`;
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="text-lg font-semibold mb-4">Coupons ({coupons.total})</h2>

      {error && (
        <div className="mb-4 rounded-lg bg-red-100 border border-red-200 p-4">
          <p className="text-red-800 text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="space-y-2">
        {coupons.coupons.map((coupon) => (
          <div
            key={coupon.id}
            className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-semibold">{coupon.code}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDiscount(coupon.discountType, coupon.discountValue)}
                  </p>
                </div>

                {isExpired(coupon.expiresAt) && (
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                    Expired
                  </span>
                )}

                {!coupon.isActive && (
                  <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                    Inactive
                  </span>
                )}
              </div>

              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span>
                  Usage: {coupon.usageCount}{coupon.maxUsage > 0 ? `/${coupon.maxUsage}` : '/∞'}
                </span>
                {coupon.expiresAt && (
                  <span>
                    Expires:{' '}
                    {new Date(coupon.expiresAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: '2-digit',
                    })}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggle(coupon.id)}
                disabled={toggling === coupon.id}
                className={`p-2 rounded-lg transition-colors ${
                  coupon.isActive
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } disabled:opacity-50`}
                title={coupon.isActive ? 'Deactivate' : 'Activate'}
              >
                <Toggle2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleDelete(coupon.id)}
                disabled={deleting === coupon.id}
                className="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors disabled:opacity-50"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {coupons.coupons.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No coupons yet. Create one to get started!</p>
        </div>
      )}
    </div>
  );
}
