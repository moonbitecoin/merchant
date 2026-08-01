import type { Metadata } from 'next';
import { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'MoonBite Merchant Hub',
  description: 'Sell digital goods and accept MBITE cryptocurrency payments',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
