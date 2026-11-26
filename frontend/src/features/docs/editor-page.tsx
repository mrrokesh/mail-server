import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { z } from 'zod';
import { readLive } from '../../lib/api';
import { useDocumentTitle } from '../../lib/use-document-title';

const editorSchema = z.object({
  frameUrl: z.string().url(),
  name: z.string(),
});

export function EditorPage() {
  const { documentId } = useParams();
  const editor = useQuery({
    queryKey: ['docs', 'editor', documentId],
    enabled: Boolean(documentId),
    queryFn: () =>
      readLive(`/docs/${documentId}/editor`, (input) => {
        const parsed = editorSchema.safeParse(input);
        return parsed.success ? parsed.data : null;
      }),
  });
  useDocumentTitle(editor.data?.name ?? 'Document');

  return (
    <section className="editor-page">
      <div className="cluster editor-bar">
        <Link className="btn btn-text" to="/documents">
          Documents
        </Link>
        <h1 className="h3">{editor.data?.name ?? 'Document'}</h1>
      </div>
      {editor.isPending ? <p className="muted editor-note">Opening Collabora.</p> : null}
      {editor.isError ? (
        <p className="muted editor-note">Collabora is not available for this document.</p>
      ) : null}
      {editor.data ? (
        <iframe
          className="editor-frame"
          title={editor.data.name}
          src={editor.data.frameUrl}
          allow="clipboard-read; clipboard-write; fullscreen"
        />
      ) : null}
    </section>
  );
}
