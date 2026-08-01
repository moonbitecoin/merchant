'use client';

import { useState } from 'react';
import { Shield, Lock } from 'lucide-react';

export function SecuritySettings() {
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEnable2FA = async () => {
    try {
      setLoading(true);
      // TODO: Call API to enable 2FA
      // const response = await apiRequest('/auth/2fa/enable', {
      //   method: 'POST',
      // });
      // setShowQR(true);
    } catch (err) {
      console.error('Failed to enable 2FA:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!confirm('Are you sure? This will reduce your account security.')) {
      return;
    }

    try {
      setLoading(true);
      // TODO: Call API to disable 2FA
      // await apiRequest('/auth/2fa/disable', {
      //   method: 'POST',
      // });
      setTotpEnabled(false);
    } catch (err) {
      console.error('Failed to disable 2FA:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Security</h2>
        <p className="text-muted-foreground mt-2">
          Manage your account security settings
        </p>
      </div>

      {/* Two-Factor Authentication */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-start justify-between">
          <div className="flex gap-4">
            <div className="rounded-lg bg-blue-100 p-3">
              <Shield className="w-6 h-6 text-blue-700" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Two-Factor Authentication (2FA)</h3>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security to your account with 2FA
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {totpEnabled ? '✓ Enabled' : 'Not enabled'}
              </p>
            </div>
          </div>

          <button
            onClick={totpEnabled ? handleDisable2FA : handleEnable2FA}
            disabled={loading}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors whitespace-nowrap ${
              totpEnabled
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-primary text-primary-foreground hover:opacity-90'
            } disabled:opacity-50`}
          >
            {loading ? 'Loading...' : totpEnabled ? 'Disable 2FA' : 'Enable 2FA'}
          </button>
        </div>
      </div>

      {/* Password Change */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-start justify-between">
          <div className="flex gap-4">
            <div className="rounded-lg bg-purple-100 p-3">
              <Lock className="w-6 h-6 text-purple-700" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Password</h3>
              <p className="text-sm text-muted-foreground">
                Update your password regularly
              </p>
            </div>
          </div>

          <button className="px-4 py-2 rounded-lg font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-colors">
            Change Password
          </button>
        </div>
      </div>

      {/* Security Tips */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <h3 className="font-semibold mb-3">Security Tips</h3>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li>✓ Use a strong, unique password</li>
          <li>✓ Enable two-factor authentication (2FA)</li>
          <li>✓ Keep your API keys confidential</li>
          <li>✓ Monitor your account activity regularly</li>
          <li>✓ Report suspicious activity immediately</li>
        </ul>
      </div>
    </div>
  );
}
