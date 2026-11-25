import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { ErrorNote, Field } from '../../components/ui/field';
import { ApiProblem, readOrFallback, writeOrFallback } from '../../lib/api';
import { useDocumentTitle } from '../../lib/use-document-title';
import type { ErrorCode } from '@mrrokesh/shared';

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

  return (
    <div className="read">
      <h1 className="h1">Campaigns</h1>
      <p>
        Campaign drafts are a separate add-on. They are not sent from a mailbox, and one-click
        unsubscribe is a placeholder header until a sending pool exists.
      </p>
      <form className="stack" onSubmit={(event) => void onCreate(event)}>
        <Field
          label="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <Field
          label="Subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          required
        />
        <button className="btn btn-primary" type="submit">
          Create draft
        </button>
      </form>
      {list.isError ? (
        <ErrorNote code={list.error instanceof ApiProblem ? list.error.code : 'API-SRV-500'} />
      ) : null}
      {code ? <ErrorNote code={code} /> : null}
      <ul>
        {(list.data ?? []).map((row) => (
          <li key={row.id}>
            <p>
              {row.name}: {row.subject} ({row.status})
            </p>
            <p className="caption">{row.headers['List-Unsubscribe']}</p>
            <p className="caption">{row.headers['List-Unsubscribe-Post']}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
