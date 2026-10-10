'use client';

import { useCountUp } from '@/hooks/useCountUp';
import { formatINR } from '@/lib/format';
import { cx } from '@/lib/cx';

export interface SummaryTile {
  label: string;
  value: number;
  money?: boolean;
  tone?: 'default' | 'alert' | 'warn';
}

function Tile({ tile, i }: { tile: SummaryTile; i: number }) {
  const shown = useCountUp(tile.value);
  const tone = tile.tone ?? 'default';
  return (
    <div
      className={cx(
        'anim-rise rounded-lg border px-4 py-3',
        tone === 'alert' && tile.value > 0 ? 'border-rust/40 bg-rust-wash' : tone === 'warn' && tile.value > 0 ? 'border-saffron/40 bg-saffron-wash' : 'border-line bg-surface',
      )}
      style={{ '--i': i } as React.CSSProperties}
    >
      <p className="tabular text-xl font-bold tracking-tight">{tile.money ? formatINR(Math.round(shown)) : Math.round(shown)}</p>
      <p className={cx('text-xs', tone === 'alert' && tile.value > 0 ? 'text-rust' : tone === 'warn' && tile.value > 0 ? 'text-saffron-ink' : 'text-ink-soft')}>{tile.label}</p>
    </div>
  );
}

/** A strip of headline numbers above a work queue; they count up when the list loads or changes. */
export function QueueSummary({ tiles }: { tiles: SummaryTile[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" role="group" aria-label="Queue summary">
      {tiles.map((t, i) => (
        <Tile key={t.label} tile={t} i={i} />
      ))}
    </div>
  );
}
