export type ThemePref = 'system' | 'light' | 'dark';
export const THEME_KEY = 'kosh-theme';
const CHANGE_EVENT = 'kosh-theme-change';

/** The saved choice; anything unreadable means "follow the system". */
export function readTheme(): ThemePref {
  try {
    const v = typeof window !== 'undefined' ? window.localStorage.getItem(THEME_KEY) : null;
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

/** Sets `data-theme` on <html> (no attribute = follow the system) and remembers the choice. */
export function applyTheme(pref: ThemePref) {
  const root = document.documentElement;
  if (pref === 'system') root.removeAttribute('data-theme');
  else root.dataset.theme = pref;
  try {
    if (pref === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, pref);
  } catch {
    // Storage blocked (private mode): the choice still applies for this page.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export const nextTheme = (pref: ThemePref): ThemePref => (pref === 'system' ? 'light' : pref === 'light' ? 'dark' : 'system');

export function subscribeTheme(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/** Runs before first paint (inlined in <head>) so a saved dark choice never flashes light. */
export const themeBootScript = `try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;
