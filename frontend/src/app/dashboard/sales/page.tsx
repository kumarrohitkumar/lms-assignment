'use client';

import { ModulePage } from '@/components/dashboard/ModulePage';
import { RefreshButton } from '@/components/dashboard/RefreshButton';
import { useQueue } from '@/components/dashboard/useQueue';
import { useCountUp } from '@/hooks/useCountUp';
import { Alert, EmptyState, Panel, SkeletonCards, cx } from '@/components/ui';
import { employmentLabel, formatDate, formatINR } from '@/lib/format';
import type { BorrowerStage, Lead } from '@/lib/types';

const stages: Record<BorrowerStage, { label: string; className: string; next: string }> = {
  REGISTERED: { label: 'Signed up', className: 'bg-ink/8 text-ink-soft', next: 'Needs to fill personal details' },
  BRE_FAILED: { label: 'Not eligible', className: 'bg-rust-wash text-rust', next: 'Failed the eligibility check' },
  DETAILS_SUBMITTED: { label: 'Eligible', className: 'bg-sky-wash text-sky-ink', next: 'Needs to upload a salary slip' },
  SLIP_UPLOADED: { label: 'Ready to apply', className: 'bg-ledger-wash text-ledger-dark', next: 'Only the loan amount is left' },
};

function CountUp({ value }: { value: number }) {
  return <>{Math.round(useCountUp(value))}</>;
}

function StageBadge({ stage }: { stage: BorrowerStage }) {
  return <span className={cx('inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold', stages[stage].className)}>{stages[stage].label}</span>;
}

export default function SalesPage() {
  const { items: leads, error, reload, refreshing, updatedAt } = useQueue<Lead>('/sales/leads', 'leads');

  return (
    <ModulePage
      module="sales"
      actions={<RefreshButton onRefresh={reload} refreshing={refreshing} updatedAt={updatedAt} />}
    >
      {error && <Alert>{error}</Alert>}
      {!leads && !error && <SkeletonCards count={2} />}
      {leads?.length === 0 && <EmptyState title="No open leads">Everyone who signed up has applied. New sign-ups will appear here.</EmptyState>}
      {leads && leads.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(Object.keys(stages) as BorrowerStage[]).map((s, i) => (
              <Panel key={s} className="anim-rise p-4" style={{ '--i': i } as React.CSSProperties}>
                <p className="tabular text-2xl font-bold">
                  <CountUp value={leads.filter((l) => l.stage === s).length} />
                </p>
                <p className="text-sm text-ink-soft">{stages[s].label}</p>
              </Panel>
            ))}
          </div>

          <Panel className="anim-fade overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="hidden border-b border-line bg-paper text-ink-soft md:table-header-group">
                <tr>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Stage</th>
                  <th className="px-5 py-3 font-medium">Details</th>
                  <th className="px-5 py-3 font-medium">Signed up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {leads.map((lead, i) => (
                  <tr key={lead.id} className="anim-rise grid gap-1 px-5 py-4 md:table-row md:p-0" style={{ '--i': i } as React.CSSProperties}>
                    <td className="md:px-5 md:py-4">
                      <p className="font-semibold">{lead.profile?.fullName ?? lead.name}</p>
                      <p className="text-ink-soft">{lead.email}</p>
                    </td>
                    <td className="md:px-5 md:py-4">
                      <StageBadge stage={lead.stage} />
                      <p className="mt-1 text-xs text-ink-faint">{stages[lead.stage].next}</p>
                    </td>
                    <td className="tabular text-ink-soft md:px-5 md:py-4">
                      {lead.profile ? (
                        <>
                          {formatINR(lead.profile.monthlySalary)} a month, {employmentLabel[lead.profile.employmentMode].toLowerCase()}
                          {lead.profile.breFailures.length > 0 && (
                            <ul className="mt-1 text-xs text-rust">
                              {lead.profile.breFailures.map((f) => (
                                <li key={f}>{f}</li>
                              ))}
                            </ul>
                          )}
                        </>
                      ) : (
                        'No details yet'
                      )}
                    </td>
                    <td className="tabular text-ink-soft md:px-5 md:py-4">{formatDate(lead.registeredAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </>
      )}
    </ModulePage>
  );
}
