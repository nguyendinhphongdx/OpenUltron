import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../../shared/theme/tokens';
import { TranscriptEntry } from '../services/voiceSession.service';

type TranscriptLogProps = {
  entries: TranscriptEntry[];
};

export function TranscriptLog({ entries }: TranscriptLogProps) {
  if (entries.length === 0) {
    return <Text style={styles.empty}>Transcript realtime sẽ hiện ở đây khi session trả event.</Text>;
  }

  return (
    <View style={styles.list}>
      {entries.slice(-6).map((entry) => (
        <View key={entry.id} style={[styles.row, entry.role === 'model' && styles.modelRow]}>
          <Text style={styles.role}>{entry.role === 'user' ? 'Bạn' : 'Ultron'}</Text>
          <Text style={styles.text}>{entry.text}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    gap: 4,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
  },
  modelRow: {
    backgroundColor: '#ECFDF5',
  },
  role: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  text: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 21,
  },
});
