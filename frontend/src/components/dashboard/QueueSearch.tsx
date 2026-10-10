'use client';

import { useEffect, useState } from 'react';

/** Search box that reports its value after the user pauses typing. */
export function QueueSearch({ onSearch, placeholder = 'Search by name, email or PAN' }: { onSearch: (q: string) => void; placeholder?: string }) {
  const [value, setValue] = useState('');
  useEffect(() => {
    const id = setTimeout(() => onSearch(value.trim()), 300);
    return () => clearTimeout(id);
  }, [value, onSearch]);

  return (
    <label className="anim-fade relative block max-w-md">
      <span className="sr-only">Search</span>
      <svg viewBox="0 0 20 20" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="9" cy="9" r="5.5" />
        <path d="M13.5 13.5L17 17" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="min-h-10 w-full rounded-md border border-line-strong bg-surface pr-3 pl-9 text-sm placeholder:text-ink-faint focus:border-ledger focus:outline-none focus:ring-2 focus:ring-ledger/20"
      />
    </label>
  );
}
