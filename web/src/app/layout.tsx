import type { Metadata } from 'next';
import './globals.css';
import { MockModeInit } from '@/mocks/mock-mode-init';
import { MockBanner } from '@/components/mock-banner';
import { QueryProvider } from '@/lib/query-provider';
import { AuthProvider } from '@/lib/session-provider';

export const metadata: Metadata = {
  title: 'AssetPulse',
  description: 'Asset maintenance control room',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen flex-col font-sans">
        <MockModeInit />
        <MockBanner />
        <AuthProvider>
          <QueryProvider>{children}</QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
