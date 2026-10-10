'use client';

import { Button } from '../ui';

const time = (d: Date) => d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit' });

/** Refresh with visible feedback: a spinner while loading, then the time of the last successful update. */
export function RefreshButton({ onRefresh, refreshing, updatedAt }: { onRefresh: () => void; refreshing: boolean; updatedAt: Date | null }) {
  return (
    <div className="flex items-center gap-3">
      <span className="tabular text-xs text-ink-faint" aria-live="polite">
        {updatedAt && !refreshing ? `Updated ${time(updatedAt)}` : ' '}
      </span>
      <Button variant="secondary" onClick={onRefresh} loading={refreshing}>
        {refreshing ? 'Refreshing…' : 'Refresh'}
      </Button>
    </div>
  );
}
