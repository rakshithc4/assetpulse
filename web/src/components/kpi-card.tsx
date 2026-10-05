import { SpotlightCard } from '@/components/ui/spotlight-card';
import { AnimatedNumber } from '@/components/ui/animated-number';

export function KpiCard({
  label,
  value,
  decimals = 0,
  unit,
  accent = '#d97706',
}: {
  label: string;
  value: number;
  decimals?: number;
  unit?: string;
  accent?: string;
}) {
  return (
    <SpotlightCard accent={accent} className="rounded-lg border border-surface-raised bg-surface-panel p-4">
      <div className="text-xs uppercase tracking-wide text-content-secondary">{label}</div>
      <div className="mt-1 font-mono text-3xl tabular-nums text-content-primary">
        <AnimatedNumber value={value} decimals={decimals} />
        {unit && <span className="ml-1 text-lg text-content-secondary">{unit}</span>}
      </div>
    </SpotlightCard>
  );
}
