import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProfileDetails } from '@/components/profile/ProfileDetails';
import type { User } from '@/lib/types';

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
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

  it('adds personal details, eligibility, slip and loans for a borrower', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve(
          url.endsWith('/borrower/profile')
            ? json({
                stage: 'SLIP_UPLOADED',
                profile: {
                  fullName: 'Asha Rao',
                  pan: 'ABCPE1234F',
                  dateOfBirth: '1995-05-20',
                  monthlySalary: 60000,
                  employmentMode: 'SALARIED',
                  bre: { passed: true, failures: [], checkedAt: '2026-10-02T06:00:00Z' },
                  salarySlip: { originalName: 'slip.pdf', mimeType: 'application/pdf', size: 20480, uploadedAt: '2026-10-02T06:10:00Z' },
                },
              })
            : json({ loans: [{ id: 'l1', status: 'DISBURSED', principal: 100000, outstanding: 40000, createdAt: '2026-10-03T00:00:00Z' }] }),
        ),
      ),
    );
    render(<ProfileDetails user={borrower} />);
    const personal = await screen.findByRole('region', { name: 'Personal details' });
    expect(within(personal).getByText('ABCPE1234F')).toBeInTheDocument();
    expect(within(personal).getByText('20 May 1995')).toBeInTheDocument();
    expect(within(personal).getByText('₹60,000')).toBeInTheDocument();
    expect(within(personal).getByText('Salaried')).toBeInTheDocument();
    expect(screen.getByText('Eligible')).toBeInTheDocument();
    expect(screen.getByText(/slip\.pdf/)).toBeInTheDocument();
    const loans = screen.getByRole('region', { name: 'Loans' });
    expect(within(loans).getByText(/1 loan/)).toBeInTheDocument();
    expect(within(loans).getByText(/Disbursed/)).toBeInTheDocument();
    expect(within(loans).getByText(/₹40,000 outstanding/)).toBeInTheDocument();
  });

  it('tells a new borrower what is missing', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => Promise.resolve(url.endsWith('/borrower/profile') ? json({ stage: 'REGISTERED', profile: null }) : json({ loans: [] }))));
    render(<ProfileDetails user={borrower} />);
    expect(await screen.findByText(/haven't added your personal details yet/i)).toBeInTheDocument();
    expect(screen.getByText(/No loans yet/)).toBeInTheDocument();
  });
});
