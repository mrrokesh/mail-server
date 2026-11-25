import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { ErrorNote, Field } from '../../components/ui/field';
import { ApiProblem, readOrFallback, writeOrFallback } from '../../lib/api';
import { useDocumentTitle } from '../../lib/use-document-title';
import type { ErrorCode } from '@mrrokesh/shared';

const viewSchema = z.object({
  archive: z.object({ enabled: z.boolean(), note: z.string() }),
  retention: z.object({ days: z.number() }),
  ediscovery: z.array(z.object({ id: z.string(), query: z.string(), status: z.string() })),
  holds: z.array(z.object({ id: z.string(), matter: z.string() })),
  journaling: z.array(z.object({ id: z.string(), destination: z.string(), enabled: z.boolean() })),
});

type ComplianceView = z.infer<typeof viewSchema>;

export function CompliancePage() {
  useDocumentTitle('Compliance');
  const queryClient = useQueryClient();
  const view = useQuery({
    queryKey: ['compliance'],
    queryFn: () =>
      readOrFallback(
        '/compliance',
        (input) => {
          const parsed = viewSchema.safeParse(input);
          return parsed.success ? parsed.data : null;
        },
        null,
      ),
  });
  const [matter, setMatter] = useState('');
  const [query, setQuery] = useState('');
  const [destination, setDestination] = useState('');
  const [days, setDays] = useState('365');
  const [code, setCode] = useState<ErrorCode | null>(null);

  async function send(path: string, method: 'POST' | 'PUT', body: unknown, event?: FormEvent) {
    event?.preventDefault();
    setCode(null);
    try {
      await writeOrFallback(
        path,
        { method, body: JSON.stringify(body) },
        () => true,
        () => false,
      );
      await queryClient.invalidateQueries({ queryKey: ['compliance'] });
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    }
  }

  const data: ComplianceView | null = view.data ?? null;

  return (
    <div className="read">
      <h1 className="h1">Compliance</h1>
      <p className="muted">
        Archive, retention, eDiscovery, legal hold, and journaling are hooks for Business Plus.
        Nothing is exported yet.
      </p>
      {data ? (
        <>
          <p>{data.archive.note}</p>
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() =>
              void send('/compliance/archive', 'PUT', { enabled: !data.archive.enabled })
            }
          >
            {data.archive.enabled ? 'Turn archive off' : 'Turn archive on'}
          </button>
          <form
            className="stack"
            onSubmit={(event) =>
              void send('/compliance/retention', 'PUT', { days: Number(days) }, event)
            }
          >
            <Field
              label="Retention days"
              type="number"
              value={days}
              onChange={(event) => setDays(event.target.value)}
            />
            <button className="btn btn-quiet" type="submit">
              Save retention
            </button>
          </form>
          <form
            className="stack"
            onSubmit={(event) => void send('/compliance/ediscovery', 'POST', { query }, event)}
          >
            <Field
              label="eDiscovery query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button className="btn btn-quiet" type="submit">
              Save case
            </button>
          </form>
          <ul>
            {data.ediscovery.map((item) => (
              <li key={item.id}>
                {item.query} · {item.status}
              </li>
            ))}
          </ul>
          <form
            className="stack"
            onSubmit={(event) => void send('/compliance/holds', 'POST', { matter }, event)}
          >
            <Field
              label="Legal hold"
              value={matter}
              onChange={(event) => setMatter(event.target.value)}
            />
            <button className="btn btn-quiet" type="submit">
              Place hold
            </button>
          </form>
          <ul>
            {data.holds.map((item) => (
              <li key={item.id}>{item.matter}</li>
            ))}
          </ul>
          <form
            className="stack"
            onSubmit={(event) =>
              void send('/compliance/journaling', 'POST', { destination }, event)
            }
          >
            <Field
              label="Journal mailbox"
              type="email"
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
            />
            <button className="btn btn-quiet" type="submit">
              Add journal
            </button>
          </form>
          <ul>
            {data.journaling.map((item) => (
              <li key={item.id}>{item.destination}</li>
            ))}
          </ul>
        </>
      ) : (
        <p>Compliance tools appear on Business Plus.</p>
      )}
      {code ? <ErrorNote code={code} /> : null}
    </div>
  );
}
