import { ERROR_CODES, tokens } from '@mrrokesh/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '../../src/components/ui/Button';
import { FormAlert } from '../../src/components/ui/FormAlert';
import { Screen } from '../../src/components/ui/Screen';
import { TextField } from '../../src/components/ui/TextField';
import { fieldMessages, resetFormSchema } from '../../src/features/auth/forms';
import { formatApiError, type FormMessage } from '../../src/lib/api';
import { useSession } from '../../src/lib/session';
import { useType } from '../../src/theme/type';

const validationCode = ERROR_CODES['API-VAL-001'].code;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const type = useType();
  const { requestPasswordReset } = useSession();
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<FormMessage | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit() {
    if (pending) return;
    setFormError(null);
    const parsed = resetFormSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldError(fieldMessages(parsed.error, ['email']).email);
      return;
    }
    setFieldError(undefined);
    setPending(true);
    try {
      await requestPasswordReset(parsed.data.email);
      setSent(true);
    } catch (error) {
      setFormError(formatApiError(error));
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <Screen scroll edges={['top', 'bottom']}>
        <View style={{ gap: tokens.space[6] }}>
          <Text accessibilityRole="header" style={type.h2}>
            Check your email
          </Text>
          <Text style={type.body}>
            If an account exists for that email, a reset link is on its way.
          </Text>
          <Button label="Back to sign in" onPress={() => router.replace('/(auth)/sign-in')} />
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
            Reset password
          </Text>
          <Text style={type.body}>We will email a reset link if an account exists.</Text>
        </View>
        <View style={{ gap: tokens.space[4] }}>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={fieldError}
            errorCode={fieldError ? validationCode : undefined}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="go"
            onSubmitEditing={() => {
              void submit();
            }}
          />
          {formError ? <FormAlert code={formError.code} message={formError.message} /> : null}
          <Button label="Send reset link" onPress={() => void submit()} busy={pending} />
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
