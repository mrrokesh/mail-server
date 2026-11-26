import type { ErrorCode } from '@mrrokesh/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { EyeOff, KeyRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { ErrorNote, Field, TextArea } from '../../components/ui/field';
import { Icon } from '../../components/ui/icon';
import { Badge } from '../../components/ui/primitives';
import { ApiProblem, readOrFallback, writeOrFallback } from '../../lib/api';
import { useDocumentTitle } from '../../lib/use-document-title';

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
  useDocumentTitle('Privacy & Masked Aliases');
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
    <div className="page-wrap">
      <div className="spread">
        <div>
          <h1 className="h2">Privacy &amp; Masked Email</h1>
          <p className="caption muted">
            Create disposable masked aliases and register client-wrapped OpenPGP public keys.
          </p>
        </div>
        {data ? (
          <button
            type="button"
            className={data.addon ? 'btn btn-quiet btn-sm' : 'btn btn-primary btn-sm'}
            onClick={() =>
              void send('/privacy/addon', 'PUT', { enabled: !data.addon }).then(async (result) => {
                if (result?.data) await queryClient.invalidateQueries({ queryKey: ['privacy'] });
              })
            }
          >
            {data.addon ? 'Privacy add-on active' : 'Enable Privacy add-on'}
          </button>
        ) : null}
      </div>

      {code ? <ErrorNote code={code} /> : null}
      {view.isError ? (
        <ErrorNote code={view.error instanceof ApiProblem ? view.error.code : 'API-SRV-500'} />
      ) : null}

      <div className="two-col">
        <div className="card stack">
          <div className="cluster-2">
            <Icon icon={EyeOff} size={18} />
            <h2 className="h3">Masked aliases</h2>
          </div>
          <form
            className="cluster"
            onSubmit={(event) =>
              void send('/privacy/aliases', 'POST', { label }, event).then(async (result) => {
                if (result?.data) {
                  setLabel('');
                  await queryClient.invalidateQueries({ queryKey: ['privacy'] });
                }
              })
            }
          >
            <div style={{ flex: 1 }}>
              <Field
                label="Website or service label"
                placeholder="Shopping portal"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                required
              />
            </div>
            <button className="btn btn-primary btn-sm" type="submit">
              Create alias
            </button>
          </form>
          {data && data.aliases.length > 0 ? (
            <div className="stack-2">
              {data.aliases.map((alias) => (
                <div key={alias.id} className="spread">
                  <div>
                    <p className="caption strong">{alias.label}</p>
                    <p className="mono">{alias.address}</p>
                  </div>
                  <div className="cluster-2">
                    <Badge tone={alias.enabled ? 'success' : 'neutral'}>
                      {alias.enabled ? 'Active' : 'Disabled'}
                    </Badge>
                    {alias.enabled ? (
                      <button
                        type="button"
                        className="btn btn-quiet btn-sm"
                        onClick={() =>
                          void send(`/privacy/aliases/${alias.id}/disable`, 'POST', {}).then(
                            async (result) => {
                              if (result?.data)
                                await queryClient.invalidateQueries({ queryKey: ['privacy'] });
                            },
                          )
                        }
                      >
                        Disable
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <form
          className="card stack"
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
          <div className="cluster-2">
            <Icon icon={KeyRound} size={18} />
            <h2 className="h3">Zero-access OpenPGP key hook</h2>
          </div>
          <Field
            label="Mailbox address"
            type="email"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            required
          />
          <TextArea
            label="Armored public key"
            value={publicKey}
            onChange={(event) => setPublicKey(event.target.value)}
            required
          />
          <TextArea
            label="Client-wrapped private key"
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
            Store client key
          </button>
          {keyNote ? <p className="caption muted">{keyNote}</p> : null}
        </form>
      </div>
    </div>
  );
}
