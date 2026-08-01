'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';

export default function ProductsPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground mt-2">Manage your digital products</p>
        </div>

        <Link
          href="/dashboard/products/new"
          className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2 font-semibold text-primary-foreground hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          New Product
        </Link>
      </div>

      {/* Placeholder Content */}
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground mb-4">
          Product management interface coming soon
        </p>
        <p className="text-sm text-muted-foreground">
          Use the Stores page to manage products for now
        </p>
        <Link
          href="/auth/profile"
          className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
        >
          Go to Profile Settings →
        </Link>
      </div>
    </div>
  );
}
