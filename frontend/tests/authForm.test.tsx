import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthForm } from '@/components/AuthForm';
import { BrandLoader } from '@/components/BrandLoader';

const navigate = vi.fn();
vi.mock('@/lib/navigate', () => ({ navigate: (url: string) => navigate(url) }));

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => navigate.mockReset());
afterEach(() => vi.unstubAllGlobals());

function fill(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
}

describe('<AuthForm mode="login">', () => {
  it('shows a full-screen "signing you in" screen after a successful login, then moves on', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ user: { id: '1', name: 'Priya Sharma', email: 'p@x.dev', role: 'BORROWER' }, token: 't' })));
    render(<AuthForm mode="login" />);
    fill('p@x.dev', 'Secret@123');
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    const overlay = await screen.findByRole('status', { name: /signing you in/i });
    expect(overlay).toHaveTextContent('Signing you in, Priya');
    // The real steps, shown in order while the next page loads.
    expect(overlay).toHaveTextContent('Details verified');
    expect(overlay).toHaveTextContent('Secure session created');
    expect(overlay).toHaveTextContent('Opening your loan application');
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/apply'), { timeout: 3000 });
  });

  it('shakes and explains a wrong password, and stays on the form', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } }, 401)));
    render(<AuthForm mode="login" />);
    fill('p@x.dev', 'nope-nope');
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(screen.getByRole('form', { name: 'Log in' })).toHaveAttribute('data-shake', 'true');
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.queryByRole('status', { name: /signing you in/i })).not.toBeInTheDocument();
  });

  it('can show and hide the password', () => {
    render(<AuthForm mode="login" />);
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');
    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('does not show demo accounts', () => {
    render(<AuthForm mode="login" />);
    expect(screen.queryByText(/demo account/i)).not.toBeInTheDocument();
  });
});

describe('<AuthForm mode="register">', () => {
  it('greets the new borrower while signing them in', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ user: { id: '2', name: 'Ravi Verma', email: 'r@x.dev', role: 'BORROWER' }, token: 't' }, 201)));
    render(<AuthForm mode="register" />);
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Ravi Verma' } });
    fill('r@x.dev', 'Secret@123');
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('status', { name: /setting up your account/i })).toHaveTextContent('Ravi');
    expect(screen.getByRole('status', { name: /setting up your account/i })).toHaveTextContent('Account created');
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/apply'), { timeout: 3000 });
  });
});

describe('<BrandLoader>', () => {
  it('is an accessible status with its message', () => {
    render(<BrandLoader label="Loading your loans" />);
    expect(screen.getByRole('status', { name: 'Loading your loans' })).toBeInTheDocument();
  });
});
