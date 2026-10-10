import { formatINR } from '@/lib/format';
import type { TimelineEvent } from '@/lib/types';
import { cx } from '../ui';
import { ROLE_LABEL, STATUS_LABEL } from './labels';

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

function describe(e: TimelineEvent): { title: string; tone: 'ledger' | 'rust' | 'saffron' | 'sky' | 'ink' } {
  if (e.type !== 'STATUS') {
    return e.type === 'PAYMENT'
      ? { title: `Payment received ${formatINR(e.amount)}`, tone: 'ledger' }
      : { title: `Payment reversed ${formatINR(e.amount)}`, tone: 'rust' };
  }
  if (e.from === 'CLOSED' && e.to === 'DISBURSED') return { title: 'Reopened', tone: 'saffron' };
  const tone = ({ APPLIED: 'saffron', SANCTIONED: 'sky', DISBURSED: 'ledger', CLOSED: 'ink', REJECTED: 'rust' } as const)[e.to];
  return { title: STATUS_LABEL[e.to], tone };
}

const dot = { ledger: 'bg-ledger', rust: 'bg-rust', saffron: 'bg-saffron', sky: 'bg-sky-ink', ink: 'bg-ink-soft' };

/** Every event in a loan's life, oldest first: what happened, who did it, when, and why. */
export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="relative ml-1.5 border-l border-line">
      {events.map((e, i) => {
        const { title, tone } = describe(e);
        const who = e.actor.role === 'SYSTEM' ? 'Automatic' : `${e.actor.name} (${ROLE_LABEL[e.actor.role] ?? e.actor.role})`;
        return (
          <li key={`${e.type}-${e.at}-${i}`} className="anim-rise relative pb-5 pl-6 last:pb-0" style={{ '--i': i } as React.CSSProperties}>
            <span className={cx('absolute -left-[5px] top-1.5 size-2.5 rounded-full ring-4 ring-surface', dot[tone])} aria-hidden="true" />
            <p className="text-sm font-semibold text-ink">{title}</p>
            <p className="text-xs text-ink-faint">
              <time dateTime={e.at}>{dateTime(e.at)}</time> by {who}
            </p>
            {e.type !== 'STATUS' && <p className="tabular mt-0.5 text-xs text-ink-soft">UTR {e.utr}</p>}
            {e.note && <p className="mt-1 rounded-md bg-paper px-3 py-2 text-sm text-ink-soft">{e.note}</p>}
          </li>
        );
      })}
    </ol>
  );
}
