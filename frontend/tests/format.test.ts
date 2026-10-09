import { describe, expect, it } from 'vitest';
import { formatINR } from '@/lib/format';

describe('formatINR', () => {
  it('uses Indian digit grouping and paise when needed', () => {
    expect(formatINR(500000)).toBe('₹5,00,000');
    expect(formatINR(50493.15)).toBe('₹50,493.15');
    expect(formatINR(1000.5)).toBe('₹1,000.50');
  });
});
