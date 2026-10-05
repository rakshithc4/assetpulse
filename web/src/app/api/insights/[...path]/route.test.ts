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
});
