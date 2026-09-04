'use client';

import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import type { LucideIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import type { MouseEvent } from 'react';

// A one-click persona card, dressed up as an equipment-tag chip — the same
// monospace "CRU-104"-style tag language used on real equipment across the
// app (see design/README.md), so the login screen previews the product's
// own visual identity instead of a generic auth-form look. Tilt + spotlight
// follow the cursor (spring-smoothed, disabled under prefers-reduced-motion);
// every color is one already defined in design/tokens.json — no ad-hoc hex.
// Converts a token hex like "#3b82f6" to "rgba(r,g,b,alpha)" for the
// cursor-following spotlight — the border tone (more saturated than the
// badge bg) read at low alpha so it glows without washing out the text.
function hexToRgba(hex: string, alpha: number) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export function PersonaCard({
  tag,
  title,
  description,
  icon: Icon,
  accent,
  pending,
  disabled,
  onSelect,
}: {
  tag: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: { fg: string; border: string; bg: string };
  pending: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const springX = useSpring(x, { stiffness: 200, damping: 20 });
  const springY = useSpring(y, { stiffness: 200, damping: 20 });
  const percentX = useTransform(springX, (v) => `${v * 100}%`);
  const percentY = useTransform(springY, (v) => `${v * 100}%`);
  const glow = hexToRgba(accent.border, 0.16);
  const spotlight = useMotionTemplate`radial-gradient(220px circle at ${percentX} ${percentY}, ${glow} 0%, transparent 70%)`;

  function handleMouseMove(e: MouseEvent<HTMLButtonElement>) {
    if (reduceMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width);
    y.set((e.clientY - rect.top) / rect.height);
  }

  function handleMouseLeave() {
    x.set(0.5);
    y.set(0.5);
  }

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      disabled={disabled}
      whileHover={reduceMotion ? undefined : { y: -4 }}
      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
      style={{ borderColor: accent.border, backgroundImage: spotlight }}
      className="group relative w-64 overflow-hidden rounded-md border bg-surface-panel/80 p-5 text-left backdrop-blur-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content-primary disabled:opacity-50"
    >
      <div className="relative flex items-start justify-between">
        <span
          className="flex size-9 items-center justify-center rounded-md border"
          style={{ borderColor: accent.border, backgroundColor: accent.bg, color: accent.fg }}
        >
          <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <span
          className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-70"
          style={{ color: accent.fg }}
        >
          {tag}
        </span>
      </div>
      <div className="relative mt-4 font-medium text-content-primary">{title}</div>
      <p className="relative mt-1 text-sm text-content-secondary">{description}</p>
      {pending && (
        <p className="relative mt-3 flex items-center gap-1.5 text-xs text-content-secondary">
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          Signing in…
        </p>
      )}
    </motion.button>
  );
}
