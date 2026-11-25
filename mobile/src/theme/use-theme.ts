import { colorsForTheme, type ColorTokens, type ThemeName } from '@mrrokesh/shared';
import { useColorScheme } from 'react-native';

export function useTheme(): { theme: ThemeName; color: ColorTokens } {
  const scheme = useColorScheme();
  const theme: ThemeName = scheme === 'dark' ? 'dark' : 'light';
  return { theme, color: colorsForTheme(theme) };
}
