import { formatDate } from '@/lib/format';
import { allowedModules } from '@/lib/rbac';
import type { User } from '@/lib/types';
import { ROLE_LABEL } from '../loan/labels';

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || '?';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="anim-rise mt-6">
      <h3 className="mb-2 text-sm font-semibold text-ink">{title}</h3>
      {children}
    </section>
  );
}

function Rows({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="divide-y divide-line rounded-lg border border-line text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[8.5rem_1fr] gap-3 px-4 py-2.5">
          <dt className="text-ink-soft">{k}</dt>
          <dd className="min-w-0 break-words font-medium text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function access(user: User) {
  if (user.role === 'BORROWER') return 'Borrower portal';
  const modules = allowedModules(user.role);
  return modules.length === 1 ? `${modules[0]!.label} module` : modules.map((m) => m.label).join(', ');
}

/** The signed-in person's account: who they are, what they can access, and when they joined and last logged in. */
export function ProfileDetails({ user }: { user: User }) {
  return (
    <div>
      <div className="anim-rise flex items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-ledger text-lg font-bold text-white" aria-hidden="true">
          {initials(user.name)}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">{user.name}</h2>
          <p className="truncate text-sm text-ink-soft">{user.email}</p>
          <span className="mt-1 inline-flex rounded-full bg-ledger-wash px-2.5 py-0.5 text-xs font-semibold text-ledger-ink">{ROLE_LABEL[user.role]}</span>
        </div>
      </div>

      <Section title="Account">
        <Rows
          rows={[
            ['Email', user.email],
            ['Role', ROLE_LABEL[user.role]],
            ['Access', access(user)],
            ['Member since', user.createdAt ? formatDate(user.createdAt) : '—'],
            ['Last login', user.lastLoginAt ? dateTime(user.lastLoginAt) : '—'],
          ]}
        />
      </Section>

    </div>
  );
}
