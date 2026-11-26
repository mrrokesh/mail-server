import type { ErrorCode } from '@mrrokesh/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { ErrorNote, Field, SelectField, TextArea } from '../../components/ui/field';
import { Icon } from '../../components/ui/icon';
import { Badge } from '../../components/ui/primitives';
import { ApiProblem, readOrFallback, writeOrFallback } from '../../lib/api';
import { useDocumentTitle } from '../../lib/use-document-title';

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
  useDocumentTitle('SSO & SCIM');
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
  const [label, setLabel] = useState('Microsoft Entra');
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
    <div className="page-wrap">
      <div className="spread">
        <div>
          <h1 className="h2">Single Sign-On &amp; SCIM</h1>
          <p className="caption muted">
            Configure SAML 2.0 / OIDC identity providers and issue SCIM 2.0 provisioning tokens.
          </p>
        </div>
        {sso.data?.configured ? (
          <Badge tone="success">
            {sso.data.protocol?.toUpperCase()} · {sso.data.issuer}
          </Badge>
        ) : (
          <Badge>Not configured</Badge>
        )}
      </div>

      {code ? <ErrorNote code={code} /> : null}

      <div className="two-col">
        <form className="card stack" onSubmit={onSave} noValidate>
          <div className="cluster-2">
            <Icon icon={KeyRound} size={18} />
            <h2 className="h3">Identity provider</h2>
          </div>
          <SelectField
            label="Protocol"
            value={protocol}
            onChange={(event) => setProtocol(event.target.value === 'saml' ? 'saml' : 'oidc')}
          >
            <option value="oidc">OIDC</option>
            <option value="saml">SAML 2.0</option>
          </SelectField>
          <Field
            label="Issuer URL"
            value={issuer}
            onChange={(event) => setIssuer(event.target.value)}
          />
          <TextArea
            label="Encrypted metadata / client configuration"
            value={metadata}
            onChange={(event) => setMetadata(event.target.value)}
          />
          <button className="btn btn-primary" type="submit">
            Save identity provider
          </button>
        </form>

        <div className="card stack">
          <h2 className="h3">SCIM 2.0 Directory Sync</h2>
          <p className="caption muted">
            Provision users automatically from Microsoft Entra ID, Google Workspace, or Okta.
          </p>
          <form className="stack" onSubmit={onToken} noValidate>
            <Field
              label="Token label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
            <button className="btn btn-quiet" type="submit">
              Generate SCIM token
            </button>
          </form>
          {token ? (
            <div className="card-bg stack-2">
              <p className="caption strong">Copy this SCIM token now (shown once)</p>
              <p className="mono break">{token}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
