import { tokens, type ColorTokens } from '@mrrokesh/shared';
import type { TextStyle } from 'react-native';
import { useTheme } from './use-theme';

function fontWeight(weight: 400 | 500 | 600 | 700): TextStyle['fontWeight'] {
  if (weight === 400) return '400';
  if (weight === 500) return '500';
  if (weight === 600) return '600';
  return '700';
}

function heading(size: number, weight: 600 | 700, color: string): TextStyle {
  return {
    fontFamily: tokens.font.headingFamily,
    fontSize: size,
    lineHeight: Math.round(size * 1.2),
    fontWeight: fontWeight(weight),
    letterSpacing: size * tokens.font.headingTracking,
    color,
  };
}

export function textStyles(color: ColorTokens) {
  return {
    h2: heading(tokens.typography.h2.mobileSize, tokens.typography.h2.weight, color.textPrimary),
    h3: heading(tokens.typography.h3.mobileSize, tokens.typography.h3.weight, color.textPrimary),
    body: {
      fontFamily: tokens.font.bodyFamily,
      fontSize: tokens.typography.body.mobileSize,
      lineHeight: tokens.typography.body.webLineHeight,
      fontWeight: fontWeight(tokens.typography.body.weight),
      color: color.textPrimary,
    } satisfies TextStyle,
    bodyStrong: {
      fontFamily: tokens.font.bodyFamily,
      fontSize: tokens.typography.body.mobileSize,
      lineHeight: tokens.typography.body.webLineHeight,
      fontWeight: fontWeight(600),
      color: color.textPrimary,
    } satisfies TextStyle,
    caption: {
      fontFamily: tokens.font.bodyFamily,
      fontSize: tokens.typography.caption.mobileSize,
      lineHeight: tokens.typography.caption.webLineHeight,
      fontWeight: fontWeight(tokens.typography.caption.weight),
      color: color.textSecondary,
    } satisfies TextStyle,
  };
}

export function useType() {
  const { color } = useTheme();
  return textStyles(color);
}
