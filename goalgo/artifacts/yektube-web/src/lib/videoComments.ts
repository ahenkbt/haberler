const KEY = "yektube-v2:video-comments";

export type LocalVideoComment = {
  id: string;
  author: string;
  text: string;
  publishedAt: string;
};

type Store = Record<string, LocalVideoComment[]>;

function readStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Store;
  } catch {
    /* ignore */
  }
  return {};
}

function writeStore(store: Store): void {
  localStorage.setItem(KEY, JSON.stringify(store));
}

function guestName(): string {
  const KEY_NAME = "yektube-v2:guest-name";
  try {
    const saved = localStorage.getItem(KEY_NAME)?.trim();
    if (saved) return saved;
    const name = `İzleyici${Math.floor(1000 + Math.random() * 9000)}`;
    localStorage.setItem(KEY_NAME, name);
    return name;
  } catch {
    return "İzleyici";
  }
}

export function loadLocalComments(youtubeVideoId: string): LocalVideoComment[] {
  return readStore()[youtubeVideoId] ?? [];
}

export function addLocalComment(youtubeVideoId: string, text: string): LocalVideoComment {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Yorum boş olamaz");
  const comment: LocalVideoComment = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    author: guestName(),
    text: trimmed.slice(0, 2000),
    publishedAt: new Date().toISOString(),
  };
  const store = readStore();
  const list = store[youtubeVideoId] ?? [];
  store[youtubeVideoId] = [comment, ...list].slice(0, 100);
  writeStore(store);
  return comment;
}

export function formatCommentTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "Az önce";
    if (mins < 60) return `${mins} dk önce`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} sa önce`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} gün önce`;
    return d.toLocaleDateString("tr-TR");
  } catch {
    return iso;
  }
}
