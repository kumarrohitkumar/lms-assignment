'use client';

import { useState } from 'react';
import { LoanCard } from '@/components/dashboard/LoanCard';
import { ModulePage } from '@/components/dashboard/ModulePage';
import { RefreshButton } from '@/components/dashboard/RefreshButton';
import { useQueue } from '@/components/dashboard/useQueue';
import { Alert, Button, EmptyState, LoadingBlock, Modal } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { formatDate, formatINR } from '@/lib/format';
import type { Loan } from '@/lib/types';

export default function DisbursementPage() {
  const { items: loans, error, reload, refreshing, updatedAt, remove } = useQueue<Loan>('/disbursement/loans', 'loans');
  const [confirming, setConfirming] = useState<Loan | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  async function disburse() {
    if (!confirming) return;
    setBusy(true);
    try {
      await api(`/disbursement/loans/${confirming.id}/disburse`, { method: 'POST' });
      remove(confirming.id);
      setNotice({ tone: 'success', text: `Marked ${formatINR(confirming.principal)} as disbursed to ${confirming.applicant.fullName}. It is now with Collection.` });
    } catch (err) {
      setNotice({ tone: 'error', text: errorMessage(err) });
      reload();
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  }

  return (
    <ModulePage
      module="disbursement"
      actions={<RefreshButton onRefresh={() => {
          setNotice(null);
          reload();
        }} refreshing={refreshing} updatedAt={updatedAt} />}
    >
      {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}
      {error && <Alert>{error}</Alert>}
      {!loans && !error && <LoadingBlock label="Loading sanctioned loans" />}
      {loans?.length === 0 && <EmptyState title="Nothing to disburse">Loans appear here once the sanction team approves them.</EmptyState>}
      {loans?.map((loan) => (
        <LoanCard key={loan.id} loan={loan}>
          {loan.sanctionedAt && <p className="text-sm text-ink-soft">Sanctioned {formatDate(loan.sanctionedAt)}</p>}
          <Button onClick={() => setConfirming(loan)}>Mark as disbursed</Button>
        </LoanCard>
      ))}

      <Modal open={!!confirming} onClose={() => setConfirming(null)} title="Confirm disbursal">
        {confirming && (
          <div className="flex flex-col gap-4">
            <p className="text-ink-soft">
              Confirm that <span className="tabular font-semibold text-ink">{formatINR(confirming.principal)}</span> has been sent to{' '}
              {confirming.applicant.fullName}. The loan becomes active and repayments of{' '}
              <span className="tabular font-semibold text-ink">{formatINR(confirming.totalRepayment)}</span> are due.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirming(null)}>
                Cancel
              </Button>
              <Button onClick={disburse} loading={busy}>
                Mark as disbursed
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </ModulePage>
  );
}
