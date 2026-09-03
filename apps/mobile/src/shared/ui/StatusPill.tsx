import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

type StatusPillProps = {
  label: string;
  tone?: 'accent' | 'success' | 'neutral' | 'warning';
};

export function StatusPill({ label, tone = 'neutral' }: StatusPillProps) {
  return (
    <View
      style={[
        styles.pill,
        tone === 'accent' && styles.accent,
        tone === 'success' && styles.success,
        tone === 'warning' && styles.warning,
      ]}
    >
      <View
        style={[
          styles.dot,
          tone === 'accent' && styles.dotAccent,
          tone === 'success' && styles.dotSuccess,
          tone === 'warning' && styles.dotWarning,
        ]}
      />
      <Text
        style={[
          styles.label,
          tone === 'accent' && styles.labelAccent,
          tone === 'success' && styles.labelSuccess,
          tone === 'warning' && styles.labelWarning,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
  },
  accent: {
    borderColor: '#99F6E4',
    backgroundColor: '#ECFDF5',
  },
  success: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  warning: {
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.textSecondary,
  },
  dotAccent: {
    backgroundColor: colors.accent,
  },
  dotSuccess: {
    backgroundColor: colors.success,
  },
  dotWarning: {
    backgroundColor: colors.action,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  labelAccent: {
    color: colors.accent,
  },
  labelSuccess: {
    color: colors.success,
  },
  labelWarning: {
    color: colors.action,
  },
});
