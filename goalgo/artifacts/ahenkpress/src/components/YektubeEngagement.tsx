import { useCallback, useEffect, useMemo, useState } from "react";
import { ThumbsUp, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

type CommentRow = {
  id: string;
  author: string;
  body: string;
  at: number;
};

function readComments(videoId: string): CommentRow[] {
  try {
    const raw = localStorage.getItem(`yektube:comments:${videoId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CommentRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeComments(videoId: string, rows: CommentRow[]) {
  localStorage.setItem(`yektube:comments:${videoId}`, JSON.stringify(rows.slice(-200)));
}

function readLikes(videoId: string): { count: number; liked: boolean } {
  try {
    const count = parseInt(localStorage.getItem(`yektube:likes:${videoId}`) || "0", 10) || 0;
    const liked = localStorage.getItem(`yektube:liked:${videoId}`) === "1";
    return { count, liked };
  } catch {
    return { count: 0, liked: false };
  }
}

function setLikes(videoId: string, count: number, liked: boolean) {
  localStorage.setItem(`yektube:likes:${videoId}`, String(Math.max(0, count)));
  if (liked) localStorage.setItem(`yektube:liked:${videoId}`, "1");
  else localStorage.removeItem(`yektube:liked:${videoId}`);
}

export function YektubeEngagement({ videoId }: { videoId: string }) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [author, setAuthor] = useState(() => {
    try {
      return localStorage.getItem("yektube:displayName") || "";
    } catch {
      return "";
    }
  });
  const [draft, setDraft] = useState("");

  const syncFromStorage = useCallback(() => {
    setComments(readComments(videoId));
    const l = readLikes(videoId);
    setLikeCount(l.count);
    setLiked(l.liked);
  }, [videoId]);

  useEffect(() => {
    syncFromStorage();
  }, [syncFromStorage]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key?.startsWith("yektube:")) return;
      syncFromStorage();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [syncFromStorage]);

  const toggleLike = () => {
    const cur = readLikes(videoId);
    if (cur.liked) {
      const nc = Math.max(0, cur.count - 1);
      setLiked(false);
      setLikeCount(nc);
      setLikes(videoId, nc, false);
    } else {
      const nc = cur.count + 1;
      setLiked(true);
      setLikeCount(nc);
      setLikes(videoId, nc, true);
    }
  };

  const submitComment = () => {
    const body = draft.trim();
    if (!body) return;
    const name = (author.trim() || "Ziyaretçi").slice(0, 60);
    try {
      localStorage.setItem("yektube:displayName", name);
    } catch {
      /* ignore */
    }
    const row: CommentRow = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      author: name,
      body: body.slice(0, 2000),
      at: Date.now(),
    };
    const next = [...readComments(videoId), row];
    writeComments(videoId, next);
    setComments(next);
    setDraft("");
  };

  const sorted = useMemo(() => [...comments].sort((a, b) => b.at - a.at), [comments]);

  return (
    <div className="mt-8 space-y-6 border-t border-zinc-200 pt-6">
      <p className="text-xs text-zinc-500 max-w-xl">
        Videolar RSS senkronu ile gelmeye devam eder. Beğeni ve yorumlar yalnızca bu tarayıcıda saklanır.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={toggleLike}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border transition-colors ${
            liked
              ? "bg-sky-50 border-sky-200 text-sky-900"
              : "bg-zinc-50 border-zinc-200 text-zinc-800 hover:bg-zinc-100"
          }`}
        >
          <ThumbsUp className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
          Beğen
          {likeCount > 0 ? <span className="tabular-nums text-zinc-600">{likeCount}</span> : null}
        </button>
      </div>

      <div>
        <h3 className="text-sm font-black text-zinc-900 uppercase tracking-wide mb-3">Yorumlar</h3>
        <div className="space-y-3 mb-4">
          <Input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Adınız (isteğe bağlı)"
            className="max-w-xs h-9 text-sm"
          />
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Yorumunuzu yazın…"
            rows={3}
            className="text-sm resize-y min-h-[80px]"
          />
          <Button type="button" size="sm" onClick={submitComment} className="gap-1.5">
            <Send className="w-3.5 h-3.5" />
            Gönder
          </Button>
        </div>
        {sorted.length === 0 ? (
          <p className="text-sm text-zinc-500">Henüz yorum yok. İlk yorumu siz yazın.</p>
        ) : (
          <ul className="space-y-4">
            {sorted.map((c) => (
              <li key={c.id} className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3">
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span className="text-sm font-bold text-zinc-900">{c.author}</span>
                  <time className="text-[10px] text-zinc-400 shrink-0" dateTime={new Date(c.at).toISOString()}>
                    {new Date(c.at).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}
                  </time>
                </div>
                <p className="text-sm text-zinc-700 whitespace-pre-wrap break-words">{c.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
