'use client';
import type { ReactNode } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useKpiDowntime, useKpiBacklogAging, useKpiFrequency } from '@/hooks/use-insights';
import { ErrorState, Skeleton } from '@/components/states';

const AGING_COLORS: Record<string, string> = { '0-7': '#4ade80', '8-30': '#facc15', '30+': '#ef4444' };

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
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a30" />
              <XAxis dataKey="group" stroke="#a1a1aa" fontSize={12} />
              <YAxis stroke="#a1a1aa" fontSize={12} />
              <Tooltip contentStyle={{ background: '#1c1c22', border: '1px solid #2a2a30' }} />
              <Bar dataKey="downtime_hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartPanel>

      <ChartPanel title="Downtime by equipment type" query={downtimeByType}>
        {(data) => (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a30" />
              <XAxis dataKey="group" stroke="#a1a1aa" fontSize={12} />
              <YAxis stroke="#a1a1aa" fontSize={12} />
              <Tooltip contentStyle={{ background: '#1c1c22', border: '1px solid #2a2a30' }} />
              <Bar dataKey="downtime_hours" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartPanel>

      <ChartPanel title="Backlog aging" query={backlogAging}>
        {(data) => (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.buckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a30" />
              <XAxis dataKey="range" stroke="#a1a1aa" fontSize={12} />
              <YAxis stroke="#a1a1aa" fontSize={12} />
              <Tooltip contentStyle={{ background: '#1c1c22', border: '1px solid #2a2a30' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.buckets.map((bucket) => (
                  <Cell key={bucket.range} fill={AGING_COLORS[bucket.range] ?? '#3b82f6'} />
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
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a30" />
              <XAxis dataKey="equip_type" stroke="#a1a1aa" fontSize={12} />
              <YAxis stroke="#a1a1aa" fontSize={12} />
              <Tooltip contentStyle={{ background: '#1c1c22', border: '1px solid #2a2a30' }} />
              <Bar dataKey="count" fill="#facc15" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartPanel>
    </div>
  );
}
