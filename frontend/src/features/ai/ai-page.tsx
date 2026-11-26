import type { ErrorCode } from '@mrrokesh/shared';
import { useQuery } from '@tanstack/react-query';
import { Check, Copy, Sparkles } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { ErrorNote, TextArea } from '../../components/ui/field';
import { Icon } from '../../components/ui/icon';
import { Badge, QuotaMeter } from '../../components/ui/primitives';
import { ApiProblem, readOrFallback, writeOrFallback } from '../../lib/api';
import { useDocumentTitle } from '../../lib/use-document-title';

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

const PRESETS = [
  {
    label: 'Follow up on proposal',
    prompt: 'Write a polite follow-up on the studio proposal sent Tuesday.',
  },
  {
    label: 'DNS cutover notice',
    prompt: 'Notify the team about Saturday 10:00 AM IST DNS cutover with zero expected downtime.',
  },
  {
    label: 'GST invoice cover note',
    prompt: 'Draft a brief note attaching November GST invoice 441.',
  },
] as const;

export function AiPage() {
  useDocumentTitle('AI Studio');
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
  const [copied, setCopied] = useState(false);
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
  const pct = current && current.limit > 0 ? (current.used / current.limit) * 100 : 0;

  return (
    <div className="page-wrap">
      <div className="spread">
        <div>
          <h1 className="h2">AI Writing Studio</h1>
          <p className="caption muted">
            Draft replies and summarize threads. Customer mail is never used for model training.
          </p>
        </div>
        {current ? (
          <div style={{ minWidth: 240 }}>
            <QuotaMeter
              label={current.enabled ? 'Daily AI actions' : 'Disabled by admin'}
              usedLabel={`${current.used} / ${current.limit}`}
              percent={pct}
            />
          </div>
        ) : (
          <Badge tone="brand">Starter &amp; above</Badge>
        )}
      </div>

      <div className="cluster-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className="chip"
            onClick={() => setPrompt(preset.prompt)}
          >
            <Icon icon={Sparkles} size={13} />
            <span>{preset.label}</span>
          </button>
        ))}
      </div>

      <div className="two-col">
        <div className="stack-6">
          <form
            className="card stack"
            onSubmit={(event) => void run('/ai/write', { prompt }, event)}
            noValidate
          >
            <h2 className="h3">Compose from prompt</h2>
            <TextArea
              label="What do you want to say?"
              placeholder="Write a concise reply confirming the 4pm IST meeting..."
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
            <button className="btn btn-primary" type="submit" disabled={pending || !prompt.trim()}>
              {pending ? 'Drafting...' : 'Generate draft'}
            </button>
          </form>

          <form
            className="card stack"
            onSubmit={(event) => void run('/ai/summarize', { text: source }, event)}
            noValidate
          >
            <h2 className="h3">Summarize thread</h2>
            <TextArea
              label="Paste email text"
              placeholder="Paste a long conversation thread to extract key points..."
              value={source}
              onChange={(event) => setSource(event.target.value)}
            />
            <button className="btn btn-quiet" type="submit" disabled={pending || !source.trim()}>
              Summarize thread
            </button>
          </form>
        </div>

        <div className="card-bg stack">
          <div className="spread">
            <h2 className="h3">Output</h2>
            {output ? (
              <button
                type="button"
                className="btn btn-quiet btn-sm"
                onClick={() => {
                  void navigator.clipboard.writeText(output);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1800);
                }}
              >
                <Icon icon={copied ? Check : Copy} size={14} />
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            ) : null}
          </div>
          {output ? (
            <p className="measure break" style={{ whiteSpace: 'pre-wrap' }}>
              {output}
            </p>
          ) : (
            <p className="caption muted">
              Generated drafts and thread summaries appear here. Every send remains under your
              manual confirmation.
            </p>
          )}
          {code ? <ErrorNote code={code} /> : null}
        </div>
      </div>
    </div>
  );
}
