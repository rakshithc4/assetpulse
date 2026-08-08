import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { resetFixtures } from '@/mocks/fixtures';
import RequestsListPage from './page';

vi.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { role: 'engineer' } } }) }));
beforeEach(() => resetFixtures());

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('RequestsListPage', () => {
  it('lists requests with severity badges and a Report fault CTA for an engineer', async () => {
    renderWithClient(<RequestsListPage />);
    await waitFor(() => expect(screen.getByText('Pump seal leaking')).toBeInTheDocument());
    expect(screen.getByText('Report fault')).toBeInTheDocument();
  });
});
