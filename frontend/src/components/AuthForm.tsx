'use client';

import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import { api, ApiError, errorMessage } from '@/lib/api';
import { navigate } from '@/lib/navigate';
import { safeNextPath } from '@/lib/rbac';
import type { User } from '@/lib/types';
import { SigningInOverlay } from './BrandLoader';
import { Alert, Button, Field, TextInput } from './ui';

type Mode = 'login' | 'register';

/** Long enough for the trust steps to be seen; the next page loads in the meantime anyway. */
const HANDOFF_MS = 900;

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
      <path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10z" />
      <circle cx="10" cy="10" r="2.4" />
      {!open && <path d="M3.5 3.5l13 13" />}
    </svg>
  );
}

export function AuthForm({ mode }: { mode: Mode }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [shake, setShake] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [signedIn, setSignedIn] = useState<User | null>(null);

  const title = mode === 'login' ? 'Log in' : 'Create account';
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setShake(false);
    setError(null);
    setFieldErrors({});
    try {
      const body = mode === 'login' ? { email: form.email, password: form.password } : form;
      const { user } = await api<{ user: User }>(`/auth/${mode}`, { body });
      setSignedIn(user);
      const next = new URLSearchParams(window.location.search).get('next');
      window.setTimeout(() => navigate(safeNextPath(user.role, next)), HANDOFF_MS);
    } catch (err) {
      if (err instanceof ApiError && Array.isArray(err.details)) {
        setFieldErrors(Object.fromEntries((err.details as { field: string; message: string }[]).map((d) => [d.field, d.message])));
      }
      setError(errorMessage(err));
      setShake(true);
      setSubmitting(false);
    }
  }

  const firstName = signedIn?.name.split(/\s+/)[0] ?? '';
  const destination = signedIn?.role === 'BORROWER' ? 'Opening your loan application' : 'Opening your dashboard';

  return (
    <>
      {signedIn && (
        <SigningInOverlay
          label={mode === 'login' ? 'Signing you in' : 'Setting up your account'}
          title={mode === 'login' ? `Signing you in, ${firstName}` : `Welcome to Kosh, ${firstName}`}
          steps={[mode === 'login' ? 'Details verified' : 'Account created', 'Secure session created', destination]}
        />
      )}
      <form
        onSubmit={onSubmit}
        aria-label={title}
        data-shake={shake ? 'true' : undefined}
        onAnimationEnd={() => setShake(false)}
        className="flex flex-col gap-5"
        noValidate
      >
        {error && (
          <div className="anim-rise">
            <Alert>{error}</Alert>
          </div>
        )}
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
            <div className="relative">
              <TextInput
                id={id}
                aria-describedby={d}
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={form.password}
                onChange={set('password')}
                invalid={!!fieldErrors.password}
                className="pr-11"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 grid w-11 place-items-center text-ink-faint transition-colors hover:text-ink"
              >
                <EyeIcon open={!showPassword} />
              </button>
            </div>
          )}
        </Field>
        <Button type="submit" loading={submitting || !!signedIn} className="mt-1 w-full">
          {title}
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
    </>
  );
}
