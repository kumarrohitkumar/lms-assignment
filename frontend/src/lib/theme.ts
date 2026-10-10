export type ThemePref = 'system' | 'light' | 'dark';
export const THEME_KEY = 'kosh-theme';
/** What a first-time visitor sees. The server renders <html data-theme="dark"> to match. */
export const DEFAULT_THEME: ThemePref = 'dark';
const CHANGE_EVENT = 'kosh-theme-change';

const isPref = (v: unknown): v is ThemePref => v === 'system' || v === 'light' || v === 'dark';

/** The saved choice, or the default when nothing (or something unreadable) is saved. */
export function readTheme(): ThemePref {
  try {
    const v = typeof window !== 'undefined' ? window.localStorage.getItem(THEME_KEY) : null;
    return isPref(v) ? v : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/** Sets `data-theme` on <html> (no attribute = follow the system) and remembers the choice. */
export function applyTheme(pref: ThemePref) {
  const root = document.documentElement;
  if (pref === 'system') root.removeAttribute('data-theme');
  else root.dataset.theme = pref;
  try {
    localStorage.setItem(THEME_KEY, pref);
  } catch {
    // Storage blocked (private mode): the choice still applies for this page.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export const nextTheme = (pref: ThemePref): ThemePref => (pref === 'dark' ? 'light' : pref === 'light' ? 'system' : 'dark');

export function subscribeTheme(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/**
 * Inlined in <head> and run before first paint. The HTML arrives dark; this switches to a saved
 * Light, or hands over to the operating system for a saved System, so there is never a flash.
 */
export const themeBootScript = `try{var t=localStorage.getItem('${THEME_KEY}'),r=document.documentElement;if(t==='light')r.dataset.theme='light';else if(t==='system')r.removeAttribute('data-theme')}catch(e){}`;
