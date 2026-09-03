import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton, Field } from '../../../shared/ui';
import { colors, spacing } from '../../../shared/theme';
import { useAuthSession } from '../hooks/useAuthSession';
import { normalizeEmail, validateEmail, validatePassword } from '../services';
import { AuthFrame } from './AuthFrame';
import { AuthLink } from './AuthLink';
import { AuthNotice } from './AuthNotice';

export function SignInView() {
  const router = useRouter();
  const { signIn } = useAuthSession();
  const [email, setEmail] = useState('owner@ultron.local');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  function handleSubmit() {
    const nextErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) {
      return;
    }

    signIn(normalizeEmail(email));
    router.replace('/conversations');
  }

  return (
    <AuthFrame
      title="Đăng nhập Ultron"
      description="Kết nối vào companion console của bạn. API thật sẽ được ghép sau; màn này giữ contract UX prod trước."
    >
      <AuthNotice
        title="Mock auth đang bật"
        description="Nhập email hợp lệ và password bất kỳ từ 8 ký tự để vào app; contract UI đã sẵn sàng nối API thật."
      />
      <Field
        autoCapitalize="none"
        autoComplete="email"
        error={errors.email}
        keyboardType="email-address"
        label="Email"
        onChangeText={setEmail}
        textContentType="emailAddress"
        value={email}
      />
      <Field
        autoComplete="password"
        error={errors.password}
        label="Password"
        onChangeText={setPassword}
        placeholder="Tối thiểu 8 ký tự"
        secureTextEntry
        textContentType="password"
        value={password}
      />
      <AppButton block label="Đăng nhập" onPress={handleSubmit} />
      <View style={styles.links}>
        <AuthLink href="/forgot-password" label="Quên mật khẩu?" />
        <Text style={styles.muted}>Chưa có tài khoản?</Text>
        <AuthLink href="/sign-up" label="Tạo tài khoản" />
      </View>
    </AuthFrame>
  );
}

const styles = StyleSheet.create({
  links: {
    gap: spacing.xs,
  },
  muted: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});
