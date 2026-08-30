import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../../../shared/theme/tokens';
import { VoiceState } from '../services/voiceSession.service';

type VoiceStatusOrbProps = {
  state: VoiceState;
};

const stateLabel = {
  idle: 'Ready',
  connecting: 'Connecting',
  listening: 'Listening',
  thinking: 'Thinking',
  speaking: 'Speaking',
  using_tool: 'Using tool',
  closed: 'Closed',
  error: 'Error',
} satisfies Record<VoiceState, string>;

export function VoiceStatusOrb({ state }: VoiceStatusOrbProps) {
  const active = state === 'listening' || state === 'thinking' || state === 'speaking' || state === 'using_tool';

  return (
    <View style={styles.container}>
      <View style={[styles.orb, active && styles.activeOrb, state === 'error' && styles.errorOrb]}>
        <View style={[styles.core, state === 'speaking' && styles.speakingCore]} />
      </View>
      <Text style={styles.label}>{stateLabel[state]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 10,
  },
  orb: {
    width: 132,
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  activeOrb: {
    borderColor: '#99F6E4',
    backgroundColor: '#ECFDF5',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
  },
  errorOrb: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  core: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  speakingCore: {
    backgroundColor: colors.action,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
});
