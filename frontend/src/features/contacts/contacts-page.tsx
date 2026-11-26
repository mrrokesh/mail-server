import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SkeletonLines } from '../../components/ui/skeleton';
import { readOrFallback } from '../../lib/api';
import { MOCK_CONTACTS, MOCK_THREADS } from '../../lib/mock-data';
import { parseContacts, parseThreads, type Contact, type ContactBook } from '../../lib/schemas';
import { useDocumentTitle } from '../../lib/use-document-title';

const BOOKS: { id: ContactBook; label: string }[] = [
  { id: 'directory', label: 'Directory' },
  { id: 'personal', label: 'Personal' },
];

export function ContactsPage() {
  useDocumentTitle('Contacts');
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

  return (
    <div className="panes" data-pane={pane}>
      <h1 className="visually-hidden">Contacts</h1>
      <section className="pane pane-nav" aria-label="Address books">
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
            {item.label}
          </button>
        ))}
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
        {contacts.isPending ? <SkeletonLines /> : null}
        {visible.length === 0 && !contacts.isPending ? (
          <p className="read muted">No one matches that search.</p>
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
            <h2 className="h3">{selected.name}</h2>
            <p className="break">{selected.email}</p>
            {selected.phone ? <p>{selected.phone}</p> : null}
            <p className="caption muted">{selected.role}</p>
            <p>{selected.notes}</p>
            <h3 className="strong">Recent mail</h3>
            {related.length === 0 ? (
              <p className="muted">No messages with this address in the current list.</p>
            ) : null}
            {related.map((thread) => (
              <Link key={thread.id} to={`/mail?thread=${thread.id}`}>
                {thread.subject}
              </Link>
            ))}
          </div>
        ) : (
          <p className="read muted">Select a person.</p>
        )}
      </article>
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
      <span>{person.name}</span>
      <span className="caption muted">{person.role}</span>
    </button>
  );
}
