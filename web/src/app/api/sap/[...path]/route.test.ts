import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';

beforeEach(() => {
  process.env.SAP_BASE_URL = 'https://sap.example.com';
  process.env.SAP_SERVICE_PATH = '/odata/v4/zassetpulse';
  process.env.SAP_USER = 'demo';
  process.env.SAP_PASS = 'secret';
  vi.restoreAllMocks();
});

describe('GET /api/sap/[...path]', () => {
  it('forwards the request with basic auth and returns JSON', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ value: [{ EquipId: '1' }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const request = new NextRequest('http://localhost/api/sap/Equipment?$top=1');
    const response = await GET(request, { params: { path: ['Equipment'] } });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.value).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://sap.example.com/odata/v4/zassetpulse/Equipment?$top=1',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: expect.stringContaining('Basic ') }) }),
    );
  });

  it('normalizes an OData error response', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ error: { code: 'BAD_REQUEST', message: { value: 'Nope' } } }), { status: 400 }));
    vi.stubGlobal('fetch', fetchMock);

    const request = new NextRequest('http://localhost/api/sap/Equipment');
    const response = await GET(request, { params: { path: ['Equipment'] } });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ status: 400, code: 'BAD_REQUEST', message: 'Nope' });
  });
});

describe('POST /api/sap/[...path]', () => {
  it('fetches a CSRF token before writing and replays it with the cookie', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 200, headers: { 'x-csrf-token': 'tok123', 'set-cookie': 'sap-session=abc' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ Status: 'REJECTED' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const request = new NextRequest("http://localhost/api/sap/MaintenanceRequest('1')/RejectRequest", {
      method: 'POST',
      body: JSON.stringify({ Note: 'Duplicate' }),
    });
    const response = await POST(request, { params: { path: ["MaintenanceRequest('1')", 'RejectRequest'] } });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const writeCallHeaders = fetchMock.mock.calls[1][1].headers as Record<string, string>;
    expect(writeCallHeaders['x-csrf-token']).toBe('tok123');
    expect(writeCallHeaders.Cookie).toBe('sap-session=abc');
  });
});
