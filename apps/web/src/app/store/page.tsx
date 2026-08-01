'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';

interface Store {
  id: string;
  slug: string;
  name: string;
  description?: string;
  logoUrl?: string;
  productCount: number;
}

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadStores = async () => {
      try {
        setLoading(true);
        // TODO: Fetch from API once public stores endpoint is available
        // const response = await fetch('http://localhost:3001/api/v1/stores/public');
        // const data = await response.json();
        // setStores(data);
        setStores([]);
      } catch (error) {
        console.error('Failed to load stores:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStores();
  }, []);

  const filteredStores = stores.filter(
    (store) =>
      store.name.toLowerCase().includes(search.toLowerCase()) ||
      store.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-muted-foreground">Loading stores...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-muted/50 border-b">
        <div className="container mx-auto py-12 px-4">
          <h1 className="text-4xl font-bold">Discover Stores</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Explore digital products from independent creators
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="border-b sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2 bg-muted rounded-lg px-4 py-2 max-w-md">
            <Search className="w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search stores..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent outline-none w-full text-sm"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        {filteredStores.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg mb-4">
              {stores.length === 0 ? 'No stores available yet' : 'No stores match your search'}
            </p>
            <Link href="/" className="text-primary hover:underline">
              Back to home →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStores.map((store) => (
              <Link key={store.id} href={`/store/${store.slug}`}>
                <div className="rounded-lg border bg-card hover:shadow-lg transition-shadow cursor-pointer h-full">
                  {store.logoUrl && (
                    <div className="aspect-video bg-muted overflow-hidden">
                      <img
                        src={store.logoUrl}
                        alt={store.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="p-6">
                    <h2 className="text-xl font-semibold mb-2">{store.name}</h2>
                    {store.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {store.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {store.productCount} product{store.productCount !== 1 ? 's' : ''}
                      </span>
                      <span className="text-sm font-medium text-primary">View Store →</span>
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
