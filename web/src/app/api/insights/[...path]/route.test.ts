import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

beforeEach(() => {
  process.env.ANALYTICS_URL = 'https://analytics.example.com';
  vi.restoreAllMocks();
});

describe('GET /api/insights/[...path]', () => {
  it('forwards to the analytics service and returns JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ mttr_hours: 6.4 }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const request = new NextRequest('http://localhost/api/insights/kpi/summary');
    const response = await GET(request, { params: { path: ['kpi', 'summary'] } });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ mttr_hours: 6.4 });
    expect(fetchMock).toHaveBeenCalledWith('https://analytics.example.com/kpi/summary', expect.anything());
  });

  it('normalizes a failure response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 503, statusText: 'Service Unavailable' }));
    vi.stubGlobal('fetch', fetchMock);

    const request = new NextRequest('http://localhost/api/insights/kpi/summary');
    const response = await GET(request, { params: { path: ['kpi', 'summary'] } });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: 503, code: 'ANALYTICS_ERROR', message: 'Service Unavailable' });
  });

  it('answers with a clean 504 JSON body (not an HTML 500) when the host is too slow to wake', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('timed out', 'TimeoutError')));

    const request = new NextRequest('http://localhost/api/insights/kpi/summary');
    const response = await GET(request, { params: { path: ['kpi', 'summary'] } });

    expect(response.status).toBe(504);
    expect(await response.json()).toEqual({
      status: 504,
      code: 'ANALYTICS_TIMEOUT',
      message: 'Analytics service did not respond in time',
    });
  });

  it('answers with a clean 502 JSON body when the host is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));

    const request = new NextRequest('http://localhost/api/insights/kpi/summary');
    const response = await GET(request, { params: { path: ['kpi', 'summary'] } });

    expect(response.status).toBe(502);
    expect((await response.json()).code).toBe('ANALYTICS_UNREACHABLE');
  });

  it('gives the upstream call a deadline so a sleeping host cannot hang the function', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await GET(new NextRequest('http://localhost/api/insights/kpi/summary'), { params: { path: ['kpi', 'summary'] } });

    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });
});
