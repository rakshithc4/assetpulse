import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from './page';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));

const signInMock = vi.fn();
vi.mock('next-auth/react', () => ({ signIn: (...args: unknown[]) => signInMock(...args) }));

beforeEach(() => {
  pushMock.mockReset();
  signInMock.mockReset();
});

describe('LoginPage', () => {
  it('signs in as supervisor and navigates home', async () => {
    signInMock.mockResolvedValue({ ok: true });
    render(<LoginPage />);

    fireEvent.click(screen.getByText('Supervisor'));

    await waitFor(() => expect(signInMock).toHaveBeenCalledWith('credentials', { persona: 'supervisor', redirect: false }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/'));
  });
});
