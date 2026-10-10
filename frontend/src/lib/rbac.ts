import type { Role } from './types';

export interface DashboardModule {
  key: 'overview' | 'sales' | 'sanction' | 'disbursement' | 'collection' | 'history';
  label: string;
  href: string;
  description: string;
  roles: Role[];
}

/**
 * Must match the backend's role checks; the API enforces the same rules with 403s. Executives see only
 * their own stage. Overview and History span every stage, so they are admin-only.
 */
export const MODULES: DashboardModule[] = [
  { key: 'overview', label: 'Overview', href: '/dashboard/overview', description: 'The whole loan book at a glance', roles: ['ADMIN'] },
  { key: 'sales', label: 'Sales', href: '/dashboard/sales', description: 'Registered users who have not applied yet', roles: ['SALES', 'ADMIN'] },
  { key: 'sanction', label: 'Sanction', href: '/dashboard/sanction', description: 'Applications waiting for a decision', roles: ['SANCTION', 'ADMIN'] },
  { key: 'disbursement', label: 'Disbursement', href: '/dashboard/disbursement', description: 'Sanctioned loans ready to pay out', roles: ['DISBURSEMENT', 'ADMIN'] },
  { key: 'collection', label: 'Collection', href: '/dashboard/collection', description: 'Active loans and repayments', roles: ['COLLECTION', 'ADMIN'] },
  { key: 'history', label: 'History', href: '/dashboard/history', description: 'Every loan, every decision and who made it', roles: ['ADMIN'] },
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

const APP_AREAS = ['/apply', '/dashboard'];

/**
 * Where to send a user after login when the URL carries `?next=`. Only same-origin app pages the role may
 * open are honoured; anything else (javascript:, //host, absolute URLs, API routes) falls back to the role's
 * home, which closes the open-redirect / script-injection hole.
 */
export function safeNextPath(role: Role, next: string | null | undefined): string {
  const home = homePathFor(role);
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return home;

  const base = 'http://app.invalid';
  let url: URL;
  try {
    url = new URL(next, base);
  } catch {
    return home;
  }
  if (url.origin !== base) return home;
  if (!APP_AREAS.some((area) => isUnder(url.pathname, area))) return home;
  if (!canAccessPath(role, url.pathname)) return home;
  return url.pathname + url.search;
}
