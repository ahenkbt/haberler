import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";

type LiveSession = {
  id: string;
  title: string;
  hostName: string;
  createdAt: number;
  active: boolean;
  offer?: string;
  answers: Map<string, string>;
};

const sessions = new Map<string, LiveSession>();

function pruneSessions(): void {
  const cutoff = Date.now() - 6 * 60 * 60 * 1000;
  for (const [id, s] of sessions) {
    if (s.createdAt < cutoff) sessions.delete(id);
  }
}

const router: IRouter = Router();

router.get("/video/yek-gonder/sessions", (_req, res) => {
  pruneSessions();
  const items = [...sessions.values()]
    .filter((s) => s.active)
    .map((s) => ({
      id: s.id,
      title: s.title,
      hostName: s.hostName,
      createdAt: s.createdAt,
      viewerCount: s.answers.size,
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
  res.json({ items });
});

router.post("/video/yek-gonder/sessions", (req, res) => {
  const title = String(req.body?.title ?? "Yek Gönder canlı yayın").trim().slice(0, 120);
  const hostName = String(req.body?.hostName ?? "Yayıncı").trim().slice(0, 80);
  const id = randomUUID().slice(0, 8);
  const session: LiveSession = {
    id,
    title,
    hostName,
    createdAt: Date.now(),
    active: true,
    answers: new Map(),
  };
  sessions.set(id, session);
  res.json({ ok: true, session: { id, title, hostName } });
});

router.get("/video/yek-gonder/sessions/:id", (req, res) => {
  const id = String(req.params.id ?? "");
  const session = sessions.get(id);
  if (!session || !session.active) {
    res.status(404).json({ error: "Yayın bulunamadı" });
    return;
  }
  res.json({
    id: session.id,
    title: session.title,
    hostName: session.hostName,
    createdAt: session.createdAt,
    hasOffer: Boolean(session.offer),
    viewerCount: session.answers.size,
  });
});

router.post("/video/yek-gonder/sessions/:id/offer", (req, res) => {
  const id = String(req.params.id ?? "");
  const session = sessions.get(id);
  const sdp = String(req.body?.sdp ?? "").trim();
  if (!session || !session.active || !sdp) {
    res.status(400).json({ error: "Geçersiz oturum veya teklif" });
    return;
  }
  session.offer = sdp;
  res.json({ ok: true });
});

router.get("/video/yek-gonder/sessions/:id/offer", (req, res) => {
  const id = String(req.params.id ?? "");
  const session = sessions.get(id);
  if (!session?.offer) {
    res.status(404).json({ error: "Teklif henüz yok" });
    return;
  }
  res.json({ sdp: session.offer });
});

router.post("/video/yek-gonder/sessions/:id/answer", (req, res) => {
  const id = String(req.params.id ?? "");
  const session = sessions.get(id);
  const viewerId = String(req.body?.viewerId ?? randomUUID()).slice(0, 36);
  const sdp = String(req.body?.sdp ?? "").trim();
  if (!session || !session.active || !sdp) {
    res.status(400).json({ error: "Geçersiz oturum veya yanıt" });
    return;
  }
  session.answers.set(viewerId, sdp);
  res.json({ ok: true, viewerId });
});

router.get("/video/yek-gonder/sessions/:id/answers", (req, res) => {
  const id = String(req.params.id ?? "");
  const session = sessions.get(id);
  if (!session) {
    res.status(404).json({ error: "Oturum yok" });
    return;
  }
  const items = [...session.answers.entries()].map(([viewerId, sdp]) => ({ viewerId, sdp }));
  res.json({ items });
});

router.post("/video/yek-gonder/sessions/:id/end", (req, res) => {
  const id = String(req.params.id ?? "");
  const session = sessions.get(id);
  if (session) session.active = false;
  res.json({ ok: true });
});

export default router;
