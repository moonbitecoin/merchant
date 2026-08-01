'use client';

import { useEffect, useState } from 'react';
import { couponAPI, ApiError } from '@/lib/api';
import { CouponForm } from './components/coupon-form';
import { CouponList } from './components/coupon-list';

export default function CouponsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coupons, setCoupons] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const loadCoupons = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await couponAPI.getCoupons(1, 50);
        setCoupons(result);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(`Failed to load coupons: ${err.detail}`);
        } else {
          setError('An unexpected error occurred');
        }
      } finally {
        setLoading(false);
      }
    };

    loadCoupons();
  }, []);

  const handleCouponCreated = async () => {
    setRefreshing(true);
    try {
      const result = await couponAPI.getCoupons(1, 50);
      setCoupons(result);
    } catch (err) {
      console.error('Failed to refresh coupons:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCouponDeleted = async () => {
    handleCouponCreated();
  };

  const handleCouponToggled = async () => {
    handleCouponCreated();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-muted-foreground">Loading coupons...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Coupons & Discounts</h1>
        <p className="text-muted-foreground mt-2">Create and manage discount coupons for your products</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-100 border border-red-200 p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Form and List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <CouponForm onCouponCreated={handleCouponCreated} />
        </div>

        <div className="lg:col-span-2">
          {coupons && (
            <CouponList
              coupons={coupons}
              onCouponDeleted={handleCouponDeleted}
              onCouponToggled={handleCouponToggled}
            />
          )}
        </div>
      </div>
    </div>
  );
}
