import { LucideIcon } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { IconBadge } from './IconBadge';

type HeroPanelProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  meta?: string;
};

export function HeroPanel({ eyebrow, title, description, icon, meta }: HeroPanelProps) {
  return (
    <View style={styles.panel}>
      <View style={styles.topRow}>
        <IconBadge icon={icon} active size="lg" />
        {meta ? (
          <View style={styles.metaPill}>
            <Text style={styles.metaText}>{meta}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#B2F5EA',
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    padding: spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  metaPill: {
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  metaText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
  },
  copy: {
    gap: spacing.xs,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 36,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 23,
  },
});
