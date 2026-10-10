'use client';

import { useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { employmentLabel, formatDate, formatDays, formatINR } from '@/lib/format';
import type { LoanDetail } from '@/lib/types';
import { LifecycleTrack } from '../LifecycleTrack';
import { Alert, Drawer, Skeleton, StatusBadge, cx } from '../ui';
import { DueBadge } from './DueBadge';
import { EligibilityChecklist } from './EligibilityChecklist';
import { RejectionNotice } from './RejectionNotice';
import { Timeline } from './Timeline';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h3 className="mb-3 text-sm font-semibold text-ink">{title}</h3>
      {children}
    </section>
  );
}

/** Everything about one loan: figures, what was checked, every decision and payment, and who made them. */
export function LoanDetailsBody({ detail }: { detail: LoanDetail }) {
  const { loan, timeline, payments } = detail;
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{loan.applicant.fullName}</p>
          <p className="text-sm text-ink-soft">{loan.borrower.email}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusBadge status={loan.status} />
          <DueBadge loan={loan} />
        </div>
      </div>
      <div className="mt-5">
        <LifecycleTrack loan={loan} />
      </div>
      <div className="mt-4">
        <RejectionNotice loan={loan} />
      </div>

      <dl className="tabular mt-6 grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg bg-paper p-4 text-sm sm:grid-cols-3">
        {[
          ['Principal', formatINR(loan.principal)],
          ['Tenure', formatDays(loan.tenureDays)],
          ['Interest', formatINR(loan.simpleInterest)],
          ['Total repayment', formatINR(loan.totalRepayment)],
          ['Paid', formatINR(loan.amountPaid)],
          ['Outstanding', formatINR(loan.outstanding)],
          ...(loan.dueDate ? [['Due date', formatDate(loan.dueDate)]] : []),
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="text-ink-soft">{k}</dt>
            <dd className="font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      {loan.disbursement && (
        <p className="tabular mt-3 text-sm text-ink-soft">
          Disbursed {formatDate(loan.disbursement.at)} with reference <span className="font-medium text-ink">{loan.disbursement.reference}</span>
          {loan.disbursement.remark ? `. ${loan.disbursement.remark}` : ''}
        </p>
      )}

      <Section title="What we checked">
        <EligibilityChecklist checks={loan.eligibility} />
        <p className="mt-2 text-xs text-ink-faint">
          {loan.applicant.fullName}, {employmentLabel[loan.applicant.employmentMode].toLowerCase()}, born {formatDate(loan.applicant.dateOfBirth)}.{' '}
          <a className="underline underline-offset-2" href={`/api/loans/${loan.id}/salary-slip`} target="_blank" rel="noreferrer">
            Open salary slip
          </a>
        </p>
      </Section>

      <Section title="History">
        <Timeline events={timeline} />
      </Section>

      {payments.length > 0 && (
        <Section title="Payments">
          <ul className="tabular divide-y divide-line rounded-lg border border-line text-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 px-4 py-2.5">
                <span className="min-w-0">
                  <span className={cx('block truncate font-medium tracking-wide', p.status === 'REVERSED' && 'text-ink-faint line-through')}>{p.utr}</span>
                  <span className="text-xs text-ink-soft">
                    {formatDate(p.paymentDate)}
                    {p.reversal ? `, reversed: ${p.reversal.reason}` : ''}
                  </span>
                </span>
                <span className={cx('font-semibold', p.status === 'REVERSED' && 'text-ink-faint line-through')}>{formatINR(p.amount)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

export function useLoanDetail(loanId: string | null) {
  const [detail, setDetail] = useState<LoanDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!loanId) return;
    let live = true;
    api<LoanDetail>(`/loans/${loanId}`).then(
      (d) => live && (setDetail(d), setError(null)),
      (e) => live && setError(errorMessage(e)),
    );
    return () => {
      live = false;
    };
  }, [loanId]);
  return { detail: detail?.loan.id === loanId ? detail : null, error };
}

/** Opens the full record of a loan in a side drawer. */
export function LoanDetailsDrawer({ loanId, onClose }: { loanId: string | null; onClose: () => void }) {
  const { detail, error } = useLoanDetail(loanId);
  return (
    <Drawer open={!!loanId} onClose={onClose} title="Loan details">
      {error && <Alert>{error}</Alert>}
      {!detail && !error && (
        <div className="flex flex-col gap-3" role="status" aria-label="Loading">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}
      {detail && <LoanDetailsBody detail={detail} />}
    </Drawer>
  );
}
