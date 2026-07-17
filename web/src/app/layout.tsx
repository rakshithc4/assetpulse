import type { Metadata } from 'next';
import './globals.css';
import { MockModeInit } from '@/mocks/mock-mode-init';
import { QueryProvider } from '@/lib/query-provider';

export const metadata: Metadata = {
  title: 'AssetPulse',
  description: 'Asset maintenance control room',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans">
        <MockModeInit />
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
