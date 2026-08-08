'use client';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { DemoRole } from '@/lib/auth';

const PERSONAS: { persona: DemoRole; title: string; description: string }[] = [
  { persona: 'engineer', title: 'Engineer', description: 'Reports faults from the field.' },
  { persona: 'supervisor', title: 'Supervisor', description: 'Converts, rejects, schedules, and cancels — sees everything.' },
  { persona: 'technician', title: 'Technician', description: 'Starts and completes assigned work orders.' },
];

export default function LoginPage() {
  const router = useRouter();
  const [pending, setPending] = useState<DemoRole | null>(null);

  async function handleLogin(persona: DemoRole) {
    setPending(persona);
    const result = await signIn('credentials', { persona, redirect: false });
    setPending(null);
    if (result?.ok) router.push('/');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-content-primary">AssetPulse</h1>
        <p className="mt-1 text-sm text-content-secondary">Asset maintenance control room</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {PERSONAS.map(({ persona, title, description }) => (
          <button
            key={persona}
            type="button"
            onClick={() => handleLogin(persona)}
            disabled={pending !== null}
            className="w-64 rounded-lg border border-surface-raised bg-surface-panel p-5 text-left transition-colors hover:border-content-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content-primary disabled:opacity-50"
          >
            <div className="font-medium text-content-primary">{title}</div>
            <p className="mt-1 text-sm text-content-secondary">{description}</p>
            {pending === persona && <p className="mt-2 text-xs text-content-secondary">Signing in…</p>}
          </button>
        ))}
      </div>
    </main>
  );
}
