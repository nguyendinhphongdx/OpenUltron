import { AlertCircle, CheckCircle2, Info } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../../shared/theme';
import { IconBadge } from '../../../shared/ui';

type AuthNoticeProps = {
  title: string;
  description: string;
  tone?: 'info' | 'success' | 'danger';
};

export function AuthNotice({ title, description, tone = 'info' }: AuthNoticeProps) {
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'danger' ? AlertCircle : Info;

  return (
    <View style={[styles.notice, tone === 'success' && styles.success, tone === 'danger' && styles.danger]}>
      <IconBadge icon={Icon} active={tone !== 'info'} size="sm" />
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
  },
  success: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  danger: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '900',
  },
  description: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
});
