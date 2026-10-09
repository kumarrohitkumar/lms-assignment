import type { Role } from './types';

export interface DashboardModule {
  key: 'sales' | 'sanction' | 'disbursement' | 'collection';
  label: string;
  href: string;
  description: string;
  roles: Role[];
}

/** Must match MODULE_ROLES in the backend; the API enforces the same rules with 403s. */
export const MODULES: DashboardModule[] = [
  { key: 'sales', label: 'Sales', href: '/dashboard/sales', description: 'Registered users who have not applied yet', roles: ['SALES', 'ADMIN'] },
  { key: 'sanction', label: 'Sanction', href: '/dashboard/sanction', description: 'Applications waiting for a decision', roles: ['SANCTION', 'ADMIN'] },
  { key: 'disbursement', label: 'Disbursement', href: '/dashboard/disbursement', description: 'Sanctioned loans ready to pay out', roles: ['DISBURSEMENT', 'ADMIN'] },
  { key: 'collection', label: 'Collection', href: '/dashboard/collection', description: 'Active loans and repayments', roles: ['COLLECTION', 'ADMIN'] },
];

export const allowedModules = (role: Role) => MODULES.filter((m) => m.roles.includes(role));

export function homePathFor(role: Role): string {
  if (role === 'BORROWER') return '/apply';
  return allowedModules(role)[0]?.href ?? '/login';
}

const isUnder = (path: string, base: string) => path === base || path.startsWith(`${base}/`);

export function canAccessPath(role: Role, path: string): boolean {
  if (isUnder(path, '/apply')) return role === 'BORROWER';
  if (path === '/dashboard') return allowedModules(role).length > 0;
  if (isUnder(path, '/dashboard')) return allowedModules(role).some((m) => isUnder(path, m.href));
  return true;
}
