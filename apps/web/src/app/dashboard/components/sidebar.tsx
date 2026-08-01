'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Package,
  DollarSign,
  Ticket,
  Settings,
  LogOut,
} from 'lucide-react';
import clsx from 'clsx';

interface NavItem {
  label: string;
  href: string;
  icon: any;
}

const navItems: NavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: BarChart3 },
  { label: 'Products', href: '/dashboard/products', icon: Package },
  { label: 'Payouts', href: '/dashboard/payouts', icon: DollarSign },
  { label: 'Coupons', href: '/dashboard/coupons', icon: Ticket },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-muted/30">
      <div className="sticky top-0 h-screen flex flex-col">
        {/* Logo */}
        <div className="border-b p-6">
          <h2 className="text-xl font-bold">MoonBite Hub</h2>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-accent'
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t p-4">
          <button
            onClick={() => {
              // TODO: Call logout API
              localStorage.removeItem('accessToken');
              window.location.href = '/';
            }}
            className="flex items-center gap-3 px-4 py-2 rounded-lg w-full text-foreground hover:bg-accent transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
