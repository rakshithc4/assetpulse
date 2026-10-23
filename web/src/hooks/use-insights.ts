import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from '@/lib/api';
import {
  FALLBACK_BACKLOG,
  FALLBACK_FREQUENCY,
  FALLBACK_SUMMARY,
  fallbackDowntime,
} from '@/lib/insights-fallback';

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

// The analytics service runs on a free host that sleeps when idle and takes about
// a minute to wake. Past this deadline we stop waiting and show sample data instead
// of a blank or failed panel; the request still reaches the host, which is what
// wakes it, and the background retry below swaps live figures in once it's up.
export const INSIGHTS_TIMEOUT_MS = 10_000;
const FALLBACK_RETRY_MS = 15_000;

export interface Insight<T> {
  data: T;
  /** true when `data` is the built-in sample data, not a live answer. */
  fallback: boolean;
}

// A timer race rather than an AbortSignal: the abandoned request is deliberately left
// running. Reaching the sleeping host is what wakes it, so cancelling would only hurt.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no answer within ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** Never throws: any failure (timeout, network, non-2xx, unexpected shape) yields the fallback. */
export async function fetchInsight<T>(
  path: string,
  parse: (raw: unknown) => T,
  fallback: T,
  timeoutMs: number = INSIGHTS_TIMEOUT_MS,
): Promise<Insight<T>> {
  try {
    const raw = await withTimeout(apiFetch<unknown>(path), timeoutMs);
    return { data: parse(raw), fallback: false };
  } catch {
    return { data: fallback, fallback: true };
  }
}

function useInsight<T>(queryKey: readonly unknown[], path: string, parse: (raw: unknown) => T, fallback: T, refetchMs?: number) {
  const query = useQuery({
    queryKey,
    queryFn: () => fetchInsight(path, parse, fallback),
    // While showing sample data, keep retrying so live figures replace it as soon as the host is awake.
    refetchInterval: (q) => (q.state.data?.fallback ? FALLBACK_RETRY_MS : (refetchMs ?? false)),
  });
  return { ...query, data: query.data?.data, isFallback: query.data?.fallback ?? false };
}

export function useKpiSummary() {
  return useInsight(['insights', 'summary'], '/api/insights/kpi/summary', (d) => summarySchema.parse(d), FALLBACK_SUMMARY, 30_000);
}

export function useKpiDowntime(by: 'site' | 'type') {
  return useInsight(['insights', 'downtime', by], `/api/insights/kpi/downtime?by=${by}`, (d) => downtimeSchema.parse(d), fallbackDowntime(by));
}

export function useKpiBacklogAging() {
  return useInsight(['insights', 'backlog-aging'], '/api/insights/kpi/backlog-aging', (d) => backlogSchema.parse(d), FALLBACK_BACKLOG);
}

export function useKpiFrequency() {
  return useInsight(['insights', 'frequency'], '/api/insights/kpi/frequency', (d) => frequencySchema.parse(d), FALLBACK_FREQUENCY);
}
