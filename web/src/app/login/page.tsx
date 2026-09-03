'use client';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Eye, Radar, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { DemoRole } from '@/lib/auth';
import { LoginHero } from '@/components/ui/login-hero';
import { PersonaCard } from '@/components/ui/persona-card';
import tokens from '../../../../design/tokens.json';

// Icon + tag + accent chosen per role, reusing tokens already in
// design/tokens.json (lifecycle.scheduled / opstatus.maintenance /
// opstatus.operational) rather than inventing new hex — see
// design/README.md for what each token family means.
const PERSONAS: {
  persona: DemoRole;
  tag: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: { fg: string; border: string; bg: string };
}[] = [
  {
    persona: 'engineer',
    tag: 'ENG · 01',
    title: 'Engineer',
    description: 'Reports faults from the field.',
    icon: Radar,
    accent: tokens.lifecycle.scheduled,
  },
  {
    persona: 'supervisor',
    tag: 'SUP · 01',
    title: 'Supervisor',
    description: 'Converts, rejects, schedules, and cancels — sees everything.',
    icon: Eye,
    accent: tokens.opstatus.maintenance,
  },
  {
    persona: 'technician',
    tag: 'TEC · 01',
    title: 'Technician',
    description: 'Starts and completes assigned work orders.',
    icon: Wrench,
    accent: tokens.opstatus.operational,
  },
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
        {PERSONAS.map(({ persona, tag, title, description, icon, accent }) => (
          <PersonaCard
            key={persona}
            tag={tag}
            title={title}
            description={description}
            icon={icon}
            accent={accent}
            pending={pending === persona}
            disabled={pending !== null}
            onSelect={() => handleLogin(persona)}
          />
        ))}
      </div>
    </LoginHero>
  );
}
