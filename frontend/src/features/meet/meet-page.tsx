import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Video } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';
import { Icon } from '../../components/ui/icon';
import { Badge, EmptyState } from '../../components/ui/primitives';
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
        { method: 'POST', body: JSON.stringify({ title: name }) },
        (input) => {
          const parsed = roomSchema.safeParse(input);
          return parsed.success ? parsed.data : null;
        },
      );
      setTitle('');
      await queryClient.invalidateQueries({ queryKey: ['meet', 'rooms'] });
      if (created.data.adapter !== 'livekit' || !created.data.livekitUrl.startsWith('ws')) {
        setProblem('LiveKit SFU URL is not configured on this API instance yet.');
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

  const list = rooms.data ?? [];

  return (
    <div className="page-wrap">
      <div className="spread">
        <div>
          <h1 className="h2">Meet</h1>
          <p className="caption muted">
            Video rooms powered by LiveKit SFU with screen sharing and participant limits by plan.
          </p>
        </div>
        <form
          className="cluster"
          onSubmit={(event) => {
            event.preventDefault();
            void createRoom();
          }}
        >
          <input
            className="input input-compact"
            style={{ width: 220 }}
            placeholder="Meeting title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <button className="btn btn-primary btn-sm" type="submit" disabled={!title.trim()}>
            <Icon icon={Video} size={15} />
            <span>Start meeting</span>
          </button>
        </form>
      </div>

      {problem ? (
        <div className="privacy-bar">
          <span className="caption muted">{problem}</span>
        </div>
      ) : null}

      {list.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No active rooms"
          description="Create a meeting room to generate an instant LiveKit join link."
        />
      ) : (
        <div className="bento-grid">
          {list.map((room) => (
            <div key={room.id} className="card spread">
              <div className="stack-2">
                <p className="strong">{room.title}</p>
                <div className="cluster-2">
                  <Badge>Up to {room.participantCap} participants</Badge>
                  <Badge>{room.maxMinutes} min</Badge>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-quiet btn-sm"
                onClick={() => {
                  if (room.adapter !== 'livekit' || !room.livekitUrl.startsWith('ws')) {
                    setProblem('LiveKit SFU URL is not configured on this API instance yet.');
                    return;
                  }
                  setProblem(null);
                  setActive(room);
                }}
              >
                Join room
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
