'use client';

export function WebhooksSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Webhooks</h2>
        <p className="text-muted-foreground mt-2">
          Receive real-time events for payment confirmations and file downloads
        </p>
      </div>

      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground mb-4">Webhook configuration</p>
        <p className="text-sm">
          Manage your webhooks from the checkout settings or create new subscriptions below
        </p>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4">
        <h3 className="font-semibold mb-2">Available Events</h3>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li>• <code className="bg-background px-2 py-1 rounded">payment.received</code> - Payment confirmed</li>
          <li>• <code className="bg-background px-2 py-1 rounded">file.downloaded</code> - File downloaded</li>
          <li>• <code className="bg-background px-2 py-1 rounded">payout.completed</code> - Payout sent</li>
        </ul>
      </div>
    </div>
  );
}
