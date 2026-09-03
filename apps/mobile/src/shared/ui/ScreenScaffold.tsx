import { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../theme';

type ScreenScaffoldProps = PropsWithChildren<{
  eyebrow?: string;
  title: string;
  description?: string;
  footer?: React.ReactNode;
}>;

export function ScreenScaffold({ eyebrow, title, description, footer, children }: ScreenScaffoldProps) {
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerShell}>
          <View style={styles.header}>
            {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
            <Text style={styles.title}>{title}</Text>
            {description ? <Text style={styles.description}>{description}</Text> : null}
          </View>
        </View>
        {children}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.appBackground,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl * 2,
  },
  headerShell: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  header: {
    gap: spacing.xs,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
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
    lineHeight: 22,
  },
  footer: {
    paddingTop: spacing.sm,
  },
});
