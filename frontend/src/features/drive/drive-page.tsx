import type { ErrorCode } from '@mrrokesh/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileText, HardDrive, Link2, Upload } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { ErrorNote, Field } from '../../components/ui/field';
import { Icon } from '../../components/ui/icon';
import { Badge, EmptyState, QuotaMeter } from '../../components/ui/primitives';
import { Sheet } from '../../components/ui/sheet';
import { SkeletonLines } from '../../components/ui/skeleton';
import { ApiProblem, readLive, readToken, writeLive } from '../../lib/api';
import { useDocumentTitle } from '../../lib/use-document-title';

const fileSchema = z.object({
  id: z.string(),
  name: z.string(),
  contentType: z.string(),
  sizeBytes: z.number(),
  stored: z.boolean().optional(),
  upload: z.string().optional(),
});

const driveResponseSchema = z.object({
  files: z.array(fileSchema),
  storageBytes: z.number().optional(),
  uploadBytes: z.number().optional(),
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

export function DrivePage() {
  useDocumentTitle('Drive');
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [uploadKey, setUploadKey] = useState(0);
  const [code, setCode] = useState<ErrorCode | null>(null);
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<DriveFile | null>(null);
  const [sharePassword, setSharePassword] = useState('');
  const [shareLink, setShareLink] = useState<string | null>(null);

  const drive = useQuery({
    queryKey: ['drive', 'files'],
    queryFn: () =>
      readLive('/drive/files', (input) => {
        const parsed = driveResponseSchema.safeParse(input);
        return parsed.success ? parsed.data : null;
      }),
  });

  async function onUpload(event: FormEvent) {
    event.preventDefault();
    setCode(null);
    setNote(null);
    if (!file) return;
    if (file.size > 8_000_000) {
      setNote('Choose a file under 8 MB for inline upload.');
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
      setNote(`${item.name} has metadata only and no stored file bytes.`);
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

  async function onCreateShare(event: FormEvent) {
    event.preventDefault();
    if (!shareTarget) return;
    setCode(null);
    try {
      const res = await writeLive(
        `/drive/files/${shareTarget.id}/shares`,
        {
          method: 'POST',
          body: JSON.stringify({
            viewOnly: true,
            ...(sharePassword.trim() ? { password: sharePassword.trim() } : {}),
          }),
        },
        (input) => {
          const parsed = z.object({ path: z.string() }).safeParse(input);
          return parsed.success ? parsed.data : null;
        },
      );
      setShareLink(`${window.location.origin}${res.data.path}`);
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    }
  }

  const files = drive.data?.files ?? [];
  const usedBytes = files.reduce((s, f) => s + f.sizeBytes, 0);
  const storageBytes = drive.data?.storageBytes ?? 5 * 1024 ** 3;

  return (
    <div className="page-wrap">
      <div className="spread">
        <div>
          <h1 className="h2">Drive</h1>
          <p className="caption muted">
            Workspace file storage with password-protected share links and large-attachment
            delivery.
          </p>
        </div>
        <div style={{ minWidth: 240 }}>
          <QuotaMeter
            label="Drive quota"
            usedLabel={`${formatBytes(usedBytes)} / ${formatBytes(storageBytes)}`}
            percent={(usedBytes / storageBytes) * 100}
          />
        </div>
      </div>

      <form className="dropzone" onSubmit={(event) => void onUpload(event)}>
        <Icon icon={Upload} size={24} />
        <p className="strong">Upload a file to workspace Drive</p>
        <p className="caption muted">
          {file ? `${file.name} (${formatBytes(file.size)})` : 'Select any file up to 8 MB.'}
        </p>
        <div className="cluster-2">
          <label className="btn btn-quiet" style={{ cursor: 'pointer' }}>
            <input
              key={uploadKey}
              className="visually-hidden"
              type="file"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <span>{file ? 'Change file' : 'Choose file'}</span>
          </label>
          <button className="btn btn-primary" type="submit" disabled={pending || !file}>
            {pending ? 'Uploading...' : 'Upload file'}
          </button>
        </div>
        {code ? <ErrorNote code={code} /> : null}
        {note ? <p className="caption muted">{note}</p> : null}
      </form>

      {drive.isPending ? <SkeletonLines count={3} /> : null}
      {!drive.isPending && files.length === 0 ? (
        <EmptyState
          icon={HardDrive}
          title="Drive is empty"
          description="Upload documents, invoices, or large attachments to share securely."
        />
      ) : null}

      {files.length > 0 ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Size</th>
                <th>Storage</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className="cluster-2">
                      <Icon icon={FileText} size={16} />
                      <span className="strong break">{item.name}</span>
                    </span>
                  </td>
                  <td className="caption muted">{item.contentType}</td>
                  <td className="tabular">{formatBytes(item.sizeBytes)}</td>
                  <td>
                    <Badge tone={item.stored ? 'success' : 'neutral'}>
                      {item.stored ? 'Stored' : 'Metadata'}
                    </Badge>
                  </td>
                  <td>
                    <div className="cluster-2">
                      {item.stored ? (
                        <button
                          className="btn btn-quiet btn-sm"
                          type="button"
                          onClick={() => void download(item)}
                        >
                          <Icon icon={Download} size={14} />
                          <span>Download</span>
                        </button>
                      ) : null}
                      <button
                        className="btn btn-quiet btn-sm"
                        type="button"
                        onClick={() => {
                          setShareTarget(item);
                          setShareLink(null);
                          setSharePassword('');
                          setCode(null);
                        }}
                      >
                        <Icon icon={Link2} size={14} />
                        <span>Share</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Sheet
        open={Boolean(shareTarget)}
        title={shareTarget ? `Share ${shareTarget.name}` : 'Share file'}
        onClose={() => setShareTarget(null)}
      >
        <form className="sheet-form" onSubmit={(e) => void onCreateShare(e)}>
          <Field
            label="Optional link password"
            type="password"
            placeholder="Leave empty for public link"
            value={sharePassword}
            onChange={(e) => setSharePassword(e.target.value)}
          />
          {code ? <ErrorNote code={code} /> : null}
          {shareLink ? (
            <div className="card stack-2">
              <p className="caption strong">Share link ready</p>
              <p className="mono break">{shareLink}</p>
            </div>
          ) : null}
          <button className="btn btn-primary" type="submit">
            Create share link
          </button>
        </form>
      </Sheet>
    </div>
  );
}
