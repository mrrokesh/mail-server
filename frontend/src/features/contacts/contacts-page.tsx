import type { ErrorCode } from '@mrrokesh/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Mail, Phone, UserPlus, Users } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { ErrorNote, Field, TextArea } from '../../components/ui/field';
import { Icon } from '../../components/ui/icon';
import { Avatar, Badge, EmptyState } from '../../components/ui/primitives';
import { Sheet } from '../../components/ui/sheet';
import { SkeletonLines } from '../../components/ui/skeleton';
import { ApiProblem, readOrFallback, writeOrFallback } from '../../lib/api';
import { MOCK_CONTACTS, MOCK_THREADS } from '../../lib/mock-data';
import { parseContacts, parseThreads, type Contact, type ContactBook } from '../../lib/schemas';
import { useDocumentTitle } from '../../lib/use-document-title';

const BOOKS: { id: ContactBook; label: string }[] = [
  { id: 'directory', label: 'Organization Directory' },
  { id: 'personal', label: 'Personal Contacts' },
];

const contactCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email(),
  phone: z.string().trim().max(40).optional(),
  role: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(500).optional(),
});

export function ContactsPage() {
  useDocumentTitle('Contacts');
  const queryClient = useQueryClient();
  const contacts = useQuery({
    queryKey: ['contacts'],
    queryFn: () => readOrFallback('/contacts', parseContacts, MOCK_CONTACTS),
    staleTime: 5 * 60 * 1000,
  });
  const threads = useQuery({
    queryKey: ['mail', 'threads'],
    queryFn: () => readOrFallback('/mail/threads', parseThreads, MOCK_THREADS),
    staleTime: 5 * 60 * 1000,
  });
  const [book, setBook] = useState<ContactBook>('directory');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pane, setPane] = useState<'folders' | 'list' | 'read'>('list');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [notes, setNotes] = useState('');
  const [code, setCode] = useState<ErrorCode | null>(null);
  const [pending, setPending] = useState(false);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (contacts.data ?? []).filter((person) => {
      if (person.book !== book) return false;
      if (!needle) return true;
      return [person.name, person.email, person.role].some((value) =>
        value.toLowerCase().includes(needle),
      );
    });
  }, [book, contacts.data, query]);

  const selected = visible.find((person) => person.id === selectedId) ?? visible[0] ?? null;
  const related = (threads.data ?? []).filter((thread) => {
    if (!selected) return false;
    return thread.fromEmail === selected.email || thread.toEmail === selected.email;
  });

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    const parsed = contactCreateSchema.safeParse({ name, email, phone, role, notes });
    if (!parsed.success) {
      setCode('API-VAL-001');
      return;
    }
    setPending(true);
    setCode(null);
    try {
      await writeOrFallback(
        '/contacts',
        { method: 'POST', body: JSON.stringify(parsed.data) },
        (input) => Boolean(input),
        () => false,
      );
      await queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setBook('personal');
      setOpen(false);
      setName('');
      setEmail('');
      setPhone('');
      setRole('');
      setNotes('');
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="panes" data-pane={pane}>
      <h1 className="visually-hidden">Contacts</h1>
      <section className="pane pane-nav" aria-label="Address books">
        <button
          type="button"
          className="btn btn-primary folder-compose"
          onClick={() => setOpen(true)}
        >
          <Icon icon={UserPlus} size={17} />
          <span>Add contact</span>
        </button>
        <div className="folder-list">
          {BOOKS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="folder"
              aria-current={book === item.id ? 'page' : undefined}
              onClick={() => {
                setBook(item.id);
                setSelectedId(null);
                setPane('list');
              }}
            >
              <span className="cluster-2">
                <Icon icon={item.id === 'directory' ? Building2 : Users} size={17} />
                <span>{item.label}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="pane pane-list" aria-label="People">
        <div className="pane-head">
          <label className="visually-hidden" htmlFor="people-search">
            Search people
          </label>
          <input
            id="people-search"
            className="input"
            type="search"
            placeholder="Search people"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        {contacts.isPending ? (
          <div className="pane-note">
            <SkeletonLines count={4} />
          </div>
        ) : null}
        {visible.length === 0 && !contacts.isPending ? (
          <EmptyState
            icon={Users}
            title="No contacts yet"
            description="Add a personal contact or view team members in Organization Directory."
            action={
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => setOpen(true)}>
                Add contact
              </button>
            }
          />
        ) : null}
        {visible.map((person) => (
          <PersonButton
            key={person.id}
            person={person}
            selected={person.id === selected?.id}
            onSelect={() => {
              setSelectedId(person.id);
              setPane('read');
            }}
          />
        ))}
      </section>

      <article className="pane pane-read">
        {selected ? (
          <div className="read">
            <button
              type="button"
              className="btn btn-text mobile-only"
              onClick={() => setPane('list')}
            >
              Back to people
            </button>
            <div className="spread">
              <div className="cluster">
                <Avatar name={selected.name} size="lg" />
                <div>
                  <h2 className="h3">{selected.name}</h2>
                  <p className="caption muted">{selected.role || 'Contact'}</p>
                </div>
              </div>
              <Link
                className="btn btn-primary btn-sm"
                to={`/mail?compose=1&to=${encodeURIComponent(selected.email)}`}
              >
                <Icon icon={Mail} size={15} />
                <span>Send mail</span>
              </Link>
            </div>
            <div className="card stack-3">
              <div className="cluster">
                <Icon icon={Mail} size={16} />
                <span className="caption break">{selected.email}</span>
              </div>
              {selected.phone ? (
                <div className="cluster">
                  <Icon icon={Phone} size={16} />
                  <span className="caption">{selected.phone}</span>
                </div>
              ) : null}
              {selected.notes ? <p className="caption muted">{selected.notes}</p> : null}
            </div>
            <div className="stack-2">
              <h3 className="strong">Recent conversations</h3>
              {related.length === 0 ? (
                <p className="caption muted">No messages with this address yet.</p>
              ) : (
                related.map((thread) => (
                  <Link
                    key={thread.id}
                    to={`/mail?thread=${thread.id}`}
                    className="folder"
                    style={{ border: '1px solid var(--color-border)' }}
                  >
                    <span className="truncate">{thread.subject}</span>
                    <Badge>{thread.folder}</Badge>
                  </Link>
                ))
              )}
            </div>
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="Select a contact"
            description="Choose someone from the directory or personal address book to inspect details."
          />
        )}
      </article>

      <Sheet open={open} title="Add contact" onClose={() => setOpen(false)}>
        <form className="sheet-form" onSubmit={(e) => void onCreate(e)} noValidate>
          <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Field label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Field label="Role or company" value={role} onChange={(e) => setRole(e.target.value)} />
          <TextArea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          {code ? <ErrorNote code={code} /> : null}
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? 'Saving...' : 'Save contact'}
          </button>
        </form>
      </Sheet>
    </div>
  );
}

function PersonButton({
  person,
  selected,
  onSelect,
}: {
  person: Contact;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button type="button" className="person" aria-selected={selected} onClick={onSelect}>
      <span className="cluster-2 truncate">
        <Avatar name={person.name} size="sm" />
        <span className="truncate">{person.name}</span>
      </span>
      <span className="caption muted">{person.role}</span>
    </button>
  );
}
