'use client';

import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, useEffect, useId, useRef } from 'react';
import type { LoanStatus } from '@/lib/types';

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
const variants: Record<Variant, string> = {
  primary: 'bg-ledger text-white hover:bg-ledger-dark disabled:bg-ledger/50',
  secondary: 'bg-surface text-ink border border-line-strong hover:border-ink-faint disabled:text-ink-faint',
  danger: 'bg-surface text-rust border border-rust/40 hover:bg-rust-wash disabled:opacity-50',
  ghost: 'text-ink-soft hover:text-ink hover:bg-ink/5',
};

export function Button({
  variant = 'primary',
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cx(
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed',
        variants[variant],
        className,
      )}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
}

export function Spinner({ className = 'size-5' }: { className?: string }) {
  return (
    <svg className={cx('animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

interface FieldProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  children: (id: string, describedBy?: string) => ReactNode;
}

export function Field({ label, error, hint, children }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children(id, describedBy)}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-rust">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-ink-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const control =
  'min-h-11 w-full rounded-md border bg-surface px-3 text-ink placeholder:text-ink-faint/80 focus:border-ledger focus:outline-none focus:ring-2 focus:ring-ledger/20';

export function TextInput({ invalid, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input {...props} aria-invalid={invalid || undefined} className={cx(control, invalid ? 'border-rust' : 'border-line-strong', className)} />;
}

export function SelectInput({ invalid, className, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return <select {...props} aria-invalid={invalid || undefined} className={cx(control, invalid ? 'border-rust' : 'border-line-strong', className)} />;
}

export function Alert({ tone = 'error', title, children }: { tone?: 'error' | 'success' | 'info'; title?: string; children?: ReactNode }) {
  const tones = {
    error: 'border-rust/30 bg-rust-wash text-rust',
    success: 'border-ledger/30 bg-ledger-wash text-ledger-dark',
    info: 'border-sky-ink/20 bg-sky-wash text-sky-ink',
  };
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cx('rounded-md border px-4 py-3 text-sm', tones[tone])}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? 'mt-1' : undefined}>{children}</div>}
    </div>
  );
}

const statusStyles: Record<LoanStatus, { label: string; className: string }> = {
  APPLIED: { label: 'Applied', className: 'bg-saffron-wash text-saffron-ink' },
  SANCTIONED: { label: 'Sanctioned', className: 'bg-sky-wash text-sky-ink' },
  DISBURSED: { label: 'Disbursed', className: 'bg-ledger-wash text-ledger-dark' },
  CLOSED: { label: 'Closed', className: 'bg-ink/8 text-ink-soft' },
  REJECTED: { label: 'Rejected', className: 'bg-rust-wash text-rust' },
};

export function StatusBadge({ status }: { status: LoanStatus }) {
  const s = statusStyles[status];
  return <span className={cx('inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold', s.className)}>{s.label}</span>;
}

export function Panel({ className, children, style }: { className?: string; children: ReactNode; style?: React.CSSProperties }) {
  return (
    <section className={cx('rounded-lg border border-line bg-surface', className)} style={style}>
      {children}
    </section>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line-strong px-6 py-12 text-center">
      <p className="font-semibold text-ink">{title}</p>
      {children && <div className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">{children}</div>}
    </div>
  );
}

export function LoadingBlock({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-ink-soft" role="status">
      <Spinner /> {label}…
    </div>
  );
}

/** Placeholder blocks that shimmer while content loads. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('skeleton', className)} aria-hidden="true" />;
}

export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-lg border border-line bg-surface p-5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-3 h-3 w-64 max-w-full" />
          <Skeleton className="mt-6 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}

/** A panel that slides in from the right; on phones it covers the screen. Native <dialog> underneath. */
export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="drawer fixed inset-y-0 right-0 left-auto m-0 h-full max-h-none w-full max-w-xl border-l border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-ink/40"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-ink-soft hover:bg-ink/5 hover:text-ink" aria-label="Close">
            <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </dialog>
  );
}

/** Native <dialog>: focus trapping and Esc-to-close come for free. */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-ink/40"
    >
      <div className="p-6">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="mt-4">{children}</div>
      </div>
    </dialog>
  );
}

export { cx };
