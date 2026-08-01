export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight">MoonBite Merchant Hub</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Sell digital goods and accept MBITE cryptocurrency payments
        </p>
        <div className="mt-8 flex gap-4 justify-center">
          <a
            href="/auth/login"
            className="rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground hover:opacity-90"
          >
            Log In
          </a>
          <a
            href="/auth/register"
            className="rounded-lg border border-primary px-6 py-3 font-semibold text-primary hover:bg-accent"
          >
            Register
          </a>
        </div>
      </div>
    </main>
  );
}
