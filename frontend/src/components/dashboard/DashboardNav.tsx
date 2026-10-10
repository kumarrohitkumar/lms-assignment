'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { allowedModules } from '@/lib/rbac';
import { useSession } from '../SessionProvider';
import { cx } from '../ui';

const ICONS: Record<string, string> = {
  overview: 'M3 11l7-7 7 7M5 9v8h10V9',
  sales: 'M10 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4 17a6 6 0 0 1 12 0',
  sanction: 'M4 10l4 4 8-8',
  disbursement: 'M3 6h14v9H3zM3 9h14M6 13h3',
  collection: 'M10 3v14M14 6.5C14 5 12.2 4 10 4S6 5 6 6.5 7.8 9 10 9.5s4 1.5 4 3S12.2 16 10 16s-4-1-4-2.5',
  history: 'M10 5v5l3 2M3.5 10a6.5 6.5 0 1 0 2-4.7M3 3v3.5h3.5',
};

/** Only the modules the user's role may open are rendered; the API enforces the same rule. */
export function DashboardNav() {
  const { user } = useSession();
  const pathname = usePathname();
  if (!user) return null;
  const modules = allowedModules(user.role);
  if (modules.length < 2) return null;

  return (
    <nav aria-label="Modules" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:w-48 lg:shrink-0 lg:px-0">
      <ul className="flex gap-1 lg:flex-col">
        {modules.map((m) => {
          const active = pathname.startsWith(m.href);
          return (
            <li key={m.key}>
              <Link
                href={m.href}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'relative flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200',
                  active ? 'bg-ledger text-white shadow-sm' : 'text-ink-soft hover:bg-ink/5 hover:text-ink',
                )}
              >
                <svg viewBox="0 0 20 20" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={ICONS[m.key]} />
                </svg>
                {m.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
