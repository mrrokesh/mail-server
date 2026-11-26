import type { ErrorCode } from '@mrrokesh/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Check, Copy, ExternalLink, Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { ErrorNote, Field } from '../../components/ui/field';
import { Icon } from '../../components/ui/icon';
import { Badge, EmptyState } from '../../components/ui/primitives';
import { Sheet } from '../../components/ui/sheet';
import { SkeletonLines } from '../../components/ui/skeleton';
import { ApiProblem, readOrFallback, writeOrFallback } from '../../lib/api';
import { useDocumentTitle } from '../../lib/use-document-title';

const pageSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  durationMinutes: z.number(),
  timezone: z.string(),
});

type Booking = z.infer<typeof pageSchema>;

function parsePages(input: unknown): Booking[] | null {
  const parsed = z.object({ pages: z.array(pageSchema) }).safeParse(input);
  return parsed.success ? parsed.data.pages : null;
}

export function BookingPage() {
  useDocumentTitle('Booking links');
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [duration, setDuration] = useState('30');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [code, setCode] = useState<ErrorCode | null>(null);
  const [pending, setPending] = useState(false);

  const pages = useQuery({
    queryKey: ['booking', 'pages'],
    queryFn: () => readOrFallback('/booking/pages', parsePages, []),
  });

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    const cleanTitle = title.trim();
    const cleanSlug = slug.trim().toLowerCase();
    if (!cleanTitle || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleanSlug)) {
      setCode('API-VAL-001');
      return;
    }
    setPending(true);
    setCode(null);
    const local: Booking = {
      id: `bk_${crypto.randomUUID()}`,
      title: cleanTitle,
      slug: cleanSlug,
      durationMinutes: Number(duration) || 30,
      timezone: 'Asia/Kolkata',
    };
    try {
      await writeOrFallback(
        '/booking/pages',
        {
          method: 'POST',
          body: JSON.stringify({
            title: cleanTitle,
            slug: cleanSlug,
            durationMinutes: Number(duration) || 30,
            timezone: 'Asia/Kolkata',
          }),
        },
        (input) => {
          const parsed = pageSchema.safeParse(input);
          return parsed.success ? parsed.data : null;
        },
        () => local,
      );
      setOpen(false);
      setTitle('');
      setSlug('');
      await queryClient.invalidateQueries({ queryKey: ['booking', 'pages'] });
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    } finally {
      setPending(false);
    }
  }

  async function copyLink(item: Booking) {
    await navigator.clipboard.writeText(`${window.location.origin}/book/${item.slug}`);
    setCopiedId(item.id);
    window.setTimeout(() => setCopiedId((cur) => (cur === item.id ? null : cur)), 2000);
  }

  const list = pages.data ?? [];

  return (
    <div className="page-wrap">
      <div className="spread">
        <div>
          <h1 className="h2">Appointment booking</h1>
          <p className="caption muted">
            Publish public scheduling links connected to your workspace calendar availability.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
          <Icon icon={Plus} size={17} />
          <span>New booking page</span>
        </button>
      </div>

      {pages.isPending ? <SkeletonLines count={3} /> : null}
      {pages.isError ? (
        <ErrorNote code={pages.error instanceof ApiProblem ? pages.error.code : 'API-SRV-500'} />
      ) : null}

      {!pages.isPending && !pages.isError && list.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No booking pages yet"
          description="Create a public scheduling link for customer demos, office hours, or interviews."
          action={
            <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
              New booking page
            </button>
          }
        />
      ) : null}

      {list.length > 0 ? (
        <div className="two-col">
          {list.map((item) => (
            <article key={item.id} className="card stack-3">
              <div className="spread">
                <h2 className="h3">{item.title}</h2>
                <Badge tone="brand">{item.durationMinutes} min</Badge>
              </div>
              <p className="caption mono muted break">/book/{item.slug}</p>
              <p className="caption muted">Timezone: {item.timezone}</p>
              <div className="cluster-2">
                <button
                  type="button"
                  className="btn btn-quiet btn-sm"
                  onClick={() => void copyLink(item)}
                >
                  <Icon icon={copiedId === item.id ? Check : Copy} size={14} />
                  <span>{copiedId === item.id ? 'Copied link' : 'Copy link'}</span>
                </button>
                <Link className="btn btn-quiet btn-sm" to={`/book/${item.slug}`}>
                  <Icon icon={ExternalLink} size={14} />
                  <span>Open public page</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <Sheet open={open} onClose={() => setOpen(false)} title="New booking page">
        <form className="sheet-form" onSubmit={(event) => void onCreate(event)}>
          <Field
            label="Page title"
            placeholder="30-min product intro"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              if (!slug) {
                setSlug(
                  event.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '')
                    .slice(0, 40),
                );
              }
            }}
            required
          />
          <Field
            label="URL slug"
            placeholder="product-intro"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            required
          />
          <Field
            label="Duration (minutes)"
            type="number"
            min={10}
            max={120}
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
          />
          {code ? <ErrorNote code={code} /> : null}
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? 'Creating...' : 'Create booking page'}
          </button>
        </form>
      </Sheet>
    </div>
  );
}
