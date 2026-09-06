export const colors = {
  appBackground: '#F7F8F6',
  surface: '#FFFFFF',
  surfaceMuted: '#F2F4F1',
  border: '#E5E7E2',
  textPrimary: '#242624',
  textSecondary: '#6F746D',
  accent: '#0D9488',
  action: '#F97316',
  success: '#16A34A',
  danger: '#DC2626',
  warning: '#D97706',
  info: '#2563EB',
} as const;

/**
 * Semantic aliases theo vai trò (không phải theo tên màu) — component nên đọc từ đây thay vì
 * `colors.*` trực tiếp khi ý nghĩa là bg/fg/border/interactive/feedback, để đổi palette sau này
 * không phải sửa từng component.
 */
export const semanticColors = {
  background: {
    canvas: colors.appBackground,
    surface: colors.surface,
    surfaceMuted: colors.surfaceMuted,
    overlay: 'rgba(36, 38, 36, 0.5)',
  },
  foreground: {
    primary: colors.textPrimary,
    secondary: colors.textSecondary,
    onAccent: colors.surface,
    onDanger: colors.surface,
    muted: colors.textSecondary,
  },
  border: {
    default: colors.border,
    muted: colors.surfaceMuted,
    focus: colors.accent,
  },
  interactive: {
    primary: colors.textPrimary,
    primaryPressed: '#3B3D3B',
    accent: colors.accent,
    accentPressed: '#0B7A70',
    secondary: colors.surface,
    ghost: 'transparent',
  },
  feedback: {
    success: { bg: '#E6F6ED', fg: colors.success, border: '#BEE8CE' },
    warning: { bg: '#FDF1E0', fg: colors.warning, border: '#F6D9A8' },
    danger: { bg: '#FBE9E7', fg: colors.danger, border: '#F3C4BE' },
    info: { bg: '#E7EEFD', fg: colors.info, border: '#C0D2F8' },
  },
} as const;

export const typography = {
  title: 28,
  heading: 22,
  body: 16,
  caption: 13,
} as const;

export const radius = {
  sm: 12,
  md: 18,
  lg: 28,
  pill: 999,
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
