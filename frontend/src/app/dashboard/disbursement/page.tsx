'use client';

import { type FormEvent, useState } from 'react';
import { LoanCard } from '@/components/dashboard/LoanCard';
import { ModulePage } from '@/components/dashboard/ModulePage';
import { QueueSearch } from '@/components/dashboard/QueueSearch';
import { RefreshButton } from '@/components/dashboard/RefreshButton';
import { useQueue } from '@/components/dashboard/useQueue';
import { LoanDetailsDrawer } from '@/components/loan/LoanDetails';
import { RejectDialog } from '@/components/loan/RejectDialog';
import { Alert, Button, EmptyState, Field, Modal, SkeletonCards, TextInput } from '@/components/ui';
import { api, ApiError, errorMessage } from '@/lib/api';
import { formatDate, formatINR } from '@/lib/format';
import type { Loan } from '@/lib/types';

export default function DisbursementPage() {
  const [q, setQ] = useState('');
  const { items: loans, error, reload, refreshing, updatedAt, remove } = useQueue<Loan>('/disbursement/loans', 'loans', { q });
  const [confirming, setConfirming] = useState<Loan | null>(null);
  const [rejecting, setRejecting] = useState<Loan | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [form, setForm] = useState({ reference: '', remark: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  function close() {
    setConfirming(null);
    setForm({ reference: '', remark: '' });
    setFormError(null);
  }

  async function disburse(e: FormEvent) {
    e.preventDefault();
    if (!confirming) return;
    if (!/^[A-Z0-9]{6,30}$/.test(form.reference.trim())) return setFormError('Enter the bank transfer reference (6–30 letters or digits).');
    setBusy(true);
    try {
      await api(`/disbursement/loans/${confirming.id}/disburse`, {
        body: { reference: form.reference.trim(), ...(form.remark.trim() ? { remark: form.remark.trim() } : {}) },
      });
      remove(confirming.id);
      setNotice({ tone: 'success', text: `Disbursed ${formatINR(confirming.principal)} to ${confirming.applicant.fullName}. It is now with Collection.` });
      close();
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) setFormError(err.message);
      else {
        setNotice({ tone: 'error', text: errorMessage(err) });
        close();
        reload();
      }
    } finally {
      setBusy(false);
    }
  }

  async function reject(input: { category: string; note?: string }) {
    if (!rejecting) return;
    await api(`/disbursement/loans/${rejecting.id}/reject`, { body: input });
    remove(rejecting.id);
    setNotice({ tone: 'success', text: `Stopped the loan for ${rejecting.applicant.fullName}. They can see the reason.` });
  }

  return (
    <ModulePage
      module="disbursement"
      actions={
        <RefreshButton
          onRefresh={() => {
            setNotice(null);
            reload();
          }}
          refreshing={refreshing}
          updatedAt={updatedAt}
        />
      }
      search={<QueueSearch onSearch={setQ} />}
    >
      {notice && (
        <div className="anim-rise">
          <Alert tone={notice.tone}>{notice.text}</Alert>
        </div>
      )}
      {error && <Alert>{error}</Alert>}
      {!loans && !error && <SkeletonCards />}
      {loans?.length === 0 && (
        <EmptyState title={q ? 'No loans match your search' : 'Nothing to disburse'}>
          {q ? 'Try a different name, email or PAN.' : 'Loans appear here once the sanction team approves them.'}
        </EmptyState>
      )}
      {loans?.map((loan, i) => (
        <LoanCard key={loan.id} loan={loan} index={i} onDetails={() => setDetailsId(loan.id)}>
          {loan.sanctionedAt && <p className="text-sm text-ink-soft">Sanctioned {formatDate(loan.sanctionedAt)}</p>}
          <Button onClick={() => setConfirming(loan)}>Mark as disbursed</Button>
          <Button variant="danger" onClick={() => setRejecting(loan)}>
            Reject
          </Button>
        </LoanCard>
      ))}

      <Modal open={!!confirming} onClose={close} title="Confirm disbursal">
        {confirming && (
          <form onSubmit={disburse} className="flex flex-col gap-4" noValidate>
            <p className="text-ink-soft">
              Confirm that <span className="tabular font-semibold text-ink">{formatINR(confirming.principal)}</span> has been sent to{' '}
              {confirming.applicant.fullName}. The loan becomes active and repayments of{' '}
              <span className="tabular font-semibold text-ink">{formatINR(confirming.totalRepayment)}</span> are due.
            </p>
            <Field label="Bank transfer reference" error={formError ?? undefined} hint="The NEFT/IMPS/RTGS reference of the payout.">
              {(id, d) => (
                <TextInput
                  id={id}
                  aria-describedby={d}
                  value={form.reference}
                  onChange={(e) => setForm({ ...form, reference: e.target.value.toUpperCase() })}
                  className="tabular uppercase"
                  spellCheck={false}
                  invalid={!!formError}
                />
              )}
            </Field>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Remark (optional)
              <TextInput value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} maxLength={500} placeholder="For example: sent to HDFC ****1234" />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" loading={busy}>
                Mark as disbursed
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <RejectDialog
        open={!!rejecting}
        stage="DISBURSEMENT"
        applicant={rejecting?.applicant.fullName ?? ''}
        onClose={() => setRejecting(null)}
        onSubmit={reject}
      />
      <LoanDetailsDrawer loanId={detailsId} onClose={() => setDetailsId(null)} />
    </ModulePage>
  );
}
