import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const url = `${process.env.ANALYTICS_URL}/${params.path.join('/')}${request.nextUrl.search}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    return NextResponse.json({ status: res.status, code: 'ANALYTICS_ERROR', message: res.statusText }, { status: res.status });
  }
  return NextResponse.json(await res.json());
}
