import { DecisionNote } from '@/components/loan/DecisionNote';
import type { DecidedLoan } from '@/lib/types';
import { Alert, EmptyState, SkeletonCards } from '../ui';
import { LoanCard } from './LoanCard';
import { QueueSummary } from './QueueSummary';

const COPY = {
  SANCTION: { yes: 'Approved', amount: 'Amount sanctioned', empty: 'No decisions yet', hint: 'Applications you approve or reject will be listed here.' },
  DISBURSEMENT: { yes: 'Disbursed', amount: 'Amount paid out', empty: 'Nothing paid out or stopped yet', hint: 'Loans you disburse or stop will be listed here.' },
} as const;

/** A stage's finished work: every loan it approved or rejected, newest first, with who decided and why. */
export function DecidedLoans({
  stage,
  loans,
  error,
  searching,
  onDetails,
}: {
  stage: keyof typeof COPY;
  loans: DecidedLoan[] | null;
  error: string | null;
  searching: boolean;
  onDetails: (id: string) => void;
}) {
  const copy = COPY[stage];
  if (error) return <Alert>{error}</Alert>;
  if (!loans) return <SkeletonCards />;
  const yes = loans.filter((l) => l.decision.outcome !== 'REJECTED');
  const amount = Math.round(yes.reduce((s, l) => s + l.principal, 0) * 100) / 100;
  return (
    <>
      <QueueSummary
        tiles={[
          { label: copy.yes, value: yes.length },
          { label: 'Rejected', value: loans.length - yes.length, tone: 'alert' },
          { label: copy.amount, value: amount, money: true },
        ]}
      />
      {loans.length === 0 && (
        <EmptyState title={searching ? 'No decisions match your search' : copy.empty}>
          {searching ? 'Try a different name, email or PAN.' : copy.hint}
        </EmptyState>
      )}
      {loans.map((loan, i) => (
        <LoanCard
          key={loan.id}
          loan={loan}
          index={i}
          onDetails={() => onDetails(loan.id)}
          extra={
            <div className="mt-4">
              <DecisionNote decision={loan.decision} />
            </div>
          }
        />
      ))}
    </>
  );
}
