'use client';

import { type FormEvent, useState } from 'react';
import { DecidedLoans } from '@/components/dashboard/DecidedLoans';
import { LoanCard } from '@/components/dashboard/LoanCard';
import { ModulePage } from '@/components/dashboard/ModulePage';
import { QueueSearch } from '@/components/dashboard/QueueSearch';
import { QueueSummary } from '@/components/dashboard/QueueSummary';
import { QueueTabs } from '@/components/dashboard/QueueTabs';
import { RefreshButton } from '@/components/dashboard/RefreshButton';
import { useQueue } from '@/components/dashboard/useQueue';
import { EligibilityChecklist } from '@/components/loan/EligibilityChecklist';
import { LoanDetailsDrawer } from '@/components/loan/LoanDetails';
import { RejectDialog } from '@/components/loan/RejectDialog';
import { Alert, Button, EmptyState, Modal, SkeletonCards } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { formatINR } from '@/lib/format';
import { queueStats } from '@/lib/queueStats';
import type { DecidedLoan, Loan } from '@/lib/types';

export default function SanctionPage() {
  const [q, setQ] = useState('');
  const { items: loans, error, reload, refreshing, updatedAt, remove } = useQueue<Loan>('/sanction/loans', 'loans', { q });
  const decided = useQueue<DecidedLoan>('/sanction/decisions', 'loans', { q });
  const [view, setView] = useState<'waiting' | 'decided'>('waiting');
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [approving, setApproving] = useState<Loan | null>(null);
  const [rejecting, setRejecting] = useState<Loan | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [remark, setRemark] = useState('');
  const [saving, setSaving] = useState(false);

  async function approve(e: FormEvent) {
    e.preventDefault();
    if (!approving) return;
    setSaving(true);
    try {
      await api(`/sanction/loans/${approving.id}/approve`, { body: remark.trim() ? { remark: remark.trim() } : {} });
      remove(approving.id);
      decided.reload();
      setNotice({ tone: 'success', text: `Sanctioned ${formatINR(approving.principal)} for ${approving.applicant.fullName}. It is now with Disbursement.` });
      setApproving(null);
      setRemark('');
    } catch (err) {
      setNotice({ tone: 'error', text: errorMessage(err) });
      setApproving(null);
      reload();
    } finally {
      setSaving(false);
    }
  }

  async function reject(input: { category: string; note?: string }) {
    if (!rejecting) return;
    await api(`/sanction/loans/${rejecting.id}/reject`, { body: input });
    remove(rejecting.id);
    decided.reload();
    setNotice({ tone: 'success', text: `Rejected the application from ${rejecting.applicant.fullName}. They can see the reason.` });
  }

  return (
    <ModulePage
      module="sanction"
      actions={
        <RefreshButton
          onRefresh={() => {
            setNotice(null);
            if (view === 'waiting') reload();
            else decided.reload();
          }}
          refreshing={view === 'waiting' ? refreshing : decided.refreshing}
          updatedAt={view === 'waiting' ? updatedAt : decided.updatedAt}
        />
      }
      search={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <QueueTabs
            label="Loans"
            value={view}
            onChange={(v) => {
              setView(v);
              setNotice(null);
            }}
            tabs={[
              { value: 'waiting', label: 'In process', count: loans?.length },
              { value: 'decided', label: 'Decided', count: decided.items?.length },
            ]}
          />
          <div className="w-full sm:w-80">
            <QueueSearch onSearch={setQ} />
          </div>
        </div>
      }
    >
      {notice && (
        <div className="anim-rise">
          <Alert tone={notice.tone}>{notice.text}</Alert>
        </div>
      )}
      {view === 'decided' && (
        <DecidedLoans stage="SANCTION" loans={decided.items} error={decided.error} searching={!!q} onDetails={setDetailsId} />
      )}
      {view === 'waiting' && error && <Alert>{error}</Alert>}
      {view === 'waiting' && loans && (
        <QueueSummary
          tiles={[
            { label: 'Applications waiting', value: queueStats(loans).count },
            { label: 'Total requested', value: queueStats(loans).principal, money: true },
          ]}
        />
      )}
      {view === 'waiting' && !loans && !error && <SkeletonCards />}
      {view === 'waiting' && loans?.length === 0 && (
        <EmptyState title={q ? 'No applications match your search' : 'No applications waiting'}>
          {q ? 'Try a different name, email or PAN.' : 'New applications will appear here as borrowers apply.'}
        </EmptyState>
      )}
      {view === 'waiting' &&
        loans?.map((loan, i) => (
          <LoanCard key={loan.id} loan={loan} index={i} onDetails={() => setDetailsId(loan.id)}>
            <Button onClick={() => setApproving(loan)}>Approve</Button>
            <Button variant="danger" onClick={() => setRejecting(loan)}>
              Reject
            </Button>
          </LoanCard>
        ))}

      <Modal open={!!approving} onClose={() => setApproving(null)} title="Approve this application?">
        {approving && (
          <form onSubmit={approve} className="flex flex-col gap-4">
            <p className="text-sm text-ink-soft">
              Sanction <span className="tabular font-semibold text-ink">{formatINR(approving.principal)}</span> for {approving.applicant.fullName}. These
              checks passed when they applied:
            </p>
            <EligibilityChecklist checks={approving.eligibility} />
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Remark (optional, kept in the history)
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="For example: salary verified against the slip"
                className="w-full rounded-md border border-line-strong bg-surface px-3 py-2 font-normal focus:border-ledger focus:outline-none focus:ring-2 focus:ring-ledger/20"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setApproving(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                Approve
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <RejectDialog
        open={!!rejecting}
        stage="SANCTION"
        applicant={rejecting?.applicant.fullName ?? ''}
        onClose={() => setRejecting(null)}
        onSubmit={reject}
      />
      <LoanDetailsDrawer loanId={detailsId} onClose={() => setDetailsId(null)} />
    </ModulePage>
  );
}
