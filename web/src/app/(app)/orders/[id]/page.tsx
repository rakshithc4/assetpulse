'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useOrder, useScheduleOrder, useStartWork, useCompleteWork, useCancelOrder } from '@/hooks/use-orders';
import { useRequest } from '@/hooks/use-requests';
import { useEquipment } from '@/hooks/use-equipment';
import { LifecycleBadge } from '@/components/badges';
import { ErrorState, Skeleton } from '@/components/states';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { canActOnOrder } from '@/lib/domain';
import type { Role, WorkOrder } from '@/lib/types';

const STEPS: WorkOrder['Status'][] = ['CREATED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED'];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const role = session?.user?.role as Role | undefined;
  const currentUser = session?.user?.email ?? '';

  const orderQuery = useOrder(id);
  const scheduleOrder = useScheduleOrder(id);
  const startWork = useStartWork(id);
  const completeWork = useCompleteWork(id);
  const cancelOrder = useCancelOrder(id);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('tech@demo');
  const [downtimeHours, setDowntimeHours] = useState('0');
  const [completionNotes, setCompletionNotes] = useState('');
  const [cancelNote, setCancelNote] = useState('');

  const requestQuery = useRequest(orderQuery.data?.ReqId ?? '');
  const equipmentQuery = useEquipment(orderQuery.data?.EquipId ?? '');

  if (orderQuery.isLoading) return <Skeleton className="h-64" />;
  if (orderQuery.isError || !orderQuery.data) {
    return <ErrorState message="Could not load work order" onRetry={() => orderQuery.refetch()} />;
  }

  const order = orderQuery.data;
  const ctx = { status: order.Status, assignedTo: order.AssignedTo };
  const can = (action: 'schedule_order' | 'start_work' | 'complete_work' | 'cancel_order') =>
    role ? canActOnOrder(role, action, ctx, currentUser) : false;

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-mono text-lg text-content-primary">Work order #{order.OrderId}</h1>
        <LifecycleBadge status={order.Status} />
      </div>

      <ol className="flex gap-2 text-xs text-content-secondary">
        {STEPS.map((step) => (
          <li key={step} className={step === order.Status ? 'font-medium text-content-primary' : ''}>{step}</li>
        ))}
        {order.Status === 'CANCELLED' && <li className="font-medium text-severity-high-fg">CANCELLED</li>}
      </ol>

      <div className="flex gap-3">
        {can('schedule_order') && <Button onClick={() => setScheduleOpen(true)}>Schedule</Button>}
        {can('start_work') && <Button onClick={() => startWork.mutate({})}>Start work</Button>}
        {can('complete_work') && <Button onClick={() => setCompleteOpen(true)}>Complete</Button>}
        {can('cancel_order') && <Button variant="destructive" onClick={() => setCancelOpen(true)}>Cancel order</Button>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {requestQuery.data && (
          <Link href={`/requests/${requestQuery.data.ReqId}`} className="rounded-md border border-surface-raised bg-surface-panel p-3 text-sm">
            <div className="text-content-secondary">Request</div>
            <div className="text-content-primary">{requestQuery.data.Title}</div>
          </Link>
        )}
        {equipmentQuery.data && (
          <Link href={`/equipment/${equipmentQuery.data.EquipId}`} className="rounded-md border border-surface-raised bg-surface-panel p-3 text-sm">
            <div className="text-content-secondary">Equipment</div>
            <div className="font-mono text-content-primary">{equipmentQuery.data.EquipTag}</div>
          </Link>
        )}
      </div>

      <ConfirmDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        title="Schedule work order"
        description="Pick a date (today or later) and assign a technician."
        confirmLabel="Schedule"
        pending={scheduleOrder.isPending}
        onConfirm={() => scheduleOrder.mutate({ ScheduledDate: scheduledDate, AssignedTo: assignedTo }, { onSuccess: () => setScheduleOpen(false) })}
      >
        <div className="flex flex-col gap-2">
          <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
          <Input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Technician" />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        title="Complete work order"
        description="Downtime hours must be zero or greater."
        confirmLabel="Complete"
        pending={completeWork.isPending}
        onConfirm={() =>
          completeWork.mutate({ CompletionNotes: completionNotes, DowntimeHours: Number(downtimeHours) }, { onSuccess: () => setCompleteOpen(false) })
        }
      >
        <div className="flex flex-col gap-2">
          <Input type="number" min="0" step="0.1" value={downtimeHours} onChange={(e) => setDowntimeHours(e.target.value)} placeholder="Downtime hours" />
          <Textarea value={completionNotes} onChange={(e) => setCompletionNotes(e.target.value)} placeholder="Completion notes" />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel work order"
        description="A reason is required."
        confirmLabel="Cancel order"
        destructive
        pending={cancelOrder.isPending}
        onConfirm={() => cancelOrder.mutate({ Note: cancelNote }, { onSuccess: () => setCancelOpen(false) })}
      >
        <Textarea value={cancelNote} onChange={(e) => setCancelNote(e.target.value)} placeholder="Reason for cancellation" />
      </ConfirmDialog>
    </div>
  );
}
