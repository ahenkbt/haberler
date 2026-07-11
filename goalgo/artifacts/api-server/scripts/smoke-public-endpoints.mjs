/**
 * Hafif duman: GET /api/map/location-suggest (DB + Nominatim).
 * Kullanım: SMOKE_BASE_URL=https://api.example.com node scripts/smoke-public-endpoints.mjs
 */
const base = (process.env.SMOKE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

async function checkSuggest(q) {
  const url = `${base}/api/map/location-suggest?q=${encodeURIComponent(q)}`;
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await r.text();
  let j;
  try {
    j = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON (${r.status}): ${text.slice(0, 200)}`);
  }
  if (!j.success) throw new Error(`suggest failed: ${j.error || r.status}`);
  const n = Array.isArray(j.data) ? j.data.length : 0;
  console.log(`OK location-suggest q=${q} → ${n} rows`);
}

async function main() {
  await checkSuggest("çankaya");
  await checkSuggest("ankara");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
