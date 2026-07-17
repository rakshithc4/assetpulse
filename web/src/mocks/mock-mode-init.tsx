'use client';
import { useEffect } from 'react';

export function MockModeInit() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_MOCK_MODE === '1') {
      void import('./browser').then(({ worker }) => worker.start({ onUnhandledRequest: 'bypass' }));
    }
  }, []);
  return null;
}
