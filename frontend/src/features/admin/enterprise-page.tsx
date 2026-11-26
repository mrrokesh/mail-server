import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { ErrorNote, Field, SelectField } from '../../components/ui/field';
import { ApiProblem, readOrFallback, writeOrFallback } from '../../lib/api';
import { useDocumentTitle } from '../../lib/use-document-title';
import type { ErrorCode } from '@mrrokesh/shared';

const viewSchema = z.object({
  byok: z.array(
    z.object({
      id: z.string(),
      version: z.number(),
      appliedToMail: z.literal(false),
    }),
  ),
  siem: z.array(z.object({ id: z.string(), kind: z.string(), enabled: z.boolean() })),
  simulations: z.array(z.object({ id: z.string(), title: z.string(), status: z.string() })),
  dedicatedIp: z.object({ enabled: z.boolean(), routed: z.literal(false), note: z.string() }),
});

export function EnterprisePage() {
  useDocumentTitle('Enterprise');
  const queryClient = useQueryClient();
  const view = useQuery({
    queryKey: ['enterprise'],
    queryFn: () =>
      readOrFallback(
        '/enterprise',
        (input) => {
          const parsed = viewSchema.safeParse(input);
          return parsed.success ? parsed.data : null;
        },
        null,
      ),
  });
  const [version, setVersion] = useState('1');
  const [kmsKeyRef, setKmsKeyRef] = useState('');
  const [kind, setKind] = useState<'webhook' | 'syslog'>('webhook');
  const [target, setTarget] = useState('');
  const [title, setTitle] = useState('');
  const [sample, setSample] = useState<string | null>(null);
  const [code, setCode] = useState<ErrorCode | null>(null);

  async function send(path: string, method: 'POST' | 'PUT', body: unknown, event?: FormEvent) {
    event?.preventDefault();
    setCode(null);
    try {
      const result = await writeOrFallback(
        path,
        { method, body: JSON.stringify(body) },
        (input) => input,
        () => null,
      );
      await queryClient.invalidateQueries({ queryKey: ['enterprise'] });
      return result.data;
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
      return null;
    }
  }

  const data = view.data;

  return (
    <div className="read">
      <h1 className="h1">Enterprise</h1>
      <p>
        BYOK stores a key version and a customer key reference. SIEM export and attack simulation do
        not leave this API. A dedicated IP flag does not change where mail is sent.
      </p>
      {data ? <p>{data.dedicatedIp.note}</p> : null}
      {view.isError ? (
        <ErrorNote code={view.error instanceof ApiProblem ? view.error.code : 'API-SRV-500'} />
      ) : null}
      {!data && !view.isError ? <p>Enterprise controls appear on the Enterprise plan.</p> : null}
      {data ? (
        <button
          type="button"
          className="btn btn-quiet"
          onClick={() =>
            void send('/enterprise/dedicated-ip', 'PUT', { enabled: !data.dedicatedIp.enabled })
          }
        >
          {data.dedicatedIp.enabled ? 'Clear dedicated IP flag' : 'Set dedicated IP flag'}
        </button>
      ) : null}
      <form
        className="stack"
        onSubmit={(event) =>
          void send('/enterprise/byok', 'POST', { version: Number(version), kmsKeyRef }, event)
        }
      >
        <h2 className="h3">Customer-managed key</h2>
        <Field
          label="Version"
          type="number"
          value={version}
          onChange={(event) => setVersion(event.target.value)}
          required
        />
        <Field
          label="Key reference"
          value={kmsKeyRef}
          onChange={(event) => setKmsKeyRef(event.target.value)}
          required
        />
        <button className="btn btn-quiet" type="submit">
          Register key version
        </button>
      </form>
      <ul>
        {(data?.byok ?? []).map((row) => (
          <li key={row.id}>Version {row.version}. Mail is not re-encrypted.</li>
        ))}
      </ul>
      <form
        className="stack"
        onSubmit={(event) => void send('/enterprise/siem', 'POST', { kind, target }, event)}
      >
        <h2 className="h3">SIEM destination</h2>
        <SelectField
          label="Kind"
          value={kind}
          onChange={(event) => setKind(event.target.value as 'webhook' | 'syslog')}
        >
          <option value="webhook">Webhook</option>
          <option value="syslog">Syslog</option>
        </SelectField>
        <Field
          label="Target"
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          required
        />
        <button className="btn btn-quiet" type="submit">
          Save destination
        </button>
      </form>
      <ul>
        {(data?.siem ?? []).map((row) => (
          <li key={row.id}>
            {row.kind}{' '}
            <button
              type="button"
              className="btn btn-text"
              onClick={() =>
                void send(`/enterprise/siem/${row.id}/sample`, 'POST', {}).then((result) => {
                  if (result && typeof result === 'object') setSample(JSON.stringify(result));
                })
              }
            >
              Build sample
            </button>
          </li>
        ))}
      </ul>
      {sample ? <p className="caption break">{sample}</p> : null}
      <form
        className="stack"
        onSubmit={(event) => void send('/enterprise/attack-simulations', 'POST', { title }, event)}
      >
        <h2 className="h3">Attack simulation</h2>
        <Field
          label="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
        <button className="btn btn-quiet" type="submit">
          Add placeholder
        </button>
      </form>
      <ul>
        {(data?.simulations ?? []).map((row) => (
          <li key={row.id}>
            {row.title} · {row.status}. No messages are sent.
          </li>
        ))}
      </ul>
      {code ? <ErrorNote code={code} /> : null}
    </div>
  );
}
