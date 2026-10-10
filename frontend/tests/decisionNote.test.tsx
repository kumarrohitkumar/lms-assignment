import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DecisionNote } from '@/components/loan/DecisionNote';
import type { Decision } from '@/lib/types';

const by = { id: 'u1', name: 'Sana Iyer', role: 'SANCTION' as const };

describe('<DecisionNote>', () => {
  it('shows an approval with who decided and their remark', () => {
    const d: Decision = { outcome: 'APPROVED', at: '2026-10-10T07:40:00Z', by, reason: null, note: 'Slip verified', reference: null };
    render(<DecisionNote decision={d} />);
    const note = screen.getByRole('group', { name: 'Decision' });
    expect(note).toHaveTextContent('Approved');
    expect(note).toHaveTextContent('Sana Iyer (Sanction)');
    expect(note).toHaveTextContent('10 Oct 2026');
    expect(note).toHaveTextContent('Slip verified');
  });

  it('shows why a loan was rejected', () => {
    const d: Decision = { outcome: 'REJECTED', at: '2026-10-10T07:40:00Z', by, reason: 'KYC verification failed', note: 'PAN name mismatch', reference: null };
    render(<DecisionNote decision={d} />);
    const note = screen.getByRole('group', { name: 'Decision' });
    expect(note).toHaveTextContent('Rejected');
    expect(note).toHaveTextContent('Reason: KYC verification failed');
    expect(note).toHaveTextContent('PAN name mismatch');
  });

  it('shows the bank reference of a payout', () => {
    const d: Decision = { outcome: 'DISBURSED', at: '2026-10-10T07:40:00Z', by: { ...by, role: 'DISBURSEMENT' }, reason: null, note: null, reference: 'NEFT123456' };
    render(<DecisionNote decision={d} />);
    const note = screen.getByRole('group', { name: 'Decision' });
    expect(note).toHaveTextContent('Disbursed');
    expect(note).toHaveTextContent('Bank reference NEFT123456');
  });
});
