import { tokens } from '@mrrokesh/shared';
import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { SkeletonBlock } from '../src/components/ui/SkeletonBlock';
import { useSession } from '../src/lib/session';
import { useTheme } from '../src/theme/use-theme';

export default function Index() {
  const { status } = useSession();
  const { color } = useTheme();

  if (status === 'loading') {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          gap: tokens.space[3],
          paddingHorizontal: tokens.layout.gutterMobile,
          backgroundColor: color.bg,
        }}
      >
        <SkeletonBlock height={tokens.space[8]} />
        <SkeletonBlock height={tokens.space[4]} />
        <SkeletonBlock height={tokens.space[4]} />
      </View>
    );
  }

  if (status === 'signedOut') {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return <Redirect href="/(tabs)/mail" />;
}
