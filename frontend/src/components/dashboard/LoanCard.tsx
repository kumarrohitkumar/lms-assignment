import type { ReactNode } from 'react';
import { employmentLabel, formatDate, formatDays, formatINR } from '@/lib/format';
import type { Loan } from '@/lib/types';
import { Panel, StatusBadge } from '../ui';

/** One loan in a work queue: who, how much, the applicant snapshot, and the module's actions. */
export function LoanCard({ loan, children, extra }: { loan: Loan; children?: ReactNode; extra?: ReactNode }) {
  return (
    <Panel className="p-5">
      <div className="grid gap-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] md:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold">{loan.applicant.fullName}</p>
            <StatusBadge status={loan.status} />
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
          <a
            href={`/api/loans/${loan.id}/salary-slip`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block font-medium text-ledger underline underline-offset-2"
          >
            Open salary slip
          </a>
        </div>

        <div className="flex flex-wrap gap-2 md:flex-col md:items-stretch">{children}</div>
      </div>
      {extra}
    </Panel>
  );
}
