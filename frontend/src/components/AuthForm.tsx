'use client';

import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import { api, ApiError, errorMessage } from '@/lib/api';
import { canAccessPath, homePathFor } from '@/lib/rbac';
import type { User } from '@/lib/types';
import { Alert, Button, Field, TextInput } from './ui';

type Mode = 'login' | 'register';

export function AuthForm({ mode }: { mode: Mode }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      const body = mode === 'login' ? { email: form.email, password: form.password } : form;
      const { user } = await api<{ user: User }>(`/auth/${mode}`, { body });
      const next = new URLSearchParams(window.location.search).get('next');
      // Full navigation so the new session starts from a clean client state.
      window.location.assign(next && canAccessPath(user.role, next) ? next : homePathFor(user.role));
      return;
    } catch (err) {
      if (err instanceof ApiError && Array.isArray(err.details)) {
        setFieldErrors(Object.fromEntries((err.details as { field: string; message: string }[]).map((d) => [d.field, d.message])));
      }
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      {error && <Alert>{error}</Alert>}
      {mode === 'register' && (
        <Field label="Full name" error={fieldErrors.name}>
          {(id, d) => <TextInput id={id} aria-describedby={d} autoComplete="name" value={form.name} onChange={set('name')} invalid={!!fieldErrors.name} required />}
        </Field>
      )}
      <Field label="Email" error={fieldErrors.email}>
        {(id, d) => (
          <TextInput id={id} aria-describedby={d} type="email" autoComplete="email" value={form.email} onChange={set('email')} invalid={!!fieldErrors.email} required />
        )}
      </Field>
      <Field label="Password" error={fieldErrors.password} hint={mode === 'register' ? 'At least 8 characters.' : undefined}>
        {(id, d) => (
          <TextInput
            id={id}
            aria-describedby={d}
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={form.password}
            onChange={set('password')}
            invalid={!!fieldErrors.password}
            required
          />
        )}
      </Field>
      <Button type="submit" loading={submitting} className="mt-1 w-full">
        {mode === 'login' ? 'Log in' : 'Create account'}
      </Button>
      <p className="text-center text-sm text-ink-soft">
        {mode === 'login' ? (
          <>
            New here?{' '}
            <Link href="/register" className="font-semibold text-ledger underline-offset-2 hover:underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-ledger underline-offset-2 hover:underline">
              Log in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
