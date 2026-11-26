import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { ErrorNote, Field, TextArea } from '../../components/ui/field';
import { ApiProblem, readOrFallback, writeOrFallback } from '../../lib/api';
import { useDocumentTitle } from '../../lib/use-document-title';
import type { ErrorCode } from '@mrrokesh/shared';

const aliasSchema = z.object({
  id: z.string(),
  label: z.string(),
  address: z.string(),
  enabled: z.boolean(),
});

const dashboardSchema = z.object({
  scope: z.enum(['basic', 'full']),
  addon: z.boolean(),
  trackers: z.object({ status: z.string(), blocked: z.null(), note: z.string() }),
  zeroAccess: z.object({ status: z.string(), inboundEncryption: z.boolean(), note: z.string() }),
  aliases: z.array(aliasSchema),
});

const keySchema = z.object({
  address: z.string(),
  fingerprint: z.string(),
  serverDecrypts: z.literal(false),
  generatesKeys: z.literal(false),
  note: z.string(),
});

export function PrivacyPage() {
  useDocumentTitle('Privacy');
  const queryClient = useQueryClient();
  const view = useQuery({
    queryKey: ['privacy'],
    queryFn: () =>
      readOrFallback(
        '/privacy/dashboard',
        (input) => {
          const parsed = dashboardSchema.safeParse(input);
          return parsed.success ? parsed.data : null;
        },
        null,
      ),
  });
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [wrappedKey, setWrappedKey] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  const [code, setCode] = useState<ErrorCode | null>(null);
  const [keyNote, setKeyNote] = useState<string | null>(null);

  async function send(path: string, method: 'POST' | 'PUT', body: unknown, event?: FormEvent) {
    event?.preventDefault();
    setCode(null);
    try {
      return await writeOrFallback(
        path,
        { method, body: JSON.stringify(body) },
        (input) => input,
        () => null,
      );
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
      return null;
    }
  }

  const data = view.data;

  return (
    <div className="read">
      <h1 className="h1">Privacy</h1>
      <p>
        Masked aliases are addresses on mask.rokeshcloud.com. That domain is not connected to
        inbound mail. Keys are stored as the client sends them. This server does not generate keys
        or encrypt mail.
      </p>
      {data ? (
        <>
          <p>
            Dashboard scope is {data.scope}. {data.trackers.note} {data.zeroAccess.note}
          </p>
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() =>
              void send('/privacy/addon', 'PUT', { enabled: !data.addon }).then(async (result) => {
                if (result?.data) await queryClient.invalidateQueries({ queryKey: ['privacy'] });
              })
            }
          >
            {data.addon ? 'Turn Privacy add-on off' : 'Turn Privacy add-on on'}
          </button>
          <ul>
            {data.aliases.map((alias) => (
              <li key={alias.id}>
                {alias.label} · {alias.address} · {alias.enabled ? 'On' : 'Off'}
                {alias.enabled ? (
                  <>
                    {' '}
                    <button
                      type="button"
                      className="btn btn-text"
                      onClick={() =>
                        void send(`/privacy/aliases/${alias.id}/disable`, 'POST', {}).then(
                          async (result) => {
                            if (result?.data)
                              await queryClient.invalidateQueries({ queryKey: ['privacy'] });
                          },
                        )
                      }
                    >
                      Disable alias
                    </button>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : view.isError ? (
        <ErrorNote code={view.error instanceof ApiProblem ? view.error.code : 'API-SRV-500'} />
      ) : (
        <p>Privacy details appear when the API answers.</p>
      )}
      <form
        className="stack"
        onSubmit={(event) =>
          void send('/privacy/aliases', 'POST', { label }, event).then(async (result) => {
            if (result?.data) {
              setLabel('');
              await queryClient.invalidateQueries({ queryKey: ['privacy'] });
            }
          })
        }
      >
        <Field
          label="Website label"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          required
        />
        <button className="btn btn-primary" type="submit">
          Create alias
        </button>
      </form>
      <form
        className="stack"
        onSubmit={(event) =>
          void send(
            '/privacy/keys',
            'PUT',
            {
              address,
              publicKeyArmored: publicKey,
              wrappedPrivateKey: wrappedKey,
              fingerprint,
            },
            event,
          ).then((result) => {
            const parsed = keySchema.safeParse(result?.data);
            setKeyNote(parsed.success ? parsed.data.note : null);
          })
        }
      >
        <h2 className="h3">Key hook</h2>
        <Field
          label="Address"
          type="email"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          required
        />
        <TextArea
          label="Public key"
          value={publicKey}
          onChange={(event) => setPublicKey(event.target.value)}
          required
        />
        <TextArea
          label="Wrapped private key"
          value={wrappedKey}
          onChange={(event) => setWrappedKey(event.target.value)}
          required
        />
        <Field
          label="Fingerprint"
          value={fingerprint}
          onChange={(event) => setFingerprint(event.target.value)}
          required
        />
        <button className="btn btn-quiet" type="submit">
          Store key hook
        </button>
        {keyNote ? <p>{keyNote}</p> : null}
      </form>
      {code ? <ErrorNote code={code} /> : null}
    </div>
  );
}
