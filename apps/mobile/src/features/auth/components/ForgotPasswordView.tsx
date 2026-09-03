import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { AppButton, Field } from '../../../shared/ui';
import { spacing } from '../../../shared/theme';
import { useAuthSession } from '../hooks/useAuthSession';
import { normalizeEmail, validateEmail } from '../services';
import { AuthFrame } from './AuthFrame';
import { AuthLink } from './AuthLink';
import { AuthNotice } from './AuthNotice';

export function ForgotPasswordView() {
  const router = useRouter();
  const { requestPasswordReset } = useAuthSession();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();

  function handleSubmit() {
    const nextError = validateEmail(email);
    setEmailError(nextError);
    if (nextError) {
      return;
    }

    requestPasswordReset(normalizeEmail(email));
    router.push('/verify');
  }

  return (
    <AuthFrame
      title="Khôi phục truy cập"
      description="Nhập email để nhận mã xác minh. Hiện tại là mock flow, chưa gọi API thật."
    >
      <AuthNotice
        title="Reset an toàn"
        description="Prod flow sau này sẽ gửi OTP qua API và revoke session cũ nếu user đổi password."
      />
      <Field
        autoCapitalize="none"
        autoComplete="email"
        error={emailError}
        keyboardType="email-address"
        label="Email"
        onChangeText={setEmail}
        textContentType="emailAddress"
        value={email}
      />
      <AppButton block label="Gửi mã xác minh" onPress={handleSubmit} />
      <View style={styles.links}>
        <AuthLink href="/sign-in" label="Quay lại đăng nhập" />
      </View>
    </AuthFrame>
  );
}

const styles = StyleSheet.create({
  links: {
    gap: spacing.xs,
  },
});
