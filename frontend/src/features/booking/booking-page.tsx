import { Link } from 'react-router-dom';
import { z } from 'zod';
import { ModulePage } from '../modules/module-page';

const pageSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  durationMinutes: z.number(),
  timezone: z.string(),
});

type Booking = z.infer<typeof pageSchema>;

function parsePages(input: unknown): Booking[] | null {
  const parsed = z.object({ pages: z.array(pageSchema) }).safeParse(input);
  return parsed.success ? parsed.data.pages : null;
}

function PublicLink({ item }: { item: Booking }) {
  return (
    <p>
      <Link to={`/book/${item.slug}`}>Open the public page</Link>
    </p>
  );
}

export function BookingPage() {
  return (
    <ModulePage
      title="Booking"
      blurb="A public page offers the next open slots. Confirmations do not send mail yet."
      queryKey={['booking', 'pages']}
      listPath="/booking/pages"
      createPath="/booking/pages"
      createLabel="New page"
      sheetTitle="New booking page"
      empty="No booking pages yet."
      fields={[
        { name: 'title', label: 'Title' },
        { name: 'slug', label: 'Link name' },
      ]}
      parseList={parsePages}
      parseItem={(input) => {
        const parsed = pageSchema.safeParse(input);
        return parsed.success ? parsed.data : null;
      }}
      titleOf={(item) => item.title}
      linesOf={(item) => [`/${item.slug}`, `${item.durationMinutes} minutes`, item.timezone]}
      bodyOf={(values) => {
        const title = values.title?.trim() ?? '';
        const slug = values.slug?.trim().toLowerCase() ?? '';
        if (!title || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
        return { title, slug, durationMinutes: 30, timezone: 'Asia/Kolkata' };
      }}
      SelectedExtra={PublicLink}
    />
  );
}
