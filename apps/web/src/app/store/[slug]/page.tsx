'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, Star } from 'lucide-react';

interface Product {
  id: string;
  title: string;
  description?: string;
  price: string; // BigInt as string (smallest unit)
  category: string;
  downloadLimit: string;
  averageRating?: number;
  reviewCount?: number;
}

interface Store {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
}

export default function StorePage({ params }: { params: { slug: string } }) {
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStore = async () => {
      try {
        setLoading(true);
        setError(null);

        // TODO: Fetch from API
        // const storeRes = await fetch(`http://localhost:3001/api/v1/stores/public/${params.slug}`);
        // const productsRes = await fetch(`http://localhost:3001/api/v1/products/public/store/${params.slug}`);

        setStore(null);
        setProducts([]);
      } catch (err) {
        setError('Failed to load store');
      } finally {
        setLoading(false);
      }
    };

    loadStore();
  }, [params.slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-muted-foreground">Loading store...</p>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-red-500 mb-4">{error || 'Store not found'}</p>
          <Link href="/store" className="text-primary hover:underline">
            Back to stores →
          </Link>
        </div>
      </div>
    );
  }

  const formatPrice = (priceStr: string) => {
    const num = Number(priceStr) / 1e8;
    return num.toFixed(2);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Store Header */}
      <div className="bg-gradient-to-b from-primary/10 to-background border-b">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-start gap-6">
            {store.logoUrl && (
              <img
                src={store.logoUrl}
                alt={store.name}
                className="w-24 h-24 rounded-lg object-cover"
              />
            )}

            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">{store.name}</h1>
              {store.description && (
                <p className="text-muted-foreground text-lg">{store.description}</p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                {products.length} product{products.length !== 1 ? 's' : ''} available
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="container mx-auto px-4 py-12">
        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No products available yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Link key={product.id} href={`/products/${product.id}`}>
                <div className="rounded-lg border bg-card hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col">
                  {/* Product Image Placeholder */}
                  <div className="aspect-video bg-gradient-to-br from-muted to-muted-foreground/20 flex items-center justify-center">
                    <ShoppingCart className="w-12 h-12 text-muted-foreground/50" />
                  </div>

                  <div className="p-6 flex-1 flex flex-col">
                    <h2 className="text-lg font-semibold mb-2 line-clamp-2">{product.title}</h2>

                    {product.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {product.description}
                      </p>
                    )}

                    {/* Rating */}
                    {product.averageRating !== undefined && (
                      <div className="flex items-center gap-1 mb-4">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < Math.round(product.averageRating || 0)
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-muted-foreground'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {product.averageRating} ({product.reviewCount || 0} reviews)
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-2xl font-bold">
                        {formatPrice(product.price)} MBITE
                      </span>
                      <span className="text-sm font-medium text-primary">Buy →</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
