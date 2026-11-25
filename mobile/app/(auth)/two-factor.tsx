import { ERROR_CODES, tokens } from '@mrrokesh/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '../../src/components/ui/Button';
import { FormAlert } from '../../src/components/ui/FormAlert';
import { Screen } from '../../src/components/ui/Screen';
import { TextField } from '../../src/components/ui/TextField';
import { fieldMessages, mfaFormSchema } from '../../src/features/auth/forms';
import { formatApiError, type FormMessage } from '../../src/lib/api';
import { useSession } from '../../src/lib/session';
import { useType } from '../../src/theme/type';

const validationCode = ERROR_CODES['API-VAL-001'].code;

export default function TwoFactorScreen() {
  const router = useRouter();
  const type = useType();
  const { challengeReady, verifyMfa } = useSession();
  const [code, setCode] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<FormMessage | null>(null);
  const [pending, setPending] = useState(false);

  if (!challengeReady) {
    return (
      <Screen scroll edges={['top', 'bottom']}>
        <View style={{ gap: tokens.space[6] }}>
          <Text accessibilityRole="header" style={type.h2}>
            Confirm it is you
          </Text>
          <Text style={type.body}>Sign in again, then enter the code.</Text>
          <Button label="Back to sign in" onPress={() => router.replace('/(auth)/sign-in')} />
        </View>
      </Screen>
    );
  }

  async function submit() {
    if (pending) return;
    setFormError(null);
    const parsed = mfaFormSchema.safeParse({ code });
    if (!parsed.success) {
      setFieldError(fieldMessages(parsed.error, ['code']).code);
      return;
    }
    setFieldError(undefined);
    setPending(true);
    try {
      await verifyMfa(parsed.data.code);
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
            Enter code
          </Text>
          <Text style={type.body}>Enter the 6-digit code from your authenticator app.</Text>
        </View>
        <View style={{ gap: tokens.space[4] }}>
          <TextField
            label="Code"
            value={code}
            onChangeText={setCode}
            error={fieldError}
            errorCode={fieldError ? validationCode : undefined}
            keyboardType="number-pad"
            autoComplete="sms-otp"
            textContentType="oneTimeCode"
            maxLength={6}
          />
          {formError ? <FormAlert code={formError.code} message={formError.message} /> : null}
          <Button label="Confirm code" onPress={() => void submit()} busy={pending} />
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
