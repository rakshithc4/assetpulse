'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useRequest, useConvertRequest, useRejectRequest } from '@/hooks/use-requests';
import { SeverityBadge } from '@/components/badges';
import { ErrorState, Skeleton } from '@/components/states';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { canActOnRequest } from '@/lib/domain';
import type { Role } from '@/lib/types';

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const role = session?.user?.role as Role | undefined;
  const requestQuery = useRequest(id);
  const convertRequest = useConvertRequest(id);
  const rejectRequest = useRejectRequest(id);

  const [convertOpen, setConvertOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');

  if (requestQuery.isLoading) return <Skeleton className="h-64" />;
  if (requestQuery.isError || !requestQuery.data) {
    return <ErrorState message="Could not load request" onRetry={() => requestQuery.refetch()} />;
  }

  const req = requestQuery.data;
  const canAct = role ? canActOnRequest(role, 'convert_request', { status: req.Status }) : false;

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium text-content-primary">{req.Title}</h1>
        <SeverityBadge severity={req.Severity} />
      </div>
      <p className="text-sm text-content-secondary">{req.Description ?? 'No description provided.'}</p>
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div><dt className="text-content-secondary">Status</dt><dd className="text-content-primary">{req.Status}</dd></div>
        <div><dt className="text-content-secondary">Reported by</dt><dd className="text-content-primary">{req.ReportedBy}</dd></div>
      </dl>
      {req.RejectNote && <p className="text-sm text-severity-high-fg">Rejected: {req.RejectNote}</p>}

      {canAct && (
        <div className="flex gap-3">
          <Button onClick={() => setConvertOpen(true)}>Convert to work order</Button>
          <Button variant="destructive" onClick={() => setRejectOpen(true)}>Reject</Button>
        </div>
      )}

      <ConfirmDialog
        open={convertOpen}
        onOpenChange={setConvertOpen}
        title="Convert to work order"
        description="Set the work order priority (defaults to the request's severity)."
        confirmLabel="Convert"
        pending={convertRequest.isPending}
        onConfirm={() => convertRequest.mutate({ Priority: priority }, { onSuccess: () => setConvertOpen(false) })}
      >
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as typeof priority)}
          className="w-full rounded-md border border-surface-raised bg-surface-panel px-2 py-2 text-sm text-content-primary"
        >
          {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </ConfirmDialog>

      <ConfirmDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject request"
        description="A reason is required."
        confirmLabel="Reject"
        destructive
        pending={rejectRequest.isPending}
        onConfirm={() => {
          if (!note.trim()) {
            setNoteError('A reason is required');
            return;
          }
          rejectRequest.mutate({ Note: note }, { onSuccess: () => setRejectOpen(false) });
        }}
      >
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for rejection" />
        {noteError && <p className="mt-1 text-xs text-severity-high-fg">{noteError}</p>}
      </ConfirmDialog>
    </div>
  );
}
