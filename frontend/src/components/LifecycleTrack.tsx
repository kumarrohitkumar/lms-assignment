import type { Loan, LoanStatus } from '@/lib/types';
import { formatDate } from '@/lib/format';
import { cx } from './ui';

const STEPS: { status: LoanStatus; label: string; dateKey: keyof Loan }[] = [
  { status: 'APPLIED', label: 'Applied', dateKey: 'createdAt' },
  { status: 'SANCTIONED', label: 'Sanctioned', dateKey: 'sanctionedAt' },
  { status: 'DISBURSED', label: 'Disbursed', dateKey: 'disbursedAt' },
  { status: 'CLOSED', label: 'Closed', dateKey: 'closedAt' },
];

/** The loan's position in its lifecycle. A rejected loan stops after "Applied". */
export function LifecycleTrack({ loan }: { loan: Loan }) {
  const rejected = loan.status === 'REJECTED';
  const reached = rejected ? 0 : STEPS.findIndex((s) => s.status === loan.status);

  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Loan progress">
      {STEPS.map((step, i) => {
        const done = i <= reached;
        const date = loan[step.dateKey] as string | null;
        const stoppedHere = rejected && i === 1;
        return (
          <li key={step.status} className="min-w-0">
            <div className={cx('h-1.5 rounded-full', done ? 'bg-ledger' : stoppedHere ? 'bg-rust' : 'bg-line')} />
            <p className={cx('mt-2 truncate text-xs font-semibold sm:text-sm', done ? 'text-ink' : stoppedHere ? 'text-rust' : 'text-ink-faint')}>
              {stoppedHere ? 'Rejected' : step.label}
            </p>
            <p className="tabular truncate text-xs text-ink-faint">{done && date ? formatDate(date) : ' '}</p>
          </li>
        );
      })}
    </ol>
  );
}
