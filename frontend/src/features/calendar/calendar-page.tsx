import type { ErrorCode } from '@mrrokesh/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
} from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { ErrorNote, Field, SelectField } from '../../components/ui/field';
import { Icon } from '../../components/ui/icon';
import { Badge, EmptyState } from '../../components/ui/primitives';
import { Sheet } from '../../components/ui/sheet';
import { SkeletonLines } from '../../components/ui/skeleton';
import { ApiProblem, readOrFallback, writeOrFallback } from '../../lib/api';
import { formatDay, formatMonth, isoDate, monthCells, sameDay } from '../../lib/dates';
import { MOCK_EVENTS } from '../../lib/mock-data';
import { parseEvent, parseEvents, type CalendarEvent, type CalendarId } from '../../lib/schemas';
import { useDocumentTitle } from '../../lib/use-document-title';

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
        <button
          type="button"
          className="btn btn-primary folder-compose"
          onClick={() => setOpen(true)}
        >
          <Icon icon={Plus} size={17} />
          <span>Add event</span>
        </button>
        <div className="pane-note stack-2">
          <p className="caption strong muted">My calendars</p>
          {(
            [
              ['work', 'Work'],
              ['personal', 'Personal'],
              ['holidays', 'India holidays'],
            ] as const
          ).map(([id, label]) => (
            <label key={id} className="check" style={{ paddingInline: 0 }}>
              <input
                type="checkbox"
                checked={visible[id]}
                onChange={() => setVisible((current) => ({ ...current, [id]: !current[id] }))}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="pane pane-list" aria-label="Month grid">
        <div className="pane-head pane-head-inline">
          <div className="cluster-2">
            <button
              type="button"
              className="icon-btn icon-btn-sm"
              aria-label="Previous month"
              onClick={() => shift(-1)}
            >
              <Icon icon={ChevronLeft} size={18} />
            </button>
            <h2 className="h3">{formatMonth(cursor)}</h2>
            <button
              type="button"
              className="icon-btn icon-btn-sm"
              aria-label="Next month"
              onClick={() => shift(1)}
            >
              <Icon icon={ChevronRight} size={18} />
            </button>
          </div>
          <button
            type="button"
            className="btn btn-quiet btn-sm"
            onClick={() => {
              setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
              setSelected(isoDate(today));
            }}
          >
            Today
          </button>
        </div>

        {events.isPending ? (
          <div className="pane-note">
            <SkeletonLines count={3} />
          </div>
        ) : null}

        <div className="month-grid">
          {WEEKDAYS.map((day) => (
            <div key={day} className="weekday caption">
              {day}
            </div>
          ))}
          {cells.map((cell) => {
            const iso = isoDate(cell);
            const dayEvents = shown.filter((item) => item.date === iso);
            const outside = cell.getMonth() !== cursor.getMonth();
            const isToday = sameDay(iso, today);
            return (
              <button
                key={iso}
                type="button"
                className={outside ? 'day-cell is-outside' : 'day-cell'}
                aria-pressed={iso === selected}
                aria-current={isToday ? 'date' : undefined}
                onClick={() => {
                  setSelected(iso);
                  setPane('read');
                }}
              >
                <span className={isToday ? 'badge badge-brand tabular' : 'caption tabular'}>
                  {cell.getDate()}
                </span>
                {dayEvents.slice(0, 2).map((item) => (
                  <span
                    key={item.id}
                    className={`day-pill${
                      item.calendar === 'personal'
                        ? ' is-personal'
                        : item.calendar === 'holidays'
                          ? ' is-holidays'
                          : ''
                    }`}
                  >
                    {item.title}
                  </span>
                ))}
                {dayEvents.length > 2 ? (
                  <span className="caption muted">+{dayEvents.length - 2} more</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="pane pane-read" aria-label="Day agenda">
        <div className="pane-head">
          <button
            type="button"
            className="btn btn-text mobile-only"
            onClick={() => setPane('list')}
          >
            Back to month
          </button>
          <h3 className="h3">{formatDay(selected)}</h3>
        </div>
        <div className="read">
          {agenda.length === 0 ? (
            <EmptyState
              icon={CalendarIcon}
              title="Nothing scheduled"
              description="No events on this date. Add a meeting or focus block."
              action={
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setDate(selected);
                    setOpen(true);
                  }}
                >
                  Add event
                </button>
              }
            />
          ) : (
            agenda.map((item) => (
              <article key={item.id} className="card stack-2">
                <div className="spread">
                  <p className="strong">{item.title}</p>
                  <Badge
                    tone={
                      item.calendar === 'holidays'
                        ? 'warning'
                        : item.calendar === 'personal'
                          ? 'success'
                          : 'brand'
                    }
                  >
                    {item.calendar}
                  </Badge>
                </div>
                <p className="caption muted cluster-2">
                  <Icon icon={Clock} size={14} />
                  <span>{item.start && item.end ? `${item.start} – ${item.end}` : 'All day'}</span>
                </p>
                {item.location ? (
                  <p className="caption muted cluster-2">
                    <Icon icon={MapPin} size={14} />
                    <span>{item.location}</span>
                  </p>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>

      <Sheet open={open} title="New event" onClose={() => setOpen(false)}>
        <form className="sheet-form" onSubmit={onSave} noValidate>
          <Field
            label="Event title"
            placeholder="Design sync"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <Field
            label="Date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
          <div className="two-col">
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
          </div>
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
            {pending ? 'Saving event...' : 'Save event'}
          </button>
        </form>
      </Sheet>
    </div>
  );
}
