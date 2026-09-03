import { Tabs } from 'expo-router';
import {
  Bot,
  BriefcaseBusiness,
  MessageCircle,
  Settings,
  Wrench,
} from 'lucide-react-native';
import { colors } from '../../../src/shared/theme';

const tabItems = [
  { name: 'conversations', title: 'Chats', icon: MessageCircle },
  { name: 'agents', title: 'Agents', icon: Bot },
  { name: 'tools', title: 'Tools', icon: Wrench },
  { name: 'knowledge-bases', title: 'KB', icon: BriefcaseBusiness },
  { name: 'settings', title: 'Settings', icon: Settings },
] as const;

export default function AppTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
        tabBarStyle: {
          minHeight: 74,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
          paddingBottom: 12,
          paddingTop: 8,
        },
      }}
    >
      {tabItems.map((item) => (
        <Tabs.Screen
          key={item.name}
          name={item.name}
          options={{
            title: item.title,
            tabBarIcon: ({ color, focused }) => (
              <item.icon
                color={color}
                fill={focused ? '#ECFDF5' : 'transparent'}
                size={22}
                strokeWidth={focused ? 2.6 : 2.1}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
