import {
  innertubeIntegrityBody,
  innertubeVisitorHeaders,
  readYoutubeStreamEnv,
  youtubeStreamFetch,
} from "./youtubeStreamConfig.js";

const UA =
  "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

const FALLBACK_INNERTUBE_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilhw_Y9_11qc8";

const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.leptons.xyz",
  "https://pipedapi.adminforge.de",
  "https://pipedapi.in.projectsegfau.lt",
  "https://pipedapi.tokhmi.xyz",
  "https://api.piped.private.coffee",
  "https://pipedapi.drgns.space",
];

const INVIDIOUS_INSTANCES = [
  "https://invidious.privacyredirect.com",
  "https://inv.nadeko.net",
  "https://yewtu.be",
  "https://invidious.nerdvpn.de",
  "https://invidious.protokolla.fi",
  "https://vid.puffyan.us",
];

type StreamFormat = {
  url?: string;
  mimeType?: string;
  height?: number;
  itag?: number;
  qualityLabel?: string;
  signatureCipher?: string;
  cipher?: string;
};

type InnertubePlayerResponse = {
  playabilityStatus?: {
    status?: string;
    reason?: string;
    playableInEmbed?: boolean;
  };
  streamingData?: {
    formats?: StreamFormat[];
    adaptiveFormats?: StreamFormat[];
  };
};

export type YoutubeStreamResult = {
  videoId: string;
  url: string;
  /** Canlı DASH — video-only akışta ayrı ses URL'si */
  audioUrl?: string;
  mimeType: string;
  qualityLabel: string | null;
  expiresAt: number;
  source: "innertube" | "invidious" | "piped" | "youtubei" | "ytdl";
};

const cache = new Map<string, { data: YoutubeStreamResult; expiresAt: number }>();
const CACHE_MS = 25 * 60 * 1000;

const MAX_CONCURRENT_RESOLVES = 3;
let activeResolves = 0;
const resolveWaitQueue: Array<() => void> = [];

async function acquireResolveSlot(): Promise<void> {
  if (activeResolves < MAX_CONCURRENT_RESOLVES) {
    activeResolves += 1;
    return;
  }
  await new Promise<void>((resolve) => {
    resolveWaitQueue.push(() => {
      activeResolves += 1;
      resolve();
    });
  });
}

function releaseResolveSlot(): void {
  activeResolves = Math.max(0, activeResolves - 1);
  const next = resolveWaitQueue.shift();
  if (next) next();
}

