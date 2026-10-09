import { employmentLabel, formatDate, formatDays, formatINR } from '@/lib/format';
import type { Loan } from '@/lib/types';
import { LifecycleTrack } from '../LifecycleTrack';
import { Alert, Panel, StatusBadge } from '../ui';

const statusCopy: Record<Loan['status'], string> = {
  APPLIED: 'Your application is with our sanction team. You will see the decision here.',
  SANCTIONED: 'Approved. The money will be sent to your bank account shortly.',
  DISBURSED: 'The money has been sent. Repay the outstanding amount to close the loan.',
  CLOSED: 'Fully repaid and closed. Thank you.',
  REJECTED: 'This application was not approved.',
};

export function LoanSummary({ loan }: { loan: Loan }) {
  const paidShare = loan.totalRepayment ? Math.min(100, (loan.amountPaid / loan.totalRepayment) * 100) : 0;

  return (
    <Panel className="p-5 sm:p-6">
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
      {loan.status === 'REJECTED' && loan.rejectionReason && (
        <div className="mt-3">
          <Alert title="Reason given">{loan.rejectionReason}</Alert>
        </div>
      )}

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
    </Panel>
  );
}
