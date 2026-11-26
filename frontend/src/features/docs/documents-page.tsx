import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { Icon } from '../../components/ui/icon';
import { Badge, EmptyState } from '../../components/ui/primitives';
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

  const list = docs.data ?? [];

  return (
    <div className="page-wrap">
      <div className="spread">
        <div>
          <h1 className="h2">Documents</h1>
          <p className="caption muted">
            Collaborative documents, spreadsheets, and Indian business templates via WOPI.
          </p>
        </div>
        <form
          className="cluster"
          onSubmit={(event) => {
            event.preventDefault();
            void createDocument();
          }}
        >
          <input
            className="input input-compact"
            style={{ width: 220 }}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Document title"
          />
          <button className="btn btn-primary btn-sm" type="submit" disabled={!name.trim()}>
            <Icon icon={Plus} size={15} />
            <span>New document</span>
          </button>
        </form>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents yet"
          description="Create a document to open it in the collaborative WOPI editor."
        />
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Version</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {list.map((doc) => (
                <tr key={doc.id}>
                  <td className="strong break">{doc.name}</td>
                  <td>
                    <Badge>{doc.kind}</Badge>
                  </td>
                  <td className="tabular">v{doc.version}</td>
                  <td>
                    <Link className="btn btn-quiet btn-sm" to={`/documents/${doc.id}`}>
                      Open editor
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
