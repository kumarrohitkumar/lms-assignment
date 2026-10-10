import { formatDate } from '@/lib/format';
import { cx } from '../ui';

interface Due {
  dueDate: string | null;
  daysToDue: number | null;
  overdue: boolean;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Repayment due status for an active loan: overdue, due soon, or the due date. */
export function DueBadge({ loan, className }: { loan: Due; className?: string }) {
  if (!loan.dueDate || loan.daysToDue === null) return null;
  const { daysToDue, overdue } = loan;
  const text = overdue
    ? `Overdue by ${plural(-daysToDue, 'day')}`
    : daysToDue === 0
      ? 'Due today'
      : daysToDue <= 7
        ? `Due in ${plural(daysToDue, 'day')}`
        : `Due ${formatDate(loan.dueDate)}`;
  const tone = overdue ? 'bg-rust text-white' : daysToDue <= 7 ? 'bg-saffron-wash text-saffron-ink' : 'bg-ink/8 text-ink-soft';
  return <span className={cx('inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold', tone, className)}>{text}</span>;
}
