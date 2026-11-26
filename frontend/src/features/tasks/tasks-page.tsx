import type { ErrorCode } from '@mrrokesh/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckSquare, Plus, StickyNote } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { ErrorNote, Field, SelectField, TextArea } from '../../components/ui/field';
import { Icon } from '../../components/ui/icon';
import { Badge, EmptyState } from '../../components/ui/primitives';
import { Sheet } from '../../components/ui/sheet';
import { SkeletonLines } from '../../components/ui/skeleton';
import { ApiProblem, readOrFallback, writeOrFallback } from '../../lib/api';
import { useDocumentTitle } from '../../lib/use-document-title';

const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  dueDate: z.string().nullable(),
  priority: z.string(),
  done: z.boolean(),
});

const noteSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
});

type TaskItem = z.infer<typeof taskSchema>;
type NoteItem = z.infer<typeof noteSchema>;

export function TasksPage() {
  useDocumentTitle('Tasks');
  const queryClient = useQueryClient();
  const tasksQuery = useQuery({
    queryKey: ['tasks'],
    queryFn: () =>
      readOrFallback(
        '/tasks',
        (input) => {
          const parsed = z.object({ tasks: z.array(taskSchema) }).safeParse(input);
          return parsed.success ? parsed.data.tasks : null;
        },
        [],
      ),
  });
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('all');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal');
  const [code, setCode] = useState<ErrorCode | null>(null);
  const [pending, setPending] = useState(false);

  const items = (tasksQuery.data ?? []).filter((task) => {
    if (filter === 'open') return !task.done;
    if (filter === 'done') return task.done;
    return true;
  });

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setCode('API-VAL-001');
      return;
    }
    setPending(true);
    setCode(null);
    try {
      await writeOrFallback(
        '/tasks',
        {
          method: 'POST',
          body: JSON.stringify({
            title: title.trim(),
            ...(dueDate ? { dueDate } : {}),
            priority,
          }),
        },
        (input) => {
          const parsed = taskSchema.safeParse(input);
          return parsed.success ? parsed.data : null;
        },
        () => null,
      );
      setTitle('');
      setDueDate('');
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    } finally {
      setPending(false);
    }
  }

  async function toggleDone(task: TaskItem) {
    queryClient.setQueryData<TaskItem[]>(['tasks'], (current = []) =>
      current.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)),
    );
    await writeOrFallback(
      `/tasks/${task.id}`,
      { method: 'PATCH', body: JSON.stringify({ done: !task.done }) },
      () => true,
      () => false,
    );
  }

  return (
    <div className="page-wrap">
      <div className="spread">
        <div>
          <h1 className="h2">Tasks</h1>
          <p className="caption muted">
            Personal action items and follow-ups linked from your inbox.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
          <Icon icon={Plus} size={17} />
          <span>New task</span>
        </button>
      </div>

      <div className="cluster-2">
        {(['all', 'open', 'done'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className="chip"
            aria-pressed={filter === tab}
            onClick={() => setFilter(tab)}
          >
            {tab === 'all' ? 'All tasks' : tab === 'open' ? 'Open' : 'Completed'}
          </button>
        ))}
      </div>

      {tasksQuery.isPending ? <SkeletonLines count={3} /> : null}
      {!tasksQuery.isPending && items.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks in this view"
          description="Create a task or convert any email in your inbox into an action item."
          action={
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
              New task
            </button>
          }
        />
      ) : null}

      {items.length > 0 ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Task</th>
                <th>Priority</th>
                <th>Due date</th>
              </tr>
            </thead>
            <tbody>
              {items.map((task) => (
                <tr key={task.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Mark ${task.title} complete`}
                      checked={task.done}
                      onChange={() => void toggleDone(task)}
                    />
                  </td>
                  <td className={task.done ? 'muted' : 'strong'}>
                    <span style={{ textDecoration: task.done ? 'line-through' : 'none' }}>
                      {task.title}
                    </span>
                  </td>
                  <td>
                    <Badge
                      tone={
                        task.priority === 'high'
                          ? 'danger'
                          : task.priority === 'low'
                            ? 'neutral'
                            : 'brand'
                      }
                    >
                      {task.priority}
                    </Badge>
                  </td>
                  <td className="caption muted tabular">{task.dueDate ?? 'No due date'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Sheet open={open} title="New task" onClose={() => setOpen(false)}>
        <form className="sheet-form" onSubmit={(e) => void onCreate(e)} noValidate>
          <Field
            label="Task title"
            placeholder="Publish DMARC p=quarantine"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <div className="two-col">
            <Field
              label="Due date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <SelectField
              label="Priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as typeof priority)}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </SelectField>
          </div>
          {code ? <ErrorNote code={code} /> : null}
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? 'Saving...' : 'Create task'}
          </button>
        </form>
      </Sheet>
    </div>
  );
}

export function NotesPage() {
  useDocumentTitle('Notes');
  const queryClient = useQueryClient();
  const notesQuery = useQuery({
    queryKey: ['notes'],
    queryFn: () =>
      readOrFallback(
        '/notes',
        (input) => {
          const parsed = z.object({ notes: z.array(noteSchema) }).safeParse(input);
          return parsed.success ? parsed.data.notes : null;
        },
        [],
      ),
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [code, setCode] = useState<ErrorCode | null>(null);

  const notes = notesQuery.data ?? [];
  const selected: NoteItem | null = notes.find((n) => n.id === selectedId) ?? notes[0] ?? null;

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setCode('API-VAL-001');
      return;
    }
    setCode(null);
    await writeOrFallback(
      '/notes',
      { method: 'POST', body: JSON.stringify({ title: title.trim(), body: body.trim() }) },
      (input) => {
        const p = noteSchema.safeParse(input);
        return p.success ? p.data : null;
      },
      () => null,
    );
    setTitle('');
    setBody('');
    setOpen(false);
    await queryClient.invalidateQueries({ queryKey: ['notes'] });
  }

  return (
    <div className="panes-two">
      <section className="pane pane-list" aria-label="Notes list">
        <div className="pane-head">
          <h1 className="h3">Notes</h1>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
            <Icon icon={Plus} size={15} />
            <span>New note</span>
          </button>
        </div>
        {notesQuery.isPending ? (
          <div className="pane-note">
            <SkeletonLines count={3} />
          </div>
        ) : null}
        {!notesQuery.isPending && notes.length === 0 ? (
          <EmptyState
            icon={StickyNote}
            title="No notes yet"
            description="Keep meeting notes, DNS checklists, or drafts in your workspace."
            action={
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setOpen(true)}
              >
                New note
              </button>
            }
          />
        ) : null}
        {notes.map((note) => (
          <button
            key={note.id}
            type="button"
            className="domain-row"
            aria-selected={note.id === selected?.id}
            onClick={() => setSelectedId(note.id)}
          >
            <span className="strong truncate">{note.title}</span>
          </button>
        ))}
      </section>
      <article className="pane pane-read">
        {selected ? (
          <div className="read">
            <h2 className="h3">{selected.title}</h2>
            <p className="measure break" style={{ whiteSpace: 'pre-wrap' }}>
              {selected.body || 'Empty note.'}
            </p>
          </div>
        ) : (
          <EmptyState
            icon={StickyNote}
            title="Select a note"
            description="Pick a note from the list or create a new one."
          />
        )}
      </article>
      <Sheet open={open} title="New note" onClose={() => setOpen(false)}>
        <form className="sheet-form" onSubmit={(e) => void onCreate(e)} noValidate>
          <Field label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <TextArea label="Body" value={body} onChange={(e) => setBody(e.target.value)} />
          {code ? <ErrorNote code={code} /> : null}
          <button className="btn btn-primary" type="submit">
            Save note
          </button>
        </form>
      </Sheet>
    </div>
  );
}
