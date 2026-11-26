import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { z } from 'zod';
import { ErrorNote, Field } from '../../components/ui/field';
import { ApiProblem, readOrFallback, writeOrFallback } from '../../lib/api';
import { useDocumentTitle } from '../../lib/use-document-title';
import type { ErrorCode } from '@mrrokesh/shared';

const pageSchema = z.object({
  title: z.string(),
  slug: z.string(),
  durationMinutes: z.number(),
  timezone: z.string(),
  slots: z.array(z.string()),
});

const bookedSchema = z.object({
  id: z.string(),
  start: z.string(),
  title: z.string(),
  meetLink: z.string(),
});

type PublicPage = z.infer<typeof pageSchema>;

export function PublicBookingPage() {
  const { slug = '' } = useParams();
  useDocumentTitle('Book a time');
  const page = useQuery({
    queryKey: ['booking', 'public', slug],
    queryFn: () =>
      readOrFallback(
        `/public/booking/${slug}`,
        (input) => {
          const parsed = pageSchema.safeParse(input);
          return parsed.success ? parsed.data : null;
        },
        null as PublicPage | null,
      ),
  });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [start, setStart] = useState('');
  const [code, setCode] = useState<ErrorCode | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const chosen = start || page.data?.slots[0] || '';

  async function onBook(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !email.includes('@') || !chosen) {
      setCode('API-VAL-001');
      return;
    }
    setPending(true);
    setCode(null);
    try {
      const result = await writeOrFallback(
        `/public/booking/${slug}`,
        {
          method: 'POST',
          body: JSON.stringify({ start: chosen, name: name.trim(), email: email.trim() }),
        },
        (input) => {
          const parsed = bookedSchema.safeParse(input);
          return parsed.success ? parsed.data : null;
        },
        () => null,
      );
      if (!result.data) {
        setCode('API-SRV-500');
        return;
      }
      setDone(result.data.meetLink);
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    } finally {
      setPending(false);
    }
  }

  const current = page.data;

  return (
    <div className="read">
      <h1 className="h1">{current?.title ?? 'Book a time'}</h1>
      {current ? (
        <p className="muted">
          {current.durationMinutes} minutes · {current.timezone}
        </p>
      ) : (
        <p>That booking page is not available.</p>
      )}
      {done ? (
        <p>
          You are booked. The meeting link is a stub: <span className="break">{done}</span>
        </p>
      ) : (
        <form className="stack" onSubmit={onBook} noValidate>
          <Field label="Name" value={name} onChange={(event) => setName(event.target.value)} />
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <label className="caption" htmlFor="slot">
            Time
          </label>
          <select
            id="slot"
            className="select"
            value={chosen}
            onChange={(event) => setStart(event.target.value)}
          >
            {(current?.slots ?? []).map((slot) => (
              <option key={slot} value={slot}>
                {slot.replace('T', ' ')}
              </option>
            ))}
          </select>
          {code ? <ErrorNote code={code} /> : null}
          <button className="btn btn-primary" type="submit" disabled={pending || !current}>
            {pending ? 'Booking' : 'Book'}
          </button>
        </form>
      )}
    </div>
  );
}
