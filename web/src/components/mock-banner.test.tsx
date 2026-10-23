import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MockBanner } from './mock-banner';

afterEach(() => vi.unstubAllEnvs());

describe('MockBanner', () => {
  it('says plainly that this is a sample-data demo when mock mode is on', () => {
    vi.stubEnv('NEXT_PUBLIC_MOCK_MODE', '1');
    render(<MockBanner />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Demo mode — sample data. Backend built and tested on SAP BTP ABAP Environment.',
    );
  });

  it('renders nothing when mock mode is off', () => {
    vi.stubEnv('NEXT_PUBLIC_MOCK_MODE', '0');
    const { container } = render(<MockBanner />);
    expect(container).toBeEmptyDOMElement();
  });
});
