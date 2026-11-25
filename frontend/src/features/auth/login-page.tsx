import type { ErrorCode } from '@mrrokesh/shared';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { ErrorNote, Field } from '../../components/ui/field';
import { problemCode, requestSignIn } from './auth-api';
import { useLoginBrand } from './use-brand';
import { useSession } from '../../lib/session';
import { safeNext, useDocumentTitle } from '../../lib/use-document-title';

const schema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

export function LoginPage() {
  useDocumentTitle('Sign in');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { signIn } = useSession();
  const brand = useLoginBrand();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState<ErrorCode | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      setCode('API-VAL-001');
      return;
    }
    setPending(true);
    setCode(null);
    try {
      const result = await requestSignIn(parsed.data);
      signIn(result.user, result.accessToken);
      navigate(safeNext(params.get('next')));
    } catch (error) {
      setCode(problemCode(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <header className="stack">
        <h1 className="h1">Sign in</h1>
        <p>Use the mailbox address and the account password for {brand.productName}.</p>
      </header>
      <form className="stack" onSubmit={onSubmit} noValidate>
        <Field
          label="Email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {code ? <ErrorNote code={code} /> : null}
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? 'Signing in' : 'Sign in'}
        </button>
        <p className="caption muted">
          When the API is offline, a real email shape and a password of 8 or more characters opens
          sample mail in this browser.
        </p>
        <Link className="btn btn-text" to="/forgot-password">
          Forgot password
        </Link>
      </form>
      <p>
        New workspace? <Link to="/signup">Create workspace</Link>
      </p>
    </>
  );
}
