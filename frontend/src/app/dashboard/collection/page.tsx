'use client';

import { useState } from 'react';
import { ModulePage } from '@/components/dashboard/ModulePage';
import { PaymentPanel } from '@/components/dashboard/PaymentPanel';
import { QueueSearch } from '@/components/dashboard/QueueSearch';
import { QueueSummary } from '@/components/dashboard/QueueSummary';
import { RefreshButton } from '@/components/dashboard/RefreshButton';
import { useQueue } from '@/components/dashboard/useQueue';
import { DueBadge } from '@/components/loan/DueBadge';
import { LoanDetailsDrawer } from '@/components/loan/LoanDetails';
import { Alert, Button, cx, EmptyState, Panel, SkeletonCards, StatusBadge } from '@/components/ui';
import { useCountUp } from '@/hooks/useCountUp';
import { formatDate, formatINR } from '@/lib/format';
import { queueStats } from '@/lib/queueStats';
import type { Loan } from '@/lib/types';

type View = 'active' | 'closed';

function Outstanding({ value }: { value: number }) {
  const shown = useCountUp(value);
  return <p className="tabular text-2xl font-bold tracking-tight">{formatINR(Math.round(shown * 100) / 100)}</p>;
}

export default function CollectionPage() {
  const [view, setView] = useState<View>('active');
  const [q, setQ] = useState('');
  const { items: loans, error, reload, refreshing, updatedAt, remove, replace } = useQueue<Loan>('/collection/loans', 'loans', {
    q,
    view: view === 'closed' ? 'closed' : '',
  });
  const [openId, setOpenId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);

  function onChanged(loan: Loan) {
    const leavesView = (view === 'active' && loan.status === 'CLOSED') || (view === 'closed' && loan.status !== 'CLOSED');
    if (leavesView) {
      remove(loan.id);
      setOpenId(null);
      setNotice(
        loan.status === 'CLOSED'
          ? `${loan.applicant.fullName} has repaid ${formatINR(loan.totalRepayment)} in full. The loan is closed.`
          : `The loan for ${loan.applicant.fullName} is active again after the reversal. Find it under Active.`,
      );
    } else {
      replace(loan);
      setFlashId(loan.id);
    }
  }

  return (
    <ModulePage
      module="collection"
      actions={
        <RefreshButton
          onRefresh={() => {
            setNotice(null);
            reload();
          }}
          refreshing={refreshing}
          updatedAt={updatedAt}
        />
      }
      search={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label="Loans" className="inline-flex rounded-md border border-line bg-surface p-1">
            {(['active', 'closed'] as const).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => {
                  setView(v);
                  setOpenId(null);
                  setNotice(null);
                }}
                className={cx('rounded px-3 py-1.5 text-sm font-medium transition-colors', view === v ? 'bg-ledger text-white' : 'text-ink-soft hover:text-ink')}
              >
                {v === 'active' ? 'Active' : 'Closed'}
              </button>
            ))}
          </div>
          <div className="w-full sm:w-80">
            <QueueSearch onSearch={setQ} />
          </div>
        </div>
      }
    >
      {notice && (
        <div className="anim-rise">
          <Alert tone="success">{notice}</Alert>
        </div>
      )}
      {error && <Alert>{error}</Alert>}
      {loans && (
        <QueueSummary
          tiles={
            view === 'active'
              ? [
                  { label: 'Active loans', value: queueStats(loans).count },
                  { label: 'Outstanding', value: queueStats(loans).outstanding, money: true },
                  { label: 'Overdue', value: queueStats(loans).overdue, tone: 'alert' },
                  { label: 'Due within 7 days', value: queueStats(loans).dueThisWeek, tone: 'warn' },
                ]
              : [
                  { label: 'Closed loans', value: queueStats(loans).count },
                  { label: 'Principal repaid', value: queueStats(loans).principal, money: true },
                ]
          }
        />
      )}
      {!loans && !error && <SkeletonCards />}
      {loans?.length === 0 && (
        <EmptyState title={q ? 'No loans match your search' : view === 'active' ? 'No active loans' : 'No closed loans yet'}>
          {q ? 'Try a different name, email or PAN.' : view === 'active' ? 'Loans appear here once they are disbursed.' : 'Fully repaid loans appear here.'}
        </EmptyState>
      )}
      {loans?.map((loan, i) => {
        const paidShare = (loan.amountPaid / loan.totalRepayment) * 100;
        const open = openId === loan.id;
        return (
          <Panel key={loan.id} className={cx('anim-rise p-5', loan.overdue && 'border-rust/40', flashId === loan.id && 'anim-flash')} style={{ '--i': i } as React.CSSProperties}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold">{loan.applicant.fullName}</p>
                  <StatusBadge status={loan.status} />
                  <DueBadge loan={loan} />
                </div>
                <p className="truncate text-sm text-ink-soft">{loan.borrower.email}</p>
                <p className="text-sm text-ink-soft">
                  {loan.status === 'CLOSED' && loan.closedAt
                    ? `Closed ${formatDate(loan.closedAt)}`
                    : loan.disbursedAt
                      ? `Disbursed ${formatDate(loan.disbursedAt)}${loan.dueDate ? `, due ${formatDate(loan.dueDate)}` : ''}`
                      : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-ink-soft">Outstanding</p>
                <Outstanding value={loan.outstanding} />
              </div>
            </div>
            <div
              className="mt-4 h-2 overflow-hidden rounded-full bg-line"
              role="progressbar"
              aria-label="Repaid"
              aria-valuenow={Math.round(paidShare)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="h-full bg-ledger transition-[width] duration-700 ease-out" style={{ width: `${paidShare}%` }} />
            </div>
            <div className="tabular mt-2 flex flex-wrap justify-between gap-2 text-sm text-ink-soft">
              <span>
                Paid {formatINR(loan.amountPaid)} of {formatINR(loan.totalRepayment)}
              </span>
              <span>
                {formatINR(loan.principal)} principal + {formatINR(loan.simpleInterest)} interest
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant={open ? 'ghost' : 'primary'} onClick={() => setOpenId(open ? null : loan.id)} aria-expanded={open}>
                {open ? 'Hide payments' : view === 'active' ? 'Record payment' : 'Payments'}
              </Button>
              <Button variant="secondary" onClick={() => setDetailsId(loan.id)}>
                Details and history
              </Button>
            </div>
            {open && <PaymentPanel loan={loan} onChanged={onChanged} />}
          </Panel>
        );
      })}
      <LoanDetailsDrawer loanId={detailsId} onClose={() => setDetailsId(null)} />
    </ModulePage>
  );
}
