import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from '@/lib/api';

const summarySchema = z.object({
  mttr_hours: z.number(),
  open_requests_by_severity: z.record(z.number()),
  open_orders: z.number(),
  equipment_availability_pct: z.number(),
  total_downtime_hours_30d: z.number(),
});
const downtimeSchema = z.object({ by: z.string(), data: z.array(z.object({ group: z.string(), downtime_hours: z.number() })) });
const backlogSchema = z.object({ buckets: z.array(z.object({ range: z.string(), count: z.number() })) });
const frequencySchema = z.object({ data: z.array(z.object({ equip_type: z.string(), count: z.number() })) });

export function useKpiSummary() {
  return useQuery({
    queryKey: ['insights', 'summary'],
    queryFn: () => apiFetch<unknown>('/api/insights/kpi/summary').then((d) => summarySchema.parse(d)),
    refetchInterval: 30_000,
  });
}

export function useKpiDowntime(by: 'site' | 'type') {
  return useQuery({
    queryKey: ['insights', 'downtime', by],
    queryFn: () => apiFetch<unknown>(`/api/insights/kpi/downtime?by=${by}`).then((d) => downtimeSchema.parse(d)),
  });
}

export function useKpiBacklogAging() {
  return useQuery({
    queryKey: ['insights', 'backlog-aging'],
    queryFn: () => apiFetch<unknown>('/api/insights/kpi/backlog-aging').then((d) => backlogSchema.parse(d)),
  });
}

export function useKpiFrequency() {
  return useQuery({
    queryKey: ['insights', 'frequency'],
    queryFn: () => apiFetch<unknown>('/api/insights/kpi/frequency').then((d) => frequencySchema.parse(d)),
  });
}
