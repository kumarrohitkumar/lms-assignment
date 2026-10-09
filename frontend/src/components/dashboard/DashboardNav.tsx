'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { allowedModules } from '@/lib/rbac';
import { useSession } from '../SessionProvider';
import { cx } from '../ui';

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
                  'block whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium',
                  active ? 'bg-ledger text-white' : 'text-ink-soft hover:bg-ink/5 hover:text-ink',
                )}
              >
                {m.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
