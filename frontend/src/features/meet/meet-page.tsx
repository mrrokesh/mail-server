import { z } from 'zod';
import { ModulePage } from '../modules/module-page';

const roomSchema = z.object({
  id: z.string(),
  title: z.string(),
  participantCap: z.number(),
  maxMinutes: z.number(),
  livekitUrl: z.string(),
  adapter: z.string(),
  token: z.string(),
});

type Room = z.infer<typeof roomSchema>;

function parseRooms(input: unknown): Room[] | null {
  const parsed = z.object({ rooms: z.array(roomSchema) }).safeParse(input);
  return parsed.success ? parsed.data.rooms : null;
}

export function MeetPage() {
  return (
    <ModulePage
      title="Meet"
      blurb="LiveKit is not connected. A room stores the cap and a stub token for the meeting shell."
      queryKey={['meet', 'rooms']}
      listPath="/meet/rooms"
      createPath="/meet/rooms"
      createLabel="New meeting"
      sheetTitle="New meeting"
      empty="No meetings yet."
      fields={[{ name: 'title', label: 'Title' }]}
      parseList={parseRooms}
      parseItem={(input) => {
        const parsed = roomSchema.safeParse(input);
        return parsed.success ? parsed.data : null;
      }}
      titleOf={(item) => item.title}
      linesOf={(item) => [
        `${item.participantCap} people, ${item.maxMinutes} minutes`,
        item.livekitUrl,
        item.adapter,
      ]}
      bodyOf={(values) => {
        const title = values.title?.trim() ?? '';
        if (!title) return null;
        return { title };
      }}
    />
  );
}
