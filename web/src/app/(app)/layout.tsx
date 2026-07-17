import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { SignOutButton } from './sign-out-button';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-surface-raised bg-surface-panel px-6 py-3">
        <nav className="flex gap-4 text-sm">
          <Link href="/" className="text-content-primary hover:text-content-secondary">Control room</Link>
          <Link href="/equipment" className="text-content-secondary hover:text-content-primary">Equipment</Link>
          <Link href="/requests" className="text-content-secondary hover:text-content-primary">Requests</Link>
          <Link href="/orders" className="text-content-secondary hover:text-content-primary">Orders</Link>
          <Link href="/insights" className="text-content-secondary hover:text-content-primary">Insights</Link>
        </nav>
        <div className="flex items-center gap-3 text-sm text-content-secondary">
          <span className="font-mono">{session.user?.email}</span>
          <SignOutButton />
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
