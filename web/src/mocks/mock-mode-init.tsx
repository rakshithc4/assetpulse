'use client';
import { useEffect } from 'react';

// Module-level (not React state) so it survives React 18 Strict Mode's dev-only
// double-invoke of effects (mount -> cleanup -> mount again). Without this guard,
// worker.start() — a singleton side effect with no matching cleanup — gets called
// twice and MSW throws "cannot configure an already enabled network".
let mockWorkerStarted = false;

export function MockModeInit() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_MOCK_MODE === '1' && !mockWorkerStarted) {
      mockWorkerStarted = true;
      void import('./browser').then(({ worker }) => worker.start({ onUnhandledRequest: 'bypass' }));
    }
  }, []);
  return null;
}
