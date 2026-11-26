import { tokens } from '@mrrokesh/shared';
import { Redirect, Tabs } from 'expo-router';
import { Calendar, Ellipsis, HardDrive, Mail, Users } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useSession } from '../../src/lib/session';
import { useTheme } from '../../src/theme/use-theme';

function TabIcon({ icon: Icon, color }: { icon: LucideIcon; color: string }) {
  return <Icon color={color} size={tokens.icon.size} strokeWidth={tokens.icon.strokeWidth} />;
}

export default function TabsLayout() {
  const { status } = useSession();
  const { color } = useTheme();

  if (status === 'loading') {
    return <View style={{ flex: 1, backgroundColor: color.bg }} />;
  }

  if (status === 'signedOut') {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.brand,
        tabBarInactiveTintColor: color.textSecondary,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: color.bg,
          borderTopColor: color.border,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        tabBarLabelStyle: {
          fontFamily: tokens.font.bodyFamily,
          fontSize: tokens.typography.caption.mobileSize,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="mail"
        options={{
          title: 'Mail',
          tabBarIcon: ({ color: iconColor }) => <TabIcon icon={Mail} color={iconColor} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color: iconColor }) => <TabIcon icon={Calendar} color={iconColor} />,
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: 'Contacts',
          tabBarIcon: ({ color: iconColor }) => <TabIcon icon={Users} color={iconColor} />,
        }}
      />
      <Tabs.Screen
        name="drive"
        options={{
          title: 'Drive',
          tabBarIcon: ({ color: iconColor }) => <TabIcon icon={HardDrive} color={iconColor} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color: iconColor }) => <TabIcon icon={Ellipsis} color={iconColor} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          href: null,
          title: 'Chat',
        }}
      />
    </Tabs>
  );
}
