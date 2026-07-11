const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const ids = process.argv.slice(2);
if (ids.length === 0) ids.push("btvDGm0llCA");

for (const id of ids) {
  const w = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`, {
    headers: { "User-Agent": UA, "Accept-Language": "tr-TR,tr;q=0.9" },
  });
  const h = await w.text();
  const status = h.match(/"status"\s*:\s*"([^"]+)"/)?.[1];
  const embed = h.match(/"playableInEmbed"\s*:\s*(true|false)/)?.[1];
  const comments = (h.match(/commentRenderer/g) ?? []).length;
  const cvm = (h.match(/commentViewModel/g) ?? []).length;
  console.log({ id, status, embed, commentRenderer: comments, commentViewModel: cvm });
}
