'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useKpiSummary } from '@/hooks/use-insights';
import { useEquipmentList } from '@/hooks/use-equipment';
import { useRequestList } from '@/hooks/use-requests';
import { useOrderList } from '@/hooks/use-orders';
import { KpiCard } from '@/components/kpi-card';
import { OpStatusBadge, SeverityBadge } from '@/components/badges';
import { EmptyState, ErrorState, Skeleton } from '@/components/states';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { Link001 } from '@/components/ui/skiper-ui/skiper40';
import tokens from '../../../../design/tokens.json';

// Three.js pulls in a large chunk (three + @react-three/fiber) for a small
// decorative accent — split it into its own lazily-loaded chunk so it never
// blocks or bloats the dashboard's initial JS. No SSR: WebGL needs a browser.
const AmbientOrb = dynamic(() => import('@/components/ui/ambient-orb').then((m) => m.AmbientOrb), {
  ssr: false,
});

export default function DashboardPage() {
  const kpi = useKpiSummary();
  const equipmentQuery = useEquipmentList();
  const criticalAlerts = useRequestList({ status: 'REPORTED' });
  const recentRequests = useRequestList();
  const recentOrders = useOrderList();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <AmbientOrb className="h-12 w-12 shrink-0" />
        <div>
          <h1 className="text-lg font-medium text-content-primary">Control room</h1>
          <p className="text-xs text-content-secondary">Live status across every registered asset.</p>
        </div>
      </div>

      <section aria-label="KPI summary" className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {kpi.isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        {kpi.isError && <ErrorState message="Could not load KPIs" onRetry={() => kpi.refetch()} />}
        {kpi.data && (
          <>
            <KpiCard label="MTTR" value={kpi.data.mttr_hours} decimals={1} unit="hrs" accent={tokens.lifecycle.scheduled.border} />
            <KpiCard label="Availability" value={kpi.data.equipment_availability_pct} decimals={1} unit="%" accent={tokens.opstatus.operational.border} />
            <KpiCard label="Open orders" value={kpi.data.open_orders} accent={tokens.lifecycle.in_progress.border} />
            <KpiCard label="Downtime (30d)" value={kpi.data.total_downtime_hours_30d} decimals={1} unit="hrs" accent={tokens.severity.critical.border} />
          </>
        )}
      </section>

      <section aria-label="Equipment status board">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium text-content-secondary">Equipment status</h2>
          <Link001 href="/equipment" className="text-xs text-content-secondary hover:text-content-primary">View all</Link001>
        </div>
        {equipmentQuery.isLoading && <Skeleton className="h-32" />}
        {equipmentQuery.isError && <ErrorState message="Could not load equipment" onRetry={() => equipmentQuery.refetch()} />}
        {equipmentQuery.data?.length === 0 && <EmptyState title="No equipment yet" description="Equipment will appear here once registered." />}
        {equipmentQuery.data && equipmentQuery.data.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {equipmentQuery.data.map((equip) => (
              <SpotlightCard
                key={equip.EquipId}
                accent={
                  equip.OpStatus === 'DOWN'
                    ? tokens.opstatus.down.border
                    : equip.OpStatus === 'MAINTENANCE'
                      ? tokens.opstatus.maintenance.border
                      : tokens.opstatus.operational.border
                }
                className="rounded-md border border-surface-raised bg-surface-panel"
              >
                <Link
                  href={`/equipment/${equip.EquipId}`}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:border-content-secondary"
                >
                  <span className="font-mono text-content-primary">{equip.EquipTag}</span>
                  <OpStatusBadge status={equip.OpStatus} />
                </Link>
              </SpotlightCard>
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
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium text-content-secondary">Recent activity</h2>
          <Link001 href="/orders" className="text-xs text-content-secondary hover:text-content-primary">View all</Link001>
        </div>
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
