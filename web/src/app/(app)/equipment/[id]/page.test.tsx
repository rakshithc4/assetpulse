import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { resetFixtures } from '@/mocks/fixtures';
import EquipmentDetailPage from './page';

vi.mock('next/navigation', () => ({ useParams: () => ({ id: '3' }) }));
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { role: 'engineer' } } }) }));

beforeEach(() => resetFixtures());

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('EquipmentDetailPage', () => {
  it('shows the header card, history, and a Report fault CTA for an engineer', async () => {
    renderWithClient(<EquipmentDetailPage />);
    await waitFor(() => expect(screen.getByText('PMP-08')).toBeInTheDocument());
    expect(await screen.findByText('Pump seal leaking')).toBeInTheDocument();
    expect(screen.getByText('Report fault')).toBeInTheDocument();
  });
});
