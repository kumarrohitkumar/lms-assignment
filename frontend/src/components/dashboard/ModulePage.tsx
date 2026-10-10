'use client';

import type { ReactNode } from 'react';
import { type DashboardModule, MODULES } from '@/lib/rbac';
import { useSession } from '../SessionProvider';
import { Alert, LoadingBlock } from '../ui';

/** Renders a module only for roles allowed to use it (the proxy redirects first; this is the in-page check). */
export function ModulePage({
  module,
  actions,
  search,
  children,
}: {
  module: DashboardModule['key'];
  actions?: ReactNode;
  search?: ReactNode;
  children: ReactNode;
}) {
  const { user, loading } = useSession();
  const meta = MODULES.find((m) => m.key === module)!;

  if (loading || !user) return <LoadingBlock />;
  if (!meta.roles.includes(user.role)) {
    return <Alert title="You don't have access to this module">Ask an admin if you need access to {meta.label}.</Alert>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="anim-fade flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{meta.label}</h1>
          <p className="text-ink-soft">{meta.description}</p>
        </div>
        {actions}
      </div>
      {search}
      {children}
    </div>
  );
}
