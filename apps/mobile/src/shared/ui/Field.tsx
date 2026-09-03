import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, radius, spacing } from '../theme/tokens';

type FieldProps = TextInputProps & {
  label: string;
  helper?: string;
  error?: string;
};

export function Field({ label, helper, error, style, ...inputProps }: FieldProps) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textSecondary}
        selectionColor={colors.accent}
        style={[styles.input, error && styles.inputError, style]}
        {...inputProps}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.xs,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    color: colors.textPrimary,
    fontSize: 16,
  },
  helper: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  inputError: {
    borderColor: colors.danger,
    backgroundColor: '#FEF2F2',
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
});
