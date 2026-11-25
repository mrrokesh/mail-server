import { Moon, Sun } from 'lucide-react';
import { Icon } from './icon';
import { readTheme, useTheme, writeTheme } from '../../lib/theme';

export function ThemeToggle() {
  const theme = useTheme();

  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => writeTheme(readTheme() === 'dark' ? 'light' : 'dark')}
    >
      <Icon icon={theme === 'dark' ? Sun : Moon} />
    </button>
  );
}
