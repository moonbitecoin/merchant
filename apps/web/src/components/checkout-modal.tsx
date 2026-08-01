'use client';

import { useState, useEffect } from 'react';
import { X, Copy, Check } from 'lucide-react';

interface Product {
  id: string;
  title: string;
  price: string;
  store: {
    id: string;
    name: string;
  };
}

interface CheckoutModalProps {
  product: Product;
  onClose: () => void;
  onSuccess: (downloadUrl: string, status: string) => void;
}

interface Checkout {
  transactionId: string;
  depositAddress: string;
  amount: string;
  qrCode: string;
  expiresAt: string;
}

export function CheckoutModal({ product, onClose, onSuccess }: CheckoutModalProps) {
  const [step, setStep] = useState<'input' | 'payment' | 'success'>('input');
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>('pending');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollingCount, setPollingCount] = useState(0);

  // Generate idempotency key
  const idempotencyKey = Math.random().toString(36).substring(7);

  const formatPrice = (priceStr: string) => {
    const num = Number(priceStr) / 1e8;
    return num.toFixed(2);
  };

  const handleCreateCheckout = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('http://localhost:3001/api/v1/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          productId: product.id,
          couponCode: couponCode || undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to create checkout');
      }

      const data = await response.json();
      setCheckout(data);
      setTransactionId(data.transactionId);
      setStep('payment');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create checkout');
    } finally {
      setLoading(false);
    }
  };

  // Poll for payment status
  useEffect(() => {
    if (step !== 'payment' || !transactionId) return;

    const poll = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:3001/api/v1/checkout/${transactionId}`);
        if (!response.ok) throw new Error('Failed to check status');

        const data = await response.json();
        setPaymentStatus(data.status);

        setPollingCount((c) => c + 1);

        if (data.status === 'confirmed') {
          clearInterval(poll);

          // Get download URL
          const downloadUrl = await generateDownloadUrl(transactionId);
          onSuccess(downloadUrl, data.status);
          setStep('success');
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    }, 2000); // Poll every 2 seconds

    // Stop polling after 15 minutes (too long for payment)
    const timeout = setTimeout(() => clearInterval(poll), 15 * 60 * 1000);

    return () => {
      clearInterval(poll);
      clearTimeout(timeout);
    };
  }, [step, transactionId]);

  const generateDownloadUrl = async (txId: string): Promise<string> => {
    // In real implementation, this would call the backend to generate signed URL
    // For now, return placeholder
    return `http://localhost:3001/api/v1/downloads/${txId}?sig=SIGNED&expires=TIMESTAMP`;
  };

  const handleCopyAddress = () => {
    if (checkout?.depositAddress) {
      navigator.clipboard.writeText(checkout.depositAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-background">
          <h2 className="text-xl font-semibold">Checkout</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-lg bg-red-100 border border-red-200 p-4">
              <p className="text-red-800 text-sm font-medium">{error}</p>
            </div>
          )}

          {step === 'input' && (
            <div className="space-y-6">
              {/* Product Summary */}
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm text-muted-foreground mb-2">Product</p>
                <p className="font-semibold">{product.title}</p>
                <p className="text-2xl font-bold mt-2">{formatPrice(product.price)} MBITE</p>
              </div>

              {/* Coupon Code */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Coupon Code <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="SAVE20"
                  className="w-full rounded-lg border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  disabled={loading}
                />
              </div>

              {/* Action */}
              <button
                onClick={handleCreateCheckout}
                disabled={loading}
                className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {loading ? 'Creating checkout...' : 'Continue to Payment'}
              </button>
            </div>
          )}

          {step === 'payment' && checkout && (
            <div className="space-y-6">
              {/* Status */}
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <p className="text-sm text-blue-900 font-medium">
                  {paymentStatus === 'pending'
                    ? '⏳ Waiting for payment... (checked ' + pollingCount + 'x)'
                    : paymentStatus === 'confirmed'
                      ? '✓ Payment confirmed!'
                      : '✗ Payment failed'}
                </p>
              </div>

              {/* QR Code */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-3">Scan to pay</p>
                <img
                  src={checkout.qrCode}
                  alt="QR Code"
                  className="mx-auto w-48 h-48 border rounded-lg bg-white"
                />
              </div>

              {/* Address */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Or send to address:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={checkout.depositAddress}
                    readOnly
                    className="flex-1 rounded-lg border bg-muted px-4 py-2 text-sm font-mono"
                  />
                  <button
                    onClick={handleCopyAddress}
                    className="px-4 py-2 rounded-lg bg-muted hover:bg-accent transition-colors"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground mb-1">Amount</p>
                <p className="text-2xl font-bold">{checkout.amount} MBITE</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Expires at {new Date(checkout.expiresAt).toLocaleTimeString()}
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="w-full rounded-lg border px-4 py-2 font-medium hover:bg-muted transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {step === 'success' && (
            <div className="space-y-6 text-center py-6">
              <div className="text-5xl mb-4">✓</div>
              <h3 className="text-2xl font-bold">Payment Successful!</h3>
              <p className="text-muted-foreground">
                Your download link has been sent. Check your email or use the link in the product page.
              </p>
              <button
                onClick={onClose}
                className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground hover:opacity-90"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
