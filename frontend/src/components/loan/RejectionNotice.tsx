import { formatDate } from '@/lib/format';
import type { Loan } from '@/lib/types';
import { STAGE_LABEL } from './labels';

/** Why a loan was turned down, at which stage and when; falls back to the plain reason on older loans. */
export function RejectionNotice({ loan }: { loan: Loan }) {
  if (loan.status !== 'REJECTED') return null;
  const r = loan.rejection;
  return (
    <div role="status" className="anim-rise rounded-lg border border-rust/30 bg-rust-wash px-4 py-3 text-sm text-rust">
      <p className="font-semibold">{r ? r.categoryLabel : 'Application not approved'}</p>
      {(r?.note || (!r && loan.rejectionReason)) && <p className="mt-1">{r?.note ?? loan.rejectionReason}</p>}
      {r && (
        <p className="mt-2 text-xs text-rust/80">
          Decided at {STAGE_LABEL[r.stage].toLowerCase()} on {formatDate(r.at)}
        </p>
      )}
    </div>
  );
}
