import { resolveYoutubeStreamUrl } from "../src/lib/youtubeStreamResolve.ts";

const videoId = process.argv[2] ?? "XyQjDg65CkhQ";

async function main() {
  const t0 = Date.now();
  const result = await resolveYoutubeStreamUrl(videoId);
  console.log(
    JSON.stringify(
      { ms: Date.now() - t0, ok: Boolean(result), source: result?.source, label: result?.qualityLabel },
      null,
      2,
    ),
  );
}

void main();
