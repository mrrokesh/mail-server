import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { z } from 'zod';
import { ApiProblem, readLive, writeLive } from '../../lib/api';
import { useDocumentTitle } from '../../lib/use-document-title';
import { LiveRoom } from './live-room';

const roomSchema = z.object({
  id: z.string(),
  title: z.string(),
  participantCap: z.number(),
  maxMinutes: z.number(),
  livekitUrl: z.string(),
  token: z.string(),
  adapter: z.string(),
});

type RoomItem = z.infer<typeof roomSchema>;

export function MeetPage() {
  useDocumentTitle('Meet');
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [active, setActive] = useState<RoomItem | null>(null);
  const rooms = useQuery({
    queryKey: ['meet', 'rooms'],
    queryFn: () =>
      readLive('/meet/rooms', (input) => {
        const body = z.object({ rooms: z.array(roomSchema) }).safeParse(input);
        return body.success ? body.data.rooms : null;
      }),
  });

  async function createRoom() {
    const name = title.trim();
    if (!name) return;
    setProblem(null);
    try {
      const created = await writeLive(
        '/meet/rooms',
        {
          method: 'POST',
          body: JSON.stringify({ title: name }),
        },
        (input) => {
          const parsed = roomSchema.safeParse(input);
          return parsed.success ? parsed.data : null;
        },
      );
      setTitle('');
      await queryClient.invalidateQueries({ queryKey: ['meet', 'rooms'] });
      if (created.data.adapter !== 'livekit' || !created.data.livekitUrl.startsWith('ws')) {
        setProblem('LiveKit is not configured on the API.');
        return;
      }
      setActive(created.data);
    } catch (error) {
      setProblem(error instanceof ApiProblem ? error.action : 'Meeting did not start.');
    }
  }

  if (active && active.adapter === 'livekit') {
    return (
      <LiveRoom url={active.livekitUrl} token={active.token} onLeave={() => setActive(null)} />
    );
  }

  return (
    <section className="billing-grid">
      <h1 className="h2">Meet</h1>
      <p className="muted">Start a room. Camera and microphone stay in this browser.</p>
      <form
        className="cluster"
        onSubmit={(event) => {
          event.preventDefault();
          void createRoom();
        }}
      >
        <label className="stack">
          <span className="caption">Title</span>
          <input
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <button className="btn btn-primary" type="submit">
          Start meeting
        </button>
      </form>
      {problem ? <p className="muted">{problem}</p> : null}
      {(rooms.data ?? []).map((room) => (
        <button
          key={room.id}
          type="button"
          className="btn btn-quiet"
          onClick={() => {
            if (room.adapter !== 'livekit' || !room.livekitUrl.startsWith('ws')) {
              setProblem('LiveKit is not configured on the API.');
              return;
            }
            setProblem(null);
            setActive(room);
          }}
        >
          {room.title}
        </button>
      ))}
    </section>
  );
}
