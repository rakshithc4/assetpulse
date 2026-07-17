import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { server } from '@/mocks/server';
import { resetFixtures } from '@/mocks/fixtures';
import { useRequest, useRejectRequest } from './use-requests';

beforeEach(() => resetFixtures());

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useRejectRequest', () => {
  it('optimistically sets status then confirms from the server', async () => {
    const { result } = renderHook(() => ({ request: useRequest('1'), reject: useRejectRequest('1') }), { wrapper });

    await waitFor(() => expect(result.current.request.data?.Status).toBe('REPORTED'));
    result.current.reject.mutate({ Note: 'Duplicate report' });

    await waitFor(() => expect(result.current.reject.isSuccess).toBe(true));
    expect(result.current.request.data?.Status).toBe('REJECTED');
  });

  it('rolls back the optimistic update on a 4xx response', async () => {
    server.use(
      http.post(
        '/api/sap/MaintenanceRequest*/com.sap.gateway.srvd.zassetpulse_srv.v0001.RejectRequest',
        () => HttpResponse.json({ status: 400, code: 'FIELD_EMPTY', message: 'Note must not be empty' }, { status: 400 }),
      ),
    );

    const { result } = renderHook(() => ({ request: useRequest('1'), reject: useRejectRequest('1') }), { wrapper });
    await waitFor(() => expect(result.current.request.data?.Status).toBe('REPORTED'));

    result.current.reject.mutate({ Note: '' });

    await waitFor(() => expect(result.current.reject.isError).toBe(true));
    expect(result.current.request.data?.Status).toBe('REPORTED');
  });
});
