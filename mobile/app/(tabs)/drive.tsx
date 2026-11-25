import { tokens } from '@mrrokesh/shared';
import { useRouter } from 'expo-router';
import { HardDrive } from 'lucide-react-native';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Screen } from '../../src/components/ui/Screen';
import { useTheme } from '../../src/theme/use-theme';

export default function DriveScreen() {
  const router = useRouter();
  const { color } = useTheme();

  return (
    <Screen scroll edges={['top']}>
      <EmptyState
        icon={
          <HardDrive
            color={color.textSecondary}
            size={tokens.icon.size}
            strokeWidth={tokens.icon.strokeWidth}
          />
        }
        sentence="Drive is not in this version."
        actionLabel="Open Mail"
        onAction={() => router.navigate('/(tabs)/mail')}
      />
    </Screen>
  );
}
