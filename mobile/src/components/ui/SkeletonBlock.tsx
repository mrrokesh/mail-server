import { tokens } from '@mrrokesh/shared';
import { View } from 'react-native';
import { useTheme } from '../../theme/use-theme';

export function SkeletonBlock({ height }: { height: number }) {
  const { color } = useTheme();
  return (
    <View
      accessibilityLabel="Loading"
      style={{
        height,
        borderRadius: tokens.radius.input,
        backgroundColor: color.surface,
      }}
    />
  );
}
