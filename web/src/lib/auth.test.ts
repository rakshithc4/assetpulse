import { describe, it, expect } from 'vitest';
import { authOptions } from './auth';

type Authorize = (credentials: Record<string, string> | undefined) => Promise<{ role: string } | null>;

describe('demo persona credentials provider', () => {
  // CredentialsProvider stores the user-defined authorize callback in options
  const provider = authOptions.providers[0] as unknown as { options: { authorize: Authorize } };

  it.each([
    ['engineer', 'engineer'],
    ['supervisor', 'supervisor'],
    ['technician', 'technician'],
  ])('authorizes persona "%s" with role "%s"', async (persona, expectedRole) => {
    const user = await provider.options.authorize({ persona });
    expect(user?.role).toBe(expectedRole);
  });

  it('rejects an unknown persona', async () => {
    const user = await provider.options.authorize({ persona: 'admin' });
    expect(user).toBeNull();
  });

  it('rejects missing credentials', async () => {
    const user = await provider.options.authorize(undefined);
    expect(user).toBeNull();
  });
});
