import { tokens } from '@mrrokesh/shared';
import { Pressable, Text } from 'react-native';
import { useTheme } from '../../theme/use-theme';
import { useType } from '../../theme/type';

type Variant = 'primary' | 'text' | 'danger';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  busy?: boolean;
  accessibilityHint?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  busy = false,
  accessibilityHint,
}: Props) {
  const { color } = useTheme();
  const type = useType();
  const inactive = disabled || busy;
  const textColor =
    variant === 'primary' ? color.onBrand : variant === 'danger' ? color.danger : color.brand;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight:
          variant === 'text' ? tokens.layout.touchTarget : tokens.layout.controlHeightMobile,
        width: '100%',
        borderRadius: tokens.radius.button,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: tokens.space[4],
        backgroundColor: variant === 'primary' ? color.brand : 'transparent',
        opacity: inactive ? 0.45 : pressed ? 0.72 : 1,
      })}
    >
      <Text style={[type.bodyStrong, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}
