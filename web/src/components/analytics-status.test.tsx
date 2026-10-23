import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { AnalyticsWaking, FallbackNote } from './analytics-status';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('AnalyticsWaking', () => {
  it('stays quiet for a fast response, then explains the wait if it drags on', () => {
    render(<AnalyticsWaking />);
    expect(screen.queryByText(/Waking analytics service/)).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1_500);
    });

    expect(screen.getByRole('status')).toHaveTextContent('Waking analytics service…');
  });
});

describe('FallbackNote', () => {
  it('tells the viewer the numbers are sample data and will be replaced', () => {
    render(<FallbackNote />);
    expect(screen.getByRole('status')).toHaveTextContent(/sample data/i);
    expect(screen.getByRole('status')).toHaveTextContent(/replace/i);
  });
});
