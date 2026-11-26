import { tokens } from '@mrrokesh/shared';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Inbox } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { SkeletonBlock } from '../../../src/components/ui/SkeletonBlock';
import { TextField } from '../../../src/components/ui/TextField';
import { MessageRow } from '../../../src/components/mail/MessageRow';
import { loadMailbox, type MailFilter } from '../../../src/features/mail/api';
import { MAILBOXES, MAILBOX_LABEL, type Mailbox } from '../../../src/features/mail/schema';
import { formatApiError } from '../../../src/lib/api';
import { useSession } from '../../../src/lib/session';
import { useTheme } from '../../../src/theme/use-theme';
import { useType } from '../../../src/theme/type';

const EMPTY_COPY: Record<Mailbox, string> = {
  inbox: 'Your inbox is empty.',
  sent: 'No sent messages yet.',
  drafts: 'No drafts yet.',
  snoozed: 'No snoozed messages.',
  archive: 'Nothing is archived.',
  trash: 'Trash is empty.',
};

const FILTERS: { id: MailFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'starred', label: 'Starred' },
];

export default function MailInboxScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { color } = useTheme();
  const type = useType();
  const { status } = useSession();
  const [mailbox, setMailbox] = useState<Mailbox>('inbox');
  const [filter, setFilter] = useState<MailFilter>('all');
  const [draft, setDraft] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setQ(draft.trim()), tokens.motion.durationBase);
    return () => clearTimeout(timer);
  }, [draft]);

  const list = useQuery({
    queryKey: ['mail', 'messages', mailbox, filter, q, status],
    enabled: status === 'signedIn',
    queryFn: () => loadMailbox({ mailbox, q, filter }),
  });

  const messages = list.data?.messages ?? [];
  const showWrite = status === 'signedIn';

  function openCompose() {
    router.push('/(tabs)/mail/compose');
  }

  let body = (
    <View style={{ paddingHorizontal: tokens.layout.gutterMobile, gap: tokens.space[3] }}>
      <SkeletonBlock height={tokens.space[16]} />
      <SkeletonBlock height={tokens.space[16]} />
      <SkeletonBlock height={tokens.space[16]} />
      <SkeletonBlock height={tokens.space[16]} />
      <SkeletonBlock height={tokens.space[16]} />
      <SkeletonBlock height={tokens.space[16]} />
    </View>
  );

  if (list.isError) {
    const error = formatApiError(list.error);
    body = (
      <EmptyState
        icon={
          <Inbox
            color={color.textSecondary}
            size={tokens.icon.size}
            strokeWidth={tokens.icon.strokeWidth}
          />
        }
        sentence={error.code ? `${error.code}. ${error.message}` : error.message}
        actionLabel="Try again"
        onAction={() => {
          void list.refetch();
        }}
      />
    );
  } else if (list.isSuccess) {
    body = (
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageRow
            message={item}
            onPress={(id) => {
              router.push({ pathname: '/(tabs)/mail/[id]', params: { id } });
            }}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={list.isRefetching}
            onRefresh={() => {
              void list.refetch();
            }}
            tintColor={color.brand}
            colors={[color.brand]}
          />
        }
        style={{ flex: 1 }}
        contentContainerStyle={messages.length === 0 ? { flexGrow: 1 } : undefined}
        ListEmptyComponent={
          <EmptyState
            icon={
              <Inbox
                color={color.textSecondary}
                size={tokens.icon.size}
                strokeWidth={tokens.icon.strokeWidth}
              />
            }
            sentence={q.length > 0 ? 'No messages match that search.' : EMPTY_COPY[mailbox]}
            actionLabel={q.length > 0 ? 'Clear search' : 'Write a message'}
            onAction={() => {
              if (q.length > 0) {
                setDraft('');
                setQ('');
                return;
              }
              openCompose();
            }}
          />
        }
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.bg, paddingTop: insets.top }}>
      <View
        style={{
          paddingHorizontal: tokens.layout.gutterMobile,
          paddingTop: tokens.space[4],
          paddingBottom: tokens.space[3],
          gap: tokens.space[3],
        }}
      >
        <Text style={type.caption}>Mail</Text>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Text accessibilityRole="header" style={type.h2}>
            {MAILBOX_LABEL[mailbox]}
          </Text>
          {showWrite ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Write a message"
              onPress={openCompose}
              style={{ minHeight: tokens.layout.touchTarget, justifyContent: 'center' }}
            >
              <Text style={[type.bodyStrong, { color: color.brand }]}>Write</Text>
            </Pressable>
          ) : null}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: tokens.space[2] }}
        >
          {MAILBOXES.map((item) => {
            const selected = item === mailbox;
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={MAILBOX_LABEL[item]}
                onPress={() => setMailbox(item)}
                style={{
                  minHeight: tokens.layout.touchTarget,
                  justifyContent: 'center',
                  paddingHorizontal: tokens.space[3],
                  borderBottomWidth: 2,
                  borderBottomColor: selected ? color.brand : 'transparent',
                }}
              >
                <Text
                  style={[type.caption, { color: selected ? color.brand : color.textSecondary }]}
                >
                  {MAILBOX_LABEL[item]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: tokens.space[2] }}>
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <Pressable
                key={f.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setFilter(f.id)}
                style={{
                  paddingHorizontal: tokens.space[3],
                  paddingVertical: tokens.space[1],
                  borderRadius: tokens.radius.pill,
                  borderWidth: 1,
                  borderColor: active ? color.brand : color.border,
                  backgroundColor: active ? color.surface : color.bg,
                }}
              >
                <Text style={[type.caption, { color: active ? color.brand : color.textSecondary }]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <TextField label="Search" value={draft} onChangeText={setDraft} autoCapitalize="none" />
      </View>
      <View style={{ flex: 1 }}>{body}</View>
    </View>
  );
}
