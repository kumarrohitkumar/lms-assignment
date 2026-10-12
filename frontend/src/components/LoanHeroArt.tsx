'use client';

import { useCountUp } from '@/hooks/useCountUp';

const STAGES = ['Applied', 'Sanctioned', 'Disbursed'] as const;

/**
 * The login panel's picture: a loan card that keeps moving through its journey. Drawn in HTML/CSS (no
 * stock photo) so it matches the product; it sits on the green panel in both themes, so its colours are fixed.
 */
export function LoanHeroArt() {
  const amount = Math.round(useCountUp(150000, 1400));
  return (
    <div
      role="img"
      aria-label="A loan card moving from Applied to Sanctioned to Disbursed"
      className="relative mx-auto h-[270px] w-full max-w-[440px] select-none"
    >
      {/* Rupee coins drifting up behind the cards */}
      {[
        { left: '6%', delay: '0s', size: 34 },
        { left: '86%', delay: '2.2s', size: 28 },
        { left: '72%', delay: '4.1s', size: 22 },
      ].map((c) => (
        <span
          key={c.left}
          aria-hidden="true"
          className="hero-coin absolute bottom-2 grid place-items-center rounded-full bg-[#f2c37c] font-bold text-[#7a4d06] shadow-md"
          style={{ left: c.left, width: c.size, height: c.size, fontSize: c.size * 0.5, animationDelay: c.delay }}
        >
          ₹
        </span>
      ))}

      {/* Back card: what will be repaid */}
      <div className="hero-back absolute top-0 right-0 w-[56%] rounded-2xl bg-white/95 p-4 text-[#1b2430] shadow-xl">
        <p className="text-xs font-medium text-[#4a5563]">Total to repay</p>
        <p className="tabular mt-0.5 text-lg font-bold">₹1,55,917.81</p>
        <p className="text-xs text-[#4a5563]">in 120 days at 12% a year</p>
        <div className="mt-3 flex h-8 w-[55%] items-end gap-1" aria-hidden="true">
          {[40, 55, 35, 70, 60, 85, 100].map((h, i) => (
            <span key={i} className="hero-bar flex-1 rounded-sm bg-[#0f6b4f]/70" style={{ height: `${h}%`, animationDelay: `${0.4 + i * 0.08}s` }} />
          ))}
        </div>
      </div>

      {/* Front card: the application itself */}
      <div className="hero-front absolute bottom-0 left-0 w-[86%] rounded-2xl bg-white p-4 text-[#1b2430] shadow-2xl sm:w-[70%] sm:p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-[#0f6b4f] text-sm font-bold text-white">RK</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">Rohit Kumar</p>
            <p className="whitespace-nowrap text-xs text-[#4a5563]">Personal loan</p>
          </div>
          <span className="relative h-6 w-[92px]">
            {STAGES.map((s, i) => (
              <span
                key={s}
                className="hero-chip absolute inset-0 grid place-items-center rounded-full text-[11px] font-semibold"
                style={{
                  animationDelay: `${i * 3}s`,
                  background: ['#fcf1df', '#e6eef6', '#e5f1ec'][i],
                  color: ['#8a5a10', '#24527a', '#0a5039'][i],
                }}
              >
                {s}
              </span>
            ))}
          </span>
        </div>
        <p className="tabular mt-4 text-3xl font-bold tracking-tight">₹{amount.toLocaleString('en-IN')}</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#dde2dc]" aria-hidden="true">
          <div className="hero-progress h-full rounded-full bg-[#0f6b4f]" />
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-[#4a5563]">
          <span>Applied</span>
          <span>Sanctioned</span>
          <span>Disbursed</span>
        </div>
      </div>
    </div>
  );
}
