import Link from 'next/link';

/** A ledger-book mark: two pages and a ruled line. */
export function Brand({ href = '/', subtitle, light }: { href?: string; subtitle?: string; light?: boolean }) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2.5 ${light ? 'text-white' : 'text-ink'}`}>
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
        <rect x="3" y="6" width="26" height="20" rx="3" className={light ? 'fill-white/15' : 'fill-ledger'} />
        <path d="M16 8v16" stroke="#fff" strokeOpacity=".55" strokeWidth="1.5" />
        <path d="M7 13h6M7 17h6M19 13h6M19 17h4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <span className="leading-tight">
        <span className="block text-lg font-bold tracking-tight">Kosh</span>
        {subtitle && <span className="block text-xs text-ink-soft">{subtitle}</span>}
      </span>
    </Link>
  );
}
