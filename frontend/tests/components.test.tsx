import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EligibilityChecklist } from '@/components/loan/EligibilityChecklist';
import { RejectDialog } from '@/components/loan/RejectDialog';
import { Timeline } from '@/components/loan/Timeline';
import type { TimelineEvent } from '@/lib/types';

// <dialog> methods are missing in jsdom.
HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function () {
  this.removeAttribute('open');
};

afterEach(() => vi.unstubAllGlobals());

describe('<EligibilityChecklist>', () => {
  it('lists each check with its result and the value that was checked', () => {
    render(
      <EligibilityChecklist
        checks={[
          { rule: 'AGE', label: 'Age', passed: true, detail: '31 years (allowed 23–50)' },
          { rule: 'SALARY_SLIP', label: 'Salary slip', passed: false, detail: 'Not uploaded' },
        ]}
      />,
    );
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Age');
    expect(items[0]).toHaveTextContent('31 years (allowed 23–50)');
    expect(items[0]).toHaveAccessibleName(/passed/i);
    expect(items[1]).toHaveAccessibleName(/failed/i);
  });
});

describe('<Timeline>', () => {
  it('shows what happened, who did it and why', () => {
    const events: TimelineEvent[] = [
      { type: 'STATUS', at: '2026-10-10T05:00:00Z', from: null, to: 'APPLIED', note: null, actor: { id: 'b', name: 'Asha Rao', role: 'BORROWER' } },
      { type: 'STATUS', at: '2026-10-10T06:00:00Z', from: 'APPLIED', to: 'REJECTED', note: 'Salary slip is unclear', actor: { id: 's', name: 'Sana', role: 'SANCTION' } },
      { type: 'PAYMENT', at: '2026-10-10T07:00:00Z', utr: 'UTR1', amount: 1000, note: null, actor: { id: 'c', name: 'Kabir', role: 'COLLECTION' } },
      { type: 'REVERSAL', at: '2026-10-10T08:00:00Z', utr: 'UTR1', amount: 1000, note: 'Bounced', actor: { id: 'c', name: 'Kabir', role: 'COLLECTION' } },
      { type: 'STATUS', at: '2026-10-10T09:00:00Z', from: 'DISBURSED', to: 'CLOSED', note: 'Fully repaid', actor: { id: null, name: 'System', role: 'SYSTEM' } },
    ];
    render(<Timeline events={events} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(5);
    expect(items[0]).toHaveTextContent('Applied');
    expect(items[0]).toHaveTextContent('Asha Rao');
    expect(items[1]).toHaveTextContent('Rejected');
    expect(items[1]).toHaveTextContent('Salary slip is unclear');
    expect(items[1]).toHaveTextContent('Sana (Sanction)');
    expect(items[2]).toHaveTextContent('Payment received');
    expect(items[2]).toHaveTextContent('₹1,000');
    expect(items[3]).toHaveTextContent('Payment reversed');
    expect(items[3]).toHaveTextContent('Bounced');
    expect(items[4]).toHaveTextContent('Closed');
    expect(items[4]).toHaveTextContent('Automatic');
  });

  it('marks only the latest event as the current step', () => {
    const events: TimelineEvent[] = [
      { type: 'STATUS', at: '2026-10-10T05:00:00Z', from: null, to: 'APPLIED', note: null, actor: { id: 'b', name: 'Asha Rao', role: 'BORROWER' } },
      { type: 'STATUS', at: '2026-10-10T06:00:00Z', from: 'APPLIED', to: 'SANCTIONED', note: null, actor: { id: 's', name: 'Sana', role: 'SANCTION' } },
    ];
    render(<Timeline events={events} />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).not.toHaveAttribute('aria-current');
    expect(items[1]).toHaveAttribute('aria-current', 'step');
  });
});

describe('<RejectDialog>', () => {
  const categories = {
    SANCTION: [
      { value: 'SLIP_UNREADABLE', label: 'Salary slip is unclear or unreadable' },
      { value: 'OTHER', label: 'Other' },
    ],
    DISBURSEMENT: [{ value: 'OTHER', label: 'Other' }],
  };

  it('submits a category, and requires a note for Other', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(categories), { headers: { 'Content-Type': 'application/json' } })));
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<RejectDialog open stage="SANCTION" applicant="Asha Rao" onClose={vi.fn()} onSubmit={onSubmit} />);

    await screen.findByLabelText('Salary slip is unclear or unreadable');
    fireEvent.click(screen.getByLabelText('Other'));
    fireEvent.click(screen.getByRole('button', { name: 'Reject application' }));
    expect(await screen.findByText(/describe the reason/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('Salary slip is unclear or unreadable'));
    fireEvent.change(screen.getByLabelText(/note for the borrower/i), { target: { value: 'Photo is blurred' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reject application' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ category: 'SLIP_UNREADABLE', note: 'Photo is blurred' }));
  });
});
