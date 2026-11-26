import type { ErrorCode } from '@mrrokesh/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, KeyRound, Network, ShieldAlert } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { ErrorNote, Field, SelectField } from '../../components/ui/field';
import { Icon } from '../../components/ui/icon';
import { Badge } from '../../components/ui/primitives';
import { SkeletonLines } from '../../components/ui/skeleton';
import { ApiProblem, readOrFallback, writeOrFallback } from '../../lib/api';
import { useDocumentTitle } from '../../lib/use-document-title';

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
  useDocumentTitle('Enterprise controls');
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
    <div className="page-wrap">
      <div className="spread">
        <div>
          <h1 className="h2">Enterprise security &amp; routing</h1>
          <p className="caption muted">
            Manage customer-managed KMS references (BYOK), SIEM log streams, attack simulation
            templates, and dedicated outbound IP preferences.
          </p>
        </div>
        {data ? (
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() =>
              void send('/enterprise/dedicated-ip', 'PUT', { enabled: !data.dedicatedIp.enabled })
            }
          >
            <Icon icon={Network} size={16} />
            <span>
              {data.dedicatedIp.enabled ? 'Disable dedicated IP flag' : 'Enable dedicated IP flag'}
            </span>
          </button>
        ) : null}
      </div>

      {view.isPending ? <SkeletonLines count={3} /> : null}
      {view.isError ? (
        <ErrorNote code={view.error instanceof ApiProblem ? view.error.code : 'API-SRV-500'} />
      ) : null}
      {!view.isPending && !data && !view.isError ? (
        <div className="card">
          <p className="caption muted">Enterprise controls require an active Enterprise plan.</p>
        </div>
      ) : null}

      {data ? (
        <>
          <div className="kpi-grid">
            <div className="kpi-card">
              <span className="caption muted">Dedicated IP flag</span>
              <span className="kpi-value">{data.dedicatedIp.enabled ? 'Enabled' : 'Standard'}</span>
            </div>
            <div className="kpi-card">
              <span className="caption muted">BYOK key versions</span>
              <span className="kpi-value">{data.byok.length}</span>
            </div>
            <div className="kpi-card">
              <span className="caption muted">SIEM destinations</span>
              <span className="kpi-value">{data.siem.length}</span>
            </div>
            <div className="kpi-card">
              <span className="caption muted">Simulation drafts</span>
              <span className="kpi-value">{data.simulations.length}</span>
            </div>
          </div>

          <div className="two-col">
            <section className="card stack">
              <div className="cluster-2">
                <Icon icon={KeyRound} size={18} />
                <h2 className="h3">Customer-managed key (BYOK)</h2>
              </div>
              <form
                className="stack"
                onSubmit={(event) =>
                  void send(
                    '/enterprise/byok',
                    'POST',
                    { version: Number(version), kmsKeyRef },
                    event,
                  )
                }
              >
                <div className="two-col">
                  <Field
                    label="Version"
                    type="number"
                    value={version}
                    onChange={(event) => setVersion(event.target.value)}
                    required
                  />
                  <Field
                    label="KMS key ARN / reference"
                    placeholder="arn:aws:kms:ap-south-1:..."
                    value={kmsKeyRef}
                    onChange={(event) => setKmsKeyRef(event.target.value)}
                    required
                  />
                </div>
                <button className="btn btn-quiet" type="submit">
                  Register key version
                </button>
              </form>
              {data.byok.length > 0 ? (
                <div className="stack-2">
                  {data.byok.map((row) => (
                    <div key={row.id} className="spread">
                      <span className="caption strong">Version {row.version}</span>
                      <Badge>Key reference stored</Badge>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="card stack">
              <div className="cluster-2">
                <Icon icon={Activity} size={18} />
                <h2 className="h3">SIEM log destinations</h2>
              </div>
              <form
                className="stack"
                onSubmit={(event) => void send('/enterprise/siem', 'POST', { kind, target }, event)}
              >
                <div className="two-col">
                  <SelectField
                    label="Protocol"
                    value={kind}
                    onChange={(event) => setKind(event.target.value as 'webhook' | 'syslog')}
                  >
                    <option value="webhook">Webhook (HTTPS)</option>
                    <option value="syslog">Syslog TLS</option>
                  </SelectField>
                  <Field
                    label="Endpoint"
                    placeholder="https://siem.example.com/ingest"
                    value={target}
                    onChange={(event) => setTarget(event.target.value)}
                    required
                  />
                </div>
                <button className="btn btn-quiet" type="submit">
                  Save destination
                </button>
              </form>
              {data.siem.length > 0 ? (
                <div className="stack-2">
                  {data.siem.map((row) => (
                    <div key={row.id} className="spread">
                      <Badge tone="brand">{row.kind}</Badge>
                      <button
                        type="button"
                        className="btn btn-quiet btn-sm"
                        onClick={() =>
                          void send(`/enterprise/siem/${row.id}/sample`, 'POST', {}).then(
                            (result) => {
                              if (result && typeof result === 'object') {
                                setSample(JSON.stringify(result, null, 2));
                              }
                            },
                          )
                        }
                      >
                        Preview sample payload
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              {sample ? (
                <pre
                  className="caption mono card-bg break"
                  style={{ margin: 0, overflowX: 'auto' }}
                >
                  {sample}
                </pre>
              ) : null}
            </section>
          </div>

          <section className="card stack">
            <div className="cluster-2">
              <Icon icon={ShieldAlert} size={18} />
              <h2 className="h3">Phishing &amp; attack simulation templates</h2>
            </div>
            <form
              className="cluster"
              onSubmit={(event) =>
                void send('/enterprise/attack-simulations', 'POST', { title }, event)
              }
            >
              <div style={{ flex: 1, minWidth: 220 }}>
                <Field
                  label="Campaign title"
                  placeholder="Q4 credential hygiene drill"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                />
              </div>
              <button className="btn btn-primary" type="submit">
                Create simulation template
              </button>
            </form>
            {data.simulations.length > 0 ? (
              <div className="stack-2">
                {data.simulations.map((row) => (
                  <div key={row.id} className="spread">
                    <span className="strong">{row.title}</span>
                    <Badge>{row.status}</Badge>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        </>
      ) : null}

      {code ? <ErrorNote code={code} /> : null}
    </div>
  );
}
