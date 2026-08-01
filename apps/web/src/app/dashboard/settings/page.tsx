'use client';

import { useState } from 'react';
import { SettingsNav } from './components/settings-nav';
import { APIKeysSettings } from './components/api-keys';
import { WebhooksSettings } from './components/webhooks';
import { WalletSettings } from './components/wallet';
import { SecuritySettings } from './components/security';

type SettingsTab = 'api-keys' | 'webhooks' | 'wallet' | 'security';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('api-keys');

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your account and integrations</p>
      </div>

      {/* Settings Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <SettingsNav activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {activeTab === 'api-keys' && <APIKeysSettings />}
          {activeTab === 'webhooks' && <WebhooksSettings />}
          {activeTab === 'wallet' && <WalletSettings />}
          {activeTab === 'security' && <SecuritySettings />}
        </div>
      </div>
    </div>
  );
}
