import { describe, expect, it } from 'vitest';
import { hasAtMostTwoDecimals, toPaise, toRupees } from '../../src/lib/money';

describe('money helpers', () => {
  it('converts rupees to integer paise without float drift', () => {
    expect(toPaise(0.1 + 0.2)).toBe(30);
    expect(toPaise(493.15)).toBe(49315);
    expect(toPaise(500000)).toBe(50000000);
  });

  it('converts paise back to rupees', () => {
    expect(toRupees(49315)).toBe(493.15);
    expect(toRupees(5000000)).toBe(50000);
  });

  it('detects amounts with more than two decimals', () => {
    expect(hasAtMostTwoDecimals(10)).toBe(true);
    expect(hasAtMostTwoDecimals(10.5)).toBe(true);
    expect(hasAtMostTwoDecimals(10.25)).toBe(true);
    expect(hasAtMostTwoDecimals(10.255)).toBe(false);
  });
});
