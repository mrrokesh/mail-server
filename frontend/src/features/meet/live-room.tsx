import {
  Room,
  RoomEvent,
  Track,
  type LocalTrackPublication,
  type RemoteTrack,
} from 'livekit-client';
import { useEffect, useRef, useState } from 'react';

function socketUrl(url: string): string {
  if (url.startsWith('https://')) return `wss://${url.slice('https://'.length)}`;
  if (url.startsWith('http://')) return `ws://${url.slice('http://'.length)}`;
  return url;
}

export function LiveRoom({
  url,
  token,
  onLeave,
}: {
  url: string;
  token: string;
  onLeave: () => void;
}) {
  const videos = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLDivElement>(null);
  const roomRef = useRef<Room | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [status, setStatus] = useState('Connecting');
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);

  useEffect(() => {
    const room = new Room();
    roomRef.current = room;
    const seen = new Set<string>();
    let cancelled = false;
    const target = socketUrl(url);

    const attach = (track: Track | RemoteTrack, local: boolean) => {
      const key = `${local ? 'local' : 'remote'}:${track.mediaStreamTrack.id}`;
      if (seen.has(key)) return;
      seen.add(key);
      const element = track.attach();
      element.autoplay = true;
      if (element instanceof HTMLVideoElement) {
        element.playsInline = true;
        element.muted = local;
        element.className = 'meet-tile';
        videos.current?.appendChild(element);
        return;
      }
      element.muted = local;
      element.className = 'meet-audio';
      audio.current?.appendChild(element);
    };

    room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
      attach(track, false);
    });
    room.on(RoomEvent.LocalTrackPublished, (publication: LocalTrackPublication) => {
      if (publication.track) attach(publication.track, true);
    });

    if (!target.startsWith('ws')) {
      setProblem('The meeting URL is not a LiveKit socket.');
      setStatus('Not connected');
      return;
    }

    room
      .connect(target, token)
      .then(async () => {
        if (cancelled) {
          await room.disconnect();
          return;
        }
        setStatus('Connected');
        await room.localParticipant.enableCameraAndMicrophone();
        room.remoteParticipants.forEach((participant) => {
          participant.trackPublications.forEach((publication) => {
            const track = publication.track;
            if (track && (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio)) {
              attach(track, false);
            }
          });
        });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setStatus('Not connected');
          setProblem(error instanceof Error ? error.message : 'Meeting did not connect.');
        }
      });

    return () => {
      cancelled = true;
      roomRef.current = null;
      void room.disconnect();
    };
  }, [token, url]);

  return (
    <section className="meet-stage" aria-label="Meeting">
      <p className="caption">{status}</p>
      {problem ? <p className="muted">{problem}</p> : null}
      <div ref={videos} className="meet-grid" />
      <div ref={audio} className="meet-audio" />
      <div className="cluster">
        <button
          type="button"
          className="btn btn-quiet"
          onClick={() => {
            const next = !micOn;
            setMicOn(next);
            void roomRef.current?.localParticipant.setMicrophoneEnabled(next);
          }}
        >
          {micOn ? 'Mute microphone' : 'Unmute microphone'}
        </button>
        <button
          type="button"
          className="btn btn-quiet"
          onClick={() => {
            const next = !cameraOn;
            setCameraOn(next);
            void roomRef.current?.localParticipant.setCameraEnabled(next);
          }}
        >
          {cameraOn ? 'Stop camera' : 'Start camera'}
        </button>
        <button type="button" className="btn btn-quiet" onClick={onLeave}>
          Leave meeting
        </button>
      </div>
    </section>
  );
}
