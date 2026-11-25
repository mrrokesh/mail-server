import { tokens } from '@mrrokesh/shared';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../src/components/ui/Button';
import { Screen } from '../../src/components/ui/Screen';
import { useSession } from '../../src/lib/session';
import { useTheme } from '../../src/theme/use-theme';
import { useType } from '../../src/theme/type';

const ROWS = [
  { title: 'Notifications', detail: 'Push arrives in a later version.' },
  { title: 'App passwords', detail: 'Not in this version.' },
  { title: 'Help', detail: 'Guides stay on the docs site.' },
] as const;

export default function MoreScreen() {
  const router = useRouter();
  const { color } = useTheme();
  const type = useType();
  const { email, status, signOut } = useSession();
  const account = email ?? (status === 'preview' ? 'Preview session' : 'Signed in');

  return (
    <Screen scroll edges={['top']}>
      <View style={{ gap: tokens.space[6] }}>
        <View style={{ gap: tokens.space[2] }}>
          <Text style={type.caption}>Account</Text>
          <Text accessibilityRole="header" style={type.h2}>
            More
          </Text>
          <Text selectable style={type.body}>
            {account}
          </Text>
          {status === 'preview' ? (
            <Text style={type.caption}>Sample mail stays on this device.</Text>
          ) : null}
        </View>
        <View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open chat"
            onPress={() => router.push('/(tabs)/chat')}
            style={{
              paddingVertical: tokens.space[3],
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: color.border,
              gap: tokens.space[1],
            }}
          >
            <Text style={type.body}>Chat</Text>
            <Text style={type.caption}>Direct messages, groups, and channels.</Text>
          </Pressable>
          {ROWS.map((row) => (
            <View
              key={row.title}
              style={{
                paddingVertical: tokens.space[3],
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: color.border,
                gap: tokens.space[1],
              }}
            >
              <Text style={type.body}>{row.title}</Text>
              <Text style={type.caption}>{row.detail}</Text>
            </View>
          ))}
        </View>
        <Button
          label="Sign out"
          variant="danger"
          onPress={() => {
            Alert.alert('Sign out', 'Sign out of MR Rokesh Mail on this device?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Sign out',
                style: 'destructive',
                onPress: () => {
                  void signOut();
                },
              },
            ]);
          }}
        />
      </View>
    </Screen>
  );
}
