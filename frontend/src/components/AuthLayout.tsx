import type { ReactNode } from 'react';
import { Brand } from './Brand';
import { ThemeToggle } from './ThemeToggle';

const JOURNEY = ['Applied', 'Sanctioned', 'Disbursed', 'Closed'];

/** Only claims the product actually makes good on. */
const PROMISES = [
  { title: 'Know the cost first', body: 'Simple interest at 12% a year, shown before you apply. No hidden charges.', icon: 'M4 10h12M4 6h12M4 14h7' },
  { title: 'Your password stays secret', body: 'Stored only as a bcrypt hash; nobody at Kosh can read it.', icon: 'M6 9V7a4 4 0 0 1 8 0v2M5 9h10v8H5z' },
  { title: 'Documents kept private', body: 'Salary slips sit in encrypted storage, opened only by you and the loan team.', icon: 'M5 3h7l3 3v11H5zM12 3v3h3' },
];

function Promise({ title, body, icon, i }: { title: string; body: string; icon: string; i: number }) {
  return (
    <li className="anim-rise flex gap-3" style={{ '--i': i + 6 } as React.CSSProperties}>
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-white/12">
        <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d={icon} />
        </svg>
      </span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-white/70">{body}</span>
      </span>
    </li>
  );
}

export function AuthLayout({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_minmax(0,34rem)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-ledger p-12 text-white lg:flex">
        {/* Faint ledger rules in the background. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 44px)' }}
        />
        <Brand href="/login" light />

        <div className="relative max-w-md">
          <p className="anim-rise text-3xl font-semibold leading-snug" style={{ '--i': 1 } as React.CSSProperties}>
            Personal loans from ₹50,000 to ₹5,00,000, at a flat 12% a year.
          </p>
          <p className="anim-rise mt-4 text-white/75" style={{ '--i': 2 } as React.CSSProperties}>
            Check your eligibility in a minute, upload one salary slip, and see exactly what you will repay before you apply.
          </p>

          {/* The loan journey lights up step by step. */}
          <ol className="anim-rise relative mt-10 grid grid-cols-4" aria-label="How a loan moves" style={{ '--i': 3 } as React.CSSProperties}>
            <span aria-hidden="true" className="absolute top-4 right-[12.5%] left-[12.5%] h-0.5 bg-white/20" />
            <span aria-hidden="true" className="journey-track absolute top-4 right-[12.5%] left-[12.5%] h-0.5 bg-white" />
            {JOURNEY.map((step, i) => (
              <li key={step} className="relative flex flex-col items-center gap-2 text-center">
                <span className="journey-step grid size-8 place-items-center rounded-full text-sm font-bold" style={{ '--i': i } as React.CSSProperties}>
                  {i + 1}
                </span>
                <span className="text-sm text-white/85">{step}</span>
              </li>
            ))}
          </ol>

          <ul className="mt-10 flex flex-col gap-4">
            {PROMISES.map((p, i) => (
              <Promise key={p.title} {...p} i={i} />
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-white/60">Simple interest, charged only for the days you borrow.</p>
      </aside>

      <div className="relative flex flex-col justify-center px-4 py-10 sm:px-10">
        <ThemeToggle className="absolute top-4 right-4" />
        <div className="anim-rise mx-auto w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Brand href="/login" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-ink-soft">{intro}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-ink-faint">
            <svg viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 9V7a4 4 0 0 1 8 0v2M5 9h10v8H5z" />
            </svg>
            Secure sign-in over HTTPS. Your session cookie can&apos;t be read by scripts.
          </p>
        </div>
      </div>
    </main>
  );
}
