import { Redirect, Stack } from 'expo-router';
import { useAuthSession } from '../../src/features/auth';

export default function AuthLayout() {
  const { status } = useAuthSession();

  if (status === 'authenticated') {
    return <Redirect href="/conversations" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
