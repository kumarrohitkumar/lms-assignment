'use client';

import { type ChangeEvent, type DragEvent, type FormEvent, useRef, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { formatBytes, formatDate } from '@/lib/format';
import type { ProfileResponse, SalarySlip } from '@/lib/types';
import { Alert, Button, cx } from '../ui';

const ACCEPTED = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_BYTES = 5 * 1024 * 1024;

function problemWith(file: File): string | null {
  if (!ACCEPTED.includes(file.type)) return 'Choose a PDF, JPG or PNG file.';
  if (file.size > MAX_BYTES) return `This file is ${formatBytes(file.size)}. The limit is 5 MB.`;
  return null;
}

interface Props {
  existing: SalarySlip | null;
  onUploaded: (res: ProfileResponse) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function SalarySlipUpload({ existing, onUploaded, onContinue, onBack }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function choose(f: File | undefined) {
    if (!f) return;
    const problem = problemWith(f);
    setError(problem);
    setFile(problem ? null : f);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return existing ? onContinue() : setError('Choose your salary slip to upload.');
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('file', file);
      onUploaded(await api<ProfileResponse>('/borrower/salary-slip', { body }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {error && <Alert>{error}</Alert>}
      {existing && !file && (
        <Alert tone="success" title="Salary slip on file">
          {existing.originalName} ({formatBytes(existing.size)}), uploaded {formatDate(existing.uploadedAt)}. Continue with it, or replace it below.
        </Alert>
      )}

      <div
        onDragOver={(e: DragEvent) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e: DragEvent) => {
          e.preventDefault();
          setDragging(false);
          choose(e.dataTransfer.files[0]);
        }}
        className={cx(
          'flex flex-col items-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors',
          dragging ? 'border-ledger bg-ledger-wash' : 'border-line-strong bg-paper',
        )}
      >
        <svg viewBox="0 0 24 24" className="size-9 text-ledger" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M7 3h7l5 5v13H7z" strokeLinejoin="round" />
          <path d="M14 3v5h5M10 13h6M10 17h4" strokeLinecap="round" />
        </svg>
        {file ? (
          <p className="mt-3 font-semibold">
            {file.name} <span className="font-normal text-ink-soft">({formatBytes(file.size)})</span>
          </p>
        ) : (
          <p className="mt-3 font-semibold">Drop your latest salary slip here</p>
        )}
        <p className="mt-1 text-sm text-ink-soft">PDF, JPG or PNG, up to 5 MB.</p>
        <Button type="button" variant="secondary" className="mt-4" onClick={() => inputRef.current?.click()}>
          {file || existing ? 'Choose a different file' : 'Choose file'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          className="sr-only"
          aria-label="Salary slip file"
          onChange={(e: ChangeEvent<HTMLInputElement>) => choose(e.target.files?.[0])}
        />
      </div>

      <div className="flex justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" loading={uploading} disabled={!file && !existing}>
          {file ? 'Upload and continue' : 'Continue'}
        </Button>
      </div>
    </form>
  );
}
