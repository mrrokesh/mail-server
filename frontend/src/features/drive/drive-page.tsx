import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { ErrorNote } from '../../components/ui/field';
import { ApiProblem, readLive, readToken, writeLive } from '../../lib/api';
import { useDocumentTitle } from '../../lib/use-document-title';
import type { ErrorCode } from '@mrrokesh/shared';

const fileSchema = z.object({
  id: z.string(),
  name: z.string(),
  contentType: z.string(),
  sizeBytes: z.number(),
  stored: z.boolean().optional(),
  upload: z.string().optional(),
});

type DriveFile = z.infer<typeof fileSchema>;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result : '';
      const comma = value.indexOf(',');
      resolve(comma >= 0 ? value.slice(comma + 1) : value);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });
}

export function DrivePage() {
  useDocumentTitle('Drive');
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [uploadKey, setUploadKey] = useState(0);
  const [code, setCode] = useState<ErrorCode | null>(null);
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const files = useQuery({
    queryKey: ['drive', 'files'],
    queryFn: () =>
      readLive('/drive/files', (input) => {
        const parsed = z.object({ files: z.array(fileSchema) }).safeParse(input);
        return parsed.success ? parsed.data.files : null;
      }),
  });

  async function onUpload(event: FormEvent) {
    event.preventDefault();
    setCode(null);
    setNote(null);
    if (!file) return;
    if (file.size > 8_000_000) {
      setNote('Choose a file under 8 MB.');
      return;
    }
    setPending(true);
    try {
      const contentBase64 = await fileToBase64(file);
      await writeLive(
        '/drive/files',
        {
          method: 'POST',
          body: JSON.stringify({
            name: file.name,
            sizeBytes: file.size,
            contentType: file.type || 'application/octet-stream',
            contentBase64,
          }),
        },
        (input) => {
          const parsed = fileSchema.safeParse(input);
          return parsed.success ? parsed.data : null;
        },
      );
      setFile(null);
      setUploadKey((value) => value + 1);
      await queryClient.invalidateQueries({ queryKey: ['drive', 'files'] });
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    } finally {
      setPending(false);
    }
  }

  async function download(item: DriveFile) {
    setNote(null);
    const token = readToken();
    const response = await fetch(`/api/v1/drive/files/${item.id}/content?download=1`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      setNote(`${item.name} has no stored bytes.`);
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = item.name;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="billing-grid">
      <h1 className="h2">Drive</h1>
      <p className="muted">Upload a file. Download returns the stored bytes.</p>
      <form className="stack" onSubmit={(event) => void onUpload(event)}>
        <input
          key={uploadKey}
          className="input"
          type="file"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        {code ? <ErrorNote code={code} /> : null}
        {note ? <p className="muted">{note}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={pending || !file}>
          {pending ? 'Uploading' : 'Upload file'}
        </button>
      </form>
      {files.isPending ? <p className="muted">Loading files.</p> : null}
      {files.isError ? <p className="muted">Drive could not be loaded.</p> : null}
      {(files.data ?? []).map((item) => (
        <div key={item.id} className="invoice-row">
          <span className="break">
            {item.name}
            <span className="caption"> · {item.sizeBytes} bytes</span>
          </span>
          {item.stored ? (
            <button className="btn btn-quiet" type="button" onClick={() => void download(item)}>
              Download
            </button>
          ) : (
            <span className="caption">No bytes</span>
          )}
        </div>
      ))}
    </section>
  );
}
