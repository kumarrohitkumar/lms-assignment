'use client';

import { useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { employmentLabel, formatBytes, formatDate, formatINR } from '@/lib/format';
import { allowedModules } from '@/lib/rbac';
import type { Loan, ProfileResponse, User } from '@/lib/types';
import { ROLE_LABEL, STATUS_LABEL } from '../loan/labels';
import { Skeleton, cx } from '../ui';

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

function BorrowerSections() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loans, setLoans] = useState<Loan[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api<ProfileResponse>('/borrower/profile'), api<{ loans: Loan[] }>('/borrower/loans')]).then(
      ([p, l]) => {
        setProfile(p);
        setLoans(l.loans);
      },
      (e) => setError(errorMessage(e)),
    );
  }, []);

  if (error) return <p className="mt-6 text-sm text-rust">{error}</p>;
  if (!profile || !loans) return <Skeleton className="mt-6 h-48" />;

  const p = profile.profile;
  const current = loans[0];
  return (
    <>
      <Section title="Personal details">
        {p ? (
          <Rows
            rows={[
              ['Full name', p.fullName],
              ['PAN', <span key="pan" className="tabular tracking-wide">{p.pan}</span>],
              ['Date of birth', formatDate(p.dateOfBirth)],
              ['Monthly salary', <span key="sal" className="tabular">{formatINR(p.monthlySalary)}</span>],
              ['Employment', employmentLabel[p.employmentMode]],
            ]}
          />
        ) : (
          <p className="rounded-lg border border-dashed border-line-strong px-4 py-3 text-sm text-ink-soft">
            You haven&apos;t added your personal details yet. Start your application to add them.
          </p>
        )}
      </Section>

      {p && (
        <Section title="Eligibility and documents">
          <Rows
            rows={[
              [
                'Eligibility',
                <span key="bre" className={cx('font-semibold', p.bre?.passed ? 'text-ledger-ink' : 'text-rust')}>
                  {p.bre?.passed ? 'Eligible' : 'Not eligible'}
                  {p.bre && !p.bre.passed && <span className="mt-0.5 block text-xs font-normal">{p.bre.failures.map((f) => f.message).join(' ')}</span>}
                </span>,
              ],
              ...(p.bre ? ([['Checked on', formatDate(p.bre.checkedAt)]] as [string, React.ReactNode][]) : []),
              [
                'Salary slip',
                p.salarySlip ? `${p.salarySlip.originalName} (${formatBytes(p.salarySlip.size)}), uploaded ${formatDate(p.salarySlip.uploadedAt)}` : 'Not uploaded yet',
              ],
            ]}
          />
        </Section>
      )}

      <Section title="Loans">
        {current ? (
          <Rows
            rows={[
              ['Applications', `${loans.length} ${loans.length === 1 ? 'loan' : 'loans'}`],
              [
                'Latest',
                <span key="latest" className="tabular">
                  {formatINR(current.principal)}, {STATUS_LABEL[current.status]}
                  {current.status === 'DISBURSED' && `, ${formatINR(current.outstanding)} outstanding`}
                </span>,
              ],
              ['Applied on', formatDate(current.createdAt)],
            ]}
          />
        ) : (
          <p className="rounded-lg border border-dashed border-line-strong px-4 py-3 text-sm text-ink-soft">No loans yet.</p>
        )}
      </Section>
    </>
  );
}

/** Everything the signed-in person can know about their own account. */
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

      {user.role === 'BORROWER' && <BorrowerSections />}
    </div>
  );
}
