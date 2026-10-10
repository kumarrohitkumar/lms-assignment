'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ModulePage } from '@/components/dashboard/ModulePage';
import { RefreshButton } from '@/components/dashboard/RefreshButton';
import { STATUS_LABEL } from '@/components/loan/labels';
import { useSession } from '@/components/SessionProvider';
import { Alert, Panel, Skeleton } from '@/components/ui';
import { useCountUp } from '@/hooks/useCountUp';
import { api, errorMessage } from '@/lib/api';
import { formatINR } from '@/lib/format';
import type { LoanStatus, Overview } from '@/lib/types';

const PIPELINE: { status: LoanStatus; href: string; bar: string }[] = [
  { status: 'APPLIED', href: '/dashboard/sanction', bar: 'bg-saffron' },
  { status: 'SANCTIONED', href: '/dashboard/disbursement', bar: 'bg-sky-ink' },
  { status: 'DISBURSED', href: '/dashboard/collection', bar: 'bg-ledger' },
  { status: 'CLOSED', href: '/dashboard/history', bar: 'bg-ink-soft' },
  { status: 'REJECTED', href: '/dashboard/history', bar: 'bg-rust' },
];

function Count({ value, money }: { value: number; money?: boolean }) {
  const shown = useCountUp(value);
  return <>{money ? formatINR(Math.round(shown)) : Math.round(shown).toLocaleString('en-IN')}</>;
}

export default function OverviewPage() {
  const { user } = useSession();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(
    () =>
      api<Overview>('/admin/overview')
        .then((d) => {
          setData(d);
          setError(null);
          setUpdatedAt(new Date());
        }, (e) => setError(errorMessage(e)))
        .finally(() => setRefreshing(false)),
    [],
  );
  const userId = user?.id;
  useEffect(() => {
    if (userId) load();
  }, [userId, load]);

  const total = data ? Object.values(data.counts).reduce((a, b) => a + b, 0) : 0;

  return (
    <ModulePage
      module="overview"
      actions={
        <RefreshButton
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          refreshing={refreshing}
          updatedAt={updatedAt}
        />
      }
    >
      {error && <Alert>{error}</Alert>}
      {!data && !error && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      )}
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Disbursed', value: data.money.disbursed, note: 'Principal paid out' },
              { label: 'Collected', value: data.money.collected, note: 'Repayments received' },
              { label: 'Outstanding', value: data.money.outstanding, note: 'Still due on active loans' },
              {
                label: 'Overdue',
                value: data.overdue.outstanding,
                note: `${data.overdue.count} ${data.overdue.count === 1 ? 'loan is' : 'loans are'} past the due date`,
                alert: data.overdue.count > 0,
              },
            ].map((t, i) => (
              <Panel key={t.label} className={`anim-rise p-5 ${'alert' in t && t.alert ? 'border-rust/40 bg-rust-wash' : ''}`} style={{ '--i': i } as React.CSSProperties}>
                <p className={`text-sm ${'alert' in t && t.alert ? 'text-rust' : 'text-ink-soft'}`}>{t.label}</p>
                <p className="tabular mt-1 text-2xl font-bold tracking-tight">
                  <Count value={t.value} money />
                </p>
                <p className="mt-1 text-xs text-ink-faint">{t.note}</p>
              </Panel>
            ))}
          </div>

          <Panel className="anim-rise p-5" style={{ '--i': 3 } as React.CSSProperties}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold">Loans by stage</h2>
              <p className="tabular text-sm text-ink-soft">
                <Count value={total} /> {total === 1 ? 'loan' : 'loans'}, <Count value={data.leads} /> {data.leads === 1 ? 'lead' : 'leads'} still to apply
              </p>
            </div>
            {total > 0 && (
              <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-line" aria-hidden="true">
                {PIPELINE.map((p) => (
                  <div key={p.status} className={`${p.bar} transition-[width] duration-700 ease-out`} style={{ width: `${(data.counts[p.status] / total) * 100}%` }} />
                ))}
              </div>
            )}
            <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {PIPELINE.map((p) => (
                <li key={p.status}>
                  <Link href={p.href} className="block rounded-md border border-line p-3 transition-colors hover:border-line-strong hover:bg-paper">
                    <span className="flex items-center gap-2 text-sm text-ink-soft">
                      <span className={`size-2.5 rounded-full ${p.bar}`} aria-hidden="true" />
                      {STATUS_LABEL[p.status]}
                    </span>
                    <span className="tabular mt-1 block text-xl font-bold">
                      <Count value={data.counts[p.status]} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </>
      )}
    </ModulePage>
  );
}
