import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { readLive, writeLive } from '../../lib/api';
import { useDocumentTitle } from '../../lib/use-document-title';

const docSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.string(),
  template: z.string().nullable(),
  version: z.number(),
});

export function DocumentsPage() {
  useDocumentTitle('Documents');
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const docs = useQuery({
    queryKey: ['docs'],
    queryFn: () =>
      readLive('/docs', (input) => {
        const parsed = z.object({ docs: z.array(docSchema) }).safeParse(input);
        return parsed.success ? parsed.data.docs : null;
      }),
  });

  async function createDocument() {
    const title = name.trim();
    if (!title) return;
    await writeLive(
      '/docs',
      { method: 'POST', body: JSON.stringify({ name: title, kind: 'document' }) },
      (input) => {
        const parsed = docSchema.safeParse(input);
        return parsed.success ? parsed.data : null;
      },
    );
    setName('');
    await queryClient.invalidateQueries({ queryKey: ['docs'] });
  }

  return (
    <section className="billing-grid">
      <h1 className="h2">Documents</h1>
      <p className="muted">Opens in Collabora on this machine.</p>
      <form
        className="cluster"
        onSubmit={(event) => {
          event.preventDefault();
          void createDocument();
        }}
      >
        <input
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Document name"
        />
        <button className="btn btn-primary" type="submit">
          New document
        </button>
      </form>
      {(docs.data ?? []).map((doc) => (
        <Link key={doc.id} className="break" to={`/documents/${doc.id}`}>
          {doc.name}
        </Link>
      ))}
    </section>
  );
}
