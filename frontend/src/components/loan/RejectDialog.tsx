'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import type { DecisionStage, RejectionCategories } from '@/lib/types';
import { Alert, Button, cx, Modal, Spinner } from '../ui';

let cached: Promise<RejectionCategories> | null = null;
const loadCategories = () => (cached ??= api<RejectionCategories>('/decisions/rejection-categories').catch((e) => {
  cached = null;
  throw e;
}));

interface Props {
  open: boolean;
  stage: DecisionStage;
  applicant: string;
  onClose: () => void;
  onSubmit: (input: { category: string; note?: string }) => Promise<void>;
}

/** Turning a loan down always records why: a category the borrower will see, plus an optional note. */
export function RejectDialog({ open, stage, applicant, onClose, onSubmit }: Props) {
  const [categories, setCategories] = useState<RejectionCategories | null>(null);
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) loadCategories().then(setCategories, (e) => setError(errorMessage(e)));
  }, [open]);

  function close() {
    setCategory('');
    setNote('');
    setError(null);
    onClose();
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!category) return setError('Choose the reason for rejecting.');
    if (category === 'OTHER' && note.trim().length < 3) return setError('Describe the reason (at least 3 characters).');
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ category, ...(note.trim() ? { note: note.trim() } : {}) });
      close();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const options = categories?.[stage] ?? [];
  return (
    <Modal open={open} onClose={close} title={stage === 'SANCTION' ? 'Reject this application?' : 'Stop this disbursal?'}>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <p className="text-sm text-ink-soft">{applicant} will see the reason you choose on their application.</p>
        {!categories && !error && (
          <p className="flex items-center gap-2 text-sm text-ink-soft">
            <Spinner className="size-4" /> Loading reasons…
          </p>
        )}
        {options.length > 0 && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Reason</legend>
            {options.map((o) => (
              <label
                key={o.value}
                className={cx(
                  'flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors',
                  category === o.value ? 'border-rust/50 bg-rust-wash' : 'border-line hover:border-line-strong',
                )}
              >
                <input type="radio" name="category" value={o.value} checked={category === o.value} onChange={() => setCategory(o.value)} className="mt-0.5 accent-rust" />
                {o.label}
              </label>
            ))}
          </fieldset>
        )}
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Note for the borrower {category === 'OTHER' ? '(required)' : '(optional)'}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full rounded-md border border-line-strong bg-surface px-3 py-2 font-normal focus:border-ledger focus:outline-none focus:ring-2 focus:ring-ledger/20"
            placeholder="For example: the slip shows ₹32,000, but ₹60,000 was declared"
          />
        </label>
        {error && <Alert>{error}</Alert>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" loading={saving}>
            {stage === 'SANCTION' ? 'Reject application' : 'Reject loan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
