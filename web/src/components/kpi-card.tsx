export function KpiCard({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="rounded-lg border border-surface-raised bg-surface-panel p-4">
      <div className="text-xs uppercase tracking-wide text-content-secondary">{label}</div>
      <div className="mt-1 font-mono text-3xl tabular-nums text-content-primary">
        {value}
        {unit && <span className="ml-1 text-lg text-content-secondary">{unit}</span>}
      </div>
    </div>
  );
}
