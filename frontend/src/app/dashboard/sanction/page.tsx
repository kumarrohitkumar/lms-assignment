'use client';

import { type FormEvent, useState } from 'react';
import { LoanCard } from '@/components/dashboard/LoanCard';
import { ModulePage } from '@/components/dashboard/ModulePage';
import { RefreshButton } from '@/components/dashboard/RefreshButton';
import { useQueue } from '@/components/dashboard/useQueue';
import { Alert, Button, EmptyState, Field, LoadingBlock, Modal } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { formatINR } from '@/lib/format';
import type { Loan } from '@/lib/types';

export default function SanctionPage() {
  const { items: loans, error, reload, refreshing, updatedAt, remove } = useQueue<Loan>('/sanction/loans', 'loans');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [rejecting, setRejecting] = useState<Loan | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);

  async function approve(loan: Loan) {
    setBusy(loan.id);
    setNotice(null);
    try {
      await api(`/sanction/loans/${loan.id}/approve`, { method: 'POST' });
      remove(loan.id);
      setNotice({ tone: 'success', text: `Sanctioned ${formatINR(loan.principal)} for ${loan.applicant.fullName}. It is now with Disbursement.` });
    } catch (err) {
      setNotice({ tone: 'error', text: errorMessage(err) });
      reload();
    } finally {
      setBusy(null);
    }
  }

  async function reject(e: FormEvent) {
    e.preventDefault();
    if (!rejecting) return;
    if (reason.trim().length < 3) return setReasonError('Give the borrower a reason (at least 3 characters).');
    setBusy(rejecting.id);
    try {
      await api(`/sanction/loans/${rejecting.id}/reject`, { body: { reason } });
      remove(rejecting.id);
      setNotice({ tone: 'success', text: `Rejected the application from ${rejecting.applicant.fullName}.` });
      closeReject();
    } catch (err) {
      setReasonError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  function closeReject() {
    setRejecting(null);
    setReason('');
    setReasonError(null);
  }

  return (
    <ModulePage
      module="sanction"
      actions={<RefreshButton onRefresh={() => {
          setNotice(null);
          reload();
        }} refreshing={refreshing} updatedAt={updatedAt} />}
    >
      {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}
      {error && <Alert>{error}</Alert>}
      {!loans && !error && <LoadingBlock label="Loading applications" />}
      {loans?.length === 0 && <EmptyState title="No applications waiting">New applications will appear here as borrowers apply.</EmptyState>}
      {loans?.map((loan) => (
        <LoanCard key={loan.id} loan={loan}>
          <Button onClick={() => approve(loan)} loading={busy === loan.id && !rejecting} disabled={!!busy}>
            Approve
          </Button>
          <Button variant="danger" onClick={() => setRejecting(loan)} disabled={!!busy}>
            Reject
          </Button>
        </LoanCard>
      ))}

      <Modal open={!!rejecting} onClose={closeReject} title="Reject this application?">
        <form onSubmit={reject} className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft">
            {rejecting?.applicant.fullName} will see this reason on their application.
          </p>
          <Field label="Reason" error={reasonError ?? undefined}>
            {(id, d) => (
              <textarea
                id={id}
                aria-describedby={d}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={500}
                className="w-full rounded-md border border-line-strong bg-surface px-3 py-2 focus:border-ledger focus:outline-none focus:ring-2 focus:ring-ledger/20"
                placeholder="For example: salary on the slip does not match the declared salary"
              />
            )}
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={closeReject}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={!!busy}>
              Reject application
            </Button>
          </div>
        </form>
      </Modal>
    </ModulePage>
  );
}
