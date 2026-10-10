'use client';

import { useCallback, useEffect, useState } from 'react';
import { ModulePage } from '@/components/dashboard/ModulePage';
import { QueueSearch } from '@/components/dashboard/QueueSearch';
import { RefreshButton } from '@/components/dashboard/RefreshButton';
import { STATUS_LABEL } from '@/components/loan/labels';
import { LoanDetailsDrawer } from '@/components/loan/LoanDetails';
import { useSession } from '@/components/SessionProvider';
import { Alert, Button, cx, EmptyState, Panel, Skeleton, StatusBadge } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { formatDate, formatINR } from '@/lib/format';
import type { Loan, LoanStatus } from '@/lib/types';

const FILTERS: (LoanStatus | '')[] = ['', 'APPLIED', 'SANCTIONED', 'DISBURSED', 'CLOSED', 'REJECTED'];
const PAGE_SIZE = 15;

interface Page {
  loans: Loan[];
  total: number;
  page: number;
  pageSize: number;
}

export default function HistoryPage() {
  const { user } = useSession();
  const [status, setStatus] = useState<LoanStatus | ''>('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (status) params.set('status', status);
    if (q) params.set('q', q);
    return api<Page>(`/loans?${params}`)
      .then((d) => {
        setData(d);
        setError(null);
        setUpdatedAt(new Date());
      }, (e) => setError(errorMessage(e)))
      .finally(() => setRefreshing(false));
  }, [page, status, q]);

  const userId = user?.id;
  useEffect(() => {
    if (userId) load();
  }, [userId, load]);

  const onSearch = useCallback((value: string) => {
    setQ(value);
    setPage(1);
  }, []);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <ModulePage
      module="history"
      actions={
        <RefreshButton
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          refreshing={refreshing}
          updatedAt={updatedAt}
        />
      }
      search={
        <div className="flex flex-col gap-3">
          <QueueSearch onSearch={onSearch} />
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
            {FILTERS.map((f) => (
              <button
                key={f || 'all'}
                type="button"
                aria-pressed={status === f}
                onClick={() => {
                  setStatus(f);
                  setPage(1);
                }}
                className={cx(
                  'rounded-full border px-3 py-1 text-sm transition-colors',
                  status === f ? 'border-ledger bg-ledger text-white' : 'border-line-strong text-ink-soft hover:text-ink',
                )}
              >
                {f ? STATUS_LABEL[f] : 'All'}
              </button>
            ))}
          </div>
        </div>
      }
    >
      {error && <Alert>{error}</Alert>}
      {!data && !error && <Skeleton className="h-72" />}
      {data?.loans.length === 0 && <EmptyState title="No loans found">Change the filter or search to see more.</EmptyState>}
      {data && data.loans.length > 0 && (
        <Panel className="anim-fade overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="hidden border-b border-line bg-paper text-ink-soft md:table-header-group">
              <tr>
                <th className="px-5 py-3 font-medium">Borrower</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Applied</th>
                <th className="px-5 py-3 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.loans.map((loan, i) => (
                <tr key={loan.id} className="anim-rise grid gap-1 px-5 py-4 md:table-row md:p-0" style={{ '--i': i } as React.CSSProperties}>
                  <td className="md:px-5 md:py-3">
                    <p className="font-semibold">{loan.applicant.fullName}</p>
                    <p className="text-ink-soft">{loan.borrower.email}</p>
                  </td>
                  <td className="tabular md:px-5 md:py-3">
                    {formatINR(loan.principal)}
                    <span className="block text-xs text-ink-faint">{loan.tenureDays} days</span>
                  </td>
                  <td className="md:px-5 md:py-3">
                    <StatusBadge status={loan.status} />
                    {loan.rejection && <span className="mt-1 block max-w-56 text-xs text-rust">{loan.rejection.categoryLabel}</span>}
                  </td>
                  <td className="tabular text-ink-soft md:px-5 md:py-3">{formatDate(loan.createdAt)}</td>
                  <td className="md:px-5 md:py-3 md:text-right">
                    <Button variant="secondary" onClick={() => setDetailsId(loan.id)}>
                      View history
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-between gap-3 text-sm">
          <p className="tabular text-ink-soft">
            Page {data.page} of {pages}, {data.total} loans
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="secondary" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
      <LoanDetailsDrawer loanId={detailsId} onClose={() => setDetailsId(null)} />
    </ModulePage>
  );
}
