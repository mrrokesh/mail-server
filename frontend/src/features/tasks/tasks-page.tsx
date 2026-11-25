import { z } from 'zod';
import { ModulePage } from '../modules/module-page';

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
  return (
    <ModulePage
      title="Tasks"
      blurb="Personal tasks with a due date and priority. Shared lists come later."
      queryKey={['tasks']}
      listPath="/tasks"
      createPath="/tasks"
      createLabel="New task"
      sheetTitle="New task"
      empty="No tasks yet."
      fields={[
        { name: 'title', label: 'Title' },
        { name: 'dueDate', label: 'Due date' },
      ]}
      parseList={(input) => {
        const parsed = z.object({ tasks: z.array(taskSchema) }).safeParse(input);
        return parsed.success ? parsed.data.tasks : null;
      }}
      parseItem={(input) => {
        const parsed = taskSchema.safeParse(input);
        return parsed.success ? parsed.data : null;
      }}
      titleOf={(item: TaskItem) => item.title}
      linesOf={(item) => [
        item.done ? 'Done' : 'Open',
        item.priority,
        item.dueDate ?? 'No due date',
      ]}
      bodyOf={(values) => {
        const title = values.title?.trim() ?? '';
        if (!title) return null;
        const dueDate = values.dueDate?.trim();
        if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return null;
        return { title, ...(dueDate ? { dueDate } : {}), priority: 'normal' };
      }}
    />
  );
}

export function NotesPage() {
  return (
    <ModulePage
      title="Notes"
      blurb="A note is plain text for now. Rich text and sharing come later."
      queryKey={['notes']}
      listPath="/notes"
      createPath="/notes"
      createLabel="New note"
      sheetTitle="New note"
      empty="No notes yet."
      fields={[
        { name: 'title', label: 'Title' },
        { name: 'body', label: 'Note' },
      ]}
      parseList={(input) => {
        const parsed = z.object({ notes: z.array(noteSchema) }).safeParse(input);
        return parsed.success ? parsed.data.notes : null;
      }}
      parseItem={(input) => {
        const parsed = noteSchema.safeParse(input);
        return parsed.success ? parsed.data : null;
      }}
      titleOf={(item: NoteItem) => item.title}
      linesOf={(item) => [item.body || 'Empty note']}
      bodyOf={(values) => {
        const title = values.title?.trim() ?? '';
        if (!title) return null;
        return { title, body: values.body?.trim() ?? '' };
      }}
    />
  );
}
