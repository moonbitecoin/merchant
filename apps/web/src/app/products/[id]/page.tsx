'use client';

import { useEffect, useState } from 'react';
import { Star, Download, Lock } from 'lucide-react';
import { CheckoutModal } from '@/components/checkout-modal';
import { ReviewSection } from '@/components/review-section';

interface Product {
  id: string;
  title: string;
  description: string;
  price: string; // BigInt as string
  category: string;
  downloadLimit: string;
  store: {
    id: string;
    name: string;
    slug: string;
  };
}

interface ProductStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export default function ProductPage({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<string | null>(null);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        setError(null);

        // TODO: Fetch product
        // const [productRes, statsRes] = await Promise.all([
        //   fetch(`http://localhost:3001/api/v1/products/${params.id}`),
        //   fetch(`http://localhost:3001/api/v1/reviews/${params.id}/stats`)
        // ]);

        setProduct(null);
        setStats(null);
      } catch (err) {
        setError('Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-muted-foreground">Loading product...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-red-500">{error || 'Product not found'}</p>
      </div>
    );
  }

  const formatPrice = (priceStr: string) => {
    const num = Number(priceStr) / 1e8;
    return num.toFixed(2);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb */}
      <div className="border-b bg-muted/50">
        <div className="container mx-auto px-4 py-3 text-sm text-muted-foreground">
          <a href="/store" className="hover:text-foreground">Stores</a> /
          <a href={`/store/${product.store.slug}`} className="hover:text-foreground ml-1">
            {product.store.name}
          </a> /
          <span className="ml-1">{product.title}</span>
        </div>
      </div>

      {/* Product Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Product Image */}
            <div className="rounded-lg border bg-gradient-to-br from-muted to-muted-foreground/20 aspect-video flex items-center justify-center mb-8">
              <Download className="w-24 h-24 text-muted-foreground/30" />
            </div>

            {/* Product Info */}
            <div className="mb-8">
              <div className="mb-4">
                <span className="inline-block px-3 py-1 rounded-full bg-muted text-xs font-medium text-muted-foreground mb-4">
                  {product.category}
                </span>
              </div>

              <h1 className="text-4xl font-bold mb-4">{product.title}</h1>

              {/* Rating */}
              {stats && (
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${
                            i < Math.round(stats.averageRating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-muted-foreground'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-medium">{stats.averageRating.toFixed(1)}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {stats.totalReviews} review{stats.totalReviews !== 1 ? 's' : ''}
                  </span>
                </div>
              )}

              <div className="prose prose-sm max-w-none">
                <p className="text-muted-foreground text-lg mb-8">{product.description}</p>
              </div>

              {/* Features */}
              <div className="bg-muted/50 rounded-lg p-6 mb-8">
                <h3 className="font-semibold mb-4">What You Get</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Instant download after purchase
                  </li>
                  <li className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Secure encrypted delivery
                  </li>
                  <li>
                    Download limit: <strong>{product.downloadLimit}</strong>
                  </li>
                </ul>
              </div>
            </div>

            {/* Reviews Section */}
            <ReviewSection productId={product.id} transactionStatus={transactionStatus} />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Price Card */}
            <div className="rounded-lg border bg-card sticky top-4">
              <div className="p-6 border-b">
                <p className="text-muted-foreground text-sm mb-2">Price</p>
                <p className="text-4xl font-bold mb-6">
                  {formatPrice(product.price)} <span className="text-lg text-muted-foreground">MBITE</span>
                </p>

                {!downloadUrl ? (
                  <button
                    onClick={() => setShowCheckout(true)}
                    className="w-full rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    Buy Now
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full rounded-lg bg-green-600 px-6 py-3 font-semibold text-white opacity-50 cursor-not-allowed"
                  >
                    ✓ Purchased
                  </button>
                )}
              </div>

              {/* Download Link */}
              {downloadUrl && (
                <div className="p-6 border-t bg-green-50">
                  <p className="text-sm font-medium text-green-900 mb-3">Your Download Link</p>
                  <a
                    href={downloadUrl}
                    download
                    className="block w-full text-center rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 transition-colors"
                  >
                    Download File
                  </a>
                  <p className="text-xs text-muted-foreground mt-3">
                    Link valid for 24 hours, restricted to your IP address
                  </p>
                </div>
              )}

              {/* Store Info */}
              <div className="p-6 border-t">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                  Seller
                </p>
                <p className="font-semibold">{product.store.name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <CheckoutModal
          product={product}
          onClose={() => setShowCheckout(false)}
          onSuccess={(downloadUrl, status) => {
            setDownloadUrl(downloadUrl);
            setTransactionStatus(status);
            setShowCheckout(false);
          }}
        />
      )}
    </div>
  );
}
