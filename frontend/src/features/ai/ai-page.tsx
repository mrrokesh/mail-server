import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { ErrorNote, TextArea } from '../../components/ui/field';
import { ApiProblem, readOrFallback, writeOrFallback } from '../../lib/api';
import { useDocumentTitle } from '../../lib/use-document-title';
import type { ErrorCode } from '@mrrokesh/shared';

const statusSchema = z.object({
  entitled: z.boolean(),
  enabled: z.boolean(),
  used: z.number(),
  limit: z.number(),
  adapter: z.string(),
});

const textSchema = z.object({
  text: z.string().optional(),
  summary: z.string().optional(),
  remaining: z.number(),
});

export function AiPage() {
  useDocumentTitle('AI');
  const status = useQuery({
    queryKey: ['ai', 'status'],
    queryFn: () =>
      readOrFallback(
        '/ai/status',
        (input) => {
          const parsed = statusSchema.safeParse(input);
          return parsed.success ? parsed.data : null;
        },
        null,
      ),
  });
  const [prompt, setPrompt] = useState('');
  const [source, setSource] = useState('');
  const [output, setOutput] = useState('');
  const [code, setCode] = useState<ErrorCode | null>(null);
  const [pending, setPending] = useState(false);

  async function run(path: '/ai/write' | '/ai/summarize', body: unknown, event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setCode(null);
    try {
      const result = await writeOrFallback(
        path,
        { method: 'POST', body: JSON.stringify(body) },
        (input) => {
          const parsed = textSchema.safeParse(input);
          return parsed.success ? parsed.data : null;
        },
        () => null,
      );
      if (!result.data) {
        setCode('API-SRV-500');
        return;
      }
      setOutput(result.data.text ?? result.data.summary ?? '');
      void status.refetch();
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    } finally {
      setPending(false);
    }
  }

  const current = status.data;

  return (
    <div className="read">
      <h1 className="h1">AI</h1>
      <p className="muted">
        {current
          ? `${current.used} of ${current.limit} actions today. ${current.enabled ? 'On' : 'Off for this workspace'}. ${current.adapter}.`
          : 'Writing and summaries use a stub. An admin can turn them off.'}
      </p>
      <form
        className="stack"
        onSubmit={(event) => void run('/ai/write', { prompt }, event)}
        noValidate
      >
        <TextArea
          label="Write"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
        />
        <button className="btn btn-primary" type="submit" disabled={pending}>
          Draft
        </button>
      </form>
      <form
        className="stack"
        onSubmit={(event) => void run('/ai/summarize', { text: source }, event)}
        noValidate
      >
        <TextArea
          label="Summarize"
          value={source}
          onChange={(event) => setSource(event.target.value)}
        />
        <button className="btn btn-quiet" type="submit" disabled={pending}>
          Summarize
        </button>
      </form>
      {output ? <p className="break">{output}</p> : null}
      {code ? <ErrorNote code={code} /> : null}
    </div>
  );
}
