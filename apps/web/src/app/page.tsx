export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-2xl text-center">
          <h1 className="text-5xl font-bold tracking-tight mb-4">MoonBite Merchant Hub</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Sell digital goods and accept MBITE cryptocurrency payments with instant, encrypted delivery
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <a
              href="/auth/login"
              className="rounded-lg bg-primary px-8 py-3 font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Merchant Login
            </a>
            <a
              href="/auth/register"
              className="rounded-lg border border-primary px-8 py-3 font-semibold text-primary hover:bg-accent transition-colors"
            >
              Start Selling
            </a>
          </div>

          <div className="mt-12 border-t pt-8">
            <p className="text-sm text-muted-foreground mb-4">👥 Browse digital products:</p>
            <a
              href="/store"
              className="inline-flex items-center gap-2 rounded-lg bg-muted px-6 py-3 font-medium hover:bg-accent transition-colors"
            >
              🛍️ Browse Stores & Products
            </a>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-muted/50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8">Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="font-semibold mb-2">Secure Delivery</h3>
              <p className="text-muted-foreground text-sm">
                AES-256-GCM encrypted files delivered instantly after payment
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="font-semibold mb-2">Instant Settlement</h3>
              <p className="text-muted-foreground text-sm">
                Get paid immediately when customers confirm their purchase
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="font-semibold mb-2">Analytics Dashboard</h3>
              <p className="text-muted-foreground text-sm">
                Track revenue, sales, and download stats in real-time
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
