import { Bot, MessageCircle, Mic2 } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../../shared/theme';
import { IconBadge, StatusPill, SurfaceCard } from '../../../shared/ui';

const conversations = [
  {
    title: 'Daily operator',
    subtitle: 'Default agent · voice ready',
    time: 'Now',
    badge: 'Live',
    icon: Mic2,
    active: true,
  },
  {
    title: 'Research Gemini Live UX',
    subtitle: 'RAG notes · 12 messages',
    time: '09:42',
    badge: '12',
    icon: MessageCircle,
    active: false,
  },
  {
    title: 'Build mobile shell',
    subtitle: 'Draft route, auth và settings',
    time: 'Yesterday',
    badge: 'Draft',
    icon: Bot,
    active: false,
  },
];

export function ConversationInboxPreview() {
  return (
    <SurfaceCard>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Recent conversations</Text>
          <Text style={styles.description}>Chat, voice và tool trace cùng nằm trong một timeline.</Text>
        </View>
        <StatusPill label="Synced" tone="success" />
      </View>

      <View style={styles.list}>
        {conversations.map((conversation) => (
          <View key={conversation.title} style={[styles.row, conversation.active && styles.rowActive]}>
            <IconBadge icon={conversation.icon} active={conversation.active} size="md" />
            <View style={styles.rowCopy}>
              <View style={styles.rowTitleLine}>
                <Text style={styles.rowTitle}>{conversation.title}</Text>
                <Text style={styles.time}>{conversation.time}</Text>
              </View>
              <Text style={styles.subtitle}>{conversation.subtitle}</Text>
            </View>
            <View style={[styles.badge, conversation.active && styles.badgeActive]}>
              <Text style={[styles.badgeText, conversation.active && styles.badgeTextActive]}>{conversation.badge}</Text>
            </View>
          </View>
        ))}
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
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
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.sm,
  },
  rowActive: {
    borderColor: '#99F6E4',
    backgroundColor: '#F0FDFA',
  },
  rowCopy: {
    flex: 1,
    gap: 3,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rowTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '900',
  },
  time: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  badge: {
    minWidth: 42,
    alignItems: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  badgeActive: {
    backgroundColor: colors.accent,
  },
  badgeText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '900',
  },
  badgeTextActive: {
    color: colors.surface,
  },
});
