import { tokens } from '@mrrokesh/shared';
import { Stack } from 'expo-router';
import { useTheme } from '../../../src/theme/use-theme';

export default function MailLayout() {
  const { color } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: color.bg },
        headerTintColor: color.textPrimary,
        headerShadowVisible: false,
        headerTitleStyle: {
          fontFamily: tokens.font.headingFamily,
          fontSize: tokens.typography.body.mobileSize,
          fontWeight: '600',
          color: color.textPrimary,
        },
        contentStyle: { backgroundColor: color.bg },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: 'Message', headerBackTitle: 'Mail' }} />
      <Stack.Screen name="compose" options={{ title: 'New message', headerBackTitle: 'Mail' }} />
    </Stack>
  );
}
