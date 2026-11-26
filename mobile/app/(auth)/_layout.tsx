import { Redirect, Stack } from 'expo-router';
import { View } from 'react-native';
import { useSession } from '../../src/lib/session';
import { useTheme } from '../../src/theme/use-theme';

export default function AuthLayout() {
  const { status } = useSession();
  const { color } = useTheme();

  if (status === 'loading') {
    return <View style={{ flex: 1, backgroundColor: color.bg }} />;
  }

  if (status === 'signedIn') {
    return <Redirect href="/(tabs)/mail" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: color.bg },
      }}
    />
  );
}
