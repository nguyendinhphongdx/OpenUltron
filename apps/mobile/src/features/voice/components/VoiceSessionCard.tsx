import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton, Field, SurfaceCard } from '../../../shared/ui';
import { colors, spacing } from '../../../shared/theme/tokens';
import { useVoiceSession } from '../hooks/useVoiceSession';
import { TranscriptLog } from './TranscriptLog';
import { VoiceStatusOrb } from './VoiceStatusOrb';

type VoiceSessionCardProps = {
  apiBaseUrl: string;
};

export function VoiceSessionCard({ apiBaseUrl }: VoiceSessionCardProps) {
  const [conversationId, setConversationId] = useState('1');
  const [debugText, setDebugText] = useState('');
  const session = useVoiceSession({ apiBaseUrl, conversationId });
  const running = session.state !== 'idle' && session.state !== 'closed' && session.state !== 'error';

  function sendDebugText() {
    const text = debugText.trim();
    if (!text) return;
    session.sendText(text);
    setDebugText('');
  }

  return (
    <SurfaceCard>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Ambient voice</Text>
          <Text style={styles.title}>Nói chuyện với agent</Text>
          <Text style={styles.subtitle}>Mobile là companion runtime; tai nghe là surface nghe/nói.</Text>
        </View>
      </View>

      <VoiceStatusOrb state={session.state} />

      <Field
        keyboardType="number-pad"
        label="Conversation ID"
        onChangeText={setConversationId}
        placeholder="1"
        value={conversationId}
      />

      <View style={styles.actions}>
        <AppButton
          disabled={!session.canStart || running}
          label={running ? 'Đang chạy' : 'Start Voice'}
          onPress={session.start}
        />
        <AppButton label="Stop" onPress={session.stop} tone="secondary" />
      </View>

      <View style={styles.debugBox}>
        <Field
          label="Text fallback để test relay"
          onChangeText={setDebugText}
          placeholder="Hỏi thử agent trước khi wire mic PCM"
          value={debugText}
        />
        <AppButton disabled={!running} label="Gửi vào voice session" onPress={sendDebugText} tone="secondary" />
      </View>

      <View style={styles.metrics}>
        <Text style={styles.metric}>Audio nhận: {session.audioBytesReceived} bytes</Text>
        {session.lastError ? <Text style={styles.error}>{session.lastError}</Text> : null}
      </View>

      <TranscriptLog entries={session.transcript} />
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  debugBox: {
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  metrics: {
    gap: 6,
  },
  metric: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
});
