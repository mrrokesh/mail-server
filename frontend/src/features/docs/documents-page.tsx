import { z } from 'zod';
import { ModulePage } from '../modules/module-page';

const docSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.string(),
  template: z.string().nullable(),
  version: z.number(),
});

type DocItem = z.infer<typeof docSchema>;

function parseDocs(input: unknown): DocItem[] | null {
  const parsed = z.object({ docs: z.array(docSchema) }).safeParse(input);
  return parsed.success ? parsed.data.docs : null;
}

export function DocumentsPage() {
  return (
    <ModulePage
      title="Docs"
      blurb="Collabora is not running here. Opening a file returns a WOPI stub the browser can show."
      queryKey={['docs']}
      listPath="/docs"
      createPath="/docs"
      createLabel="New document"
      sheetTitle="New document"
      empty="No documents yet."
      fields={[{ name: 'name', label: 'Name' }]}
      parseList={parseDocs}
      parseItem={(input) => {
        const parsed = docSchema.safeParse(input);
        return parsed.success ? parsed.data : null;
      }}
      titleOf={(item) => item.name}
      linesOf={(item) => [
        item.kind,
        item.template ? `Template ${item.template}` : 'Blank',
        `Version ${item.version}`,
        'WOPI stub',
      ]}
      bodyOf={(values) => {
        const name = values.name?.trim() ?? '';
        if (!name) return null;
        return { name, kind: 'document' };
      }}
    />
  );
}
