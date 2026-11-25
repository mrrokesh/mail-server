import { ERROR_CODES, tokens } from '@mrrokesh/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { signInFormSchema, fieldMessages } from '../../src/features/auth/forms';
import { apiBaseUrl } from '../../src/lib/config';
import { formatApiError, type FormMessage } from '../../src/lib/api';
import { useSession } from '../../src/lib/session';
import { Button } from '../../src/components/ui/Button';
import { FormAlert } from '../../src/components/ui/FormAlert';
import { Screen } from '../../src/components/ui/Screen';
import { TextField } from '../../src/components/ui/TextField';
import { useTheme } from '../../src/theme/use-theme';
import { useType } from '../../src/theme/type';

const validationCode = ERROR_CODES['API-VAL-001'].code;

export default function SignInScreen() {
  const router = useRouter();
  const type = useType();
  const { color } = useTheme();
  const { signIn, enterPreview } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<FormMessage | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    if (pending) return;
    setFormError(null);
    const parsed = signInFormSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFieldErrors(fieldMessages(parsed.error, ['email', 'password']));
      return;
    }
    setFieldErrors({});
    setPending(true);
    try {
      const result = await signIn(parsed.data);
      if (result === 'mfa') router.push('/(auth)/two-factor');
    } catch (error) {
      setFormError(formatApiError(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <View style={{ gap: tokens.space[6] }}>
        <View style={{ gap: tokens.space[2] }}>
          <Text style={type.caption}>MR Rokesh Mail</Text>
          <Text accessibilityRole="header" style={type.h2}>
            Sign in
          </Text>
          <Text style={type.body}>Use the email for your mailbox.</Text>
        </View>
        <View style={{ gap: tokens.space[4] }}>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={fieldErrors.email}
            errorCode={fieldErrors.email ? validationCode : undefined}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            error={fieldErrors.password}
            errorCode={fieldErrors.password ? validationCode : undefined}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={() => {
              void submit();
            }}
          />
          {formError ? <FormAlert code={formError.code} message={formError.message} /> : null}
          <Button label="Sign in" onPress={() => void submit()} busy={pending} />
          <Button
            label="Forgot password"
            variant="text"
            onPress={() => router.push('/(auth)/forgot-password')}
          />
          <Button
            label="Create account"
            variant="text"
            onPress={() => router.push('/(auth)/sign-up')}
          />
          {__DEV__ ? (
            <Button
              label="Preview the inbox"
              variant="text"
              accessibilityHint="Opens a sample inbox without calling the API."
              onPress={() => {
                void enterPreview();
              }}
            />
          ) : null}
        </View>
        {__DEV__ ? (
          <Text style={[type.caption, { color: color.textSecondary }]}>API {apiBaseUrl()}</Text>
        ) : null}
      </View>
    </Screen>
  );
}
