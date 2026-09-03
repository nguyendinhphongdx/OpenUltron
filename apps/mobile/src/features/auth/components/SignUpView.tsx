import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { AppButton, Field } from '../../../shared/ui';
import { spacing } from '../../../shared/theme';
import { useAuthSession } from '../hooks/useAuthSession';
import {
  normalizeEmail,
  validateConfirmPassword,
  validateDisplayName,
  validateEmail,
  validatePassword,
} from '../services';
import { AuthFrame } from './AuthFrame';
import { AuthLink } from './AuthLink';
import { AuthNotice } from './AuthNotice';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';

export function SignUpView() {
  const router = useRouter();
  const { signUp } = useAuthSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; confirmPassword?: string }>({});

  function handleSubmit() {
    const nextErrors = {
      name: validateDisplayName(name),
      email: validateEmail(email),
      password: validatePassword(password),
      confirmPassword: validateConfirmPassword(password, confirmPassword),
    };
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.email || nextErrors.password || nextErrors.confirmPassword) {
      return;
    }

    signUp({ email: normalizeEmail(email), name });
    router.replace('/verify');
  }

  return (
    <AuthFrame
      title="Tạo tài khoản"
      description="Chuẩn bị cho auth/authz thật: identity, pairing và quyền thiết bị sẽ được nối API sau."
    >
      <AuthNotice
        title="Tài khoản cá nhân"
        description="Ultron vẫn là single-user tool; màn này chỉ dựng seam cho identity, device pairing và session token sau này."
        tone="success"
      />
      <Field error={errors.name} label="Tên hiển thị" onChangeText={setName} value={name} placeholder="Nguyễn Đình Phong" />
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
        autoComplete="new-password"
        error={errors.password}
        label="Password"
        onChangeText={setPassword}
        secureTextEntry
        textContentType="newPassword"
        value={password}
        placeholder="Tối thiểu 8 ký tự"
      />
      <PasswordStrengthMeter password={password} />
      <Field
        autoComplete="new-password"
        error={errors.confirmPassword}
        label="Nhập lại password"
        onChangeText={setConfirmPassword}
        secureTextEntry
        textContentType="newPassword"
        value={confirmPassword}
        placeholder="Nhập lại password"
      />
      <AppButton block label="Tạo tài khoản" onPress={handleSubmit} />
      <View style={styles.links}>
        <AuthLink href="/sign-in" label="Đã có tài khoản? Đăng nhập" />
      </View>
    </AuthFrame>
  );
}

const styles = StyleSheet.create({
  links: {
    gap: spacing.xs,
  },
});
