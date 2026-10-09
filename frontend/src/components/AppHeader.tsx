'use client';

import { useSession } from './SessionProvider';
import { Brand } from './Brand';
import { Button } from './ui';

const roleLabel: Record<string, string> = {
  ADMIN: 'Admin',
  SALES: 'Sales',
  SANCTION: 'Sanction',
  DISBURSEMENT: 'Disbursement',
  COLLECTION: 'Collection',
  BORROWER: 'Borrower',
};

export function AppHeader({ subtitle, homeHref }: { subtitle: string; homeHref: string }) {
  const { user, logout } = useSession();
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Brand href={homeHref} subtitle={subtitle} />
        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden text-right text-sm leading-tight sm:block">
              <p className="font-semibold">{user.name}</p>
              <p className="text-ink-soft">{roleLabel[user.role]}</p>
            </div>
          )}
          <Button variant="secondary" onClick={logout}>
            Log out
          </Button>
        </div>
      </div>
    </header>
  );
}
