import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { resetFixtures } from '@/mocks/fixtures';
import InsightsPage from './page';

beforeEach(() => resetFixtures());

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('InsightsPage', () => {
  it('renders all four chart panels once data loads', async () => {
    renderWithClient(<InsightsPage />);
    await waitFor(() => expect(screen.getByText('Downtime by site')).toBeInTheDocument());
    expect(screen.getByText('Downtime by equipment type')).toBeInTheDocument();
    expect(screen.getByText('Backlog aging')).toBeInTheDocument();
    expect(screen.getByText('Requests by equipment type')).toBeInTheDocument();
  });
});
