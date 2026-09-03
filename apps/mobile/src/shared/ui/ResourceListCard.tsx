import { StyleSheet, Text, View } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { colors, radius, spacing } from '../theme';
import { SurfaceCard } from './SurfaceCard';
import { IconBadge } from './IconBadge';

export type ResourceListItem = {
  title: string;
  subtitle: string;
  badge?: string;
  icon?: LucideIcon;
  tone?: 'accent' | 'neutral';
};

type ResourceListCardProps = {
  title: string;
  description?: string;
  items: ResourceListItem[];
};

export function ResourceListCard({ title, description, items }: ResourceListCardProps) {
  return (
    <SurfaceCard>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      <View style={styles.list}>
        {items.map((item) => (
          <View key={item.title} style={styles.row}>
            {item.icon ? <IconBadge icon={item.icon} active={item.tone === 'accent'} size="md" /> : null}
            <View style={styles.rowText}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
            {item.badge ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            ) : null}
          </View>
        ))}
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 4,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  description: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  list: {
    gap: spacing.xs,
  },
  row: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  badge: {
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
});
