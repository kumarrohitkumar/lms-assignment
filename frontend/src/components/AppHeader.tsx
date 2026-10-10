'use client';

import { useSession } from './SessionProvider';
import { Brand } from './Brand';
import { ProfileButton } from './profile/ProfileButton';
import { ThemeToggle } from './ThemeToggle';
import { Button } from './ui';

export function AppHeader({ subtitle, homeHref }: { subtitle: string; homeHref: string }) {
  const { logout } = useSession();
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Brand href={homeHref} subtitle={subtitle} />
        <div className="flex items-center gap-3">
          <ProfileButton />
          <ThemeToggle />
          <Button variant="secondary" onClick={logout}>
            Log out
          </Button>
        </div>
      </div>
    </header>
  );
}
