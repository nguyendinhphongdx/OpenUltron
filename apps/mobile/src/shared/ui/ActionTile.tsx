import { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { IconBadge } from './IconBadge';

type ActionTileProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  active?: boolean;
  onPress?: () => void;
};

export function ActionTile({ title, description, icon, active = false, onPress }: ActionTileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.tile, active && styles.active, pressed && styles.pressed]}
    >
      <IconBadge icon={icon} active={active} size="md" />
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 126,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  active: {
    borderColor: '#99F6E4',
    backgroundColor: '#ECFDF5',
  },
  pressed: {
    opacity: 0.78,
  },
  copy: {
    gap: 4,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '900',
  },
  description: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
});
