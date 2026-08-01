'use client';

import { DollarSign, ShoppingCart, TrendingUp, Package } from 'lucide-react';

interface MetricsCardProps {
  label: string;
  value: string;
  icon: keyof typeof iconMap;
}

const iconMap = {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Package,
};

export function MetricsCard({ label, value, icon }: MetricsCardProps) {
  const Icon = iconMap[icon];

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-2">{value}</p>
        </div>
        <div className="rounded-lg bg-muted p-3">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </div>
  );
}
