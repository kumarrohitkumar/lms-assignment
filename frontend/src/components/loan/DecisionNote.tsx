import type { Decision } from '@/lib/types';
import { cx } from '../ui';
import { ROLE_LABEL } from './labels';

const OUTCOME = {
  APPROVED: { label: 'Approved', className: 'border-ledger/40 bg-ledger-wash/50', badge: 'bg-ledger-wash text-ledger-ink', icon: 'M4 10l4 4 8-8' },
  DISBURSED: { label: 'Disbursed', className: 'border-ledger/40 bg-ledger-wash/50', badge: 'bg-ledger-wash text-ledger-ink', icon: 'M3 6h14v9H3zM3 9h14' },
  REJECTED: { label: 'Rejected', className: 'border-rust/40 bg-rust-wash/50', badge: 'bg-rust-wash text-rust', icon: 'M5 5l10 10M15 5L5 15' },
} as const;

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

/** What a stage decided about a loan: outcome, who and when, and the reason, remark or bank reference. */
export function DecisionNote({ decision }: { decision: Decision }) {
  const o = OUTCOME[decision.outcome];
  const who = decision.by ? `${decision.by.name} (${ROLE_LABEL[decision.by.role] ?? decision.by.role})` : 'Automatic';
  return (
    <div role="group" aria-label="Decision" className={cx('flex flex-col gap-1 rounded-md border px-3 py-2.5 text-sm', o.className)}>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', o.badge)}>
          <svg viewBox="0 0 20 20" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={o.icon} />
          </svg>
          {o.label}
        </span>
        <span className="text-ink-soft">
          by {who}, <time dateTime={decision.at}>{dateTime(decision.at)}</time>
        </span>
      </p>
      {decision.reason && <p className="font-medium text-ink">Reason: {decision.reason}</p>}
      {decision.reference && <p className="tabular text-ink">Bank reference {decision.reference}</p>}
      {decision.note && <p className="text-ink-soft">“{decision.note}”</p>}
    </div>
  );
}
