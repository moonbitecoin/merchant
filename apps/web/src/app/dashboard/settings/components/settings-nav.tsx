'use client';

import { Key, Webhook, Wallet, Shield } from 'lucide-react';
import clsx from 'clsx';

interface SettingsNavProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: any;
  description: string;
}

const navItems: NavItem[] = [
  {
    id: 'api-keys',
    label: 'API Keys',
    icon: Key,
    description: 'Manage your API credentials',
  },
  {
    id: 'webhooks',
    label: 'Webhooks',
    icon: Webhook,
    description: 'Configure event webhooks',
  },
  {
    id: 'wallet',
    label: 'Wallet',
    icon: Wallet,
    description: 'Update payout wallet',
  },
  {
    id: 'security',
    label: 'Security',
    icon: Shield,
    description: '2FA and password',
  },
];

export function SettingsNav({ activeTab, onTabChange }: SettingsNavProps) {
  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={clsx(
              'w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground hover:bg-muted'
            )}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm">{item.label}</p>
              <p className="text-xs opacity-75">{item.description}</p>
            </div>
          </button>
        );
      })}
    </nav>
  );
}
