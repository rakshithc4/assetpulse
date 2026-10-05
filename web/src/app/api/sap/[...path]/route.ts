import { NextRequest, NextResponse } from 'next/server';

function targetUrl(pathSegments: string[], search: string): string {
  const base = `${process.env.SAP_BASE_URL}${process.env.SAP_SERVICE_PATH}`;
  return `${base}/${pathSegments.join('/')}${search}`;
}

function authHeader(): string {
  return `Basic ${Buffer.from(`${process.env.SAP_USER}:${process.env.SAP_PASS}`).toString('base64')}`;
}

async function normalizeError(res: Response) {
  let message = res.statusText;
  let code = 'UNKNOWN';
  try {
    const body = await res.json();
    const error = body.error ?? body;
    message = error.message?.value ?? error.message ?? message;
    code = error.code ?? code;
  } catch {
    // body wasn't JSON — keep statusText
  }
  return { status: res.status, code, message };
}

async function fetchCsrfToken(baseUrl: string): Promise<{ token: string; cookie: string }> {
  const res = await fetch(baseUrl, { headers: { Authorization: authHeader(), 'x-csrf-token': 'fetch' } });
  return { token: res.headers.get('x-csrf-token') ?? '', cookie: res.headers.get('set-cookie') ?? '' };
}

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const url = targetUrl(params.path, request.nextUrl.search);
  const res = await fetch(url, { headers: { Authorization: authHeader(), Accept: 'application/json' } });
  if (!res.ok) return NextResponse.json(await normalizeError(res), { status: res.status });
  return NextResponse.json(await res.json());
}

async function write(request: NextRequest, params: { path: string[] }, method: 'POST' | 'PATCH') {
  const base = `${process.env.SAP_BASE_URL}${process.env.SAP_SERVICE_PATH}`;
  const { token, cookie } = await fetchCsrfToken(base);
  const url = targetUrl(params.path, request.nextUrl.search);
  const body = await request.text();
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: authHeader(),
      'x-csrf-token': token,
      Cookie: cookie,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body || undefined,
  });
  if (!res.ok) return NextResponse.json(await normalizeError(res), { status: res.status });
  const text = await res.text();
  return NextResponse.json(text ? JSON.parse(text) : {});
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  return write(request, params, 'POST');
}

export async function PATCH(request: NextRequest, { params }: { params: { path: string[] } }) {
  return write(request, params, 'PATCH');
}
