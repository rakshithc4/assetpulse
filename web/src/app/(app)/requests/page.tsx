'use client';
import Link from 'next/link';
import { AnimatePresence } from 'motion/react';
import { useSession } from 'next-auth/react';
import { useRequestList } from '@/hooks/use-requests';
import { SeverityBadge } from '@/components/badges';
import { EmptyState, ErrorState, Skeleton } from '@/components/states';
import { Button } from '@/components/ui/button';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { canReportRequest } from '@/lib/domain';
import type { Role } from '@/lib/types';
import tokens from '../../../../../design/tokens.json';

const SEVERITY_ACCENT: Record<string, string> = {
  LOW: tokens.severity.low.border,
  MEDIUM: tokens.severity.medium.border,
  HIGH: tokens.severity.high.border,
  CRITICAL: tokens.severity.critical.border,
};

export default function RequestsListPage() {
  const { data: session } = useSession();
  const role = session?.user?.role as Role | undefined;
  const query = useRequestList();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium text-content-primary">Maintenance requests</h1>
        {role && canReportRequest(role) && <Button asChild><Link href="/requests/new">Report fault</Link></Button>}
      </div>

      {query.isLoading && <Skeleton className="h-64" />}
      {query.isError && <ErrorState message="Could not load requests" onRetry={() => query.refetch()} />}
      {query.data?.length === 0 && <EmptyState title="No requests yet" description="Reported faults will show up here." />}
      <ul className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {query.data?.map((req) => (
            <SpotlightCard
              key={req.ReqId}
              as="li"
              accent={SEVERITY_ACCENT[req.Severity] ?? tokens.severity.medium.border}
              className="flex items-center justify-between rounded-md border border-surface-raised bg-surface-panel px-3 py-2 text-sm"
            >
              <Link href={`/requests/${req.ReqId}`} className="text-content-primary">{req.Title}</Link>
              <div className="flex items-center gap-2">
                <span className="text-content-secondary">{req.Status}</span>
                <SeverityBadge severity={req.Severity} />
              </div>
            </SpotlightCard>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
