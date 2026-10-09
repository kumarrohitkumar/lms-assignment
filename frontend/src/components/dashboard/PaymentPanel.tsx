'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { api, ApiError, errorMessage } from '@/lib/api';
import { formatDate, formatINR } from '@/lib/format';
import type { Loan, Payment } from '@/lib/types';
import { Alert, Button, Field, TextInput } from '../ui';

const todayIst = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);

export function PaymentPanel({ loan, onRecorded }: { loan: Loan; onRecorded: (loan: Loan) => void }) {
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [form, setForm] = useState({ utr: '', amount: '', paymentDate: todayIst() });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<{ payments: Payment[] }>(`/collection/loans/${loan.id}/payments`)
      .then((d) => setPayments(d.payments))
      .catch((err) => setError(errorMessage(err)));
  }, [loan.id]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: key === 'utr' ? e.target.value.toUpperCase() : e.target.value }));

  function validate() {
    const next: Record<string, string> = {};
    const amount = Number(form.amount);
    if (!/^[A-Z0-9]{8,30}$/.test(form.utr.trim())) next.utr = 'UTR must be 8–30 letters or digits.';
    if (!form.amount || !(amount > 0)) next.amount = 'Enter an amount greater than zero.';
    else if (Math.abs(Math.round(amount * 100) - amount * 100) > 1e-6) next.amount = 'Use at most 2 decimal places.';
    else if (amount > loan.outstanding) next.amount = `Cannot be more than the outstanding ${formatINR(loan.outstanding)}.`;
    if (!form.paymentDate) next.paymentDate = 'Choose the date the money was received.';
    else if (form.paymentDate > todayIst()) next.paymentDate = 'The payment date cannot be in the future.';
    return next;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    setError(null);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      const res = await api<{ loan: Loan; payment: Payment }>(`/collection/loans/${loan.id}/payments`, {
        body: { utr: form.utr.trim(), amount: Number(form.amount), paymentDate: form.paymentDate },
      });
      setPayments((p) => [...(p ?? []), res.payment]);
      setForm({ utr: '', amount: '', paymentDate: todayIst() });
      onRecorded(res.loan);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'DUPLICATE_UTR') setErrors({ utr: err.message });
      else if (err instanceof ApiError && err.code === 'AMOUNT_EXCEEDS_OUTSTANDING') setErrors({ amount: err.message });
      else if (err instanceof ApiError && Array.isArray(err.details)) {
        setErrors(Object.fromEntries((err.details as { field: string; message: string }[]).map((d) => [d.field, d.message])));
      } else setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-5 grid gap-6 border-t border-line pt-5 lg:grid-cols-2">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <p className="font-semibold">Record a payment</p>
        {error && <Alert>{error}</Alert>}
        <Field label="UTR number" error={errors.utr} hint="The bank reference for the transfer. Each UTR can be used once.">
          {(id, d) => <TextInput id={id} aria-describedby={d} value={form.utr} onChange={set('utr')} spellCheck={false} className="tabular uppercase" invalid={!!errors.utr} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount (₹)" error={errors.amount}>
            {(id, d) => (
              <div className="flex flex-col gap-1">
                <TextInput id={id} aria-describedby={d} type="number" inputMode="decimal" min={0} step="0.01" value={form.amount} onChange={set('amount')} className="tabular" invalid={!!errors.amount} />
                <button type="button" className="self-start text-xs font-medium text-ledger underline underline-offset-2" onClick={() => setForm((f) => ({ ...f, amount: String(loan.outstanding) }))}>
                  Fill outstanding {formatINR(loan.outstanding)}
                </button>
              </div>
            )}
          </Field>
          <Field label="Payment date" error={errors.paymentDate}>
            {(id, d) => <TextInput id={id} aria-describedby={d} type="date" max={todayIst()} value={form.paymentDate} onChange={set('paymentDate')} invalid={!!errors.paymentDate} />}
          </Field>
        </div>
        <div>
          <Button type="submit" loading={saving}>
            Record payment
          </Button>
        </div>
      </form>

      <div>
        <p className="font-semibold">Payment history</p>
        {payments === null && !error && <p className="mt-3 text-sm text-ink-soft">Loading…</p>}
        {payments?.length === 0 && <p className="mt-3 text-sm text-ink-soft">No payments recorded yet.</p>}
        {payments && payments.length > 0 && (
          <ul className="tabular mt-3 divide-y divide-line text-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate font-medium tracking-wide">{p.utr}</span>
                  <span className="text-ink-soft">{formatDate(p.paymentDate)}</span>
                </span>
                <span className="font-semibold">{formatINR(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
