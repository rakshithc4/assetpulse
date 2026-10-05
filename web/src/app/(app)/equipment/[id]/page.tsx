'use client';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEquipment } from '@/hooks/use-equipment';
import { useRequestList } from '@/hooks/use-requests';
import { useOrderList } from '@/hooks/use-orders';
import { OpStatusBadge, SeverityBadge, LifecycleBadge } from '@/components/badges';
import { ErrorState, Skeleton } from '@/components/states';
import { Button } from '@/components/ui/button';
import { canReportRequest } from '@/lib/domain';
import type { Role } from '@/lib/types';

export default function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const equipmentQuery = useEquipment(id);
  const requestsQuery = useRequestList();
  const ordersQuery = useOrderList();

  if (equipmentQuery.isLoading) return <Skeleton className="h-64" />;
  if (equipmentQuery.isError || !equipmentQuery.data) {
    return <ErrorState message="Could not load equipment" onRetry={() => equipmentQuery.refetch()} />;
  }

  const equip = equipmentQuery.data;
  const role = session?.user?.role as Role | undefined;

  const history = [
    ...(requestsQuery.data
      ?.filter((r) => r.EquipId === id)
      .map((r) => ({ kind: 'request' as const, id: r.ReqId, label: r.Title, changedAt: r.ChangedAt, node: <SeverityBadge severity={r.Severity} /> })) ?? []),
    ...(ordersQuery.data
      ?.filter((o) => o.EquipId === id)
      .map((o) => ({ kind: 'order' as const, id: o.OrderId, label: `Work order #${o.OrderId}`, changedAt: o.ChangedAt, node: <LifecycleBadge status={o.Status} /> })) ?? []),
  ].sort((a, b) => b.changedAt.localeCompare(a.changedAt));

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-surface-raised bg-surface-panel p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-mono text-xl text-content-primary">{equip.EquipTag}</h1>
            <p className="text-content-secondary">{equip.Name}</p>
          </div>
          <OpStatusBadge status={equip.OpStatus} />
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div><dt className="text-content-secondary">Site</dt><dd className="text-content-primary">{equip.Site}</dd></div>
          <div><dt className="text-content-secondary">Type</dt><dd className="text-content-primary">{equip.EquipType}</dd></div>
          <div><dt className="text-content-secondary">Criticality</dt><dd className="text-content-primary">{equip.Criticality}</dd></div>
        </dl>
        {role && canReportRequest(role) && (
          <Button asChild className="mt-4">
            <Link href={`/requests/new?equipId=${equip.EquipId}`}>Report fault</Link>
          </Button>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-content-secondary">Maintenance history</h2>
        {history.length === 0 && <p className="text-sm text-content-secondary">No history yet.</p>}
        <ul className="flex flex-col gap-2">
          {history.map((item) => (
            <li key={`${item.kind}-${item.id}`} className="flex items-center justify-between rounded-md border border-surface-raised bg-surface-panel px-3 py-2 text-sm">
              <Link href={item.kind === 'request' ? `/requests/${item.id}` : `/orders/${item.id}`} className="text-content-primary">{item.label}</Link>
              {item.node}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
