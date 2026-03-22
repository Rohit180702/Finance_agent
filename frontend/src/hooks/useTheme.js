import { useState, useEffect, useCallback } from 'react';

const KEY = 'finagent_theme';

function getInitial() {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'dark' || v === 'light') return v;
  } catch {}
  return 'dark';
}

export function useTheme() {
  const [theme, setThemeState] = useState(getInitial);

  const setTheme = useCallback((t) => {
    setThemeState(t);
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem(KEY, t); } catch {}
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return { theme, setTheme, toggle, isDark: theme === 'dark' };
}
