'use client';

import { useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import type { Loan, ProfileResponse } from '@/lib/types';
import { useSession } from '../SessionProvider';
import { Alert, Button, LoadingBlock, Panel } from '../ui';
import { LoanCalculator } from './LoanCalculator';
import { LoanSummary } from './LoanSummary';
import { PersonalDetailsForm } from './PersonalDetailsForm';
import { SalarySlipUpload } from './SalarySlipUpload';
import { Stepper } from './Stepper';

const OPEN: Loan['status'][] = ['APPLIED', 'SANCTIONED', 'DISBURSED'];

/** Steps completed so far, derived from what the server has stored. */
function completedSteps(data: ProfileResponse) {
  if (data.stage === 'SLIP_UPLOADED') return 2;
  if (data.stage === 'DETAILS_SUBMITTED') return 1;
  return 0;
}

const stepCopy = [
  { title: 'Tell us about yourself', intro: 'We check eligibility instantly. Nothing is shared outside Kosh.' },
  { title: 'Upload your salary slip', intro: 'Your most recent month. A clear photo or a PDF from your employer both work.' },
  { title: 'Choose your loan', intro: 'Move the sliders to see exactly what you will repay. No hidden charges.' },
];

export function ApplyFlow() {
  const { user } = useSession();
  return user ? <BorrowerApplication /> : <LoadingBlock label="Loading your application" />;
}

function BorrowerApplication() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [step, setStep] = useState(0);
  const [applyingAgain, setApplyingAgain] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([api<ProfileResponse>('/borrower/profile'), api<{ loans: Loan[] }>('/borrower/loans')]).then(
      ([p, l]) => {
        setProfile(p);
        setLoans(l.loans);
        setStep(Math.min(completedSteps(p), 2));
      },
      (err) => setLoadError(errorMessage(err)),
    );
  }, []);

  if (loadError) return <Alert title="Could not load your application">{loadError}</Alert>;
  if (!profile) return <LoadingBlock label="Loading your application" />;

  const latest = loans[0];
  const hasOpenLoan = latest && OPEN.includes(latest.status);

  async function apply(input: { principal: number; tenureDays: number }) {
    setSubmitting(true);
    setApplyError(null);
    try {
      const { loan } = await api<{ loan: Loan }>('/borrower/loans', { body: input });
      setLoans((prev) => [loan, ...prev]);
      setApplyingAgain(false);
    } catch (err) {
      setApplyError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (latest && (hasOpenLoan || !applyingAgain)) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your loan</h1>
          <p className="text-ink-soft">Track your application from approval to closure.</p>
        </div>
        <LoanSummary loan={latest} />
        {!hasOpenLoan && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface p-5">
            <p className="text-ink-soft">{latest.status === 'CLOSED' ? 'Need funds again?' : 'You can apply again with updated details.'}</p>
            <Button onClick={() => { setApplyingAgain(true); setStep(0); }}>Start a new application</Button>
          </div>
        )}
        {loans.length > 1 && (
          <details className="text-sm text-ink-soft">
            <summary className="cursor-pointer font-medium text-ink">Earlier loans ({loans.length - 1})</summary>
            <div className="mt-4 flex flex-col gap-4">
              {loans.slice(1).map((l) => (
                <LoanSummary key={l.id} loan={l} />
              ))}
            </div>
          </details>
        )}
      </div>
    );
  }

  const completed = completedSteps(profile);
  const onProfile = (res: ProfileResponse) => {
    setProfile(res);
    setStep(completedSteps(res));
  };

  return (
    <div className="flex flex-col gap-8">
      <Stepper current={step} completed={completed} />
      <div key={`h${step}`} className="anim-rise">
        <h1 className="text-2xl font-bold tracking-tight">{stepCopy[step]!.title}</h1>
        <p className="text-ink-soft">{stepCopy[step]!.intro}</p>
      </div>
      <Panel key={`p${step}`} className="anim-rise p-5 sm:p-8" style={{ '--i': 1 } as React.CSSProperties}>
        {step === 0 && <PersonalDetailsForm initial={profile.profile} onSaved={onProfile} />}
        {step === 1 && (
          <SalarySlipUpload
            existing={profile.profile?.salarySlip ?? null}
            onUploaded={onProfile}
            onContinue={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && (
          <div className="flex flex-col gap-6">
            {applyError && <Alert>{applyError}</Alert>}
            <LoanCalculator onApply={apply} submitting={submitting} />
            <div>
              <Button variant="ghost" onClick={() => setStep(1)}>
                Back
              </Button>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
