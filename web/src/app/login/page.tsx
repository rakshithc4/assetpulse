'use client';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { DemoRole } from '@/lib/auth';
import { LoginHero } from '@/components/ui/login-hero';

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
    <LoginHero title="AssetPulse" subtitle="Asset maintenance control room">
      <div className="grid justify-center gap-4 sm:grid-cols-3">
        {PERSONAS.map(({ persona, title, description }) => (
          <button
            key={persona}
            type="button"
            onClick={() => handleLogin(persona)}
            disabled={pending !== null}
            className="w-64 rounded-md border border-surface-raised bg-surface-panel/80 p-5 text-left backdrop-blur-sm transition-colors hover:border-content-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content-primary disabled:opacity-50"
          >
            <div className="font-medium text-content-primary">{title}</div>
            <p className="mt-1 text-sm text-content-secondary">{description}</p>
            {pending === persona && <p className="mt-2 text-xs text-content-secondary">Signing in…</p>}
          </button>
        ))}
      </div>
    </LoginHero>
  );
}
