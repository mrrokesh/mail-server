import { PLAN_TIER_LABEL, type ErrorCode, type PlanTier } from '@mrrokesh/shared';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { ErrorNote, Field } from '../../components/ui/field';
import { Badge } from '../../components/ui/primitives';
import { isPlan, problemCode, requestSignUp } from './auth-api';
import { useSession } from '../../lib/session';
import { useDocumentTitle } from '../../lib/use-document-title';

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  organization: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

export function SignupPage() {
  useDocumentTitle('Create workspace');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requested = params.get('plan');
  const plan: PlanTier = isPlan(requested) ? requested : 'free';
  const { signIn } = useSession();
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState<ErrorCode | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = schema.safeParse({ name, organization, email, password });
    if (!parsed.success) {
      setCode('API-VAL-001');
      return;
    }
    setPending(true);
    setCode(null);
    try {
      const result = await requestSignUp({ ...parsed.data, plan });
      signIn(result.user, result.accessToken);
      navigate('/mail');
    } catch (error) {
      setCode(problemCode(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <header className="stack-2">
        <div className="spread">
          <h1 className="h2">Create workspace</h1>
          <Badge tone="brand">{PLAN_TIER_LABEL[plan]}</Badge>
        </div>
        <p className="caption muted">
          You will be the workspace owner. Connect your custom domain right after signing up.
        </p>
      </header>
      <form className="stack" onSubmit={onSubmit} noValidate>
        <Field
          label="Full name"
          autoComplete="name"
          placeholder="Ada Iyer"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <Field
          label="Organization name"
          autoComplete="organization"
          placeholder="Northwind Studio"
          value={organization}
          onChange={(event) => setOrganization(event.target.value)}
          required
        />
        <Field
          label="Work email"
          type="email"
          autoComplete="email"
          placeholder="ada@northwind.example"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <Field
          label="Password (8–128 characters)"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {code ? <ErrorNote code={code} /> : null}
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? 'Creating workspace...' : 'Create workspace'}
        </button>
      </form>
      <p className="caption muted">
        Already have a mailbox?{' '}
        <Link className="strong" to="/login">
          Sign in
        </Link>
      </p>
    </>
  );
}
