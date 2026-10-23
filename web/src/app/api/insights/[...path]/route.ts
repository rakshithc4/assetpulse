import { NextRequest, NextResponse } from 'next/server';

// A sleeping free-tier host can take about a minute to answer; don't let one request
// hold a serverless function that long. The request still reaches the host (which is
// what wakes it), and the client retries until it's up.
const UPSTREAM_TIMEOUT_MS = 15_000;

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const url = `${process.env.ANALYTICS_URL}/${params.path.join('/')}${request.nextUrl.search}`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
    if (!res.ok) {
      return NextResponse.json({ status: res.status, code: 'ANALYTICS_ERROR', message: res.statusText }, { status: res.status });
    }
    return NextResponse.json(await res.json());
  } catch (err) {
    const timedOut = err instanceof DOMException && (err.name === 'TimeoutError' || err.name === 'AbortError');
    const status = timedOut ? 504 : 502;
    return NextResponse.json(
      {
        status,
        code: timedOut ? 'ANALYTICS_TIMEOUT' : 'ANALYTICS_UNREACHABLE',
        message: timedOut ? 'Analytics service did not respond in time' : 'Analytics service unreachable',
      },
      { status },
    );
  }
}
