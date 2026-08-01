'use client';

import Link from 'next/link';

interface TopProductsProps {
  products: Array<{
    productId: string;
    title: string;
    revenue: string;
    sales: number;
  }>;
}

export function TopProducts({ products }: TopProductsProps) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="text-lg font-semibold mb-4">Top Products</h2>

      <div className="space-y-3">
        {products.map((product, index) => (
          <div
            key={product.productId}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground w-5">
                  #{index + 1}
                </span>
                <p className="text-sm font-medium truncate">{product.title}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {product.sales} {product.sales === 1 ? 'sale' : 'sales'}
              </p>
            </div>
            <p className="text-sm font-semibold text-right">
              {(Number(product.revenue) / 1e8).toFixed(2)} MBITE
            </p>
          </div>
        ))}
      </div>

      <Link
        href="/dashboard/products"
        className="block mt-4 text-center text-sm font-medium text-primary hover:underline"
      >
        View all products →
      </Link>
    </div>
  );
}
