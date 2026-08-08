import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { resetFixtures } from '@/mocks/fixtures';
import NewRequestPage from './page';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }), useSearchParams: () => new URLSearchParams() }));

beforeEach(() => {
  resetFixtures();
  pushMock.mockReset();
});

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('NewRequestPage', () => {
  it('submits a valid request and navigates to the list', async () => {
    renderWithClient(<NewRequestPage />);
    await waitFor(() => expect(screen.getByText('CRU-104 — Primary crusher — Line 1')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Equipment'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Loud grinding noise' } });
    fireEvent.click(screen.getByText('Submit request'));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/requests'));
  });

  it('shows a validation error when title is empty', async () => {
    renderWithClient(<NewRequestPage />);
    await waitFor(() => expect(screen.getByText('CRU-104 — Primary crusher — Line 1')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Equipment'), { target: { value: '1' } });
    fireEvent.click(screen.getByText('Submit request'));

    expect(await screen.findByText('Title is required')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
