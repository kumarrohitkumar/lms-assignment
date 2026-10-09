'use client';

import { useId, useState } from 'react';
import { formatDays, formatINR } from '@/lib/format';
import { calculateLoan, INTEREST_RATE_PA, LOAN_LIMITS } from '@/lib/loanMath';
import { Button } from '../ui';

interface Props {
  onApply: (input: { principal: number; tenureDays: number }) => void;
  submitting?: boolean;
}

function Slider({
  label,
  value,
  display,
  min,
  max,
  step,
  minLabel,
  maxLabel,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  minLabel: string;
  maxLabel: string;
  onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="font-medium">
          {label}
        </label>
        <output htmlFor={id} className="tabular text-xl font-semibold">
          {display}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 h-2 w-full cursor-pointer"
      />
      <div className="tabular mt-1 flex justify-between text-xs text-ink-faint">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

/** Sliders on the left, a repayment slip on the right that recalculates as they move. */
export function LoanCalculator({ onApply, submitting }: Props) {
  const [principal, setPrincipal] = useState(100_000);
  const [tenureDays, setTenureDays] = useState(90);
  const { simpleInterest, totalRepayment } = calculateLoan(principal, tenureDays);

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_minmax(0,20rem)]">
      <div className="flex flex-col gap-8">
        <Slider
          label="Loan amount"
          value={principal}
          display={formatINR(principal)}
          min={LOAN_LIMITS.minPrincipal}
          max={LOAN_LIMITS.maxPrincipal}
          step={LOAN_LIMITS.principalStep}
          minLabel="₹50,000"
          maxLabel="₹5,00,000"
          onChange={setPrincipal}
        />
        <Slider
          label="Tenure"
          value={tenureDays}
          display={formatDays(tenureDays)}
          min={LOAN_LIMITS.minTenureDays}
          max={LOAN_LIMITS.maxTenureDays}
          step={1}
          minLabel="30 days"
          maxLabel="365 days"
          onChange={setTenureDays}
        />
        <p className="text-sm text-ink-soft">
          Interest is simple interest at {INTEREST_RATE_PA}% a year, charged for the exact number of days:
          <span className="tabular mt-1 block text-ink">
            {formatINR(principal)} × {INTEREST_RATE_PA}% × {tenureDays} ÷ 365 = {formatINR(simpleInterest)}
          </span>
        </p>
      </div>

      <div aria-live="polite" className="receipt relative rounded-b-lg bg-ledger-wash px-6 pb-6 pt-7">
        <p className="text-sm font-semibold text-ledger-dark">Your repayment</p>
        <dl className="tabular mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Amount borrowed</dt>
            <dd data-testid="principal" className="font-medium">
              {formatINR(principal)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Interest for {formatDays(tenureDays)}</dt>
            <dd data-testid="interest" className="font-medium">
              {formatINR(simpleInterest)}
            </dd>
          </div>
          <div className="border-t border-dashed border-ledger/40 pt-3">
            <dt className="text-ink-soft">Total to repay</dt>
            <dd data-testid="total" className="mt-1 text-3xl font-bold tracking-tight text-ledger-dark">
              {formatINR(totalRepayment)}
            </dd>
          </div>
        </dl>
        <Button className="mt-6 w-full" loading={submitting} onClick={() => onApply({ principal, tenureDays })}>
          Apply for {formatINR(principal)}
        </Button>
      </div>
    </div>
  );
}
