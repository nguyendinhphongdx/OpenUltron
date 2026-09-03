import { Drawer } from 'expo-router/drawer';
import { Redirect } from 'expo-router';
import { AppDrawerContent } from '../../src/shared/navigation';
import { colors } from '../../src/shared/theme';
import { useAuthSession } from '../../src/features/auth';

const drawerItems = [
  { name: '(tabs)', title: 'Workspace' },
  { name: 'models', title: 'Models' },
  { name: 'orchestrators', title: 'Orchestrators' },
  { name: 'credentials', title: 'Credentials' },
  { name: 'runtime-logs', title: 'Runtime Logs' },
] as const;

export default function AppLayout() {
  const { status } = useAuthSession();

  if (status !== 'authenticated') {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Drawer
      drawerContent={(props) => <AppDrawerContent {...props} />}
      screenOptions={{
        drawerActiveTintColor: colors.accent,
        drawerInactiveTintColor: colors.textSecondary,
        drawerStyle: {
          backgroundColor: colors.appBackground,
          width: 310,
        },
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: colors.appBackground,
        },
        headerTintColor: colors.textPrimary,
        headerTitleAlign: 'center',
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '800',
        },
      }}
    >
      <Drawer.Screen name="index" options={{ drawerItemStyle: { display: 'none' } }} />
      {drawerItems.map((item) => (
        <Drawer.Screen key={item.name} name={item.name} options={{ title: item.title }} />
      ))}
    </Drawer>
  );
}
