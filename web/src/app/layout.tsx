import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AssetPulse',
  description: 'Asset maintenance control room',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans">{children}</body>
    </html>
  );
}
