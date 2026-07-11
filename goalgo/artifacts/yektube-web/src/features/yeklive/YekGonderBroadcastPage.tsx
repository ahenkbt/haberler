import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Mic, MicOff, Radio, Square, Video, VideoOff } from "lucide-react";
import { ytRoutes } from "@/lib/routes";
import { useMemberAuth } from "@/features/auth/MemberAuth";

const ICE: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

export function YekGonderBroadcastPage() {
  const { member } = useMemberAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pollRef = useRef<number | null>(null);

  const [title, setTitle] = useState("Yek Gönder canlı yayın");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewers, setViewers] = useState(0);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = null;
  }, []);

  useEffect(() => () => stopTracks(), [stopTracks]);

  const toggleCamera = () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCameraOn(track.enabled);
  };

  const toggleMic = () => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  };

  const startBroadcast = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        void videoRef.current.play().catch(() => undefined);
      }

      const hostName = member?.firstName?.trim() || "Yayıncı";
      const createRes = await fetch("/api/video/yek-gonder/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, hostName }),
      });
      if (!createRes.ok) throw new Error("Yayın oturumu oluşturulamadı");
      const created = (await createRes.json()) as { session: { id: string } };
      const id = created.session.id;
      setSessionId(id);

      const pc = new RTCPeerConnection({ iceServers: ICE });
      pcRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await fetch(`/api/video/yek-gonder/sessions/${id}/offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sdp: offer.sdp }),
      });

      pollRef.current = window.setInterval(async () => {
        try {
          const r = await fetch(`/api/video/yek-gonder/sessions/${id}/answers`);
          if (!r.ok) return;
          const data = (await r.json()) as { items: { viewerId: string; sdp: string }[] };
          setViewers(data.items.length);
          for (const ans of data.items) {
            if (pc.signalingState === "stable" && pc.remoteDescription) continue;
            await pc.setRemoteDescription({ type: "answer", sdp: ans.sdp });
          }
          const stat = await fetch(`/api/video/yek-gonder/sessions/${id}`);
          if (stat.ok) {
            const meta = (await stat.json()) as { viewerCount?: number };
            if (typeof meta.viewerCount === "number") setViewers(meta.viewerCount);
          }
        } catch {
          /* ignore poll errors */
        }
      }, 3000);

      setLive(true);
    } catch (e) {
      stopTracks();
      setError(e instanceof Error ? e.message : "Kamera veya mikrofon açılamadı");
    }
  };

  const endBroadcast = async () => {
    if (sessionId) {
      await fetch(`/api/video/yek-gonder/sessions/${sessionId}/end`, {
        method: "POST",
        credentials: "include",
      }).catch(() => undefined);
    }
    stopTracks();
    setLive(false);
    setSessionId(null);
    setViewers(0);
  };

  const watchUrl = sessionId ? `${ytRoutes.live()}/yayin/${sessionId}` : null;

  return (
    <div className="min-h-full px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center gap-2">
          <Link href={ytRoutes.yeklive()} className="text-sm text-[var(--color-yt-muted)] hover:underline">
            ← Yek Gönder
          </Link>
        </div>
        <h1 className="text-xl font-bold">Canlı yayın stüdyosu</h1>
        <p className="mt-1 text-sm text-[var(--color-yt-muted)]">
          Kamera ve mikrofonunuzdan doğrudan Yektube&apos;de yayın yapın (YouTube gerekmez).
        </p>

        {!live ? (
          <div className="mt-6 space-y-4">
            <label className="block text-sm font-medium">
              Yayın başlığı
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="yt-input mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                maxLength={120}
              />
            </label>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button
              type="button"
              onClick={() => void startBroadcast()}
              className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
            >
              <Radio className="h-4 w-4" />
              Yayına başla
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="relative overflow-hidden rounded-xl bg-black aspect-video">
              <video ref={videoRef} className="h-full w-full object-contain mirror" playsInline muted autoPlay />
              <div className="absolute left-3 top-3 rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                CANLI · {viewers} izleyici
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={toggleCamera} className="rounded-full border px-3 py-1.5 text-sm yt-panel-hover">
                {cameraOn ? <Video className="inline h-4 w-4" /> : <VideoOff className="inline h-4 w-4" />} Kamera
              </button>
              <button type="button" onClick={toggleMic} className="rounded-full border px-3 py-1.5 text-sm yt-panel-hover">
                {micOn ? <Mic className="inline h-4 w-4" /> : <MicOff className="inline h-4 w-4" />} Mikrofon
              </button>
              <button
                type="button"
                onClick={() => void endBroadcast()}
                className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-4 py-1.5 text-sm font-semibold text-white"
              >
                <Square className="h-3.5 w-3.5 fill-current" /> Bitir
              </button>
            </div>
            {watchUrl ? (
              <p className="text-sm text-[var(--color-yt-muted)]">
                İzleme linki:{" "}
                <a href={watchUrl} className="font-medium underline">
                  {typeof window !== "undefined" ? window.location.origin : ""}
                  {watchUrl}
                </a>
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
