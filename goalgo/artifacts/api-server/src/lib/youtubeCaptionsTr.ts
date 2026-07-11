const UA =
  "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

type CaptionCue = { startMs: number; endMs: number; text: string };

async function fetchCaptionRaw(videoId: string, lang: string, fmt: string): Promise<string | null> {
  const url = new URL("https://www.youtube.com/api/timedtext");
  url.searchParams.set("v", videoId);
  url.searchParams.set("lang", lang);
  url.searchParams.set("fmt", fmt);
  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": UA, "Accept-Language": "tr-TR,tr;q=0.9" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function parseJson3Cues(raw: string): CaptionCue[] {
  try {
    const data = JSON.parse(raw) as {
      events?: Array<{ tStartMs?: number; dDurationMs?: number; segs?: Array<{ utf8?: string }> }>;
    };
    const cues: CaptionCue[] = [];
    for (const ev of data.events ?? []) {
      const text = (ev.segs ?? [])
        .map((s) => s.utf8 ?? "")
        .join("")
        .replace(/\n+/g, " ")
        .trim();
      if (!text) continue;
      const startMs = ev.tStartMs ?? 0;
      const endMs = startMs + Math.max(ev.dDurationMs ?? 2500, 500);
      cues.push({ startMs, endMs, text });
    }
    return cues;
  } catch {
    return [];
  }
}

function parseSrv1Cues(raw: string): CaptionCue[] {
  const cues: CaptionCue[] = [];
  const re = /<text start="([\d.]+)" dur="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const startMs = Math.round(parseFloat(m[1] ?? "0") * 1000);
    const durMs = Math.round(parseFloat(m[2] ?? "2") * 1000);
    const text = (m[3] ?? "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) continue;
    cues.push({ startMs, endMs: startMs + durMs, text });
  }
  return cues;
}

function formatVttTime(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const msPart = ms % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(msPart).padStart(3, "0")}`;
}

function cuesToVtt(cues: CaptionCue[]): string {
  const lines = ["WEBVTT", "", "Kind: captions", "Language: tr", ""];
  for (const cue of cues) {
    lines.push(`${formatVttTime(cue.startMs)} --> ${formatVttTime(cue.endMs)}`);
    lines.push(cue.text);
    lines.push("");
  }
  return lines.join("\n");
}

/** Türkçe altyazı — WebVTT (native video track) */
export async function fetchYoutubeTurkishCaptionsVtt(videoId: string): Promise<string | null> {
  const id = videoId.trim();
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return null;

  for (const lang of ["tr", "tr-TR"]) {
    for (const fmt of ["json3", "srv1"] as const) {
      const raw = await fetchCaptionRaw(id, lang, fmt);
      if (!raw) continue;
      const cues = fmt === "json3" ? parseJson3Cues(raw) : parseSrv1Cues(raw);
      if (cues.length >= 2) return cuesToVtt(cues);
    }
  }
  return null;
}

/** YouTube Türkçe altyazı/kapalı altyazı metninden kısa özet (SEO açıklama yedeği) */
export async function fetchYoutubeTurkishCaptionExcerpt(
  videoId: string,
  maxChars = 600,
): Promise<string | null> {
  const id = videoId.trim();
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return null;

  for (const lang of ["tr", "tr-TR"]) {
    for (const fmt of ["json3", "srv1"]) {
      const raw = await fetchCaptionRaw(id, lang, fmt);
      if (!raw) continue;
      const text = extractCaptionPlainText(raw, fmt);
      if (text && text.length >= 24) {
        return text.slice(0, maxChars).trim();
      }
    }
  }

  return null;
}

function extractCaptionPlainText(raw: string, fmt: string): string {
  if (fmt === "json3") {
    try {
      const data = JSON.parse(raw) as {
        events?: Array<{ segs?: Array<{ utf8?: string }> }>;
      };
      const parts: string[] = [];
      for (const ev of data.events ?? []) {
        for (const seg of ev.segs ?? []) {
          const u = seg.utf8?.trim();
          if (u && u !== "\n") parts.push(u);
        }
      }
      return parts.join(" ").replace(/\s+/g, " ").trim();
    } catch {
      return "";
    }
  }
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
