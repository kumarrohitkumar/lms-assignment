import { cx } from '../ui';

export const STEPS = ['Personal details', 'Salary slip', 'Loan amount'] as const;

export function Stepper({ current, completed }: { current: number; completed: number }) {
  return (
    <ol className="flex gap-2 sm:gap-6" aria-label="Application steps">
      {STEPS.map((label, i) => {
        const done = i < completed;
        const active = i === current;
        return (
          <li key={label} aria-current={active ? 'step' : undefined} className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
            <span
              className={cx(
                'tabular grid size-7 shrink-0 place-items-center rounded-full text-sm font-semibold',
                active ? 'bg-ledger text-white' : done ? 'bg-ledger-wash text-ledger-ink' : 'border border-line-strong text-ink-faint',
              )}
            >
              {done && !active ? '✓' : i + 1}
            </span>
            <span className={cx('truncate text-sm', active ? 'font-semibold text-ink' : 'text-ink-soft', !active && 'hidden sm:inline')}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
