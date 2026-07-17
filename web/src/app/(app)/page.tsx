'use client';
import Link from 'next/link';
import { useKpiSummary } from '@/hooks/use-insights';
import { useEquipmentList } from '@/hooks/use-equipment';
import { useRequestList } from '@/hooks/use-requests';
import { useOrderList } from '@/hooks/use-orders';
import { KpiCard } from '@/components/kpi-card';
import { OpStatusBadge, SeverityBadge } from '@/components/badges';
import { EmptyState, ErrorState, Skeleton } from '@/components/states';

export default function DashboardPage() {
  const kpi = useKpiSummary();
  const equipmentQuery = useEquipmentList();
  const criticalAlerts = useRequestList({ status: 'REPORTED' });
  const recentRequests = useRequestList();
  const recentOrders = useOrderList();

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="KPI summary" className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {kpi.isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        {kpi.isError && <ErrorState message="Could not load KPIs" onRetry={() => kpi.refetch()} />}
        {kpi.data && (
          <>
            <KpiCard label="MTTR" value={kpi.data.mttr_hours.toFixed(1)} unit="hrs" />
            <KpiCard label="Availability" value={kpi.data.equipment_availability_pct.toFixed(1)} unit="%" />
            <KpiCard label="Open orders" value={kpi.data.open_orders} />
            <KpiCard label="Downtime (30d)" value={kpi.data.total_downtime_hours_30d.toFixed(1)} unit="hrs" />
          </>
        )}
      </section>

      <section aria-label="Equipment status board">
        <h2 className="mb-2 text-sm font-medium text-content-secondary">Equipment status</h2>
        {equipmentQuery.isLoading && <Skeleton className="h-32" />}
        {equipmentQuery.isError && <ErrorState message="Could not load equipment" onRetry={() => equipmentQuery.refetch()} />}
        {equipmentQuery.data?.length === 0 && <EmptyState title="No equipment yet" description="Equipment will appear here once registered." />}
        {equipmentQuery.data && equipmentQuery.data.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {equipmentQuery.data.map((equip) => (
              <Link
                key={equip.EquipId}
                href={`/equipment/${equip.EquipId}`}
                className="flex items-center gap-2 rounded-md border border-surface-raised bg-surface-panel px-3 py-2 text-sm hover:border-content-secondary"
              >
                <span className="font-mono text-content-primary">{equip.EquipTag}</span>
                <OpStatusBadge status={equip.OpStatus} />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section aria-label="Critical alerts">
        <h2 className="mb-2 text-sm font-medium text-content-secondary">Critical alerts</h2>
        {criticalAlerts.data?.filter((r) => r.Severity === 'CRITICAL').length === 0 && (
          <EmptyState title="No critical alerts" description="Nothing critical reported right now." />
        )}
        <ul className="flex flex-col gap-2">
          {criticalAlerts.data
            ?.filter((r) => r.Severity === 'CRITICAL')
            .map((req) => (
              <li
                key={req.ReqId}
                className="flex items-center justify-between rounded-md border border-severity-critical-border bg-severity-critical-bg px-3 py-2"
              >
                <Link href={`/requests/${req.ReqId}`} className="text-sm text-severity-critical-fg">{req.Title}</Link>
                <SeverityBadge severity={req.Severity} />
              </li>
            ))}
        </ul>
      </section>

      <section aria-label="Recent activity">
        <h2 className="mb-2 text-sm font-medium text-content-secondary">Recent activity</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {recentRequests.data?.slice(0, 5).map((req) => (
            <li key={req.ReqId} className="flex justify-between text-content-secondary">
              <span>Request: {req.Title}</span>
              <span className="font-mono text-xs">{new Date(req.ChangedAt).toLocaleString()}</span>
            </li>
          ))}
          {recentOrders.data?.slice(0, 5).map((order) => (
            <li key={order.OrderId} className="flex justify-between text-content-secondary">
              <span>Order #{order.OrderId}: {order.Status}</span>
              <span className="font-mono text-xs">{new Date(order.ChangedAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
