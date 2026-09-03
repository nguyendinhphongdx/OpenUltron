import { DrawerContentComponentProps, DrawerContentScrollView } from 'expo-router/drawer';
import { router } from 'expo-router';
import {
  Bot,
  Boxes,
  BrainCircuit,
  Cable,
  KeyRound,
  MessageCircle,
  Route,
  Settings,
  Sparkles,
  ScrollText,
  Wrench,
} from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuthSession } from '../../features/auth';
import { colors, radius, spacing } from '../theme';
import { IconBadge } from '../ui';

const primaryItems = [
  { path: '/conversations', match: 'conversations', label: 'Conversations', icon: MessageCircle },
  { path: '/agents', match: 'agents', label: 'Agents', icon: Bot },
  { path: '/tools', match: 'tools', label: 'Tools', icon: Wrench },
  { path: '/knowledge-bases', match: 'knowledge-bases', label: 'Knowledge Bases', icon: Boxes },
  { path: '/models', match: 'models', label: 'Models', icon: BrainCircuit },
  { path: '/settings', match: 'settings', label: 'Settings', icon: Settings },
] as const;

const secondaryItems = [
  { path: '/orchestrators', match: 'orchestrators', label: 'Orchestrators', icon: Route },
  { path: '/credentials', match: 'credentials', label: 'Credentials', icon: KeyRound },
  { path: '/runtime-logs', match: 'runtime-logs', label: 'Runtime Logs', icon: ScrollText },
] as const;

export function AppDrawerContent(props: DrawerContentComponentProps) {
  const { signOut, user } = useAuthSession();
  const activeRoute = props.state.routeNames[props.state.index];

  function navigate(path: string) {
    router.push(path);
  }

  function renderItem(item: { path: string; match: string; label: string; icon: typeof MessageCircle }) {
    const nestedTabRoute = props.state.routes[props.state.index]?.state?.routes?.at(-1)?.name;
    const active = activeRoute === item.match || nestedTabRoute === item.match;
    return (
      <Pressable
        accessibilityRole="button"
        key={item.path}
        onPress={() => navigate(item.path)}
        style={({ pressed }) => [styles.item, active && styles.itemActive, pressed && styles.itemPressed]}
      >
        <IconBadge icon={item.icon} active={active} size="sm" />
        <Text style={[styles.itemText, active && styles.itemTextActive]}>{item.label}</Text>
      </Pressable>
    );
  }

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.content}>
      <View style={styles.brand}>
        <IconBadge icon={Sparkles} active size="lg" />
        <View style={styles.brandText}>
          <Text style={styles.title}>Ultron</Text>
          <Text style={styles.subtitle}>Ambient companion</Text>
        </View>
      </View>

      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <Cable color={colors.accent} size={18} strokeWidth={2.5} />
          <Text style={styles.statusTitle}>Agent runtime ready</Text>
        </View>
        <Text style={styles.statusCopy}>Voice, tools, KB và orchestrator dùng chung backend runtime.</Text>
      </View>

      <View style={styles.group}>{primaryItems.map(renderItem)}</View>
      <View style={styles.divider} />
      <View style={styles.group}>{secondaryItems.map(renderItem)}</View>

      <View style={styles.profileCard}>
        <Text style={styles.profileName}>{user?.name ?? 'Ultron User'}</Text>
        <Text style={styles.profileEmail}>{user?.email ?? 'owner@ultron.local'}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            signOut();
            router.replace('/sign-in');
          }}
          style={styles.signOutButton}
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  brandText: {
    flex: 1,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  statusCard: {
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  onlineDot: {
    width: 9,
    height: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
  },
  statusTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  statusCopy: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  group: {
    gap: 4,
  },
  item: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
  },
  itemActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemPressed: {
    opacity: 0.78,
  },
  itemText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },
  itemTextActive: {
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  profileCard: {
    marginTop: 'auto',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  profileName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  profileEmail: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  signOutButton: {
    minHeight: 40,
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  signOutText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '800',
  },
});
