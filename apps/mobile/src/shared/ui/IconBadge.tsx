import { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme';

type IconBadgeProps = {
  icon: LucideIcon;
  active?: boolean;
  size?: 'sm' | 'md' | 'lg';
};

export function IconBadge({ icon: Icon, active = false, size = 'md' }: IconBadgeProps) {
  return (
    <View style={[styles.badge, styles[size], active && styles.active]}>
      <Icon color={active ? colors.accent : colors.textSecondary} size={size === 'lg' ? 24 : 18} strokeWidth={2.4} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  sm: {
    width: 32,
    height: 32,
  },
  md: {
    width: 40,
    height: 40,
  },
  lg: {
    width: 54,
    height: 54,
    borderRadius: 18,
  },
  active: {
    borderColor: '#99F6E4',
    backgroundColor: '#ECFDF5',
  },
});
