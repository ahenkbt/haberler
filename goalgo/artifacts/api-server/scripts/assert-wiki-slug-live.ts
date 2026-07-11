import assert from "node:assert/strict";

const HEADERS = { "User-Agent": "YekpareBilgiAgaci/1.0 (https://yekpare.net; ahenkbt1@gmail.com)" };

const CASES: { slug: string; expectedTitle: string }[] = [
  { slug: "ulusal-egemenlik-ve-cocuk-bayrami", expectedTitle: "23 Nisan Ulusal Egemenlik ve Çocuk Bayramı" },
  { slug: "emniyet-genel-mudurlugu", expectedTitle: "Emniyet Genel Müdürlüğü" },
  { slug: "calisan-gazeteciler-gunu", expectedTitle: "Çalışan Gazeteciler Günü" },
  { slug: "seri-penalti-vuruslari", expectedTitle: "Seri penaltı vuruşları" },
];

async function wikiSummaryTitle(title: string): Promise<string | null> {
  const r = await fetch(`https://tr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, {
    headers: HEADERS,
  });
  if (!r.ok) return null;
  const d = (await r.json()) as { title?: string; type?: string };
  if (d.type === "disambiguation") return null;
  return d.title?.trim() || title;
}

for (const { slug, expectedTitle } of CASES) {
  const resolved = await wikiSummaryTitle(expectedTitle);
  assert.ok(resolved, `${slug}: Wikipedia summary missing for "${expectedTitle}"`);
  assert.notEqual(resolved, "Ulusal", `${slug}: must not resolve to disambiguation "Ulusal"`);
  assert.notEqual(resolved, "Emniyet", `${slug}: must not resolve to partial "Emniyet"`);
  console.log(`ok ${slug} → ${resolved}`);
}

console.log("assert-wiki-slug-live: ok");
