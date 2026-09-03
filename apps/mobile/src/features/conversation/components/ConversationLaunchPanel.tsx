import { Headphones, MessageSquarePlus, Radio, Settings2 } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../../../shared/theme';
import { ActionTile, AppButton, StatusPill, SurfaceCard } from '../../../shared/ui';

export function ConversationLaunchPanel() {
  return (
    <SurfaceCard>
      <View style={styles.header}>
        <View style={styles.copy}>
          <StatusPill label="Companion mode" tone="accent" />
          <Text style={styles.title}>Start from the thing you have</Text>
          <Text style={styles.description}>
            Gõ nhanh khi đang xem màn hình, hoặc bật voice khi đang đi lại. Cùng agent, cùng tool, cùng KB.
          </Text>
        </View>
      </View>

      <View style={styles.grid}>
        <ActionTile active description="Mở mic foreground, nghe/trả lời theo conversation hiện tại." icon={Headphones} title="Voice" />
        <ActionTile description="Tạo chat mới với agent mặc định và vào timeline ngay." icon={MessageSquarePlus} title="New chat" />
      </View>
      <View style={styles.grid}>
        <ActionTile description="Theo dõi event stream, tool call, KB retrieval khi agent chạy." icon={Radio} title="Runtime" />
        <ActionTile description="API URL, wake phrase, background mode và privacy controls." icon={Settings2} title="Power settings" />
      </View>

      <AppButton block label="Tạo conversation mới" onPress={() => {}} />
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
  },
  copy: {
    gap: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.6,
    lineHeight: 29,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
