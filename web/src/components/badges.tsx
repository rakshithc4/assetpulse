import { cn } from '@/lib/utils';
import type { Equipment, MaintenanceRequest, WorkOrder } from '@/lib/types';

const BASE = 'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium';

const SEVERITY: Record<MaintenanceRequest['Severity'], { label: string; classes: string }> = {
  LOW: { label: 'Low', classes: 'bg-severity-low-bg text-severity-low-fg border-severity-low-border font-mono' },
  MEDIUM: { label: 'Medium', classes: 'bg-severity-medium-bg text-severity-medium-fg border-severity-medium-border font-mono' },
  HIGH: { label: 'High', classes: 'bg-severity-high-bg text-severity-high-fg border-severity-high-border font-mono' },
  CRITICAL: { label: 'Critical', classes: 'bg-severity-critical-bg text-severity-critical-fg border-severity-critical-border font-mono motion-safe:animate-pulse' },
};

export function SeverityBadge({ severity }: { severity: MaintenanceRequest['Severity'] }) {
  const { label, classes } = SEVERITY[severity];
  return <span className={cn(BASE, classes)}>{label}</span>;
}

const OPSTATUS: Record<Equipment['OpStatus'], { label: string; classes: string }> = {
  OPERATIONAL: { label: 'Operational', classes: 'bg-opstatus-operational-bg text-opstatus-operational-fg border-opstatus-operational-border' },
  MAINTENANCE: { label: 'Maintenance', classes: 'bg-opstatus-maintenance-bg text-opstatus-maintenance-fg border-opstatus-maintenance-border' },
  DOWN: { label: 'Down', classes: 'bg-opstatus-down-bg text-opstatus-down-fg border-opstatus-down-border' },
};

export function OpStatusBadge({ status }: { status: Equipment['OpStatus'] }) {
  const { label, classes } = OPSTATUS[status];
  return <span className={cn(BASE, classes)}>{label}</span>;
}

const LIFECYCLE: Record<WorkOrder['Status'], { label: string; classes: string }> = {
  CREATED: { label: 'Created', classes: 'bg-lifecycle-created-bg text-lifecycle-created-fg border-lifecycle-created-border' },
  SCHEDULED: { label: 'Scheduled', classes: 'bg-lifecycle-scheduled-bg text-lifecycle-scheduled-fg border-lifecycle-scheduled-border' },
  IN_PROGRESS: { label: 'In progress', classes: 'bg-lifecycle-in_progress-bg text-lifecycle-in_progress-fg border-lifecycle-in_progress-border' },
  COMPLETED: { label: 'Completed', classes: 'bg-lifecycle-completed-bg text-lifecycle-completed-fg border-lifecycle-completed-border' },
  CANCELLED: { label: 'Cancelled', classes: 'bg-lifecycle-cancelled-bg text-lifecycle-cancelled-fg border-lifecycle-cancelled-border' },
};

export function LifecycleBadge({ status }: { status: WorkOrder['Status'] }) {
  const { label, classes } = LIFECYCLE[status];
  return <span className={cn(BASE, classes)}>{label}</span>;
}
