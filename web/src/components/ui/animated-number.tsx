'use client';

import { animate, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

/**
 * Counts up to `value` on mount/change instead of snapping straight to the
 * final number — the KPI-strip equivalent of Skiper's animated-counter
 * pattern. Settles on the exact same toFixed(decimals) string a plain
 * render would show, so nothing downstream (tests included) needs to know
 * the number arrived by animation.
 */
export function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(reduceMotion ? value : 0);
  const from = useRef(0);

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(value);
      return;
    }
    const controls = animate(from.current, value, {
      duration: 0.5,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(v),
      onComplete: () => {
        from.current = value;
      },
    });
    return () => controls.stop();
  }, [value, reduceMotion]);

  return <>{display.toFixed(decimals)}</>;
}
