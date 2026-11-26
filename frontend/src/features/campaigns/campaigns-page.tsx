import type { ErrorCode } from '@mrrokesh/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Megaphone } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { ErrorNote, Field } from '../../components/ui/field';
import { Badge, EmptyState } from '../../components/ui/primitives';
import { ApiProblem, readOrFallback, writeOrFallback } from '../../lib/api';
import { useDocumentTitle } from '../../lib/use-document-title';

const campaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  subject: z.string(),
  status: z.string(),
  sendsFromMailbox: z.literal(false),
  headers: z.object({
    'List-Unsubscribe': z.string(),
    'List-Unsubscribe-Post': z.string(),
  }),
});

export function CampaignsPage() {
  useDocumentTitle('Campaigns');
  const queryClient = useQueryClient();
  const list = useQuery({
    queryKey: ['campaigns'],
    queryFn: () =>
      readOrFallback(
        '/campaigns',
        (input) => {
          const parsed = z.object({ campaigns: z.array(campaignSchema) }).safeParse(input);
          return parsed.success ? parsed.data.campaigns : null;
        },
        [],
      ),
  });
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [code, setCode] = useState<ErrorCode | null>(null);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setCode(null);
    try {
      const created = await writeOrFallback(
        '/campaigns',
        { method: 'POST', body: JSON.stringify({ name, subject }) },
        (input) => (campaignSchema.safeParse(input).success ? true : null),
        () => false,
      );
      if (!created.data) {
        setCode('API-VAL-001');
        return;
      }
      setName('');
      setSubject('');
      await queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    }
  }

  const rows = list.data ?? [];

  return (
    <div className="page-wrap">
      <div className="spread">
        <div>
          <h1 className="h2">Campaigns</h1>
          <p className="caption muted">
            Bulk newsletters run in an isolated sending pool with RFC 8058 one-click unsubscribe,
            separate from mailbox IPs.
          </p>
        </div>
        <Badge tone="brand">Isolated pool</Badge>
      </div>

      <div className="two-col">
        <form className="card stack" onSubmit={(event) => void onCreate(event)}>
          <h2 className="h3">New campaign draft</h2>
          <Field
            label="Campaign name"
            placeholder="November Product Update"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <Field
            label="Email subject"
            placeholder="What changed in November"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            required
          />
          {code ? <ErrorNote code={code} /> : null}
          <button className="btn btn-primary" type="submit">
            Create campaign draft
          </button>
        </form>

        <div className="stack">
          {list.isError ? (
            <ErrorNote code={list.error instanceof ApiProblem ? list.error.code : 'API-SRV-500'} />
          ) : null}
          {rows.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title="No campaign drafts"
              description="Draft a newsletter with automatic List-Unsubscribe headers."
            />
          ) : (
            rows.map((row) => (
              <div key={row.id} className="card stack-2">
                <div className="spread">
                  <span className="strong">{row.name}</span>
                  <Badge>{row.status}</Badge>
                </div>
                <p className="caption">{row.subject}</p>
                <p className="mono muted break">{row.headers['List-Unsubscribe']}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
