'use client';

import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import type { MouseEvent, ReactNode } from 'react';
import { cn, hexToRgba } from '@/lib/utils';

/**
 * Cursor-tracked spotlight glow + subtle lift, generalized from the login
 * screen's persona cards (web/src/components/ui/persona-card.tsx) so the
 * rest of the app can share the same premium hover treatment without
 * duplicating the motion-value wiring. Purely presentational — wraps
 * whatever's passed as children (a Link, a div, plain content); never
 * touches data fetching or business logic.
 *
 * Also carries `layout` plus a default fade/slide enter-exit — every list
 * that maps this component gets smooth reflow on filter/sort/add/remove for
 * free, as long as the caller wraps its `.map()` in <AnimatePresence>.
 */
export function SpotlightCard({
  accent,
  className,
  children,
  as = 'div',
}: {
  /** Border/glow hex — same token values already used for badges (severity/opstatus/lifecycle). */
  accent: string;
  className?: string;
  children: ReactNode;
  /** HTML tag to render as — 'li' when this card is a <ul>/<ol> item, so no <div> ends up as a direct child of the list. */
  as?: 'div' | 'li';
}) {
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const springX = useSpring(x, { stiffness: 200, damping: 20 });
  const springY = useSpring(y, { stiffness: 200, damping: 20 });
  const percentX = useTransform(springX, (v) => `${v * 100}%`);
  const percentY = useTransform(springY, (v) => `${v * 100}%`);
  const glow = hexToRgba(accent, 0.14);
  const spotlight = useMotionTemplate`radial-gradient(200px circle at ${percentX} ${percentY}, ${glow} 0%, transparent 70%)`;

  function handleMouseMove(e: MouseEvent<HTMLDivElement | HTMLLIElement>) {
    if (reduceMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width);
    y.set((e.clientY - rect.top) / rect.height);
  }

  function handleMouseLeave() {
    x.set(0.5);
    y.set(0.5);
  }

  const MotionTag = as === 'li' ? motion.li : motion.div;

  return (
    <MotionTag
      layout={!reduceMotion}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={reduceMotion ? undefined : { y: -2 }}
      style={{ backgroundImage: spotlight }}
      className={cn('relative overflow-hidden transition-colors', className)}
    >
      {children}
    </MotionTag>
  );
}
