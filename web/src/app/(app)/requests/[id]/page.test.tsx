import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { resetFixtures } from '@/mocks/fixtures';
import RequestDetailPage from './page';

vi.mock('next/navigation', () => ({ useParams: () => ({ id: '1' }) }));
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { role: 'supervisor' } } }) }));

beforeEach(() => resetFixtures());

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('RequestDetailPage', () => {
  it('lets a supervisor reject a REPORTED request with a required note', async () => {
    renderWithClient(<RequestDetailPage />);
    await waitFor(() => expect(screen.getByText('Pump seal leaking')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Reject'));
    fireEvent.click(screen.getAllByText('Reject')[1]!); // confirm button inside dialog, note still empty

    expect(await screen.findByText('A reason is required')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Reason for rejection'), { target: { value: 'Duplicate report' } });
    fireEvent.click(screen.getAllByText('Reject')[1]!);

    await waitFor(() => expect(screen.getByText('Rejected: Duplicate report')).toBeInTheDocument());
  });
});
