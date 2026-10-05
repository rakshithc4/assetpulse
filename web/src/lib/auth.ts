import type { NextAuthOptions } from 'next-auth';
import type { User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { Role } from './types';

const DEMO_PERSONAS = {
  engineer: { email: 'engineer@demo', name: 'Engineer', role: 'engineer' as const },
  supervisor: { email: 'supervisor@demo', name: 'Supervisor', role: 'supervisor' as const },
  technician: { email: 'tech@demo', name: 'Technician', role: 'technician' as const },
} satisfies Record<string, { email: string; name: string; role: Role }>;

export type DemoRole = keyof typeof DEMO_PERSONAS;

// ponytail: demo personas skip real password checks by design — spec §7 calls for
// one-click persona cards, and v1 explicitly excludes real SAP authorization objects (spec §10).
export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    CredentialsProvider({
      name: 'Demo persona',
      credentials: { persona: { label: 'Persona', type: 'text' } },
      async authorize(credentials): Promise<(User & { role: Role }) | null> {
        const persona = credentials?.persona as DemoRole | undefined;
        if (!persona || !(persona in DEMO_PERSONAS)) return null;
        const demo = DEMO_PERSONAS[persona];
        return { id: demo.email, email: demo.email, name: demo.name, role: demo.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = (user as { role: Role }).role;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as { role?: Role }).role = token.role as Role;
      return session;
    },
  },
  pages: { signIn: '/login' },
};
