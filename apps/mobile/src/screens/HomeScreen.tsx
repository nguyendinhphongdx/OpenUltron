import { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ApiSettingsCard } from '../features/settings';
import { VoiceSessionCard, checkApiConnection } from '../features/voice';
import { colors, spacing } from '../shared/theme/tokens';

export function HomeScreen() {
  const [apiBaseUrl, setApiBaseUrl] = useState('http://localhost:8000');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'online' | 'offline'>('idle');

  async function handleCheckConnection() {
    setConnectionStatus('checking');
    try {
      await checkApiConnection(apiBaseUrl);
      setConnectionStatus('online');
    } catch {
      setConnectionStatus('offline');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>✦</Text>
          </View>
          <View style={styles.heroText}>
            <Text style={styles.title}>Ultron Mobile</Text>
            <Text style={styles.subtitle}>
              Companion app cho ambient AI: mở session nhanh, nói với agent qua điện thoại/tai nghe.
            </Text>
          </View>
        </View>

        <ApiSettingsCard
          apiBaseUrl={apiBaseUrl}
          connectionStatus={connectionStatus}
          onApiBaseUrlChange={setApiBaseUrl}
          onCheckConnection={handleCheckConnection}
        />
        <VoiceSessionCard apiBaseUrl={apiBaseUrl} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.appBackground,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logo: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#B2F5EA',
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
  },
  logoText: {
    color: colors.accent,
    fontSize: 26,
    fontWeight: '900',
  },
  heroText: {
    flex: 1,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 4,
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
  },
});
