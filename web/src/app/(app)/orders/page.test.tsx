import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { resetFixtures } from '@/mocks/fixtures';
import OrdersListPage from './page';

vi.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { role: 'technician', email: 'tech@demo' } } }) }));
beforeEach(() => resetFixtures());

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('OrdersListPage', () => {
  it('defaults a technician to their own assigned orders', async () => {
    renderWithClient(<OrdersListPage />);
    await waitFor(() => expect(screen.getByText('#1')).toBeInTheDocument());
    expect(screen.getByText('Show all orders')).toBeInTheDocument();
  });
});
