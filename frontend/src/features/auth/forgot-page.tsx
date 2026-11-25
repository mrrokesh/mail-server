import type { ErrorCode } from '@mrrokesh/shared';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { ErrorNote, Field } from '../../components/ui/field';
import { problemCode, requestPasswordReset } from './auth-api';
import { useDocumentTitle } from '../../lib/use-document-title';

const schema = z.object({ email: z.string().trim().email() });

export function ForgotPage() {
  useDocumentTitle('Reset password');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState<ErrorCode | null>(null);
  const [result, setResult] = useState<'live' | 'preview' | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      setCode('API-VAL-001');
      return;
    }
    setPending(true);
    setCode(null);
    try {
      setResult(await requestPasswordReset(parsed.data.email));
    } catch (error) {
      setCode(problemCode(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <header className="stack">
        <h1 className="h1">Reset your password</h1>
        <p className="measure">We do not say whether the address has an account.</p>
      </header>
      {result ? (
        <p role="status">
          {result === 'preview'
            ? 'The API did not answer, so nothing was sent.'
            : 'If that address has an account, a reset link will be sent.'}
        </p>
      ) : (
        <form className="stack" onSubmit={onSubmit} noValidate>
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          {code ? <ErrorNote code={code} /> : null}
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? 'Sending reset link' : 'Send reset link'}
          </button>
        </form>
      )}
      <Link className="btn btn-text" to="/login">
        Back to sign in
      </Link>
    </>
  );
}
