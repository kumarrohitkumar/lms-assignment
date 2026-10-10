import type { ReactNode } from 'react';
import { Brand } from './Brand';

export function AuthLayout({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_minmax(0,34rem)]">
      <aside className="hidden flex-col justify-between bg-ledger p-12 text-white lg:flex">
        <Brand href="/login" light />
        <div className="anim-rise max-w-md" style={{ '--i': 2 } as React.CSSProperties}>
          <p className="text-3xl font-semibold leading-snug">Personal loans from ₹50,000 to ₹5,00,000, at a flat 12% a year.</p>
          <p className="mt-4 text-white/75">
            Check your eligibility in a minute, upload one salary slip, and see exactly what you will repay before you apply.
          </p>
        </div>
        <p className="text-sm text-white/60">Simple interest, charged only for the days you borrow.</p>
      </aside>
      <div className="flex flex-col justify-center px-4 py-10 sm:px-10">
        <div className="anim-rise mx-auto w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Brand href="/login" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-ink-soft">{intro}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </main>
  );
}
