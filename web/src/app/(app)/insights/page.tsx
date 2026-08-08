'use client';
import type { ReactNode } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useKpiDowntime, useKpiBacklogAging, useKpiFrequency } from '@/hooks/use-insights';
import { ErrorState, Skeleton } from '@/components/states';
import tokens from '../../../../../design/tokens.example.json';

// Recharts needs literal color values (SVG props), not Tailwind classes, so these
// read straight from the same tokens.json every other component consumes via
// tailwind.config.ts — never hand-picked hex. The aging ramp intentionally reuses
// the severity ramp per DESIGN_BRIEF.md ("the severity ramp reused for aging buckets").
const GRID_COLOR = tokens.text.muted;
const AXIS_COLOR = tokens.text.secondary;
const TOOLTIP_BG = tokens.surface.raised;
const AGING_COLORS: Record<string, string> = {
  '0-7': tokens.severity.low.fg,
  '8-30': tokens.severity.medium.fg,
  '30+': tokens.severity.critical.border,
};

interface QueryLike<T> {
  data?: T;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

function ChartPanel<T>({ title, query, children }: { title: string; query: QueryLike<T>; children: (data: T) => ReactNode }) {
  return (
    <section aria-label={title} className="rounded-lg border border-surface-raised bg-surface-panel p-4">
      <h2 className="mb-2 text-sm font-medium text-content-secondary">{title}</h2>
      {query.isLoading && <Skeleton className="h-60" />}
      {query.isError && <ErrorState message={`Could not load ${title.toLowerCase()}`} onRetry={query.refetch} />}
      {query.data && children(query.data)}
    </section>
  );
}

export default function InsightsPage() {
  const downtimeBySite = useKpiDowntime('site');
  const downtimeByType = useKpiDowntime('type');
  const backlogAging = useKpiBacklogAging();
  const frequency = useKpiFrequency();
  const mockBadge = process.env.NEXT_PUBLIC_MOCK_MODE === '1';

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-content-secondary">
        Last 90 days{mockBadge && <span className="ml-2 rounded border border-surface-raised px-1.5 py-0.5 text-xs">mock mode</span>}
      </p>

      <ChartPanel title="Downtime by site" query={downtimeBySite}>
        {(data) => (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.data}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis dataKey="group" stroke={AXIS_COLOR} fontSize={12} />
              <YAxis stroke={AXIS_COLOR} fontSize={12} />
              <Tooltip contentStyle={{ background: TOOLTIP_BG, border: `1px solid ${GRID_COLOR}` }} />
              <Bar dataKey="downtime_hours" fill={tokens.lifecycle.scheduled.border} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartPanel>

      <ChartPanel title="Downtime by equipment type" query={downtimeByType}>
        {(data) => (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.data}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis dataKey="group" stroke={AXIS_COLOR} fontSize={12} />
              <YAxis stroke={AXIS_COLOR} fontSize={12} />
              <Tooltip contentStyle={{ background: TOOLTIP_BG, border: `1px solid ${GRID_COLOR}` }} />
              <Bar dataKey="downtime_hours" fill={tokens.lifecycle.in_progress.border} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartPanel>

      <ChartPanel title="Backlog aging" query={backlogAging}>
        {(data) => (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.buckets}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis dataKey="range" stroke={AXIS_COLOR} fontSize={12} />
              <YAxis stroke={AXIS_COLOR} fontSize={12} />
              <Tooltip contentStyle={{ background: TOOLTIP_BG, border: `1px solid ${GRID_COLOR}` }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.buckets.map((bucket) => (
                  <Cell key={bucket.range} fill={AGING_COLORS[bucket.range] ?? tokens.lifecycle.scheduled.border} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartPanel>

      <ChartPanel title="Requests by equipment type" query={frequency}>
        {(data) => (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.data}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis dataKey="equip_type" stroke={AXIS_COLOR} fontSize={12} />
              <YAxis stroke={AXIS_COLOR} fontSize={12} />
              <Tooltip contentStyle={{ background: TOOLTIP_BG, border: `1px solid ${GRID_COLOR}` }} />
              <Bar dataKey="count" fill={tokens.severity.medium.fg} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartPanel>
    </div>
  );
}
