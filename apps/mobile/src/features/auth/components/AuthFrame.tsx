import { PropsWithChildren } from 'react';
import { Fingerprint, KeyRound, ShieldCheck, Sparkles, Smartphone } from 'lucide-react-native';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../../shared/theme';
import { IconBadge, StatusPill } from '../../../shared/ui';

type AuthFrameProps = PropsWithChildren<{
  title: string;
  description: string;
}>;

export function AuthFrame({ title, description, children }: AuthFrameProps) {
  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.ambientGlow} />
          <View style={styles.brand}>
            <IconBadge icon={Sparkles} active size="lg" />
            <View>
              <Text style={styles.brandText}>Ultron</Text>
              <Text style={styles.brandSubtext}>AI OS companion</Text>
            </View>
          </View>
          <View style={styles.card}>
            <View style={styles.securityRow}>
              <StatusPill label="Secure companion" tone="accent" />
            </View>
            <View style={styles.heading}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.description}>{description}</Text>
            </View>
            <View style={styles.featureRail}>
              <AuthFeature icon={ShieldCheck} label="Device pairing ready" />
              <AuthFeature icon={Fingerprint} label="Biometric seam" />
              <AuthFeature icon={KeyRound} label="Token storage seam" />
              <AuthFeature icon={Smartphone} label="Mobile companion shell" />
            </View>
            <View style={styles.form}>{children}</View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function AuthFeature({ icon, label }: { icon: typeof ShieldCheck; label: string }) {
  return (
    <View style={styles.feature}>
      <IconBadge icon={icon} size="sm" />
      <Text style={styles.featureText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.appBackground,
  },
  keyboard: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    gap: spacing.lg,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl * 2,
  },
  ambientGlow: {
    position: 'absolute',
    top: 92,
    right: -72,
    width: 220,
    height: 220,
    borderRadius: radius.pill,
    backgroundColor: '#CCFBF1',
    opacity: 0.42,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  brandText: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
  },
  brandSubtext: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 34,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.08,
    shadowRadius: 36,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heading: {
    gap: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 23,
  },
  form: {
    gap: spacing.md,
  },
  featureRail: {
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
  },
  feature: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
});
