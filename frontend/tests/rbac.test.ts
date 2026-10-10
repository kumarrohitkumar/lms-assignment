import { describe, expect, it } from 'vitest';
import { allowedModules, canAccessPath, homePathFor, safeNextPath } from '@/lib/rbac';

describe('rbac helpers', () => {
  it('gives each executive exactly one module and admin all four', () => {
    expect(allowedModules('SALES').map((m) => m.key)).toEqual(['sales']);
    expect(allowedModules('SANCTION').map((m) => m.key)).toEqual(['sanction']);
    expect(allowedModules('DISBURSEMENT').map((m) => m.key)).toEqual(['disbursement']);
    expect(allowedModules('COLLECTION').map((m) => m.key)).toEqual(['collection']);
    expect(allowedModules('ADMIN').map((m) => m.key)).toEqual(['overview', 'sales', 'sanction', 'disbursement', 'collection', 'history']);
    expect(allowedModules('BORROWER')).toEqual([]);
  });

  it('sends each role to its home', () => {
    expect(homePathFor('BORROWER')).toBe('/apply');
    expect(homePathFor('ADMIN')).toBe('/dashboard/overview');
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
    ['ADMIN', '/dashboard/history', true],
    ['ADMIN', '/dashboard/overview', true],
    ['SANCTION', '/dashboard/history', false],
    ['COLLECTION', '/dashboard/overview', false],
  ] as const)('%s on %s → %s', (role, path, allowed) => {
    expect(canAccessPath(role, path)).toBe(allowed);
  });
});

describe('safeNextPath (post-login redirect)', () => {
  it.each([
    ['javascript:alert(document.cookie)'],
    ['JavaScript:fetch("/api")'],
    ['//evil.example'],
    ['/\\evil.example'],
    ['https://evil.example/dashboard/sales'],
    ['dashboard/sales'],
    [''],
  ])('ignores unsafe value %s and falls back to the role home', (next) => {
    expect(safeNextPath('ADMIN', next)).toBe('/dashboard/overview');
  });

  it('ignores a same-origin path the role cannot open', () => {
    expect(safeNextPath('SALES', '/dashboard/sanction')).toBe('/dashboard/sales');
    expect(safeNextPath('BORROWER', '/dashboard/sales')).toBe('/apply');
  });

  it('keeps an allowed in-app path, including its query string', () => {
    expect(safeNextPath('ADMIN', '/dashboard/collection?tab=1')).toBe('/dashboard/collection?tab=1');
    expect(safeNextPath('BORROWER', '/apply')).toBe('/apply');
  });

  it('only allows app pages, not arbitrary same-origin URLs like the API', () => {
    expect(safeNextPath('ADMIN', '/api/auth/logout')).toBe('/dashboard/overview');
  });
});
