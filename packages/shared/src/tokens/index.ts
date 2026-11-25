export interface ColorTokens {
  bg: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  brand: string;
  brandGlow: string;
  success: string;
  warning: string;
  danger: string;
  border: string;
  onBrand: string;
}

export interface TypeToken {
  webSize: number;
  webLineHeight: number;
  phoneSize: number;
  mobileSize: number;
  weight: 400 | 500 | 600 | 700;
  font: 'heading' | 'body';
}

/**
 * Design tokens for web (CSS variables in tokens.css) and native (numbers).
 * Values match the locked tables in DESIGN.md. Do not invent colours here.
 */
export const tokens = {
  color: {
    light: {
      bg: '#FFFFFF',
      surface: '#F5F5F7',
      textPrimary: '#111113',
      textSecondary: '#6E6E73',
      brand: '#5B5BF7',
      brandGlow: 'rgba(91, 91, 247, 0.20)',
      success: '#1F9D55',
      warning: '#C77700',
      danger: '#D92D20',
      border: 'rgba(17, 17, 19, 0.08)',
      onBrand: '#FFFFFF',
    },
    dark: {
      bg: '#000000',
      surface: '#1C1C1E',
      textPrimary: '#F5F5F7',
      textSecondary: '#A1A1A6',
      brand: '#7B7BFF',
      brandGlow: 'rgba(91, 91, 247, 0.20)',
      success: '#30D158',
      warning: '#FFD60A',
      danger: '#FF453A',
      border: 'rgba(245, 245, 247, 0.10)',
      onBrand: '#FFFFFF',
    },
  } satisfies { light: ColorTokens; dark: ColorTokens },
  font: {
    heading: '"Satoshi", -apple-system, BlinkMacSystemFont, sans-serif',
    body: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    headingFamily: 'Satoshi',
    bodyFamily: 'Inter',
    headingTracking: -0.02,
    measureMaxCh: 70,
  },
  typography: {
    display: {
      webSize: 80,
      webLineHeight: 84,
      phoneSize: 48,
      mobileSize: 40,
      weight: 700,
      font: 'heading',
    },
    h1: {
      webSize: 56,
      webLineHeight: 60,
      phoneSize: 34,
      mobileSize: 34,
      weight: 700,
      font: 'heading',
    },
    h2: {
      webSize: 40,
      webLineHeight: 44,
      phoneSize: 28,
      mobileSize: 28,
      weight: 600,
      font: 'heading',
    },
    h3: {
      webSize: 28,
      webLineHeight: 34,
      phoneSize: 22,
      mobileSize: 22,
      weight: 600,
      font: 'heading',
    },
    bodyLg: {
      webSize: 21,
      webLineHeight: 32,
      phoneSize: 19,
      mobileSize: 19,
      weight: 400,
      font: 'body',
    },
    body: {
      webSize: 17,
      webLineHeight: 26,
      phoneSize: 17,
      mobileSize: 17,
      weight: 400,
      font: 'body',
    },
    caption: {
      webSize: 14,
      webLineHeight: 20,
      phoneSize: 13,
      mobileSize: 13,
      weight: 500,
      font: 'body',
    },
  } satisfies Record<string, TypeToken>,
  space: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    6: 24,
    8: 32,
    12: 48,
    16: 64,
    24: 96,
    32: 128,
  },
  layout: {
    containerMax: 1200,
    gutterMobile: 24,
    sectionPyDesktop: 128,
    sectionPyMobile: 64,
    controlHeightWeb: 48,
    controlHeightMobile: 50,
    touchTarget: 44,
  },
  radius: {
    input: 8,
    button: 14,
    pill: 9999,
    card: 20,
    modal: 28,
  },
  shadow: {
    soft: '0 8px 30px rgba(0, 0, 0, 0.08)',
  },
  blur: {
    glass: 20,
    glow: 80,
  },
  motion: {
    durationFast: 200,
    durationBase: 300,
    durationSlow: 400,
    easeCalm: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    revealOffset: 24,
  },
  icon: {
    set: 'lucide',
    strokeWidth: 1.5,
    size: 24,
  },
  brandMaxViewportFraction: 0.1,
} as const;

export type ThemeName = 'light' | 'dark';

export function colorsForTheme(theme: ThemeName): ColorTokens {
  return theme === 'dark' ? tokens.color.dark : tokens.color.light;
}
