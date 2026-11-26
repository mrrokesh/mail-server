import type { ErrorCode } from '@mrrokesh/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Shield } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { ErrorNote, Field } from '../../components/ui/field';
import { Icon } from '../../components/ui/icon';
import { Badge } from '../../components/ui/primitives';
import { ApiProblem, readOrFallback, writeOrFallback } from '../../lib/api';
import { useDocumentTitle } from '../../lib/use-document-title';

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
    <div className="page-wrap">
      <div className="spread">
        <div>
          <h1 className="h2">Compliance &amp; eDiscovery</h1>
          <p className="caption muted">
            Archive retention policies, legal holds, eDiscovery search cases, and external
            journaling.
          </p>
        </div>
        <Badge tone="brand">Business Plus &amp; Enterprise</Badge>
      </div>

      {code ? <ErrorNote code={code} /> : null}

      {data ? (
        <div className="bento-grid">
          <section className="card stack">
            <div className="spread">
              <div className="cluster-2">
                <Icon icon={Shield} size={18} />
                <h2 className="h3">Archive &amp; retention</h2>
              </div>
              <Badge tone={data.archive.enabled ? 'success' : 'neutral'}>
                {data.archive.enabled ? 'Archive on' : 'Archive off'}
              </Badge>
            </div>
            <p className="caption muted">{data.archive.note}</p>
            <div>
              <button
                type="button"
                className="btn btn-quiet btn-sm"
                onClick={() =>
                  void send('/compliance/archive', 'PUT', { enabled: !data.archive.enabled })
                }
              >
                {data.archive.enabled ? 'Disable archive' : 'Enable archive'}
              </button>
            </div>
            <form
              className="stack"
              onSubmit={(event) =>
                void send('/compliance/retention', 'PUT', { days: Number(days) }, event)
              }
            >
              <Field
                label="Retention period (days)"
                type="number"
                value={days}
                onChange={(event) => setDays(event.target.value)}
              />
              <button className="btn btn-primary btn-sm" type="submit">
                Save retention
              </button>
            </form>
          </section>

          <section className="card stack">
            <h2 className="h3">Litigation holds</h2>
            <form
              className="cluster"
              onSubmit={(event) => void send('/compliance/holds', 'POST', { matter }, event)}
            >
              <div style={{ flex: 1 }}>
                <Field
                  label="Matter name"
                  placeholder="Vendor contract review"
                  value={matter}
                  onChange={(event) => setMatter(event.target.value)}
                />
              </div>
              <button className="btn btn-primary btn-sm" type="submit">
                Place hold
              </button>
            </form>
            <div className="stack-2">
              {data.holds.map((item) => (
                <div key={item.id} className="spread">
                  <span className="caption strong">{item.matter}</span>
                  <Badge tone="warning">Active hold</Badge>
                </div>
              ))}
            </div>
          </section>

          <section className="card stack">
            <h2 className="h3">eDiscovery cases</h2>
            <form
              className="cluster"
              onSubmit={(event) => void send('/compliance/ediscovery', 'POST', { query }, event)}
            >
              <div style={{ flex: 1 }}>
                <Field
                  label="Search query"
                  placeholder="from:vendor.example"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <button className="btn btn-quiet btn-sm" type="submit">
                Save case
              </button>
            </form>
            <div className="stack-2">
              {data.ediscovery.map((item) => (
                <div key={item.id} className="spread">
                  <span className="mono">{item.query}</span>
                  <Badge>{item.status}</Badge>
                </div>
              ))}
            </div>
          </section>

          <section className="card stack">
            <h2 className="h3">External journaling</h2>
            <form
              className="cluster"
              onSubmit={(event) =>
                void send('/compliance/journaling', 'POST', { destination }, event)
              }
            >
              <div style={{ flex: 1 }}>
                <Field
                  label="Journal mailbox address"
                  type="email"
                  placeholder="vault@archive.example"
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                />
              </div>
              <button className="btn btn-quiet btn-sm" type="submit">
                Add journal
              </button>
            </form>
            <div className="stack-2">
              {data.journaling.map((item) => (
                <div key={item.id} className="spread">
                  <span className="caption break">{item.destination}</span>
                  <Badge tone="success">Active</Badge>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="card">
          <p className="muted">Compliance tools unlock on Business Plus and Enterprise plans.</p>
        </div>
      )}
    </div>
  );
}
