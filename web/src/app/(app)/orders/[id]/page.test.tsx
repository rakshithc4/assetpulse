import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { resetFixtures } from '@/mocks/fixtures';
import OrderDetailPage from './page';

vi.mock('next/navigation', () => ({ useParams: () => ({ id: '1' }) }));
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { role: 'technician', email: 'tech@demo' } } }) }));

beforeEach(() => resetFixtures());

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('OrderDetailPage', () => {
  it('lets the assigned technician complete an IN_PROGRESS order', async () => {
    renderWithClient(<OrderDetailPage />);
    await waitFor(() => expect(screen.getByText('Work order #1')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Complete'));
    fireEvent.change(screen.getByPlaceholderText('Downtime hours'), { target: { value: '3.5' } });
    fireEvent.click(screen.getAllByText('Complete')[1]!);

    await waitFor(() => expect(screen.getByText('COMPLETED')).toBeInTheDocument());
  });
});
