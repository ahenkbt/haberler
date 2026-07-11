import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "wouter";
import { Loader2, Radio } from "lucide-react";
import { ytRoutes } from "@/lib/routes";

const ICE: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

export function YekGonderWatchPage() {
  const params = useParams<{ sessionId?: string }>();
  const sessionId = params.sessionId?.trim() ?? "";
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const viewerIdRef = useRef(crypto.randomUUID());

  const [title, setTitle] = useState("Canlı yayın");
  const [hostName, setHostName] = useState("");
  const [status, setStatus] = useState<"loading" | "live" | "waiting" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      setError("Geçersiz yayın");
      return;
    }

    let cancelled = false;

    async function connect() {
      try {
        const metaRes = await fetch(`/api/video/yek-gonder/sessions/${sessionId}`);
        if (!metaRes.ok) throw new Error("Yayın bulunamadı");
        const meta = (await metaRes.json()) as { title?: string; hostName?: string };
        if (cancelled) return;
        setTitle(meta.title ?? "Canlı yayın");
        setHostName(meta.hostName ?? "");

        const offerRes = await fetch(`/api/video/yek-gonder/sessions/${sessionId}/offer`);
        if (!offerRes.ok) {
          setStatus("waiting");
          return;
        }
        const { sdp } = (await offerRes.json()) as { sdp: string };
        if (cancelled || !sdp) {
          setStatus("waiting");
          return;
        }

        const pc = new RTCPeerConnection({ iceServers: ICE });
        pcRef.current = pc;
        pc.ontrack = (ev) => {
          const stream = ev.streams[0];
          if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
            void videoRef.current.play().catch(() => undefined);
          }
        };

        await pc.setRemoteDescription({ type: "offer", sdp });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await fetch(`/api/video/yek-gonder/sessions/${sessionId}/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ viewerId: viewerIdRef.current, sdp: answer.sdp }),
        });

        if (!cancelled) setStatus("live");
      } catch (e) {
        if (!cancelled) {
          setStatus("error");
          setError(e instanceof Error ? e.message : "Bağlantı kurulamadı");
        }
      }
    }

    void connect();
    const timer = window.setInterval(() => {
      if (status === "waiting") void connect();
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      pcRef.current?.close();
    };
  }, [sessionId, status]);

  return (
    <div className="min-h-full px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href={ytRoutes.live()} className="text-sm text-[var(--color-yt-muted)] hover:underline">
          ← Canlı Yayın
        </Link>
        <div className="mt-4 flex items-center gap-2">
          <Radio className="h-5 w-5 text-red-600" />
          <h1 className="text-xl font-bold">{title}</h1>
        </div>
        {hostName ? <p className="text-sm text-[var(--color-yt-muted)]">{hostName}</p> : null}

        <div className="relative mt-4 aspect-video overflow-hidden rounded-xl bg-black">
          {status === "loading" || status === "waiting" ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-white/80">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">{status === "waiting" ? "Yayıncı bekleniyor…" : "Bağlanılıyor…"}</p>
            </div>
          ) : null}
          {status === "error" ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-red-300">{error}</div>
          ) : null}
          <video ref={videoRef} className="h-full w-full object-contain" playsInline autoPlay />
          {status === "live" ? (
            <div className="absolute left-3 top-3 rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white">CANLI</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
