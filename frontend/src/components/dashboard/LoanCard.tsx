import type { ReactNode } from 'react';
import { employmentLabel, formatDate, formatDays, formatINR } from '@/lib/format';
import type { Loan } from '@/lib/types';
import { cx, Panel, StatusBadge } from '../ui';

/** One loan in a work queue: who, how much, the applicant snapshot, and the module's actions. */
export function LoanCard({
  loan,
  children,
  extra,
  index = 0,
  onDetails,
}: {
  loan: Loan;
  children?: ReactNode;
  extra?: ReactNode;
  index?: number;
  onDetails?: () => void;
}) {
  const passed = loan.eligibility?.filter((c) => c.passed).length ?? 0;
  const total = loan.eligibility?.length ?? 0;
  return (
    <Panel className="anim-rise p-5 transition-shadow hover:shadow-md" style={{ '--i': index } as React.CSSProperties}>
      <div className="grid gap-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] md:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold">{loan.applicant.fullName}</p>
            <StatusBadge status={loan.status} />
            {total > 0 && (
              <span
                className={cx(
                  'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                  passed === total ? 'bg-ledger-wash text-ledger-dark' : 'bg-rust-wash text-rust',
                )}
              >
                {passed}/{total} checks passed
              </span>
            )}
          </div>
          <p className="truncate text-sm text-ink-soft">{loan.borrower.email}</p>
          <dl className="tabular mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-ink-soft">PAN</dt>
            <dd className="tracking-wide">{loan.applicant.pan}</dd>
            <dt className="text-ink-soft">Monthly salary</dt>
            <dd>{formatINR(loan.applicant.monthlySalary)}</dd>
            <dt className="text-ink-soft">Employment</dt>
            <dd>{employmentLabel[loan.applicant.employmentMode]}</dd>
            <dt className="text-ink-soft">Date of birth</dt>
            <dd>{formatDate(loan.applicant.dateOfBirth)}</dd>
          </dl>
        </div>

        <div className="tabular border-line text-sm md:border-l md:pl-5">
          <p className="text-2xl font-bold tracking-tight">{formatINR(loan.principal)}</p>
          <p className="text-ink-soft">
            {formatDays(loan.tenureDays)} at {loan.interestRatePa}%
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
            <dt className="text-ink-soft">Interest</dt>
            <dd>{formatINR(loan.simpleInterest)}</dd>
            <dt className="text-ink-soft">Total repayment</dt>
            <dd className="font-semibold">{formatINR(loan.totalRepayment)}</dd>
            <dt className="text-ink-soft">Applied</dt>
            <dd>{formatDate(loan.createdAt)}</dd>
          </dl>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            <a
              href={`/api/loans/${loan.id}/salary-slip`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-ledger underline underline-offset-2"
            >
              Open salary slip
            </a>
            {onDetails && (
              <button type="button" onClick={onDetails} className="font-medium text-ledger underline underline-offset-2">
                View details and history
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 md:flex-col md:items-stretch">{children}</div>
      </div>
      {extra}
    </Panel>
  );
}
