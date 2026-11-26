import { tokens } from '@mrrokesh/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Calendar } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { z } from 'zod';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { TextField } from '../../src/components/ui/TextField';
import { Screen } from '../../src/components/ui/Screen';
import { apiRequest } from '../../src/lib/api';
import { useSession } from '../../src/lib/session';
import { useTheme } from '../../src/theme/use-theme';
import { useType } from '../../src/theme/type';

const eventsSchema = z.object({
  events: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      date: z.string(),
    }),
  ),
});

export default function CalendarScreen() {
  const router = useRouter();
  const { color } = useTheme();
  const type = useType();
  const { status } = useSession();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const createEvent = useMutation({
    mutationFn: () =>
      apiRequest('/api/v1/calendar/events', z.object({ id: z.string() }), {
        auth: true,
        method: 'POST',
        body: { title, date: new Date().toISOString().slice(0, 10), calendar: 'personal' },
      }),
    onSuccess: () => {
      setTitle('');
      void queryClient.invalidateQueries({ queryKey: ['calendar', 'events'] });
    },
  });
  const events = useQuery({
    queryKey: ['calendar', 'events', status],
    enabled: status === 'signedIn',
    queryFn: () => apiRequest('/api/v1/calendar/events', eventsSchema, { auth: true }),
  });

  if (status !== 'signedIn') {
    return (
      <Screen scroll edges={['top']}>
        <EmptyState
          icon={
            <Calendar
              color={color.textSecondary}
              size={tokens.icon.size}
              strokeWidth={tokens.icon.strokeWidth}
            />
          }
          sentence="Sign in to the API to see Calendar."
          actionLabel="Open Mail"
          onAction={() => router.navigate('/(tabs)/mail')}
        />
      </Screen>
    );
  }

  const rows = events.data?.events ?? [];

  return (
    <Screen scroll edges={['top']}>
      <View style={{ gap: tokens.space[4], paddingHorizontal: tokens.layout.gutterMobile }}>
        <Text accessibilityRole="header" style={type.h2}>
          Calendar
        </Text>
        <TextField label="New event" value={title} onChangeText={setTitle} />
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (title.trim()) createEvent.mutate();
          }}
          style={{
            minHeight: 44,
            justifyContent: 'center',
            paddingHorizontal: tokens.space[4],
            borderRadius: tokens.radius.button,
            backgroundColor: color.brand,
          }}
        >
          <Text style={[type.body, { color: color.bg }]}>Add event</Text>
        </Pressable>
        {events.isPending ? <Text style={type.body}>Loading events.</Text> : null}
        {events.isError ? <Text style={type.body}>Calendar could not be loaded.</Text> : null}
        {events.isSuccess && rows.length === 0 ? (
          <Text style={type.body}>No events yet.</Text>
        ) : null}
        {rows.map((event) => (
          <View key={event.id} style={{ gap: tokens.space[1] }}>
            <Text style={type.body}>{event.title}</Text>
            <Text style={type.caption}>{event.date}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}
