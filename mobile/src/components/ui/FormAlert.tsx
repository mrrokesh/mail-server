import type { FormMessage } from '../../lib/api';
import { Text } from 'react-native';
import { useTheme } from '../../theme/use-theme';
import { useType } from '../../theme/type';

export function FormAlert({ code, message }: FormMessage) {
  const { color } = useTheme();
  const type = useType();
  const text = code ? `${code} · ${message}` : message;
  return (
    <Text
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[type.caption, { color: color.danger }]}
    >
      {text}
    </Text>
  );
}
