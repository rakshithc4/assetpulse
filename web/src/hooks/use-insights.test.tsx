import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse, delay } from 'msw';
import type { ReactNode } from 'react';
import { server } from '@/mocks/server';
import { FALLBACK_SUMMARY } from '@/lib/insights-fallback';
import { fetchInsight, useKpiSummary } from './use-insights';

const SUMMARY_URL = '/api/insights/kpi/summary';
const passthrough = (d: unknown) => d as { mttr_hours: number };
const fallback = { mttr_hours: -1 };
// Deliberately different from the sample data, so only a genuine live answer can satisfy
// the "live" assertions below (the mock layer's default reply equals the sample data).
const LIVE_MTTR = 12.3;
const serveLive = () =>
  server.use(http.get(SUMMARY_URL, () => HttpResponse.json({ ...FALLBACK_SUMMARY, mttr_hours: LIVE_MTTR })));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('fetchInsight', () => {
  it('returns live data untouched when the service answers', async () => {
    serveLive();
    const result = await fetchInsight(SUMMARY_URL, passthrough, fallback);
    expect(result.fallback).toBe(false);
    expect(result.data.mttr_hours).toBe(LIVE_MTTR);
  });

  it('falls back instead of throwing when the network call fails', async () => {
    server.use(http.get(SUMMARY_URL, () => HttpResponse.error()));
    expect(await fetchInsight(SUMMARY_URL, passthrough, fallback)).toEqual({ data: fallback, fallback: true });
  });

  it('falls back on a non-2xx response (e.g. the proxy reporting a timeout)', async () => {
    server.use(
      http.get(SUMMARY_URL, () => HttpResponse.json({ code: 'ANALYTICS_TIMEOUT' }, { status: 504 })),
    );
    expect(await fetchInsight(SUMMARY_URL, passthrough, fallback)).toEqual({ data: fallback, fallback: true });
  });

  it('falls back when the payload is not the shape we expect', async () => {
    const strict = (d: unknown) => {
      if (typeof (d as { mttr_hours?: unknown }).mttr_hours !== 'number') throw new Error('bad shape');
      return d as { mttr_hours: number };
    };
    server.use(http.get(SUMMARY_URL, () => HttpResponse.json({ oops: true })));
    expect(await fetchInsight(SUMMARY_URL, strict, fallback)).toEqual({ data: fallback, fallback: true });
  });

  it('falls back when the service is slower than the timeout (a cold-starting host)', async () => {
    server.use(
      http.get(SUMMARY_URL, async () => {
        await delay(400);
        return HttpResponse.json({ mttr_hours: 99 });
      }),
    );
    const result = await fetchInsight(SUMMARY_URL, passthrough, fallback, 30);
    expect(result).toEqual({ data: fallback, fallback: true });
  });
});

describe('useKpiSummary', () => {
  it('serves live data and reports isFallback=false when the service answers', async () => {
    serveLive();
    const { result } = renderHook(() => useKpiSummary(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.isFallback).toBe(false);
    expect(result.current.data?.mttr_hours).toBe(LIVE_MTTR);
  });

  it('serves sample data (never an error) and reports isFallback=true when the service is down', async () => {
    server.use(http.get(SUMMARY_URL, () => HttpResponse.error()));
    const { result } = renderHook(() => useKpiSummary(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.isFallback).toBe(true);
    expect(result.current.isError).toBe(false);
    expect(result.current.data).toEqual(FALLBACK_SUMMARY);
  });
});
