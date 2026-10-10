import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DueBadge } from '@/components/loan/DueBadge';

describe('<DueBadge>', () => {
  it.each([
    [{ dueDate: '2026-10-31', daysToDue: -3, overdue: true }, 'Overdue by 3 days'],
    [{ dueDate: '2026-10-31', daysToDue: -1, overdue: true }, 'Overdue by 1 day'],
    [{ dueDate: '2026-10-31', daysToDue: 0, overdue: false }, 'Due today'],
    [{ dueDate: '2026-10-31', daysToDue: 5, overdue: false }, 'Due in 5 days'],
    [{ dueDate: '2026-10-31', daysToDue: 40, overdue: false }, 'Due 31 Oct 2026'],
  ])('%o → %s', (loan, text) => {
    render(<DueBadge loan={loan} />);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('renders nothing for loans without a due date or that are settled', () => {
    const { container } = render(<DueBadge loan={{ dueDate: null, daysToDue: null, overdue: false }} />);
    expect(container).toBeEmptyDOMElement();
    const closed = render(<DueBadge loan={{ dueDate: '2026-10-31', daysToDue: null, overdue: false }} />);
    expect(closed.container).toBeEmptyDOMElement();
  });
});
