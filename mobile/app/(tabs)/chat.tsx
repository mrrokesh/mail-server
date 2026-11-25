import { tokens } from '@mrrokesh/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { z } from 'zod';
import { Button } from '../../src/components/ui/Button';
import { Screen } from '../../src/components/ui/Screen';
import { apiRequest } from '../../src/lib/api';
import { useSession } from '../../src/lib/session';
import { useTheme } from '../../src/theme/use-theme';
import { useType } from '../../src/theme/type';

const listSchema = z.object({
  engine: z.literal('mrrokesh-chat'),
  conversations: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      kind: z.string(),
    }),
  ),
});

const messagesSchema = z.object({
  messages: z.array(
    z.object({
      id: z.string(),
      body: z.string(),
      threadRootId: z.string().nullable(),
    }),
  ),
});

const createdSchema = z.object({ id: z.string() });

export default function ChatScreen() {
  const { color } = useTheme();
  const type = useType();
  const { status } = useSession();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const conversations = useQuery({
    queryKey: ['chat', 'conversations', status],
    enabled: status === 'signedIn',
    queryFn: () => apiRequest('/api/v1/chat/conversations', listSchema, { auth: true }),
  });
  const rows = conversations.data?.conversations ?? [];
  const selected = rows.find((row) => row.id === selectedId) ?? rows[0] ?? null;
  const messages = useQuery({
    queryKey: ['chat', 'messages', selected?.id ?? 'none'],
    enabled: status === 'signedIn' && Boolean(selected?.id),
    queryFn: () =>
      apiRequest(`/api/v1/chat/conversations/${selected?.id ?? ''}/messages`, messagesSchema, {
        auth: true,
      }),
  });
  const send = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      await apiRequest(
        `/api/v1/chat/conversations/${selected.id}/messages`,
        z.object({ id: z.string() }),
        { method: 'POST', auth: true, body: { body: body.trim() } },
      );
    },
    onSuccess: async () => {
      setBody('');
      await queryClient.invalidateQueries({ queryKey: ['chat', 'messages', selected?.id] });
    },
  });
  const createChannel = useMutation({
    mutationFn: () =>
      apiRequest('/api/v1/chat/conversations', createdSchema, {
        method: 'POST',
        auth: true,
        body: { kind: 'channel', title: 'General' },
      }),
    onSuccess: async (created) => {
      setSelectedId(created.id);
      await queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
  });

  return (
    <Screen scroll edges={['top']}>
      <View style={{ gap: tokens.space[4], paddingHorizontal: tokens.layout.gutterMobile }}>
        <Text accessibilityRole="header" style={type.h2}>
          Chat
        </Text>
        <Text style={type.caption}>mrrokesh-chat. Opened from More.</Text>
        {status !== 'signedIn' ? (
          <Text style={type.body}>Sign in to the API to use chat.</Text>
        ) : null}
        {conversations.isError ? (
          <Text style={type.body}>Chat is available on Business and above.</Text>
        ) : null}
        {status === 'signedIn' && rows.length === 0 && !conversations.isPending ? (
          <Button
            label="Start General"
            onPress={() => {
              createChannel.mutate();
            }}
            busy={createChannel.isPending}
          />
        ) : null}
        {rows.map((row) => (
          <Pressable key={row.id} accessibilityRole="button" onPress={() => setSelectedId(row.id)}>
            <Text style={selected?.id === row.id ? type.bodyStrong : type.body}>{row.title}</Text>
            <Text style={type.caption}>{row.kind}</Text>
          </Pressable>
        ))}
        {(messages.data?.messages ?? []).map((message) => (
          <Text key={message.id} style={type.body}>
            {message.threadRootId ? `Thread: ${message.body}` : message.body}
          </Text>
        ))}
        {selected ? (
          <View style={{ gap: tokens.space[3] }}>
            <TextInput
              accessibilityLabel="Message"
              value={body}
              onChangeText={setBody}
              placeholder="Message"
              placeholderTextColor={color.textSecondary}
              style={{
                ...type.body,
                borderColor: color.border,
                borderWidth: 1,
                padding: tokens.space[3],
              }}
            />
            <Button
              label="Send message"
              disabled={body.trim().length === 0}
              busy={send.isPending}
              onPress={() => {
                send.mutate();
              }}
            />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
