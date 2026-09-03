import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

type Metric = {
  label: string;
  value: string;
};

type MetricStripProps = {
  metrics: Metric[];
};

export function MetricStrip({ metrics }: MetricStripProps) {
  return (
    <View style={styles.grid}>
      {metrics.map((metric) => (
        <View key={metric.label} style={styles.metric}>
          <Text style={styles.value}>{metric.value}</Text>
          <Text style={styles.label}>{metric.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metric: {
    flex: 1,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  value: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
});
