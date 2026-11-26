import { z } from 'zod';

export const signInFormSchema = z.object({
  email: z.string().trim().min(1, 'Enter an email.').email('Enter a valid email.'),
  password: z.string().min(8, 'Use 8 to 128 characters.').max(128, 'Use 8 to 128 characters.'),
});

export const signUpFormSchema = signInFormSchema.extend({
  name: z.string().trim().min(1, 'Enter your name.').max(80, 'Use 80 characters or fewer.'),
});

export const resetFormSchema = z.object({
  email: z.string().trim().min(1, 'Enter an email.').email('Enter a valid email.'),
});

export const mfaFormSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code.'),
});

export const composeFormSchema = z.object({
  to: z.string().trim().min(1, 'Enter an email.').email('Enter a valid email.'),
  subject: z.string().trim().min(1, 'Enter a subject.').max(200, 'Use 200 characters or fewer.'),
  text: z.string().trim().min(1, 'Write a message.'),
});

export function fieldMessages<Key extends string>(
  error: z.ZodError,
  keys: readonly Key[],
): Partial<Record<Key, string>> {
  const next: Partial<Record<Key, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key !== 'string' || !keys.includes(key as Key) || next[key as Key]) continue;
    next[key as Key] = issue.message;
  }
  return next;
}