async function fetchInnertubeKey(): Promise<string> {
  try {
    const res = await youtubeStreamFetch("https://www.youtube.com/", {
      headers: {
        "User-Agent": UA,
        "Accept-Language": "tr-TR,tr;q=0.9",
        Cookie: "CONSENT=YES+1",
      },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();
    const m = html.match(/"INNERTUBE_API_KEY"\s*:\s*"([^"]+)"/);
    if (m?.[1]) return m[1];
  } catch {
    /* fallback key */
  }
  return FALLBACK_INNERTUBE_KEY;
}

function hasDirectUrl(f: StreamFormat): f is StreamFormat & { url: string } {
  return Boolean(f.url && !f.signatureCipher && !f.cipher);
}

function isMuxedStreamFormat(f: StreamFormat): boolean {
  const mime = f.mimeType ?? "";
  if (mime.includes("audio") && mime.includes("video")) return true;
  const itag = f.itag ?? 0;
  return itag === 18 || itag === 22 || itag === 43;
}

function scoreFormat(f: StreamFormat & { url: string }): number {
  let score = f.height ?? 0;
  const mime = f.mimeType ?? "";
  if (mime.includes("audio") && mime.includes("video")) score += 800;
  else if (mime.includes("video/mp4")) score += 200;
  if ((f.itag ?? 0) === 18) score += 300;
  if ((f.itag ?? 0) === 22) score += 250;
  return score;
}

function pickBestDirectUrl(formats: StreamFormat[], requireMuxed = true): StreamFormat | null {
  const direct = formats.filter(hasDirectUrl);
  const muxed = direct.filter(isMuxedStreamFormat);
  const pool = muxed.length > 0 ? muxed : requireMuxed ? [] : direct;
  const candidates = pool.sort((a, b) => scoreFormat(b) - scoreFormat(a));
  return candidates[0] ?? null;
}

function isAudioOnlyFormat(f: StreamFormat): boolean {
  const mime = f.mimeType ?? "";
  return mime.includes("audio") && !mime.includes("video");
}

function isVideoOnlyFormat(f: StreamFormat): boolean {
  const mime = f.mimeType ?? "";
  return mime.includes("video") && !mime.includes("audio");
}

function pickBestAudioUrl(formats: StreamFormat[]): StreamFormat | null {
  const direct = formats.filter(hasDirectUrl).filter(isAudioOnlyFormat);
  const candidates = direct.sort((a, b) => scoreFormat(b) - scoreFormat(a));
  return candidates[0] ?? null;
}

function pickBestVideoOnlyUrl(formats: StreamFormat[]): StreamFormat | null {
  const direct = formats.filter(hasDirectUrl).filter(isVideoOnlyFormat);
  const candidates = direct.sort((a, b) => scoreFormat(b) - scoreFormat(a));
  return candidates[0] ?? null;
}

type LiveDashPick = {
  video: StreamFormat & { url: string };
  audio?: StreamFormat & { url: string };
};

/** Canlı yayın — muxed yoksa video + audio DASH çifti */
function pickLiveDashStreams(data: InnertubePlayerResponse): LiveDashPick | null {
  const adaptive = data.streamingData?.adaptiveFormats ?? [];
  const muxedPool = [...(data.streamingData?.formats ?? []), ...adaptive.filter(isMuxedStreamFormat)];
  const muxed = pickBestDirectUrl(muxedPool, true);
  if (muxed?.url) return { video: muxed as StreamFormat & { url: string } };

  const video = pickBestVideoOnlyUrl(adaptive);
  const audio = pickBestAudioUrl(adaptive);
  if (video?.url && audio?.url) {
    return {
      video: video as StreamFormat & { url: string },
      audio: audio as StreamFormat & { url: string },
    };
  }
  if (video?.url) return { video: video as StreamFormat & { url: string } };
  return null;
}

function toStreamResult(
  videoId: string,
  pick: LiveDashPick,
  source: YoutubeStreamResult["source"],
): YoutubeStreamResult {
  const result: YoutubeStreamResult = {
    videoId,
    url: pick.video.url,
    mimeType: pick.video.mimeType ?? "video/mp4",
    qualityLabel: pick.video.qualityLabel ?? (pick.video.height ? `${pick.video.height}p` : null),
    expiresAt: Date.now() + CACHE_MS,
    source,
  };
  if (pick.audio?.url) result.audioUrl = pick.audio.url;
  return result;
}

function pickBestStream(data: InnertubePlayerResponse, preferAudio = false): StreamFormat | null {
  if (preferAudio) {
    const audio = pickBestAudioUrl(data.streamingData?.adaptiveFormats ?? []);
    if (audio) return audio;
  }
  const muxed = data.streamingData?.formats ?? [];
  const fromMuxed = pickBestDirectUrl(muxed, true);
  if (fromMuxed) return fromMuxed;
  return pickBestDirectUrl(data.streamingData?.adaptiveFormats ?? [], true);
}

async function fetchPlayerResponse(
  videoId: string,
  client: Record<string, string | number>,
): Promise<InnertubePlayerResponse | null> {
  const env = readYoutubeStreamEnv();
  const key = await fetchInnertubeKey();
  const body: Record<string, unknown> = {
    videoId,
    contentCheckOk: true,
    racyCheckOk: true,
    context: {
      client: {
        hl: "tr",
        gl: "TR",
        ...client,
        ...(env.visitorData ? { visitorData: env.visitorData } : {}),
      },
    },
    ...innertubeIntegrityBody(env),
  };

  const res = await youtubeStreamFetch(`https://www.youtube.com/youtubei/v1/player?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": UA,
      "Accept-Language": "tr-TR,tr;q=0.9",
      Origin: "https://www.youtube.com",
      Referer: `https://www.youtube.com/watch?v=${videoId}`,
      Cookie: "CONSENT=YES+1",
      ...innertubeVisitorHeaders(env),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) return null;
  return (await res.json()) as InnertubePlayerResponse;
}

const INNERTUBE_CLIENTS: Array<Record<string, string | number>> = [
  { clientName: "TV_EMBEDDED", clientVersion: "2.20250220.01.00", osName: "Android", osVersion: "13" },
  { clientName: "WEB_EMBEDDED", clientVersion: "2.20250220.01.00", osName: "Windows", osVersion: "10.0" },
  { clientName: "ANDROID", clientVersion: "20.10.38", androidSdkVersion: 30, osName: "Android", osVersion: "13" },
  { clientName: "ANDROID", clientVersion: "19.17.41", androidSdkVersion: 30, osName: "Android", osVersion: "12" },
  { clientName: "IOS", clientVersion: "19.45.4", deviceModel: "iPhone16,2", osName: "iOS", osVersion: "18.0" },
  { clientName: "TVHTML5_SIMPLY", clientVersion: "2.0", osName: "Android", osVersion: "13" },
  { clientName: "TVHTML5", clientVersion: "7.20250319.00.00" },
  { clientName: "WEB", clientVersion: "2.20250220.01.00" },
  { clientName: "MWEB", clientVersion: "2.20250220.01.00" },
];

async function resolveViaInnertube(
  videoId: string,
  preferAudio = false,
): Promise<YoutubeStreamResult | null> {
  const tryClient = async (client: Record<string, string | number>): Promise<YoutubeStreamResult | null> => {
    const data = await fetchPlayerResponse(videoId, client);
    if (!data) return null;

    const status = data.playabilityStatus?.status;
    if (status && !["OK", "LIVE_STREAM_OFFLINE", "UNPLAYABLE"].includes(status)) {
      if (status === "LOGIN_REQUIRED" || status === "ERROR") return null;
    }

    const picked = pickBestStream(data, preferAudio);
    if (picked?.url) {
      return {
        videoId,
        url: picked.url,
        mimeType: picked.mimeType ?? "video/mp4",
        qualityLabel: picked.qualityLabel ?? (picked.height ? `${picked.height}p` : null),
        expiresAt: Date.now() + CACHE_MS,
        source: "innertube",
      };
    }

    /** Muxed yoksa video-only + audio DASH (embed kapalı haber videoları) */
    const dash = pickLiveDashStreams(data);
    if (dash?.video.url) {
      return toStreamResult(videoId, dash, "innertube");
    }

    return null;
  };

  const priorityClients = INNERTUBE_CLIENTS.slice(0, 4);
  const fast = await firstResolved(priorityClients.map((client) => () => tryClient(client)));
  if (fast) return fast;

  for (const client of INNERTUBE_CLIENTS.slice(4)) {
    try {
      const result = await tryClient(client);
      if (result) return result;
    } catch {
      continue;
    }
  }
  return null;
}

async function resolveViaInnertubeLive(videoId: string): Promise<YoutubeStreamResult | null> {
  const tryClient = async (client: Record<string, string | number>): Promise<YoutubeStreamResult | null> => {
    const data = await fetchPlayerResponse(videoId, client);
    if (!data) return null;

    const status = data.playabilityStatus?.status;
    if (status && !["OK", "LIVE_STREAM_OFFLINE", "UNPLAYABLE"].includes(status)) {
      if (status === "LOGIN_REQUIRED" || status === "ERROR") return null;
    }

    const picked = pickLiveDashStreams(data);
    if (!picked) return null;
    return toStreamResult(videoId, picked, "innertube");
  };

  const liveClients = INNERTUBE_CLIENTS.filter((c) =>
    ["TV_EMBEDDED", "ANDROID", "WEB_EMBEDDED", "TVHTML5"].includes(String(c.clientName)),
  );
  const fast = await firstResolved(liveClients.map((client) => () => tryClient(client)));
  if (fast) return fast;

  for (const client of INNERTUBE_CLIENTS) {
    try {
      const result = await tryClient(client);
      if (result) return result;
    } catch {
      continue;
    }
  }
  return null;
}

type YoutubeiModule = typeof import("youtubei.js");
type YoutubeiInnertube = Awaited<ReturnType<YoutubeiModule["Innertube"]["create"]>>;

let youtubeiBootstrapped = false;

async function bootstrapYoutubei(): Promise<YoutubeiModule> {
  const mod = await import("youtubei.js");
  if (!youtubeiBootstrapped) {
    mod.Platform.shim.eval = async (data) => new Function(data.output)();
    youtubeiBootstrapped = true;
  }
  return mod;
}

let innertubePromise: Promise<YoutubeiInnertube> | null = null;

async function getYoutubeiInnertube(): Promise<YoutubeiInnertube> {
  if (!innertubePromise) {
    const env = readYoutubeStreamEnv();
    innertubePromise = bootstrapYoutubei().then(({ Innertube, UniversalCache }) =>
      Innertube.create({
        retrieve_player: true,
        generate_session_locally: true,
        lang: "tr",
        location: "TR",
        cache: new UniversalCache(true, env.playerCacheDir),
        po_token: env.poToken,
        visitor_data: env.visitorData,
        fetch: youtubeStreamFetch,
      }),
    );
  }
  return innertubePromise;
}

const YOUTUBEI_CLIENTS = ["ANDROID", "IOS", "TV_EMBEDDED", "WEB_EMBEDDED", "WEB", "MWEB"] as const;

async function resolveViaYoutubeiJs(
  videoId: string,
  preferAudio = false,
): Promise<YoutubeStreamResult | null> {
  const env = readYoutubeStreamEnv();
  try {
    const yt = await getYoutubeiInnertube();
    for (const client of YOUTUBEI_CLIENTS) {
      try {
        const info = await yt.getBasicInfo(videoId, { client, po_token: env.poToken });
        const status = info.playability_status?.status;
        if (status && status !== "OK" && status !== "LIVE_STREAM_OFFLINE") continue;

        const format = preferAudio
          ? info.chooseFormat({ type: "audio", quality: "best" }) ??
            info.chooseFormat({ type: "audio", quality: "best", format: "mp4" })
          : info.chooseFormat({ type: "video+audio", quality: "best", format: "mp4" }) ??
            info.chooseFormat({ type: "video+audio", quality: "best" }) ??
            info.chooseFormat({ type: "video", quality: "best", format: "mp4" }) ??
            info.chooseFormat({ type: "video", quality: "best" });
        if (!format) continue;

        let url: string | null = null;
        if (typeof format.url === "string" && format.url) url = format.url;
        else if (format.url) url = String(format.url);
        if (!url && yt.session.player) {
          const deciphered = format.decipher(yt.session.player);
          url = typeof deciphered === "string" ? deciphered : deciphered ? String(deciphered) : null;
        }
        if (!url) continue;

        return {
          videoId,
          url,
          mimeType: format.mime_type ?? "video/mp4",
          qualityLabel: format.quality_label ?? null,
          expiresAt: Date.now() + CACHE_MS,
          source: "youtubei",
        };
      } catch {
        continue;
      }
    }
  } catch {
    return null;
  }
  return null;
}

async function resolveViaYtdl(videoId: string, preferAudio = false): Promise<YoutubeStreamResult | null> {
  try {
    const mod = await import("@distube/ytdl-core");
    const ytdl = mod.default;
    const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`);
    const format = preferAudio
      ? ytdl.chooseFormat(info.formats, { quality: "highestaudio", filter: "audioonly" })
      : ytdl.chooseFormat(info.formats, { quality: "highest", filter: "audioandvideo" }) ??
        ytdl.chooseFormat(info.formats, { quality: "highest", filter: "videoandaudio" }) ??
        ytdl.chooseFormat(info.formats, { quality: "highestvideo" });
    if (!format?.url) return null;
    return {
      videoId,
      url: format.url,
      mimeType: format.mimeType ?? (preferAudio ? "audio/mp4" : "video/mp4"),
      qualityLabel: format.qualityLabel ?? null,
      expiresAt: Date.now() + CACHE_MS,
      source: "ytdl",
    };
  } catch {
    return null;
  }
}

async function firstResolved(
  tasks: Array<() => Promise<YoutubeStreamResult | null>>,
): Promise<YoutubeStreamResult | null> {
  return new Promise((resolve) => {
    let pending = tasks.length;
    let settled = false;
    if (pending === 0) {
      resolve(null);
      return;
    }
    for (const task of tasks) {
      void task()
        .then((result) => {
          if (!settled && result) {
            settled = true;
            resolve(result);
          }
        })
        .catch(() => {
          /* ignore */
        })
        .finally(() => {
          pending -= 1;
          if (!settled && pending === 0) resolve(null);
        });
    }
  });
}

type InvidiousFormat = {
  url?: string;
  type?: string;
  quality?: string;
  resolution?: string;
};

async function resolveViaInvidiousOne(base: string, videoId: string): Promise<YoutubeStreamResult | null> {
  const res = await fetch(`${base}/api/v1/videos/${encodeURIComponent(videoId)}`, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    formatStreams?: InvidiousFormat[];
    adaptiveFormats?: InvidiousFormat[];
  };

  const streams = [...(data.formatStreams ?? []), ...(data.adaptiveFormats ?? [])];
  const mp4 = streams
    .filter((s) => s.url && s.type?.includes("video/mp4") && s.type.includes("audio"))
    .sort((a, b) => {
      const ah = parseInt(a.quality ?? "0", 10) || 0;
      const bh = parseInt(b.quality ?? "0", 10) || 0;
      return bh - ah;
    })[0];

  const picked =
    mp4 ??
    streams.find((s) => s.url && s.type?.includes("video/mp4") && s.type.includes("audio")) ??
    streams.find((s) => s.url && s.type?.includes("video/mp4")) ??
    streams.find((s) => s.url && s.type?.includes("video/"));

  if (!picked?.url) return null;

  return {
    videoId,
    url: picked.url,
    mimeType: picked.type ?? "video/mp4",
    qualityLabel: picked.quality ?? picked.resolution ?? null,
    expiresAt: Date.now() + CACHE_MS,
    source: "invidious",
  };
}

async function resolveViaInvidious(videoId: string): Promise<YoutubeStreamResult | null> {
  return firstResolved(INVIDIOUS_INSTANCES.map((base) => () => resolveViaInvidiousOne(base, videoId)));
}

type PipedStream = {
  url?: string;
  mimeType?: string;
  quality?: string;
  height?: number;
  codec?: string;
};

async function resolveViaPipedOne(base: string, videoId: string): Promise<YoutubeStreamResult | null> {
  const res = await fetch(`${base}/streams/${encodeURIComponent(videoId)}`, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    videoStreams?: PipedStream[];
    videoOnlyStreams?: PipedStream[];
  };

  const combined = (data.videoStreams ?? [])
    .filter((s) => s.url)
    .sort((a, b) => {
      const bh = b.height ?? (parseInt(String(b.quality ?? "0"), 10) || 0);
      const ah = a.height ?? (parseInt(String(a.quality ?? "0"), 10) || 0);
      return bh - ah;
    });

  const picked =
    combined.find((s) => s.codec?.includes("avc") || s.mimeType?.includes("mp4")) ?? combined[0];

  if (!picked?.url) return null;

  return {
    videoId,
    url: picked.url,
    mimeType: picked.mimeType ?? "video/mp4",
    qualityLabel: picked.quality ?? (picked.height ? `${picked.height}p` : null),
    expiresAt: Date.now() + CACHE_MS,
    source: "piped",
  };
}

async function resolveViaPiped(videoId: string): Promise<YoutubeStreamResult | null> {
  return firstResolved(PIPED_INSTANCES.map((base) => () => resolveViaPipedOne(base, videoId)));
}

const RESOLVE_TIMEOUT_MS = 45_000;

async function resolveSequential(videoId: string, preferAudio = false): Promise<YoutubeStreamResult | null> {
  const steps = preferAudio
    ? [
        () => resolveViaYoutubeiJs(videoId, true),
        () => resolveViaInnertube(videoId, true),
        () => resolveViaYtdl(videoId, true),
        () => resolveViaPiped(videoId),
        () => resolveViaInvidious(videoId),
      ]
    : [
        () => resolveViaPiped(videoId),
        () => resolveViaInvidious(videoId),
        () => resolveViaInnertube(videoId, false),
        () => resolveViaYoutubeiJs(videoId, false),
        () => resolveViaYtdl(videoId, false),
      ];
  return firstResolved(steps);
}

function cacheKey(videoId: string, preferAudio: boolean): string {
  return preferAudio ? `${videoId}:audio` : videoId;
}

const LIVE_CACHE_SUFFIX = ":live";

export async function resolveYoutubeLiveStreamUrl(videoId: string): Promise<YoutubeStreamResult | null> {
  const key = `${videoId}${LIVE_CACHE_SUFFIX}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  await acquireResolveSlot();
  try {
    const cachedAfterWait = cache.get(key);
    if (cachedAfterWait && cachedAfterWait.expiresAt > Date.now()) return cachedAfterWait.data;

    const result = await Promise.race([
      resolveViaInnertubeLive(videoId),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), RESOLVE_TIMEOUT_MS)),
    ]);

    if (result) {
      cache.set(key, { data: result, expiresAt: result.expiresAt });
      return result;
    }
    return null;
  } finally {
    releaseResolveSlot();
  }
}

