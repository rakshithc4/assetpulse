'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { BlackHole } from '@/components/ui/black-hole';

// Signature hero treatment: a ray-marched black hole, centered and sized to
// sit directly behind the icon/title/subtitle block, with a big letter-in
// title on top. Recolored to the app's amber identity in black-hole.tsx.
// Real page content (the persona cards) composes below via `children`,
// clear of the disc — this component only owns the mark behind the title.
export function LoginHero({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children?: ReactNode;
}) {
  const words = title.split(' ');
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center px-4">
      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center text-center">
        <div className="relative flex flex-col items-center">
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 sm:h-[680px] sm:w-[680px]"
            aria-hidden="true"
          >
            <BlackHole
              focus={[0.5, 0.5]}
              scrim="none"
              roll={0}
              elevation={-8}
              distance={22}
              fov={46}
              diskDensity={1.1}
              glow={1.15}
              exposure={0.95}
              vignette={0.15}
              hotColor="#fdf1d8"
              midColor="#d97706"
              coolColor="#3a2412"
              steps={260}
              resolution={0.65}
              maxDpr={1.5}
            />
          </div>

          {icon && (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="mb-4"
            >
              {icon}
            </motion.div>
          )}
          <motion.h1
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="mb-2 text-5xl font-bold tracking-tighter text-content-primary sm:text-6xl"
          >
            {words.map((word, wordIndex) => (
              <span key={wordIndex} className="mr-3 inline-block last:mr-0">
                {word.split('').map((letter, letterIndex) => (
                  <motion.span
                    key={`${wordIndex}-${letterIndex}`}
                    initial={reduceMotion ? false : { y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                      delay: reduceMotion ? 0 : wordIndex * 0.1 + letterIndex * 0.03,
                      type: 'spring',
                      stiffness: 150,
                      damping: 25,
                    }}
                    className="inline-block bg-gradient-to-b from-content-primary to-content-primary/70 bg-clip-text text-transparent"
                  >
                    {letter}
                  </motion.span>
                ))}
              </span>
            ))}
          </motion.h1>

          {subtitle && (
            <motion.p
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-sm text-content-secondary"
            >
              {subtitle}
            </motion.p>
          )}
        </div>

        {children && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mt-8 w-full"
          >
            {children}
          </motion.div>
        )}
      </div>
    </div>
  );
}
