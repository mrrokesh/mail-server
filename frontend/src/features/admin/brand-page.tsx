import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { ErrorNote, Field } from '../../components/ui/field';
import { ApiProblem, readOrFallback, writeOrFallback } from '../../lib/api';
import { useDocumentTitle } from '../../lib/use-document-title';
import type { ErrorCode } from '@mrrokesh/shared';

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
  useDocumentTitle('Login brand');
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

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setCode(null);
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
      await queryClient.invalidateQueries({ queryKey: ['brand-admin'] });
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    }
  }

  return (
    <div className="read">
      <h1 className="h1">Login brand</h1>
      <p>
        {view.data?.note ??
          'Partners can set a login host, product name, and https logo. Colour stays on the brand token.'}
      </p>
      {view.isError ? (
        <ErrorNote code={view.error instanceof ApiProblem ? view.error.code : 'API-SRV-500'} />
      ) : null}
      {view.data?.brand ? (
        <p>
          Current host {view.data.brand.loginHost} shows {view.data.brand.productName}. Accent is{' '}
          {view.data.accentToken}.
        </p>
      ) : null}
      <form className="stack" onSubmit={(event) => void onSave(event)}>
        <Field
          label="Login host"
          value={loginHost}
          onChange={(event) => setLoginHost(event.target.value)}
          required
        />
        <Field
          label="Product name"
          value={productName}
          onChange={(event) => setProductName(event.target.value)}
          required
        />
        <Field
          label="Logo URL"
          value={logoUrl}
          onChange={(event) => setLogoUrl(event.target.value)}
        />
        <button className="btn btn-primary" type="submit">
          Save login brand
        </button>
      </form>
      {code ? <ErrorNote code={code} /> : null}
    </div>
  );
}
