'use client';

import { useState } from 'react';
import { ModulePage } from '@/components/dashboard/ModulePage';
import { PaymentPanel } from '@/components/dashboard/PaymentPanel';
import { useQueue } from '@/components/dashboard/useQueue';
import { Alert, Button, EmptyState, LoadingBlock, Panel } from '@/components/ui';
import { formatDate, formatINR } from '@/lib/format';
import type { Loan } from '@/lib/types';

export default function CollectionPage() {
  const { items: loans, error, reload, remove, replace } = useQueue<Loan>('/collection/loans', 'loans');
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function onRecorded(loan: Loan) {
    if (loan.status === 'CLOSED') {
      remove(loan.id);
      setOpenId(null);
      setNotice(`${loan.applicant.fullName} has repaid ${formatINR(loan.totalRepayment)} in full. The loan is closed.`);
    } else {
      replace(loan);
    }
  }

  return (
    <ModulePage module="collection" actions={<Button variant="secondary" onClick={reload}>Refresh</Button>}>
      {notice && <Alert tone="success">{notice}</Alert>}
      {error && <Alert>{error}</Alert>}
      {!loans && !error && <LoadingBlock label="Loading active loans" />}
      {loans?.length === 0 && <EmptyState title="No active loans">Loans appear here once they are disbursed.</EmptyState>}
      {loans?.map((loan) => {
        const paidShare = (loan.amountPaid / loan.totalRepayment) * 100;
        const open = openId === loan.id;
        return (
          <Panel key={loan.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate font-semibold">{loan.applicant.fullName}</p>
                <p className="truncate text-sm text-ink-soft">
                  {loan.borrower.email}. Disbursed {loan.disbursedAt ? formatDate(loan.disbursedAt) : ''}
                </p>
              </div>
              <div className="tabular text-right">
                <p className="text-sm text-ink-soft">Outstanding</p>
                <p className="text-2xl font-bold tracking-tight">{formatINR(loan.outstanding)}</p>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-label="Repaid" aria-valuenow={Math.round(paidShare)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-ledger transition-[width]" style={{ width: `${paidShare}%` }} />
            </div>
            <div className="tabular mt-2 flex flex-wrap justify-between gap-2 text-sm text-ink-soft">
              <span>
                Paid {formatINR(loan.amountPaid)} of {formatINR(loan.totalRepayment)}
              </span>
              <span>
                {formatINR(loan.principal)} principal + {formatINR(loan.simpleInterest)} interest
              </span>
            </div>
            <div className="mt-4">
              <Button variant={open ? 'ghost' : 'primary'} onClick={() => setOpenId(open ? null : loan.id)} aria-expanded={open}>
                {open ? 'Hide payments' : 'Record payment'}
              </Button>
            </div>
            {open && <PaymentPanel loan={loan} onRecorded={onRecorded} />}
          </Panel>
        );
      })}
    </ModulePage>
  );
}
