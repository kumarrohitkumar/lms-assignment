import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProfileDetails } from '@/components/profile/ProfileDetails';
import type { User } from '@/lib/types';

afterEach(() => vi.unstubAllGlobals());

const staff: User = { id: 's1', name: 'Sana Iyer', email: 'sana@lms.dev', role: 'SANCTION', createdAt: '2026-10-01T05:00:00Z', lastLoginAt: '2026-10-10T08:30:00Z' };
const admin: User = { ...staff, id: 'a1', name: 'Admin', email: 'admin@lms.dev', role: 'ADMIN' };
const borrower: User = { id: 'b1', name: 'Asha Rao', email: 'asha@example.com', role: 'BORROWER', createdAt: '2026-10-02T05:00:00Z', lastLoginAt: '2026-10-10T08:30:00Z' };

describe('<ProfileDetails>', () => {
  it('shows a staff member their email, role, access and account dates', () => {
    render(<ProfileDetails user={staff} />);
    expect(screen.getByRole('heading', { name: 'Sana Iyer' })).toBeInTheDocument();
    const account = screen.getByRole('region', { name: 'Account' });
    expect(within(account).getByText('sana@lms.dev')).toBeInTheDocument();
    expect(within(account).getByText('Sanction')).toBeInTheDocument();
    expect(within(account).getByText('1 Oct 2026')).toBeInTheDocument();
    expect(within(account).getByText(/10 Oct 2026/)).toBeInTheDocument();
    expect(within(account).getByText('Sanction module')).toBeInTheDocument();
  });

  it('lists every module for an admin', () => {
    render(<ProfileDetails user={admin} />);
    expect(screen.getByText('Overview, Sales, Sanction, Disbursement, Collection, History')).toBeInTheDocument();
  });

  it('shows a borrower the same account details only, without loading anything else', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<ProfileDetails user={borrower} />);
    const account = screen.getByRole('region', { name: 'Account' });
    expect(within(account).getByText('asha@example.com')).toBeInTheDocument();
    expect(within(account).getByText('Borrower portal')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Personal details' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Loans' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('region')).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