export async function resolveYoutubeStreamUrl(
  videoId: string,
  opts?: { preferAudio?: boolean },
): Promise<YoutubeStreamResult | null> {
  const preferAudio = Boolean(opts?.preferAudio);
  const key = cacheKey(videoId, preferAudio);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  await acquireResolveSlot();
  try {
    const cachedAfterWait = cache.get(key);
    if (cachedAfterWait && cachedAfterWait.expiresAt > Date.now()) return cachedAfterWait.data;

    const parallel = await Promise.race([
      firstResolved([
        () => resolveViaPiped(videoId),
        () => resolveViaInvidious(videoId),
        () => resolveViaInnertube(videoId, preferAudio),
        () => resolveViaYoutubeiJs(videoId, preferAudio),
        ...(preferAudio
          ? [() => resolveViaYtdl(videoId, true)]
          : [() => resolveViaYtdl(videoId, false)]),
      ]),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), RESOLVE_TIMEOUT_MS)),
    ]);

    let result = parallel;
    if (!result) {
      result = await resolveSequential(videoId, preferAudio);
    }

    if (result) {
      cache.set(key, { data: result, expiresAt: result.expiresAt });
      return result;
    }

    return null;
  } finally {
    releaseResolveSlot();
  }
}

/** googlevideo / proxy URL'lerine doğru Referer ile istek */
export async function fetchYoutubeStreamUpstream(
  streamUrl: string,
  rangeHeader?: string,
): Promise<Response> {
  const headers: Record<string, string> = {
    "User-Agent": UA,
    Referer: "https://www.youtube.com/",
    Origin: "https://www.youtube.com",
  };
  if (rangeHeader) headers.Range = rangeHeader;

  return youtubeStreamFetch(streamUrl, {
    headers,
    redirect: "follow",
    signal: AbortSignal.timeout(60000),
  });
}

export function invalidateStreamCache(videoId: string): void {
  cache.delete(videoId);
  cache.delete(`${videoId}:audio`);
  cache.delete(`${videoId}${LIVE_CACHE_SUFFIX}`);
}

/** URL slug veya düz parametreden 11 karakterlik YouTube video id */
export function normalizeYoutubeVideoId(raw: string): string | null {
  const id = raw.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(id)) return id;
  const dashed = id.match(/-([A-Za-z0-9_-]{11})$/);
  if (dashed?.[1] && /^[A-Za-z0-9_-]{11}$/.test(dashed[1])) return dashed[1];
  const tail = id.match(/([A-Za-z0-9_-]{11})$/);
  if (tail?.[1] && /^[A-Za-z0-9_-]{11}$/.test(tail[1])) return tail[1];
  const embedded = id.match(/(?:^|[^A-Za-z0-9_-])([A-Za-z0-9_-]{11})(?:[^A-Za-z0-9_-]|$)/);
  if (embedded?.[1] && /^[A-Za-z0-9_-]{11}$/.test(embedded[1])) return embedded[1];
  return null;
}
