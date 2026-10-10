import { cx } from '../ui';

/** Segmented tabs above a work queue, e.g. "Waiting" and "Decided (12)". */
export function QueueTabs<V extends string>({
  value,
  onChange,
  tabs,
  label,
}: {
  value: V;
  onChange: (v: V) => void;
  tabs: { value: V; label: string; count?: number }[];
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex rounded-md border border-line bg-surface p-1">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cx(
            'rounded px-3 py-1.5 text-sm font-medium transition-colors',
            value === t.value ? 'bg-ledger text-white' : 'text-ink-soft hover:text-ink',
          )}
        >
          {t.label}
          {t.count !== undefined && <span className={cx('tabular ml-1.5', value === t.value ? 'text-white/80' : 'text-ink-faint')}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
