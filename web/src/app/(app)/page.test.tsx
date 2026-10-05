import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { resetFixtures } from '@/mocks/fixtures';
import DashboardPage from './page';

beforeEach(() => resetFixtures());

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('DashboardPage', () => {
  it('shows KPI numbers, equipment tags, and the critical alert', async () => {
    renderWithClient(<DashboardPage />);

    await waitFor(() => expect(screen.getByText('6.4')).toBeInTheDocument());
    expect(await screen.findByText('CRU-104')).toBeInTheDocument();
    expect(await screen.findByText('Pump seal leaking')).toBeInTheDocument();
  });
});
