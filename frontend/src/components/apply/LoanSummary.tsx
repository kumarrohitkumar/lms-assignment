'use client';

import { employmentLabel, formatDate, formatDays, formatINR } from '@/lib/format';
import type { Loan } from '@/lib/types';
import { LifecycleTrack } from '../LifecycleTrack';
import { useState } from 'react';
import { EligibilityChecklist } from '../loan/EligibilityChecklist';
import { useLoanDetail } from '../loan/LoanDetails';
import { RejectionNotice } from '../loan/RejectionNotice';
import { Timeline } from '../loan/Timeline';
import { Panel, Skeleton, StatusBadge } from '../ui';

const statusCopy: Record<Loan['status'], string> = {
  APPLIED: 'Your application is with our sanction team. You will see the decision here.',
  SANCTIONED: 'Approved. The money will be sent to your bank account shortly.',
  DISBURSED: 'The money has been sent. Repay the outstanding amount to close the loan.',
  CLOSED: 'Fully repaid and closed. Thank you.',
  REJECTED: 'This application was not approved.',
};

function LoanHistory({ loanId }: { loanId: string }) {
  const { detail, error } = useLoanDetail(loanId);
  if (error) return <p className="mt-3 text-sm text-rust">{error}</p>;
  if (!detail) return <Skeleton className="mt-4 h-40" />;
  return (
    <div className="mt-4 grid gap-6 md:grid-cols-2">
      <div>
        <h3 className="mb-3 text-sm font-semibold">What we checked</h3>
        <EligibilityChecklist checks={detail.loan.eligibility} />
      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold">History</h3>
        <Timeline events={detail.timeline} />
      </div>
    </div>
  );
}

export function LoanSummary({ loan, defaultOpen = false }: { loan: Loan; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen || loan.status === 'REJECTED');
  const paidShare = loan.totalRepayment ? Math.min(100, (loan.amountPaid / loan.totalRepayment) * 100) : 0;

  return (
    <Panel className="anim-rise p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-ink-soft">Applied {formatDate(loan.createdAt)}</p>
          <p className="tabular mt-0.5 text-2xl font-bold tracking-tight">{formatINR(loan.principal)}</p>
          <p className="text-sm text-ink-soft">
            for {formatDays(loan.tenureDays)} at {loan.interestRatePa}% a year
          </p>
        </div>
        <StatusBadge status={loan.status} />
      </div>

      <div className="mt-6">
        <LifecycleTrack loan={loan} />
      </div>

      <p className="mt-6 text-ink-soft">{statusCopy[loan.status]}</p>
      <div className="mt-3">
        <RejectionNotice loan={loan} />
      </div>

      <dl className="tabular mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-5 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-ink-soft">Interest</dt>
          <dd className="font-semibold">{formatINR(loan.simpleInterest)}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">Total repayment</dt>
          <dd className="font-semibold">{formatINR(loan.totalRepayment)}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">Paid so far</dt>
          <dd className="font-semibold">{formatINR(loan.amountPaid)}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">Outstanding</dt>
          <dd className="font-semibold">{formatINR(loan.outstanding)}</dd>
        </div>
      </dl>
      {(loan.status === 'DISBURSED' || loan.status === 'CLOSED') && (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={Math.round(paidShare)} aria-valuemin={0} aria-valuemax={100} aria-label="Repaid">
          <div className="h-full bg-ledger" style={{ width: `${paidShare}%` }} />
        </div>
      )}
      <p className="mt-4 text-xs text-ink-faint">
        Applied as {loan.applicant.fullName}, {employmentLabel[loan.applicant.employmentMode].toLowerCase()}.{' '}
        <a className="underline underline-offset-2" href={`/api/loans/${loan.id}/salary-slip`} target="_blank" rel="noreferrer">
          View salary slip
        </a>
      </p>

      <details className="group mt-5 border-t border-line pt-4" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
        <summary className="cursor-pointer list-none text-sm font-semibold text-ledger">
          <span className="inline-flex items-center gap-1.5">
            <svg viewBox="0 0 16 16" className="size-3.5 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            What we checked and full history
          </span>
        </summary>
        {open && <LoanHistory loanId={loan.id} />}
      </details>
    </Panel>
  );
}
