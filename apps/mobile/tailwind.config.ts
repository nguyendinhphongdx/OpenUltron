import type { Config } from 'tailwindcss';
import { colors, radius, semanticColors, spacing, typography } from './src/shared/theme/tokens';

export default {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        appBackground: colors.appBackground,
        surface: colors.surface,
        surfaceMuted: colors.surfaceMuted,
        border: colors.border,
        textPrimary: colors.textPrimary,
        textSecondary: colors.textSecondary,
        accent: colors.accent,
        action: colors.action,
        success: colors.success,
        danger: colors.danger,
        warning: colors.warning,
        info: colors.info,
        bg: semanticColors.background,
        fg: semanticColors.foreground,
        stroke: semanticColors.border,
        interactive: semanticColors.interactive,
        feedback: semanticColors.feedback,
      },
      spacing: {
        xs: `${spacing.xs}px`,
        sm: `${spacing.sm}px`,
        md: `${spacing.md}px`,
        lg: `${spacing.lg}px`,
        xl: `${spacing.xl}px`,
      },
      borderRadius: {
        sm: `${radius.sm}px`,
        md: `${radius.md}px`,
        lg: `${radius.lg}px`,
        pill: `${radius.pill}px`,
      },
      fontSize: {
        caption: `${typography.caption}px`,
        body: `${typography.body}px`,
        heading: `${typography.heading}px`,
        title: `${typography.title}px`,
      },
    },
  },
  plugins: [],
} satisfies Config;
