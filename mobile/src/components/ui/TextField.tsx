import { tokens } from '@mrrokesh/shared';
import { useState } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '../../theme/use-theme';
import { useType } from '../../theme/type';

type Props = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  errorCode?: string;
  secureTextEntry?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
  multiline?: boolean;
  maxLength?: number;
};

export function TextField({
  label,
  value,
  onChangeText,
  error,
  errorCode,
  secureTextEntry = false,
  keyboardType,
  autoCapitalize = 'none',
  autoComplete,
  textContentType,
  returnKeyType,
  onSubmitEditing,
  multiline = false,
  maxLength,
}: Props) {
  const { color } = useTheme();
  const type = useType();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? color.danger : focused ? color.brand : color.border;
  const alert = error ? (errorCode ? `${errorCode} · ${error}` : error) : null;

  return (
    <View style={{ gap: tokens.space[2] }}>
      <Text style={type.caption}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        textContentType={textContentType}
        autoCorrect={false}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        multiline={multiline}
        maxLength={maxLength}
        accessibilityLabel={label}
        placeholderTextColor={color.textSecondary}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          type.body,
          {
            minHeight: multiline ? 160 : tokens.layout.controlHeightWeb,
            borderWidth: 2,
            borderColor,
            borderRadius: tokens.radius.input,
            paddingHorizontal: tokens.space[3],
            paddingVertical: multiline ? tokens.space[3] : 0,
            textAlignVertical: multiline ? 'top' : 'center',
          },
        ]}
      />
      {alert ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[type.caption, { color: color.danger }]}
        >
          {alert}
        </Text>
      ) : null}
    </View>
  );
}
