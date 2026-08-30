import { StyleSheet, Text, View } from 'react-native';
import { AppButton, Field, SurfaceCard } from '../../../shared/ui';
import { colors, radius, spacing } from '../../../shared/theme/tokens';

type ApiSettingsCardProps = {
  apiBaseUrl: string;
  connectionStatus: 'idle' | 'checking' | 'online' | 'offline';
  onApiBaseUrlChange: (value: string) => void;
  onCheckConnection: () => void;
};

const statusLabel = {
  idle: 'Chưa kiểm tra',
  checking: 'Đang kiểm tra',
  online: 'API sẵn sàng',
  offline: 'Không kết nối được',
} satisfies Record<ApiSettingsCardProps['connectionStatus'], string>;

export function ApiSettingsCard({
  apiBaseUrl,
  connectionStatus,
  onApiBaseUrlChange,
  onCheckConnection,
}: ApiSettingsCardProps) {
  return (
    <SurfaceCard>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Runtime</Text>
          <Text style={styles.title}>Kết nối Ultron API</Text>
        </View>
        <View
          style={[
            styles.badge,
            connectionStatus === 'online' && styles.badgeOnline,
            connectionStatus === 'offline' && styles.badgeOffline,
          ]}
        >
          <Text style={styles.badgeText}>{statusLabel[connectionStatus]}</Text>
        </View>
      </View>
      <Field
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        label="API base URL"
        onChangeText={onApiBaseUrlChange}
        placeholder="http://localhost:8000"
        value={apiBaseUrl}
        helper="Trên điện thoại thật, dùng IP LAN của máy chạy backend thay vì localhost."
      />
      <AppButton
        disabled={connectionStatus === 'checking'}
        label={connectionStatus === 'checking' ? 'Đang kiểm tra…' : 'Kiểm tra kết nối'}
        onPress={onCheckConnection}
        tone="secondary"
      />
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
  eyebrow: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  badge: {
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeOnline: {
    backgroundColor: '#DCFCE7',
  },
  badgeOffline: {
    backgroundColor: '#FEE2E2',
  },
  badgeText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
});
