import { tokens } from '@mrrokesh/shared';
import { Pin, Star } from 'lucide-react-native';
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
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: tokens.space[2],
          }}
        >
          <Text style={[nameStyle, { flex: 1 }]} numberOfLines={1}>
            {message.fromName}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space[1] }}>
            {message.pinned ? <Pin size={13} color={color.brand} strokeWidth={1.75} /> : null}
            {message.starred ? (
              <Star size={13} color={color.brand} fill={color.brand} strokeWidth={1.75} />
            ) : null}
            <Text style={type.caption}>{when}</Text>
          </View>
        </View>
        <Text style={message.unread ? type.bodyStrong : type.body} numberOfLines={1}>
          {message.subject}
        </Text>
        <Text style={type.caption} numberOfLines={1}>
          {message.preview}
        </Text>
        {message.labels.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[1] }}>
            {message.labels.slice(0, 3).map((label) => (
              <View
                key={label}
                style={{
                  backgroundColor: color.surface,
                  borderColor: color.border,
                  borderWidth: 1,
                  borderRadius: tokens.radius.pill,
                  paddingHorizontal: tokens.space[2],
                  paddingVertical: 1,
                }}
              >
                <Text style={type.caption}>{label}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
