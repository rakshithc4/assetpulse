import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export { Skeleton };

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-surface-raised p-10 text-center">
      <p className="font-medium text-content-primary">{title}</p>
      <p className="text-sm text-content-secondary">{description}</p>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-severity-high-border bg-severity-high-bg p-10 text-center">
      <p className="text-sm text-severity-high-fg">{message}</p>
      <Button variant="outline" onClick={onRetry}>Retry</Button>
    </div>
  );
}
