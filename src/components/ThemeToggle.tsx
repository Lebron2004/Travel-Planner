import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
const STORAGE_KEY = 'wayfinder-theme';

const systemTheme = (): Theme => (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

/** The theme on screen: the saved choice set on <html> by index.html, else the device setting. */
function currentTheme(): Theme {
  const forced = document.documentElement.dataset.theme;
  return forced === 'light' || forced === 'dark' ? forced : systemTheme();
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(currentTheme);

  // Follow the device if it switches (e.g. at sunset) and nothing was chosen.
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onChange = () => setTheme(currentTheme());
    mq?.addEventListener('change', onChange);
    return () => mq?.removeEventListener('change', onChange);
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode or blocked storage: the choice just won't be remembered.
    }
    setTheme(next);
  };

  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  return (
    <button className="theme-toggle" onClick={toggle} aria-label={label} title={label}>
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  );
}
