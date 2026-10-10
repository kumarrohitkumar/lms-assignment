'use client';

import { useSyncExternalStore } from 'react';
import { applyTheme, DEFAULT_THEME, nextTheme, readTheme, subscribeTheme, type ThemePref } from '@/lib/theme';
import { cx } from './ui';

const LABEL: Record<ThemePref, string> = { system: 'System', light: 'Light', dark: 'Dark' };

function Icon({ pref }: { pref: ThemePref }) {
  const common = { viewBox: '0 0 20 20', className: 'size-4', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (pref === 'light') {
    return (
      <svg {...common}>
        <circle cx="10" cy="10" r="3.5" />
        <path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4" />
      </svg>
    );
  }
  if (pref === 'dark') {
    return (
      <svg {...common}>
        <path d="M16 12.5A6.5 6.5 0 0 1 7.5 4a6.5 6.5 0 1 0 8.5 8.5z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="3" y="4" width="14" height="10" rx="1.5" />
      <path d="M7.5 17h5M10 14v3" />
    </svg>
  );
}

/** Cycles Dark → Light → System. Dark is the default until the person picks. */
export function ThemeToggle({ className }: { className?: string }) {
  const pref = useSyncExternalStore(subscribeTheme, readTheme, () => DEFAULT_THEME);
  return (
    <button
      type="button"
      onClick={() => applyTheme(nextTheme(pref))}
      aria-label={`Theme: ${LABEL[pref]}. Switch to ${LABEL[nextTheme(pref)]}`}
      title={`Theme: ${LABEL[pref]}`}
      className={cx('inline-flex size-10 items-center justify-center rounded-md border border-line-strong text-ink-soft transition-colors hover:text-ink', className)}
    >
      <Icon pref={pref} />
    </button>
  );
}
