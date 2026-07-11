import { scrapeYoutubeLiveSearch } from "../src/lib/youtubeLiveHtmlSearch.js";

const query = process.argv[2] || "kurtlar vadisi";
const limit = Number(process.argv[3] ?? 10) || 10;

async function main() {
  console.log("query:", query, "limit:", limit);

  const hits = await scrapeYoutubeLiveSearch(query, limit);
  console.log("HTML live search:", hits.length, "hits");
  for (const h of hits.slice(0, 8)) {
    console.log(" -", h.videoId, "|", h.channelTitle, "|", h.title.slice(0, 70));
  }

  if (hits.length === 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
