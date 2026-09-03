import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { AppButton, Field } from '../../../shared/ui';
import { spacing } from '../../../shared/theme';
import { useAuthSession } from '../hooks/useAuthSession';
import { validateVerificationCode } from '../services';
import { AuthFrame } from './AuthFrame';
import { AuthLink } from './AuthLink';
import { AuthNotice } from './AuthNotice';

export function VerifyCodeView() {
  const router = useRouter();
  const { pendingEmail, requestPasswordReset, verifyCode } = useAuthSession();
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | undefined>();

  function handleVerify() {
    const nextError = validateVerificationCode(code);
    setCodeError(nextError);
    if (nextError) {
      return;
    }

    verifyCode(code);
    router.replace('/conversations');
  }

  function handleResend() {
    requestPasswordReset(pendingEmail ?? 'owner@ultron.local');
  }

  return (
    <AuthFrame
      title="Xác minh thiết bị"
      description="Màn này dành cho email OTP hoặc pairing code sau này. Chưa nối backend thật."
    >
      <AuthNotice
        title={pendingEmail ? `Mã đã gửi tới ${pendingEmail}` : 'Pairing code demo'}
        description="Nhập 6 chữ số bất kỳ để hoàn tất mock verification và vào app shell."
        tone="success"
      />
      <Field
        error={codeError}
        keyboardType="number-pad"
        label="Verification code"
        maxLength={6}
        onChangeText={setCode}
        textContentType="oneTimeCode"
        value={code}
        placeholder="123456"
      />
      <AppButton block label="Xác minh và vào app" onPress={handleVerify} />
      <AppButton block label="Gửi lại mã" onPress={handleResend} tone="secondary" />
      <View style={styles.links}>
        <AuthLink href="/sign-in" label="Dùng tài khoản khác" />
      </View>
    </AuthFrame>
  );
}

const styles = StyleSheet.create({
  links: {
    gap: spacing.xs,
  },
});
