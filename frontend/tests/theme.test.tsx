import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ThemeToggle } from '@/components/ThemeToggle';
import { applyTheme, DEFAULT_THEME, nextTheme, readTheme, THEME_KEY, themeBootScript } from '@/lib/theme';

const runBoot = () => new Function(themeBootScript)();

beforeEach(() => {
  localStorage.clear();
  document.documentElement.dataset.theme = 'dark'; // what the server renders
});
afterEach(() => localStorage.clear());

describe('theme helpers', () => {
  it('is dark by default', () => {
    expect(DEFAULT_THEME).toBe('dark');
    expect(readTheme()).toBe('dark');
  });

  it('applies and remembers Light', () => {
    applyTheme('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
    expect(readTheme()).toBe('light');
  });

  it('remembers System explicitly and lets the OS decide', () => {
    applyTheme('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(localStorage.getItem(THEME_KEY)).toBe('system');
    expect(readTheme()).toBe('system');
  });

  it('cycles dark → light → system → dark', () => {
    expect(nextTheme('dark')).toBe('light');
    expect(nextTheme('light')).toBe('system');
    expect(nextTheme('system')).toBe('dark');
  });

  it('treats junk in storage as the default', () => {
    localStorage.setItem(THEME_KEY, 'purple');
    expect(readTheme()).toBe('dark');
  });
});

describe('boot script (runs before paint)', () => {
  it('keeps dark when nothing is saved', () => {
    runBoot();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('switches to a saved Light before paint', () => {
    localStorage.setItem(THEME_KEY, 'light');
    runBoot();
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('hands over to the OS for a saved System', () => {
    localStorage.setItem(THEME_KEY, 'system');
    runBoot();
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});

describe('<ThemeToggle>', () => {
  it('starts on Dark and switches on click', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: /theme: dark/i }));
    expect(document.documentElement.dataset.theme).toBe('light');
    fireEvent.click(screen.getByRole('button', { name: /theme: light/i }));
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});
