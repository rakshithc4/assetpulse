'use client';
import { useEffect, useState } from 'react';

/**
 * Shown under a skeleton while the analytics service answers. Stays silent for the
 * first moment so a fast response never flashes text, then explains the wait: the
 * free-tier host sleeps when idle and can take about a minute to wake.
 */
export function AnalyticsWaking({ delayMs = 1_500 }: { delayMs?: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  return (
    // Fixed height so the text appearing doesn't shift the layout.
    <div className="h-5">
      {show && (
        <p role="status" aria-live="polite" className="text-xs text-content-secondary">
          Waking analytics service… free-tier hosting can take up to a minute.
        </p>
      )}
    </div>
  );
}

/** Shown while sample data stands in for the analytics service. */
export function FallbackNote() {
  return (
    <p role="status" className="text-xs text-content-secondary">
      Showing sample data while the analytics service wakes up. Live figures will replace it automatically.
    </p>
  );
}
