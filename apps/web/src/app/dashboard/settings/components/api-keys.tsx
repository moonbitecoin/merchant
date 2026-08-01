'use client';

import { useState } from 'react';
import { Copy, Trash2, Eye, EyeOff } from 'lucide-react';

interface APIKey {
  publicKey: string;
  createdAt: string;
  lastUsed?: string;
}

export function APIKeysSettings() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleCreateKey = async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Call API to create key
      // const response = await apiRequest('/auth/api-keys', {
      //   method: 'POST',
      // });

      setSuccess('API key created successfully!');
    } catch (err) {
      setError('Failed to create API key');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteKey = async (publicKey: string) => {
    if (!confirm('Are you sure? This cannot be undone.')) return;

    try {
      setLoading(true);
      setError(null);

      // TODO: Call API to delete key
      // await apiRequest(`/auth/api-keys/${publicKey}`, {
      //   method: 'DELETE',
      // });

      setSuccess('API key deleted successfully!');
    } catch (err) {
      setError('Failed to delete API key');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">API Keys</h2>
        <p className="text-muted-foreground mt-2">
          Create and manage API keys for programmatic access
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-lg bg-red-100 border border-red-200 p-4">
          <p className="text-red-800 text-sm font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-100 border border-green-200 p-4">
          <p className="text-green-800 text-sm font-medium">{success}</p>
        </div>
      )}

      {/* Create Button */}
      <button
        onClick={handleCreateKey}
        disabled={loading}
        className="rounded-lg bg-primary px-6 py-2 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {loading ? 'Creating...' : 'Create New API Key'}
      </button>

      {/* Keys List */}
      {apiKeys.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-muted-foreground">No API keys yet. Create one to get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {apiKeys.map((key) => (
            <div key={key.publicKey} className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-mono text-sm font-medium">{key.publicKey}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Created: {new Date(key.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(key.publicKey)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    title="Copy"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteKey(key.publicKey)}
                    className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Documentation */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <h3 className="font-semibold mb-3">Authentication</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Use your API key to authenticate requests:
        </p>
        <code className="block bg-background p-3 rounded text-xs font-mono text-muted-foreground">
          Authorization: Bearer YOUR_API_KEY
        </code>
      </div>
    </div>
  );
}
