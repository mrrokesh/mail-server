import { tokens } from '@mrrokesh/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Users } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { z } from 'zod';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { TextField } from '../../src/components/ui/TextField';
import { Screen } from '../../src/components/ui/Screen';
import { apiRequest, formatApiError } from '../../src/lib/api';
import { useSession } from '../../src/lib/session';
import { useTheme } from '../../src/theme/use-theme';
import { useType } from '../../src/theme/type';

const contactsSchema = z.object({
  contacts: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
    }),
  ),
});

export default function ContactsScreen() {
  const router = useRouter();
  const { color } = useTheme();
  const type = useType();
  const { status } = useSession();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const createContact = useMutation({
    mutationFn: () =>
      apiRequest('/api/v1/contacts', z.object({ id: z.string() }), {
        auth: true,
        method: 'POST',
        body: {
          name: name.trim(),
          email: email.trim(),
          ...(phone.trim() ? { phone: phone.trim() } : {}),
        },
      }),
    onSuccess: () => {
      setName('');
      setEmail('');
      setPhone('');
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
    onError: (cause) => {
      setError(formatApiError(cause).message);
    },
  });
  const contacts = useQuery({
    queryKey: ['contacts', status],
    enabled: status === 'signedIn',
    queryFn: () => apiRequest('/api/v1/contacts', contactsSchema, { auth: true }),
  });

  if (status !== 'signedIn') {
    return (
      <Screen scroll edges={['top']}>
        <EmptyState
          icon={
            <Users
              color={color.textSecondary}
              size={tokens.icon.size}
              strokeWidth={tokens.icon.strokeWidth}
            />
          }
          sentence="Sign in to the API to see Contacts."
          actionLabel="Open Mail"
          onAction={() => router.navigate('/(tabs)/mail')}
        />
      </Screen>
    );
  }

  const rows = contacts.data?.contacts ?? [];

  return (
    <Screen scroll edges={['top']}>
      <View style={{ gap: tokens.space[4], paddingHorizontal: tokens.layout.gutterMobile }}>
        <Text accessibilityRole="header" style={type.h2}>
          Contacts
        </Text>
        <TextField label="Name" value={name} onChangeText={setName} autoCapitalize="words" />
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <TextField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (name.trim() && email.trim()) createContact.mutate();
          }}
          style={{
            minHeight: 44,
            justifyContent: 'center',
            paddingHorizontal: tokens.space[4],
            borderRadius: tokens.radius.button,
            backgroundColor: color.brand,
          }}
        >
          <Text style={[type.body, { color: color.bg }]}>
            {createContact.isPending ? 'Saving' : 'Add contact'}
          </Text>
        </Pressable>
        {error ? <Text style={type.body}>{error}</Text> : null}
        {contacts.isPending ? <Text style={type.body}>Loading contacts.</Text> : null}
        {contacts.isError ? <Text style={type.body}>Contacts could not be loaded.</Text> : null}
        {contacts.isSuccess && rows.length === 0 ? (
          <Text style={type.body}>No contacts yet.</Text>
        ) : null}
        {rows.map((contact) => (
          <View key={contact.id} style={{ gap: tokens.space[1] }}>
            <Text style={type.body}>{contact.name}</Text>
            <Text style={type.caption}>{contact.email}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}
