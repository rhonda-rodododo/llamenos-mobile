/**
 * Design tokens for React Native — hex colors converted from web app's OKLCH values.
 *
 * These are used:
 * 1. As CSS variables in global.css (NativeWind dark mode)
 * 2. Directly in JS where style objects are required (RefreshControl tintColor, StatusBar, etc.)
 */

export const colors = {
  light: {
    background: '#faf9f7',
    foreground: '#1a1d2e',
    card: '#ffffff',
    cardForeground: '#1a1d2e',
    primary: '#0d7377',
    primaryForeground: '#ffffff',
    secondary: '#e8f4f4',
    secondaryForeground: '#1a1d2e',
    muted: '#f3f2f0',
    mutedForeground: '#6b6e7a',
    accent: '#c49a3c',
    accentForeground: '#1a1d2e',
    destructive: '#e5484d',
    destructiveForeground: '#ffffff',
    border: '#e8e6e3',
    input: '#e8e6e3',
    ring: '#0d7377',
    // Status colors
    green: '#22c55e',
    yellow: '#eab308',
    gray: '#9ca3af',
  },
  dark: {
    background: '#161a2a',
    foreground: '#f0eeeb',
    card: '#1e2236',
    cardForeground: '#f0eeeb',
    primary: '#3db8bc',
    primaryForeground: '#0a0a0a',
    secondary: '#2a2e42',
    secondaryForeground: '#f0eeeb',
    muted: '#2a2e42',
    mutedForeground: '#9499ab',
    accent: '#d4a84a',
    accentForeground: '#f0eeeb',
    destructive: '#e5484d',
    destructiveForeground: '#ffffff',
    border: '#363a50',
    input: '#363a50',
    ring: '#3db8bc',
    // Status colors
    green: '#22c55e',
    yellow: '#eab308',
    gray: '#6b7280',
  },
} as const

export type ThemePref = 'light' | 'dark' | 'system'
export type ResolvedScheme = 'light' | 'dark'
