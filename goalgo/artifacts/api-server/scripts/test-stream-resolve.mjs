import { resolveYoutubeStreamUrl } from "../dist/lib/youtubeStreamResolve.js";

const videoId = process.argv[2] ?? "XyQjDg65CkhQ";
const t0 = Date.now();
const result = await resolveYoutubeStreamUrl(videoId);
console.log(JSON.stringify({ ms: Date.now() - t0, ok: Boolean(result), source: result?.source, label: result?.qualityLabel }, null, 2));
