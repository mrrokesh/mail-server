import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { ErrorNote, Field, SelectField, TextArea } from '../../components/ui/field';
import { ApiProblem, readOrFallback, writeOrFallback } from '../../lib/api';
import { useDocumentTitle } from '../../lib/use-document-title';
import type { ErrorCode } from '@mrrokesh/shared';

const ssoSchema = z.object({
  configured: z.boolean(),
  protocol: z.enum(['saml', 'oidc']).nullable(),
  issuer: z.string().nullable(),
});

const tokenSchema = z.object({
  id: z.string(),
  token: z.string(),
  label: z.string(),
});

export function SsoPage() {
  useDocumentTitle('Single sign-on');
  const queryClient = useQueryClient();
  const sso = useQuery({
    queryKey: ['sso'],
    queryFn: () =>
      readOrFallback(
        '/admin/sso',
        (input) => {
          const parsed = ssoSchema.safeParse(input);
          return parsed.success ? parsed.data : null;
        },
        null,
      ),
  });
  const [protocol, setProtocol] = useState<'saml' | 'oidc'>('oidc');
  const [issuer, setIssuer] = useState('https://');
  const [metadata, setMetadata] = useState('');
  const [label, setLabel] = useState('Entra');
  const [token, setToken] = useState<string | null>(null);
  const [code, setCode] = useState<ErrorCode | null>(null);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setCode(null);
    try {
      await writeOrFallback(
        '/admin/sso',
        { method: 'PUT', body: JSON.stringify({ protocol, issuer, metadata }) },
        (input) => (ssoSchema.safeParse(input).success ? true : null),
        () => false,
      );
      await queryClient.invalidateQueries({ queryKey: ['sso'] });
      setMetadata('');
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    }
  }

  async function onToken(event: FormEvent) {
    event.preventDefault();
    setCode(null);
    try {
      const result = await writeOrFallback(
        '/admin/scim/tokens',
        { method: 'POST', body: JSON.stringify({ label }) },
        (input) => {
          const parsed = tokenSchema.safeParse(input);
          return parsed.success ? parsed.data : null;
        },
        () => null,
      );
      setToken(result.data?.token ?? null);
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    }
  }

  return (
    <div className="read">
      <h1 className="h1">Single sign-on</h1>
      <p className="muted">
        SAML and OIDC metadata is encrypted at rest. SCIM here only stores users. It does not create
        mailboxes.
      </p>
      {sso.data?.configured ? (
        <p>
          {sso.data.protocol} · {sso.data.issuer}
        </p>
      ) : (
        <p>No identity provider is saved.</p>
      )}
      <form className="stack" onSubmit={onSave} noValidate>
        <SelectField
          label="Protocol"
          value={protocol}
          onChange={(event) => setProtocol(event.target.value === 'saml' ? 'saml' : 'oidc')}
        >
          <option value="oidc">OIDC</option>
          <option value="saml">SAML</option>
        </SelectField>
        <Field label="Issuer" value={issuer} onChange={(event) => setIssuer(event.target.value)} />
        <TextArea
          label="Metadata"
          value={metadata}
          onChange={(event) => setMetadata(event.target.value)}
        />
        <button className="btn btn-primary" type="submit">
          Save provider
        </button>
      </form>
      <form className="stack" onSubmit={onToken} noValidate>
        <Field
          label="SCIM token label"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
        <button className="btn btn-quiet" type="submit">
          Create SCIM token
        </button>
      </form>
      {token ? <p className="break">Copy this token now. It is not shown again. {token}</p> : null}
      {code ? <ErrorNote code={code} /> : null}
    </div>
  );
}
