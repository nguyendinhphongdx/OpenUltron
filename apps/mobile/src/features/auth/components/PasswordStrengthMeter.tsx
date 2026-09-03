import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../../shared/theme';
import { getPasswordStrength } from '../services';

type PasswordStrengthMeterProps = {
  password: string;
};

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const strength = getPasswordStrength(password);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.label}>Độ mạnh password</Text>
        <Text style={styles.value}>{strength.label}</Text>
      </View>
      <View style={styles.track}>
        {[0, 1, 2, 3].map((index) => (
          <View key={index} style={[styles.segment, index < strength.score && styles.segmentActive]} />
        ))}
      </View>
      <Text style={styles.helper}>{strength.helper}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  value: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '900',
  },
  track: {
    flexDirection: 'row',
    gap: 4,
  },
  segment: {
    flex: 1,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  segmentActive: {
    backgroundColor: colors.accent,
  },
  helper: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
});
