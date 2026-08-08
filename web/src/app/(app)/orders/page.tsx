'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useOrderList } from '@/hooks/use-orders';
import { LifecycleBadge } from '@/components/badges';
import { EmptyState, ErrorState, Skeleton } from '@/components/states';
import { Button } from '@/components/ui/button';

export default function OrdersListPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const currentUser = session?.user?.email ?? '';
  const [showMineOnly, setShowMineOnly] = useState(role === 'technician');

  const query = useOrderList(showMineOnly ? { assignedTo: currentUser } : undefined);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium text-content-primary">Work orders</h1>
        {role === 'technician' && (
          <Button variant="outline" onClick={() => setShowMineOnly((v) => !v)}>
            {showMineOnly ? 'Show all orders' : 'Show my orders'}
          </Button>
        )}
      </div>

      {query.isLoading && <Skeleton className="h-64" />}
      {query.isError && <ErrorState message="Could not load work orders" onRetry={() => query.refetch()} />}
      {query.data?.length === 0 && <EmptyState title="No work orders" description="Converted requests will appear here." />}
      <ul className="flex flex-col gap-2">
        {query.data?.map((order) => (
          <li key={order.OrderId} className="flex items-center justify-between rounded-md border border-surface-raised bg-surface-panel px-3 py-2 text-sm">
            <Link href={`/orders/${order.OrderId}`} className="font-mono text-content-primary">#{order.OrderId}</Link>
            <div className="flex items-center gap-2">
              <span className="text-content-secondary">{order.AssignedTo ?? 'Unassigned'}</span>
              <LifecycleBadge status={order.Status} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
