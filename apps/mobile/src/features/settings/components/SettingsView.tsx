import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Field, ScreenScaffold, SurfaceCard } from '../../../shared/ui';
import { getDefaultApiBaseUrl } from '../../../shared/services';
import { colors, radius, spacing } from '../../../shared/theme';

type SettingSwitchProps = {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

function SettingSwitch({ title, description, value, onValueChange }: SettingSwitchProps) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchText}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        trackColor={{ false: colors.border, true: '#99F6E4' }}
        thumbColor={value ? colors.accent : colors.surface}
        value={value}
        onValueChange={onValueChange}
      />
    </View>
  );
}

export function SettingsView() {
  const [apiBaseUrl, setApiBaseUrl] = useState(getDefaultApiBaseUrl());
  const [wakePhrase, setWakePhrase] = useState('Hey Ultron');
  const [backgroundMode, setBackgroundMode] = useState(false);
  const [wakeEnabled, setWakeEnabled] = useState(false);
  const [saveTranscript, setSaveTranscript] = useState(true);
  const [shareDiagnostics, setShareDiagnostics] = useState(false);

  return (
    <ScreenScaffold
      eyebrow="Power"
      title="Settings"
      description="Control center cho mobile companion: API, auth/pairing, voice, wake phrase, background, privacy và logs."
    >
      <SurfaceCard>
        <Text style={styles.sectionTitle}>Connection</Text>
        <Field
          autoCapitalize="none"
          keyboardType="url"
          label="API base URL"
          onChangeText={setApiBaseUrl}
          value={apiBaseUrl}
          helper="Android emulator dùng 10.0.2.2; device thật cần IP LAN hoặc URL public/dev tunnel."
        />
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Auth seam</Text>
          <Text style={styles.infoCopy}>Token/pairing chưa nối API, nhưng client đã có chỗ để gắn auth header sau.</Text>
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.sectionTitle}>Voice and wake</Text>
        <Field
          label="Wake phrase"
          onChangeText={setWakePhrase}
          value={wakePhrase}
          helper="Wake phrase hiện chỉ là setting mock; code thật cần spec/ADR về privacy và battery."
        />
        <SettingSwitch
          title="Enable wake phrase"
          description="Default off. Khi bật thật phải chạy permission và local/background strategy rõ ràng."
          value={wakeEnabled}
          onValueChange={setWakeEnabled}
        />
        <SettingSwitch
          title="Background listening"
          description="Giữ tắt trong MVP. Tính năng thật cần native/background policy riêng."
          value={backgroundMode}
          onValueChange={setBackgroundMode}
        />
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.sectionTitle}>Privacy and logs</Text>
        <SettingSwitch
          title="Save transcript"
          description="Lưu transcript vào conversation để reload và tiếp tục context."
          value={saveTranscript}
          onValueChange={setSaveTranscript}
        />
        <SettingSwitch
          title="Share diagnostics"
          description="Mock setting cho runtime logs/crash reports; chưa gửi dữ liệu ra ngoài."
          value={shareDiagnostics}
          onValueChange={setShareDiagnostics}
        />
      </SurfaceCard>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  switchRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  switchText: {
    flex: 1,
    gap: 3,
  },
  settingTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  settingDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  infoBox: {
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
  },
  infoTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  infoCopy: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
});
