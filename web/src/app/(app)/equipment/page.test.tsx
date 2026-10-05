import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { resetFixtures } from '@/mocks/fixtures';
import EquipmentListPage from './page';

beforeEach(() => resetFixtures());

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('EquipmentListPage', () => {
  it('lists all equipment and filters by search text', async () => {
    renderWithClient(<EquipmentListPage />);
    await waitFor(() => expect(screen.getByText('CRU-104')).toBeInTheDocument());
    expect(screen.getByText('PMP-08')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search tag or name…'), { target: { value: 'crusher' } });

    await waitFor(() => expect(screen.queryByText('PMP-08')).not.toBeInTheDocument());
    expect(screen.getByText('CRU-104')).toBeInTheDocument();
  });
});
