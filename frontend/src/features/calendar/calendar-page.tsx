import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { Icon } from '../../components/ui/icon';
import { ErrorNote, Field, SelectField } from '../../components/ui/field';
import { Sheet } from '../../components/ui/sheet';
import { SkeletonLines } from '../../components/ui/skeleton';
import { ApiProblem, readOrFallback, writeOrFallback } from '../../lib/api';
import { useDataSource } from '../../lib/data-source';
import { formatDay, formatMonth, isoDate, monthCells, sameDay } from '../../lib/dates';
import { MOCK_EVENTS } from '../../lib/mock-data';
import { parseEvent, parseEvents, type CalendarEvent, type CalendarId } from '../../lib/schemas';
import { useDocumentTitle } from '../../lib/use-document-title';
import type { ErrorCode } from '@mrrokesh/shared';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const eventSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
    calendar: z.enum(['personal', 'work']),
  })
  .refine((value) => value.end > value.start);

export function CalendarPage() {
  useDocumentTitle('Calendar');
  const source = useDataSource();
  const queryClient = useQueryClient();
  const events = useQuery({
    queryKey: ['calendar', 'events'],
    queryFn: () => readOrFallback('/calendar/events', parseEvents, MOCK_EVENTS),
    staleTime: 5 * 60 * 1000,
  });
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(() => isoDate(today));
  const [visible, setVisible] = useState<Record<CalendarId, boolean>>({
    personal: true,
    work: true,
    holidays: true,
  });
  const [pane, setPane] = useState<'folders' | 'list' | 'read'>('list');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => isoDate(today));
  const [start, setStart] = useState('10:00');
  const [end, setEnd] = useState('10:30');
  const [calendar, setCalendar] = useState<'personal' | 'work'>('work');
  const [code, setCode] = useState<ErrorCode | null>(null);
  const [pending, setPending] = useState(false);

  const cells = monthCells(cursor.getFullYear(), cursor.getMonth());
  const shown = (events.data ?? []).filter((event) => visible[event.calendar]);
  const agenda = shown
    .filter((event) => event.date === selected)
    .sort((a, b) => (a.start ?? '').localeCompare(b.start ?? ''));

  function shift(delta: number) {
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    const parsed = eventSchema.safeParse({ title, date, start, end, calendar });
    if (!parsed.success) {
      setCode('API-VAL-001');
      return;
    }
    setPending(true);
    setCode(null);
    const local: CalendarEvent = {
      id: `evt_${crypto.randomUUID()}`,
      calendar: parsed.data.calendar,
      title: parsed.data.title,
      date: parsed.data.date,
      start: parsed.data.start,
      end: parsed.data.end,
      location: '',
    };
    try {
      const result = await writeOrFallback(
        '/calendar/events',
        { method: 'POST', body: JSON.stringify(parsed.data) },
        parseEvent,
        () => local,
      );
      queryClient.setQueryData<CalendarEvent[]>(['calendar', 'events'], (current = []) => [
        ...current,
        result.data,
      ]);
      setSelected(result.data.date);
      setCursor(new Date(`${result.data.date}T00:00:00`));
      setOpen(false);
      setTitle('');
      setPane('read');
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="panes" data-pane={pane}>
      <h1 className="visually-hidden">Calendar</h1>
      <section className="pane pane-nav" aria-label="Calendars">
        <div className="pane-head">
          <p className="strong">Calendars</p>
        </div>
        {(
          [
            ['work', 'Work'],
            ['personal', 'Personal'],
            ['holidays', 'India holidays'],
          ] as const
        ).map(([id, label]) => (
          <label key={id} className="check">
            <input
              type="checkbox"
              checked={visible[id]}
              onChange={() => setVisible((current) => ({ ...current, [id]: !current[id] }))}
            />
            {label}
          </label>
        ))}
        {source === 'preview' ? (
          <p className="caption muted pane-note">Holiday dates in this preview are samples.</p>
        ) : null}
      </section>
      <section className="pane pane-list" aria-label="Month">
        <div className="pane-head">
          <button
            type="button"
            className="icon-btn"
            aria-label="Previous month"
            onClick={() => shift(-1)}
          >
            <Icon icon={ChevronLeft} />
          </button>
          <h2 className="h2">{formatMonth(cursor)}</h2>
          <button
            type="button"
            className="icon-btn"
            aria-label="Next month"
            onClick={() => shift(1)}
          >
            <Icon icon={ChevronRight} />
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
            Add event
          </button>
        </div>
        {events.isPending ? <SkeletonLines count={2} /> : null}
        <div className="month-grid">
          {WEEKDAYS.map((day) => (
            <div key={day} className="weekday caption">
              {day}
            </div>
          ))}
          {cells.map((cell) => {
            const iso = isoDate(cell);
            const count = shown.filter((item) => item.date === iso).length;
            const outside = cell.getMonth() !== cursor.getMonth();
            return (
              <button
                key={iso}
                type="button"
                className={outside ? 'day-cell is-outside' : 'day-cell'}
                aria-pressed={iso === selected}
                aria-current={sameDay(iso, today) ? 'date' : undefined}
                onClick={() => {
                  setSelected(iso);
                  setPane('read');
                }}
              >
                <span>{cell.getDate()}</span>
                {count > 0 ? <span className="caption">{count}</span> : null}
              </button>
            );
          })}
        </div>
      </section>
      <section className="pane pane-read" aria-label="Day">
        <div className="read">
          <button
            type="button"
            className="btn btn-text mobile-only"
            onClick={() => setPane('list')}
          >
            Back to month
          </button>
          <h3 className="strong">{formatDay(selected)}</h3>
          {agenda.length === 0 ? <p className="muted">Nothing scheduled.</p> : null}
          {agenda.map((item) => (
            <article key={item.id} className="stack">
              <p className="strong">{item.title}</p>
              <p className="caption muted">
                {item.start && item.end ? `${item.start}–${item.end}` : 'All day'}
                {item.location ? ` · ${item.location}` : ''}
              </p>
            </article>
          ))}
        </div>
      </section>
      <Sheet open={open} title="New event" onClose={() => setOpen(false)}>
        <form className="sheet-form" onSubmit={onSave} noValidate>
          <Field label="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
          <Field
            label="Date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
          <Field
            label="Start"
            type="time"
            value={start}
            onChange={(event) => setStart(event.target.value)}
          />
          <Field
            label="End"
            type="time"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
          />
          <SelectField
            label="Calendar"
            value={calendar}
            onChange={(event) =>
              setCalendar(event.target.value === 'personal' ? 'personal' : 'work')
            }
          >
            <option value="work">Work</option>
            <option value="personal">Personal</option>
          </SelectField>
          {code ? <ErrorNote code={code} /> : null}
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? 'Saving event' : 'Save event'}
          </button>
        </form>
      </Sheet>
    </div>
  );
}
