import type { ThemeName } from '@mrrokesh/shared';
import { useEffect, useState } from 'react';

export function readTheme(): ThemeName {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function writeTheme(theme: ThemeName) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('theme', theme);
}

export function useTheme(): ThemeName {
  const [theme, setTheme] = useState<ThemeName>(readTheme);

  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(readTheme()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  return theme;
}
