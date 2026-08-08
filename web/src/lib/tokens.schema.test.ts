import { describe, it, expect } from 'vitest';
import { tokensSchema } from './tokens.schema';
import fixture from '../../../design/tokens.example.json';

describe('tokensSchema', () => {
  it('accepts the fixture tokens file', () => {
    expect(() => tokensSchema.parse(fixture)).not.toThrow();
  });

  it('rejects a severity ramp missing a step', () => {
    const broken = { ...fixture, severity: { low: fixture.severity.low } };
    expect(() => tokensSchema.parse(broken)).toThrow();
  });
});
