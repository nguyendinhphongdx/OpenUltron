import 'react-native-gesture-handler';

import { Stack } from 'expo-router';
import { AuthSessionProvider } from '../src/features/auth';

export default function RootLayout() {
  return (
    <AuthSessionProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </AuthSessionProvider>
  );
}
