import type { Metadata } from 'next';
import './globals.css';
import { MockModeInit } from '@/mocks/mock-mode-init';
import { QueryProvider } from '@/lib/query-provider';
import { AuthProvider } from '@/lib/session-provider';

export const metadata: Metadata = {
  title: 'AssetPulse',
  description: 'Asset maintenance control room',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans">
        <MockModeInit />
        <AuthProvider>
          <QueryProvider>{children}</QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
