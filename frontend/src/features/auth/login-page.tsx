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
      <header className="stack-2">
        <h1 className="h2">Sign in</h1>
        <p className="caption muted">
          Access your {brand.productName} mailbox, calendar, and admin console.
        </p>
      </header>
      <form className="stack" onSubmit={onSubmit} noValidate>
        <Field
          label="Email address"
          type="email"
          autoComplete="username"
          placeholder="ada@northwind.example"
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
          {pending ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      <div className="spread">
        <Link className="caption muted" to="/forgot-password">
          Forgot password?
        </Link>
        <Link className="caption strong" to="/signup">
          Create workspace
        </Link>
      </div>
    </>
  );
}
