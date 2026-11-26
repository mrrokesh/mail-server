import { tokens } from '@mrrokesh/shared';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Message } from '../../features/mail/schema';
import { formatWhen } from '../../features/mail/format';
import { useTheme } from '../../theme/use-theme';
import { useType } from '../../theme/type';

type Props = {
  message: Message;
  onPress: (id: string) => void;
};

export function MessageRow({ message, onPress }: Props) {
  const { color } = useTheme();
  const type = useType();
  const when = formatWhen(message.receivedAt);
  const nameStyle = message.unread ? type.bodyStrong : type.body;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${message.unread ? 'Unread. ' : ''}${message.fromName}. ${message.subject}`}
      accessibilityHint="Opens the message"
      onPress={() => onPress(message.id)}
      style={({ pressed }) => ({
        backgroundColor: pressed ? color.surface : color.bg,
        paddingHorizontal: tokens.layout.gutterMobile,
        paddingVertical: tokens.space[3],
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: color.border,
        minHeight: tokens.layout.touchTarget,
        flexDirection: 'row',
        gap: tokens.space[3],
        alignItems: 'flex-start',
      })}
    >
      <View
        style={{
          width: tokens.space[2],
          height: tokens.space[2],
          borderRadius: tokens.space[2],
          marginTop: tokens.space[2],
          backgroundColor: message.unread ? color.brand : 'transparent',
        }}
      />
      <View style={{ flex: 1, gap: tokens.space[1] }}>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', gap: tokens.space[3] }}
        >
          <Text style={[nameStyle, { flex: 1 }]} numberOfLines={1}>
            {message.fromName}
          </Text>
          <Text style={type.caption}>{when}</Text>
        </View>
        <Text style={message.unread ? type.bodyStrong : type.body} numberOfLines={1}>
          {message.subject}
        </Text>
        <Text style={type.caption} numberOfLines={1}>
          {message.preview}
        </Text>
      </View>
    </Pressable>
  );
}
