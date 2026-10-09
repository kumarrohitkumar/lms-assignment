import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LoanCalculator } from '@/components/apply/LoanCalculator';

describe('<LoanCalculator>', () => {
  it('shows the repayment for the initial values', () => {
    render(<LoanCalculator onApply={vi.fn()} />);
    expect(screen.getByTestId('principal')).toHaveTextContent('₹1,00,000');
    expect(screen.getByTestId('interest')).toHaveTextContent('₹2,958.90'); // 1,00,000 × 12 × 90 / 36,500
    expect(screen.getByTestId('total')).toHaveTextContent('₹1,02,958.90');
  });

  it('updates the panel live as the sliders move', () => {
    render(<LoanCalculator onApply={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Loan amount'), { target: { value: '200000' } });
    fireEvent.change(screen.getByLabelText('Tenure'), { target: { value: '180' } });

    expect(screen.getByTestId('principal')).toHaveTextContent('₹2,00,000');
    expect(screen.getByTestId('interest')).toHaveTextContent('₹11,835.62');
    expect(screen.getByTestId('total')).toHaveTextContent('₹2,11,835.62');
  });

  it('enforces the slider limits', () => {
    render(<LoanCalculator onApply={vi.fn()} />);
    const amount = screen.getByLabelText('Loan amount');
    const tenure = screen.getByLabelText('Tenure');
    expect(amount).toHaveAttribute('min', '50000');
    expect(amount).toHaveAttribute('max', '500000');
    expect(tenure).toHaveAttribute('min', '30');
    expect(tenure).toHaveAttribute('max', '365');
  });

  it('sends only principal and tenure when applying', () => {
    const onApply = vi.fn();
    render(<LoanCalculator onApply={onApply} />);
    fireEvent.change(screen.getByLabelText('Loan amount'), { target: { value: '75000' } });
    fireEvent.click(screen.getByRole('button', { name: /apply for/i }));
    expect(onApply).toHaveBeenCalledWith({ principal: 75000, tenureDays: 90 });
  });
});
