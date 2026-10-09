'use client';

import { type FormEvent, useState } from 'react';
import { api, ApiError, errorMessage } from '@/lib/api';
import { checkEligibility } from '@/lib/bre';
import { todayIst } from '@/lib/dates';
import type { BreFailure, EmploymentMode, Profile, ProfileResponse } from '@/lib/types';
import { Alert, Button, Field, SelectInput, TextInput } from '../ui';

interface Props {
  initial: Profile | null;
  onSaved: (res: ProfileResponse) => void;
}


export function PersonalDetailsForm({ initial, onSaved }: Props) {
  const [form, setForm] = useState({
    fullName: initial?.fullName ?? '',
    pan: initial?.pan ?? '',
    dateOfBirth: initial?.dateOfBirth ?? '',
    monthlySalary: initial ? String(initial.monthlySalary) : '',
    employmentMode: (initial?.employmentMode ?? '') as EmploymentMode | '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [rejection, setRejection] = useState<BreFailure[] | null>(initial?.bre && !initial.bre.passed ? initial.bre.failures : null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: key === 'pan' ? e.target.value.toUpperCase() : e.target.value }));

  // Live hints as the user types; the decision itself is made by the server on submit.
  const complete = form.dateOfBirth && form.monthlySalary && form.employmentMode && form.pan.length >= 10;
  const hints = complete
    ? Object.fromEntries(
        checkEligibility({ ...form, monthlySalary: Number(form.monthlySalary), employmentMode: form.employmentMode as EmploymentMode }).map(
          (f) => [f.rule, f.message],
        ),
      )
    : {};

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const missing: Record<string, string> = {};
    if (form.fullName.trim().length < 2) missing.fullName = 'Enter your full name as on your PAN card.';
    if (!form.pan.trim()) missing.pan = 'Enter your PAN.';
    if (!form.dateOfBirth) missing.dateOfBirth = 'Enter your date of birth.';
    if (!form.monthlySalary || Number(form.monthlySalary) <= 0) missing.monthlySalary = 'Enter your monthly take-home salary.';
    if (!form.employmentMode) missing.employmentMode = 'Choose how you are employed.';
    setFieldErrors(missing);
    if (Object.keys(missing).length) return;

    setSubmitting(true);
    setError(null);
    setRejection(null);
    try {
      const res = await api<ProfileResponse>('/borrower/profile', {
        method: 'PUT',
        body: { ...form, monthlySalary: Number(form.monthlySalary) },
      });
      onSaved(res);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'BRE_REJECTED') {
        setRejection(err.details as BreFailure[]);
      } else if (err instanceof ApiError && Array.isArray(err.details)) {
        setFieldErrors(Object.fromEntries((err.details as { field: string; message: string }[]).map((d) => [d.field, d.message])));
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {rejection && (
        <Alert title="You are not eligible for a loan right now">
          <ul className="list-disc space-y-0.5 pl-5">
            {rejection.map((f) => (
              <li key={f.rule}>{f.message}</li>
            ))}
          </ul>
          <p className="mt-2">If any detail above is wrong, correct it and check again.</p>
        </Alert>
      )}
      {error && <Alert>{error}</Alert>}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Full name" error={fieldErrors.fullName} hint="As printed on your PAN card.">
            {(id, d) => <TextInput id={id} aria-describedby={d} autoComplete="name" value={form.fullName} onChange={set('fullName')} invalid={!!fieldErrors.fullName} />}
          </Field>
        </div>
        <Field label="PAN" error={fieldErrors.pan ?? hints.PAN} hint="10 characters, like ABCPE1234F.">
          {(id, d) => (
            <TextInput
              id={id}
              aria-describedby={d}
              value={form.pan}
              onChange={set('pan')}
              maxLength={10}
              autoCapitalize="characters"
              spellCheck={false}
              className="tabular uppercase tracking-wider"
              invalid={!!(fieldErrors.pan ?? hints.PAN)}
            />
          )}
        </Field>
        <Field label="Date of birth" error={fieldErrors.dateOfBirth ?? hints.AGE} hint="You must be 23 to 50 years old.">
          {(id, d) => (
            <TextInput id={id} aria-describedby={d} type="date" max={todayIst()} value={form.dateOfBirth} onChange={set('dateOfBirth')} invalid={!!(fieldErrors.dateOfBirth ?? hints.AGE)} />
          )}
        </Field>
        <Field label="Monthly salary (₹)" error={fieldErrors.monthlySalary ?? hints.SALARY} hint="Take-home pay. Minimum ₹25,000.">
          {(id, d) => (
            <TextInput
              id={id}
              aria-describedby={d}
              type="number"
              inputMode="numeric"
              min={0}
              step="any"
              value={form.monthlySalary}
              onChange={set('monthlySalary')}
              className="tabular"
              invalid={!!(fieldErrors.monthlySalary ?? hints.SALARY)}
            />
          )}
        </Field>
        <Field label="Employment" error={fieldErrors.employmentMode ?? hints.EMPLOYMENT}>
          {(id, d) => (
            <SelectInput id={id} aria-describedby={d} value={form.employmentMode} onChange={set('employmentMode')} invalid={!!(fieldErrors.employmentMode ?? hints.EMPLOYMENT)}>
              <option value="" disabled>
                Choose one
              </option>
              <option value="SALARIED">Salaried</option>
              <option value="SELF_EMPLOYED">Self-employed</option>
              <option value="UNEMPLOYED">Unemployed</option>
            </SelectInput>
          )}
        </Field>
      </div>

      <div className="flex justify-end">
        <Button type="submit" loading={submitting}>
          Check eligibility
        </Button>
      </div>
    </form>
  );
}
