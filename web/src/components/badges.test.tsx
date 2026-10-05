import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SeverityBadge, OpStatusBadge, LifecycleBadge } from './badges';

describe('SeverityBadge', () => {
  it('renders the label and critical pulse class for CRITICAL', () => {
    render(<SeverityBadge severity="CRITICAL" />);
    const badge = screen.getByText('Critical');
    expect(badge.className).toContain('bg-severity-critical-bg');
    expect(badge.className).toContain('animate-pulse');
  });

  it('does not pulse for LOW', () => {
    render(<SeverityBadge severity="LOW" />);
    expect(screen.getByText('Low').className).not.toContain('animate-pulse');
  });
});

describe('OpStatusBadge', () => {
  it('renders DOWN with the alarm classes', () => {
    render(<OpStatusBadge status="DOWN" />);
    expect(screen.getByText('Down').className).toContain('bg-opstatus-down-bg');
  });
});

describe('LifecycleBadge', () => {
  it('renders IN_PROGRESS with its lifecycle classes', () => {
    render(<LifecycleBadge status="IN_PROGRESS" />);
    expect(screen.getByText('In progress').className).toContain('bg-lifecycle-in_progress-bg');
  });
});
