import { ERROR_CODES, tokens } from '@mrrokesh/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button } from '../../../src/components/ui/Button';
import { FormAlert } from '../../../src/components/ui/FormAlert';
import { Screen } from '../../../src/components/ui/Screen';
import { TextField } from '../../../src/components/ui/TextField';
import { fieldMessages, composeFormSchema } from '../../../src/features/auth/forms';
import { sendMessage } from '../../../src/features/mail/api';
import { formatApiError, type FormMessage } from '../../../src/lib/api';
import { routeParam } from '../../../src/lib/param';
import { useTheme } from '../../../src/theme/use-theme';

const validationCode = ERROR_CODES['API-VAL-001'].code;

export default function ComposeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { color } = useTheme();
  const params = useLocalSearchParams<{ to?: string | string[]; subject?: string | string[] }>();
  const toParam = routeParam(params.to);
  const subjectParam = routeParam(params.subject);
  const [to, setTo] = useState(toParam);
  const [subject, setSubject] = useState(subjectParam);
  const [text, setText] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ to?: string; subject?: string; text?: string }>(
    {},
  );
  const [formError, setFormError] = useState<FormMessage | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setTo(toParam);
    setSubject(subjectParam);
    setText('');
  }, [toParam, subjectParam]);

  async function submit() {
    if (pending) return;
    setFormError(null);
    const parsed = composeFormSchema.safeParse({ to, subject, text });
    if (!parsed.success) {
      setFieldErrors(fieldMessages(parsed.error, ['to', 'subject', 'text']));
      return;
    }
    setFieldErrors({});
    setPending(true);
    try {
      await sendMessage(parsed.data);
      await queryClient.invalidateQueries({ queryKey: ['mail', 'messages'] });
      router.back();
    } catch (error) {
      setFormError(formatApiError(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <Screen scroll edges={[]}>
      <View style={{ gap: tokens.space[4], backgroundColor: color.bg }}>
        <TextField
          label="To"
          value={to}
          onChangeText={setTo}
          error={fieldErrors.to}
          errorCode={fieldErrors.to ? validationCode : undefined}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <TextField
          label="Subject"
          value={subject}
          onChangeText={setSubject}
          error={fieldErrors.subject}
          errorCode={fieldErrors.subject ? validationCode : undefined}
          autoCapitalize="sentences"
        />
        <TextField
          label="Message"
          value={text}
          onChangeText={setText}
          error={fieldErrors.text}
          errorCode={fieldErrors.text ? validationCode : undefined}
          multiline
          autoCapitalize="sentences"
        />
        {formError ? <FormAlert code={formError.code} message={formError.message} /> : null}
        <Button label="Send message" onPress={() => void submit()} busy={pending} />
      </View>
    </Screen>
  );
}
