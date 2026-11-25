import { useState } from 'react';
import { z } from 'zod';
import { ErrorNote } from '../../components/ui/field';
import { ApiProblem, writeOrFallback } from '../../lib/api';
import { ModulePage } from '../modules/module-page';
import type { ErrorCode } from '@mrrokesh/shared';

const fileSchema = z.object({
  id: z.string(),
  name: z.string(),
  contentType: z.string(),
  sizeBytes: z.number(),
  upload: z.string().optional(),
});

const shareSchema = z.object({
  path: z.string(),
  hasPassword: z.boolean(),
  viewOnly: z.boolean(),
});

type DriveFile = z.infer<typeof fileSchema>;

function parseFiles(input: unknown): DriveFile[] | null {
  const parsed = z.object({ files: z.array(fileSchema) }).safeParse(input);
  return parsed.success ? parsed.data.files : null;
}

function ShareBox({ item }: { item: DriveFile }) {
  const [password, setPassword] = useState('');
  const [link, setLink] = useState<string | null>(null);
  const [code, setCode] = useState<ErrorCode | null>(null);
  const [pending, setPending] = useState(false);

  async function onShare() {
    setPending(true);
    setCode(null);
    try {
      const result = await writeOrFallback(
        `/drive/files/${item.id}/shares`,
        {
          method: 'POST',
          body: JSON.stringify({
            viewOnly: true,
            ...(password.trim() ? { password: password.trim() } : {}),
          }),
        },
        (input) => {
          const parsed = shareSchema.safeParse(input);
          return parsed.success ? parsed.data : null;
        },
        () => null,
      );
      if (!result.data) {
        setCode('API-SRV-500');
        return;
      }
      setLink(result.data.path);
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="stack">
      <label className="caption" htmlFor="share-password">
        Link password
      </label>
      <input
        id="share-password"
        className="input"
        type="text"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="off"
      />
      <button
        type="button"
        className="btn btn-quiet"
        onClick={() => void onShare()}
        disabled={pending}
      >
        {pending ? 'Creating link' : 'Create share link'}
      </button>
      {link ? <p className="break">{link}</p> : null}
      {code ? <ErrorNote code={code} /> : null}
    </div>
  );
}

export function DrivePage() {
  return (
    <ModulePage
      title="Drive"
      blurb="Upload is recorded as metadata. The file bytes stay on object storage once that adapter is connected."
      queryKey={['drive', 'files']}
      listPath="/drive/files"
      createPath="/drive/files"
      createLabel="Add file"
      sheetTitle="Add file"
      empty="No files yet."
      fields={[
        { name: 'name', label: 'File name' },
        { name: 'sizeBytes', label: 'Size in bytes', type: 'number' },
      ]}
      parseList={parseFiles}
      parseItem={(input) => {
        const parsed = fileSchema.safeParse(input);
        return parsed.success ? parsed.data : null;
      }}
      titleOf={(item) => item.name}
      linesOf={(item) => [`${item.sizeBytes} bytes`, item.contentType, 'Upload stub']}
      bodyOf={(values) => {
        const name = values.name?.trim() ?? '';
        const sizeBytes = Number(values.sizeBytes);
        if (!name || !Number.isInteger(sizeBytes) || sizeBytes < 1) return null;
        return { name, sizeBytes, contentType: 'application/octet-stream' };
      }}
      SelectedExtra={ShareBox}
    />
  );
}
