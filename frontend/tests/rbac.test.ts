import { describe, expect, it } from 'vitest';
import { allowedModules, canAccessPath, homePathFor } from '@/lib/rbac';

describe('rbac helpers', () => {
  it('gives each executive exactly one module and admin all four', () => {
    expect(allowedModules('SALES').map((m) => m.key)).toEqual(['sales']);
    expect(allowedModules('SANCTION').map((m) => m.key)).toEqual(['sanction']);
    expect(allowedModules('DISBURSEMENT').map((m) => m.key)).toEqual(['disbursement']);
    expect(allowedModules('COLLECTION').map((m) => m.key)).toEqual(['collection']);
    expect(allowedModules('ADMIN').map((m) => m.key)).toEqual(['sales', 'sanction', 'disbursement', 'collection']);
    expect(allowedModules('BORROWER')).toEqual([]);
  });

  it('sends each role to its home', () => {
    expect(homePathFor('BORROWER')).toBe('/apply');
    expect(homePathFor('ADMIN')).toBe('/dashboard/sales');
    expect(homePathFor('COLLECTION')).toBe('/dashboard/collection');
  });

  it.each([
    ['BORROWER', '/apply', true],
    ['BORROWER', '/dashboard/sales', false],
    ['SALES', '/dashboard/sales', true],
    ['SALES', '/dashboard/sanction', false],
    ['SANCTION', '/dashboard/sanction/123', true],
    ['SANCTION', '/apply', false],
    ['ADMIN', '/dashboard/collection', true],
    ['ADMIN', '/apply', false],
    ['COLLECTION', '/dashboard', true],
    ['COLLECTION', '/dashboard/salesy', false],
  ] as const)('%s on %s → %s', (role, path, allowed) => {
    expect(canAccessPath(role, path)).toBe(allowed);
  });
});
