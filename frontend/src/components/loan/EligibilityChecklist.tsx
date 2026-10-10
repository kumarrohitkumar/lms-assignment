import type { EligibilityCheck } from '@/lib/types';
import { cx } from '../ui';

/** "What we checked": each rule the system ran when the loan was applied for, with the value it saw. */
export function EligibilityChecklist({ checks }: { checks: EligibilityCheck[] }) {
  if (!checks.length) return <p className="text-sm text-ink-soft">No checks were recorded for this application.</p>;
  return (
    <ul className="divide-y divide-line rounded-lg border border-line">
      {checks.map((c, i) => (
        <li
          key={c.rule}
          aria-label={`${c.label}: ${c.passed ? 'passed' : 'failed'}`}
          className="anim-rise flex items-start gap-3 px-4 py-3"
          style={{ '--i': i } as React.CSSProperties}
        >
          <span
            className={cx('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full', c.passed ? 'bg-ledger text-white' : 'bg-rust text-white')}
            aria-hidden="true"
          >
            <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              {c.passed ? (
                <path className="check-draw" style={{ '--i': i } as React.CSSProperties} d="M3.5 8.5l3 3 6-7" />
              ) : (
                <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
              )}
            </svg>
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-ink">{c.label}</span>
            <span className="tabular block text-sm text-ink-soft">{c.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
