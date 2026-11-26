import { tokens } from '@mrrokesh/shared';
import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Mail } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { Button } from '../../../src/components/ui/Button';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { Screen } from '../../../src/components/ui/Screen';
import { SkeletonBlock } from '../../../src/components/ui/SkeletonBlock';
import { formatWhen } from '../../../src/features/mail/format';
import { loadMessage } from '../../../src/features/mail/api';
import { formatApiError } from '../../../src/lib/api';
import { routeParam } from '../../../src/lib/param';
import { useSession } from '../../../src/lib/session';
import { useTheme } from '../../../src/theme/use-theme';
import { useType } from '../../../src/theme/type';

export default function MessageScreen() {
  const router = useRouter();
  const { color } = useTheme();
  const type = useType();
  const { status } = useSession();
  const id = routeParam(useLocalSearchParams<{ id?: string | string[] }>().id);

  const message = useQuery({
    queryKey: ['mail', 'message', id, status],
    enabled: id.length > 0 && status === 'signedIn',
    queryFn: () => loadMessage(id),
  });

  function backToMail() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/mail');
  }

  if (message.isLoading) {
    return (
      <Screen scroll edges={[]}>
        <View style={{ gap: tokens.space[3] }}>
          <SkeletonBlock height={tokens.space[8]} />
          <SkeletonBlock height={tokens.space[4]} />
          <SkeletonBlock height={tokens.space[16]} />
          <SkeletonBlock height={tokens.space[16]} />
        </View>
      </Screen>
    );
  }

  if (message.isError || !message.data) {
    const error = message.isError ? formatApiError(message.error) : null;
    return (
      <Screen scroll edges={[]}>
        <EmptyState
          icon={
            <Mail
              color={color.textSecondary}
              size={tokens.icon.size}
              strokeWidth={tokens.icon.strokeWidth}
            />
          }
          sentence={
            error
              ? error.code
                ? `${error.code}. ${error.message}`
                : error.message
              : 'That message is missing.'
          }
          actionLabel="Back to Mail"
          onAction={backToMail}
        />
      </Screen>
    );
  }

  const item = message.data;
  const replySubject = item.subject.startsWith('Re:') ? item.subject : `Re: ${item.subject}`;

  return (
    <Screen scroll edges={[]}>
      <Stack.Screen options={{ title: 'Message' }} />
      <View style={{ gap: tokens.space[4] }}>
        <Text accessibilityRole="header" style={type.h3}>
          {item.subject}
        </Text>
        <View style={{ gap: tokens.space[1] }}>
          <Text style={type.body}>{item.fromName}</Text>
          <Text style={type.caption}>
            {item.fromAddress} · {formatWhen(item.receivedAt)}
          </Text>
        </View>
        <Text selectable style={type.body}>
          {item.bodyText.length > 0 ? item.bodyText : 'This message has no text.'}
        </Text>
        <Text style={type.caption}>Remote images stay off.</Text>
        <Button
          label="Reply"
          onPress={() => {
            router.push({
              pathname: '/(tabs)/mail/compose',
              params: { to: item.fromAddress, subject: replySubject },
            });
          }}
        />
      </View>
    </Screen>
  );
}
