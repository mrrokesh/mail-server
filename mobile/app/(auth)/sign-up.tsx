import { ERROR_CODES, tokens } from '@mrrokesh/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '../../src/components/ui/Button';
import { FormAlert } from '../../src/components/ui/FormAlert';
import { Screen } from '../../src/components/ui/Screen';
import { TextField } from '../../src/components/ui/TextField';
import { fieldMessages, signUpFormSchema } from '../../src/features/auth/forms';
import { formatApiError, type FormMessage } from '../../src/lib/api';
import { useSession } from '../../src/lib/session';
import { useType } from '../../src/theme/type';

const validationCode = ERROR_CODES['API-VAL-001'].code;

export default function SignUpScreen() {
  const router = useRouter();
  const type = useType();
  const { signUp } = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});
  const [formError, setFormError] = useState<FormMessage | null>(null);
  const [created, setCreated] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit() {
    if (pending) return;
    setFormError(null);
    const parsed = signUpFormSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      setFieldErrors(fieldMessages(parsed.error, ['name', 'email', 'password']));
      return;
    }
    setFieldErrors({});
    setPending(true);
    try {
      const result = await signUp(parsed.data);
      if (result === 'created') setCreated(true);
    } catch (error) {
      setFormError(formatApiError(error));
    } finally {
      setPending(false);
    }
  }

  if (created) {
    return (
      <Screen scroll edges={['top', 'bottom']}>
        <View style={{ gap: tokens.space[6] }}>
          <Text accessibilityRole="header" style={type.h2}>
            Account created
          </Text>
          <Text style={type.body}>Sign in to open Mail.</Text>
          <Button label="Sign in" onPress={() => router.replace('/(auth)/sign-in')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <View style={{ gap: tokens.space[6] }}>
        <View style={{ gap: tokens.space[2] }}>
          <Text style={type.caption}>MR Rokesh Mail</Text>
          <Text accessibilityRole="header" style={type.h2}>
            Create account
          </Text>
          <Text style={type.body}>Create the mailbox you will sign in with.</Text>
        </View>
        <View style={{ gap: tokens.space[4] }}>
          <TextField
            label="Name"
            value={name}
            onChangeText={setName}
            error={fieldErrors.name}
            errorCode={fieldErrors.name ? validationCode : undefined}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
          />
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={fieldErrors.email}
            errorCode={fieldErrors.email ? validationCode : undefined}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            error={fieldErrors.password}
            errorCode={fieldErrors.password ? validationCode : undefined}
            secureTextEntry
            autoComplete="password-new"
            textContentType="newPassword"
          />
          {formError ? <FormAlert code={formError.code} message={formError.message} /> : null}
          <Button label="Create account" onPress={() => void submit()} busy={pending} />
          <Button
            label="Back to sign in"
            variant="text"
            onPress={() => router.replace('/(auth)/sign-in')}
          />
        </View>
      </View>
    </Screen>
  );
}
