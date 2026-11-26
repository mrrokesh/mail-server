import type { ErrorCode } from '@mrrokesh/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, Palette } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { ErrorNote, Field } from '../../components/ui/field';
import { Icon } from '../../components/ui/icon';
import { Badge } from '../../components/ui/primitives';
import { SkeletonLines } from '../../components/ui/skeleton';
import { ApiProblem, readOrFallback, writeOrFallback } from '../../lib/api';
import { useDocumentTitle } from '../../lib/use-document-title';

const viewSchema = z.object({
  accentToken: z.literal('brand'),
  note: z.string(),
  brand: z
    .object({
      loginHost: z.string(),
      productName: z.string(),
      logoUrl: z.string().nullable(),
    })
    .nullable(),
});

export function BrandPage() {
  useDocumentTitle('White-label brand');
  const queryClient = useQueryClient();
  const view = useQuery({
    queryKey: ['brand-admin'],
    queryFn: () =>
      readOrFallback(
        '/admin/brand',
        (input) => {
          const parsed = viewSchema.safeParse(input);
          return parsed.success ? parsed.data : null;
        },
        null,
      ),
  });
  const [loginHost, setLoginHost] = useState('');
  const [productName, setProductName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [code, setCode] = useState<ErrorCode | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setCode(null);
    setSavedNote(null);
    setPending(true);
    try {
      const saved = await writeOrFallback(
        '/admin/brand',
        {
          method: 'PUT',
          body: JSON.stringify({
            loginHost,
            productName,
            ...(logoUrl.trim() ? { logoUrl: logoUrl.trim() } : {}),
          }),
        },
        (input) => (input && typeof input === 'object' ? true : null),
        () => false,
      );
      if (!saved.data) {
        setCode('API-VAL-001');
        return;
      }
      setSavedNote('Sign-in branding updated.');
      await queryClient.invalidateQueries({ queryKey: ['brand-admin'] });
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    } finally {
      setPending(false);
    }
  }

  const activeName = productName.trim() || view.data?.brand?.productName || 'MR Rokesh Mail';
  const activeHost = loginHost.trim() || view.data?.brand?.loginHost || 'mail.yourcompany.com';
  const activeLogo = logoUrl.trim() || view.data?.brand?.logoUrl || '';

  return (
    <div className="page-wrap">
      <div className="spread">
        <div>
          <h1 className="h2">White-label login branding</h1>
          <p className="caption muted">
            Configure a custom login host, product name, and HTTPS logo while preserving accessible
            brand tokens.
          </p>
        </div>
        {view.data?.brand ? <Badge tone="success">Active</Badge> : <Badge>Default</Badge>}
      </div>

      {view.isPending ? <SkeletonLines count={3} /> : null}
      {view.isError ? (
        <ErrorNote code={view.error instanceof ApiProblem ? view.error.code : 'API-SRV-500'} />
      ) : null}

      <div className="two-col">
        <form className="card stack" onSubmit={(event) => void onSave(event)}>
          <div className="cluster-2">
            <Icon icon={Palette} size={18} />
            <h2 className="h3">Brand configuration</h2>
          </div>
          <Field
            label="Custom login host"
            placeholder={view.data?.brand?.loginHost ?? 'mail.example.com'}
            value={loginHost}
            onChange={(event) => setLoginHost(event.target.value)}
            required
          />
          <Field
            label="Product display name"
            placeholder={view.data?.brand?.productName ?? 'Rokesh Cloud Mail'}
            value={productName}
            onChange={(event) => setProductName(event.target.value)}
            required
          />
          <Field
            label="Logo URL (HTTPS)"
            type="url"
            placeholder={view.data?.brand?.logoUrl ?? 'https://cdn.example.com/logo.png'}
            value={logoUrl}
            onChange={(event) => setLogoUrl(event.target.value)}
          />
          {code ? <ErrorNote code={code} /> : null}
          {savedNote ? <p className="caption status-ready">{savedNote}</p> : null}
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? 'Saving...' : 'Save login branding'}
          </button>
        </form>

        <section className="card-bg stack" aria-label="Sign-in preview">
          <div className="spread">
            <span className="caption strong muted">Live sign-in preview</span>
            <span className="caption mono muted">{activeHost}</span>
          </div>
          <div
            className="card stack-3"
            style={{ maxWidth: 360, marginInline: 'auto', width: '100%' }}
          >
            <div className="cluster-2">
              {activeLogo ? (
                <img
                  src={activeLogo}
                  alt={activeName}
                  style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'contain' }}
                />
              ) : (
                <span className="brand-mark" aria-hidden="true">
                  <Icon icon={Mail} size={16} />
                </span>
              )}
              <strong className="strong">{activeName}</strong>
            </div>
            <p className="h3">Sign in</p>
            <p className="caption muted">
              Access your {activeName} mailbox, calendar, and console.
            </p>
            <div className="input" style={{ display: 'flex', alignItems: 'center' }}>
              <span className="caption muted">ada@{activeHost.replace(/^mail\./, '')}</span>
            </div>
            <button type="button" className="btn btn-primary btn-sm" disabled>
              Sign in
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
