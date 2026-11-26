import { tokens } from '@mrrokesh/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Mail } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button } from '../../../src/components/ui/Button';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { FormAlert } from '../../../src/components/ui/FormAlert';
import { Screen } from '../../../src/components/ui/Screen';
import { SkeletonBlock } from '../../../src/components/ui/SkeletonBlock';
import { TextField } from '../../../src/components/ui/TextField';
import { formatWhen } from '../../../src/features/mail/format';
import { loadMessage, updateMessageState } from '../../../src/features/mail/api';
import { formatApiError, type FormMessage } from '../../../src/lib/api';
import { routeParam } from '../../../src/lib/param';
import { useSession } from '../../../src/lib/session';
import { useTheme } from '../../../src/theme/use-theme';
import { useType } from '../../../src/theme/type';

export default function MessageScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { color } = useTheme();
  const type = useType();
  const { status } = useSession();
  const id = routeParam(useLocalSearchParams<{ id?: string | string[] }>().id);

  const [labelInput, setLabelInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [actionError, setActionError] = useState<FormMessage | null>(null);
  const [busy, setBusy] = useState(false);

  const message = useQuery({
    queryKey: ['mail', 'message', id, status],
    enabled: id.length > 0 && status === 'signedIn',
    queryFn: () => loadMessage(id),
  });

  useEffect(() => {
    if (message.data) {
      setNoteInput(message.data.internalNote ?? '');
    }
  }, [message.data]);

  function backToMail() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/mail');
  }

  async function mutate(
    patch: Parameters<typeof updateMessageState>[1],
    navigateBack = false,
  ): Promise<void> {
    if (!message.data || busy) return;
    setActionError(null);
    setBusy(true);
    try {
      await updateMessageState(message.data.id, patch);
      await queryClient.invalidateQueries({ queryKey: ['mail'] });
      if (navigateBack) backToMail();
    } catch (error) {
      setActionError(formatApiError(error));
    } finally {
      setBusy(false);
    }
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
  const fwdSubject = item.subject.startsWith('Fwd:') ? item.subject : `Fwd: ${item.subject}`;
  const quotedBody = `\n\n--- Original message ---\nFrom: ${item.fromAddress}\nSubject: ${item.subject}\n\n${item.bodyText}`;

  const pillActions: { label: string; active?: boolean; onPress: () => void }[] = [
    {
      label: item.starred ? 'Starred' : 'Star',
      active: item.starred,
      onPress: () => void mutate({ starred: !item.starred }),
    },
    {
      label: item.pinned ? 'Pinned' : 'Pin',
      active: item.pinned,
      onPress: () => void mutate({ pinned: !item.pinned }),
    },
    {
      label: item.muted ? 'Muted' : 'Mute',
      active: item.muted,
      onPress: () => void mutate({ muted: !item.muted }),
    },
    {
      label: item.unread ? 'Mark read' : 'Mark unread',
      onPress: () => void mutate({ unread: !item.unread }),
    },
    {
      label: 'Snooze 24h',
      active: item.mailbox === 'snoozed',
      onPress: () =>
        void mutate(
          {
            folder: 'snoozed',
            snoozeUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          },
          true,
        ),
    },
    {
      label: 'Archive',
      onPress: () => void mutate({ folder: 'archive' }, true),
    },
    {
      label: item.mailbox === 'trash' ? 'Inbox' : 'Trash',
      onPress: () => void mutate({ folder: item.mailbox === 'trash' ? 'inbox' : 'trash' }, true),
    },
  ];

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

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[2] }}>
          {pillActions.map((act) => (
            <Pressable
              key={act.label}
              disabled={busy}
              accessibilityRole="button"
              onPress={act.onPress}
              style={{
                paddingHorizontal: tokens.space[3],
                paddingVertical: tokens.space[2],
                borderRadius: tokens.radius.pill,
                borderWidth: 1,
                borderColor: act.active ? color.brand : color.border,
                backgroundColor: act.active ? color.surface : color.bg,
              }}
            >
              <Text
                style={[type.caption, { color: act.active ? color.brand : color.textSecondary }]}
              >
                {act.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text selectable style={type.body}>
          {item.bodyText.length > 0 ? item.bodyText : 'This message has no text.'}
        </Text>
        <Text style={type.caption}>Remote images stay off.</Text>

        <View
          style={{
            gap: tokens.space[3],
            paddingTop: tokens.space[3],
            borderTopWidth: 1,
            borderTopColor: color.border,
          }}
        >
          <Text style={type.caption}>Labels</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[2] }}>
            {item.labels.map((lbl) => (
              <Pressable
                key={lbl}
                onPress={() =>
                  void mutate({ labels: item.labels.filter((existing) => existing !== lbl) })
                }
                style={{
                  paddingHorizontal: tokens.space[3],
                  paddingVertical: tokens.space[1],
                  borderRadius: tokens.radius.pill,
                  backgroundColor: color.surface,
                  borderWidth: 1,
                  borderColor: color.border,
                }}
              >
                <Text style={type.caption}>{lbl} ×</Text>
              </Pressable>
            ))}
          </View>
          <TextField
            label="Add label"
            value={labelInput}
            onChangeText={setLabelInput}
            autoCapitalize="none"
          />
          <Button
            label="Save label"
            variant="text"
            busy={busy}
            onPress={() => {
              const clean = labelInput.trim();
              if (!clean) return;
              const next = Array.from(new Set([...item.labels, clean]));
              setLabelInput('');
              void mutate({ labels: next });
            }}
          />

          <TextField
            label="Internal team note"
            value={noteInput}
            onChangeText={setNoteInput}
            multiline
          />
          <Button
            label="Save note"
            variant="text"
            busy={busy}
            onPress={() => void mutate({ internalNote: noteInput.trim() || null })}
          />
        </View>

        {actionError ? <FormAlert code={actionError.code} message={actionError.message} /> : null}

        <View style={{ gap: tokens.space[3] }}>
          <Button
            label="Reply"
            onPress={() => {
              router.push({
                pathname: '/(tabs)/mail/compose',
                params: { to: item.fromAddress, subject: replySubject, text: quotedBody },
              });
            }}
          />
          <Button
            label="Forward"
            variant="text"
            onPress={() => {
              router.push({
                pathname: '/(tabs)/mail/compose',
                params: { to: '', subject: fwdSubject, text: quotedBody },
              });
            }}
          />
        </View>
      </View>
    </Screen>
  );
}
