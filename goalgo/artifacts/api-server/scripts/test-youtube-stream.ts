import { resolveYoutubeStreamUrl } from "../src/lib/youtubeStreamResolve.ts";

const ids = process.argv.slice(2).length ? process.argv.slice(2) : ["U8sFICDJeWQ", "Ng0GAaA4z-A"];

for (const id of ids) {
  const started = Date.now();
  process.stdout.write(`Testing ${id}... `);
  try {
    const result = await Promise.race([
      resolveYoutubeStreamUrl(id),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error("timeout")), 90000)),
    ]);
    if (result) {
      console.log(`OK ${result.source} ${result.qualityLabel ?? ""} (${Date.now() - started}ms)`);
    } else {
      console.log(`no stream (${Date.now() - started}ms)`);
    }
  } catch (err) {
    console.log(`FAIL ${err instanceof Error ? err.message : err} (${Date.now() - started}ms)`);
  }
}
