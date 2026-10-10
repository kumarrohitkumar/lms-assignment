import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ThemeToggle } from '@/components/ThemeToggle';
import { applyTheme, nextTheme, readTheme, THEME_KEY } from '@/lib/theme';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});
afterEach(() => localStorage.clear());

describe('theme helpers', () => {
  it('defaults to following the system', () => {
    expect(readTheme()).toBe('system');
  });

  it('applies and remembers an explicit choice', () => {
    applyTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
    expect(readTheme()).toBe('dark');
  });

  it('removes the override when going back to system', () => {
    applyTheme('light');
    applyTheme('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
  });

  it('cycles system → light → dark → system', () => {
    expect(nextTheme('system')).toBe('light');
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('system');
  });

  it('ignores junk in storage', () => {
    localStorage.setItem(THEME_KEY, 'purple');
    expect(readTheme()).toBe('system');
  });
});

describe('<ThemeToggle>', () => {
  it('says what it will switch to and switches on click', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: /theme: system/i });
    fireEvent.click(button);
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(screen.getByRole('button', { name: /theme: light/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /theme: light/i }));
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
