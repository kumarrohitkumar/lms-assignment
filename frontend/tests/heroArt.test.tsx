import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LoanHeroArt } from '@/components/LoanHeroArt';

describe('<LoanHeroArt>', () => {
  it('is one described image for screen readers, with the journey it animates', () => {
    render(<LoanHeroArt />);
    const art = screen.getByRole('img', { name: /loan card moving from applied to sanctioned to disbursed/i });
    expect(art).toBeInTheDocument();
    expect(art).toHaveTextContent('₹1,50,000');
    expect(art).toHaveTextContent('Disbursed');
  });
});
