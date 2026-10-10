import { createPortal } from 'react-dom';
import { cx } from '@/lib/cx';

/**
 * The Kosh ledger mark, writing its own lines: a loading state that looks like the product rather than
 * a generic spinner. The lines stop moving when the person prefers reduced motion.
 */
export function BrandLoader({ label, size = 'md', className }: { label: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const px = { sm: 'size-8', md: 'size-12', lg: 'size-20' }[size];
  return (
    <div role="status" aria-label={label} className={cx('flex flex-col items-center gap-3', className)}>
      <span className="loader-ring relative grid place-items-center rounded-2xl">
        <svg viewBox="0 0 32 32" className={px} aria-hidden="true">
          <rect x="3" y="6" width="26" height="20" rx="3" className="fill-ledger" />
          <path d="M16 8v16" stroke="#fff" strokeOpacity=".55" strokeWidth="1.5" />
          <g stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none">
            <path className="ledger-line" style={{ '--d': '0s' } as React.CSSProperties} d="M7 13h6" />
            <path className="ledger-line" style={{ '--d': '.15s' } as React.CSSProperties} d="M7 17h6" />
            <path className="ledger-line" style={{ '--d': '.3s' } as React.CSSProperties} d="M19 13h6" />
            <path className="ledger-line" style={{ '--d': '.45s' } as React.CSSProperties} d="M19 17h4" />
          </g>
        </svg>
      </span>
      <span className={cx('text-ink-soft', size === 'sm' ? 'text-sm' : 'text-base')}>{label}…</span>
    </div>
  );
}

/**
 * Covers the page while a login or sign-up hands over to the next screen: a shield draws itself and the
 * real steps tick off one by one (the account is verified and the session set before this appears; the
 * last step is the next page loading).
 */
export function SigningInOverlay({ title, steps, label }: { title: string; steps: [string, string, string]; label: string }) {
  // A portal into <body>: inside an animated (transformed) ancestor, `fixed` would only cover that ancestor.
  return createPortal(
    <div role="status" aria-label={label} className="anim-fade fixed inset-0 z-50 grid place-items-center bg-paper/95 px-6 backdrop-blur-sm">
      <div className="flex w-full max-w-xs flex-col items-center text-center">
        <svg viewBox="0 0 64 64" className="size-20" aria-hidden="true">
          <circle cx="32" cy="32" r="30" className="shield-halo" fill="var(--color-ledger)" fillOpacity="0.12" />
          <path
            className="shield-draw"
            d="M32 9 L50 16 V30 C50 42 42 51 32 55 C22 51 14 42 14 30 V16 Z"
            fill="none"
            stroke="var(--color-ledger)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path className="shield-check" d="M23 32 L29.5 38.5 L41.5 26" fill="none" stroke="var(--color-ledger)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="anim-rise mt-5 text-xl font-semibold text-ink">{title}</p>
        <ol className="mt-5 flex w-full flex-col gap-2.5 text-left">
          {steps.map((step, i) => {
            const last = i === steps.length - 1;
            return (
              <li key={step} className="trust-step flex items-center gap-3 text-sm text-ink" style={{ '--i': i } as React.CSSProperties}>
                <span className={cx('grid size-6 shrink-0 place-items-center rounded-full', last ? 'bg-ledger-wash' : 'bg-ledger text-white')}>
                  {last ? (
                    <span className="size-3 animate-spin rounded-full border-2 border-ledger border-t-transparent" aria-hidden="true" />
                  ) : (
                    <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3.5 8.5l3 3 6-7" />
                    </svg>
                  )}
                </span>
                {step}
              </li>
            );
          })}
        </ol>
      </div>
    </div>,
    document.body,
  );
}
