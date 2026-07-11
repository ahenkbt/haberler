#!/usr/bin/env node
const DEFAULT_API_ORIGIN = "http://localhost:3000";
const DEFAULT_TIMEOUT_MS = 20_000;

function usage() {
  console.log(`Usage:
  API_ORIGIN=http://localhost:3000 pnpm run smoke:wiki
  pnpm run smoke:wiki -- --api https://api.example.com

Checks Bilgi Ağacı exact title resolution and rewritten article body links.`);
}

function argValue(name) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  usage();
  process.exit(0);
}

const apiOrigin = (argValue("--api") || process.env.API_ORIGIN || DEFAULT_API_ORIGIN).replace(/\/+$/, "");

function apiUrl(path) {
  const apiPath = path.startsWith("/api/") ? path : `/api${path.startsWith("/") ? path : `/${path}`}`;
  return `${apiOrigin}${apiPath}`;
}

async function fetchJson(url) {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    const body = await res.text();
    let json = null;
    try {
      json = body ? JSON.parse(body) : null;
    } catch {
      // Keep a short body in the failure message below.
    }
    return { res, body, json };
  } finally {
    clearTimeout(tid);
  }
}

async function checkArticle(inputTitle, expectedTitle) {
  const url = apiUrl(`/wiki/article/${encodeURIComponent(inputTitle)}?lang=tr&exact=1`);
  const { res, body, json } = await fetchJson(url);
  const title = json?.data?.title;
  const ok = res.ok && json?.success === true && title === expectedTitle;
  console.log(`${ok ? "PASS" : "FAIL"} article ${inputTitle} -> ${title || "none"}: HTTP ${res.status}`);
  if (!ok) console.log((body || "").slice(0, 500));
  return Boolean(ok);
}

async function checkBodyLinks() {
  const url = apiUrl(`/wiki/article/${encodeURIComponent("İstanbul")}?lang=tr&exact=1`);
  const { res, body, json } = await fetchJson(url);
  const html = String(json?.data?.html ?? "");
  const ok =
    res.ok &&
    json?.success === true &&
    /href="\/bilgiagaci\/[^"]+"/.test(html) &&
    !/href="https?:\/\/tr\.wikipedia\.org\/wiki\//i.test(html);
  console.log(`${ok ? "PASS" : "FAIL"} article body wiki links rewritten: HTTP ${res.status}`);
  if (!ok) console.log((body || "").slice(0, 500));
  return Boolean(ok);
}

const checks = [
  checkArticle("Ankara", "Ankara"),
  checkArticle("ankara", "Ankara"),
  checkArticle("istanbul", "İstanbul"),
  checkArticle("İstanbul", "İstanbul"),
  checkArticle("Istanbul", "İstanbul"),
  checkArticle("izmir", "İzmir"),
  checkArticle("Izmir", "İzmir"),
  checkArticle("Bursa", "Bursa"),
  checkArticle("Antalya", "Antalya"),
  checkArticle("Mustafa_Necati", "Mustafa Necati"),
  checkArticle("Mustafa Necati", "Mustafa Necati"),
  checkArticle("Cahit_Arf", "Cahit Arf"),
  checkArticle("Cahit Arf", "Cahit Arf"),
  checkArticle("Seri_penalti_vuruslari", "Seri penaltı vuruşları"),
  checkArticle("Seri penaltı vuruşları", "Seri penaltı vuruşları"),
  checkArticle("findik", "Fındık"),
  checkArticle("fındık", "Fındık"),
  checkArticle("Türkiye", "Türkiye"),
  checkArticle("turkiye", "Türkiye"),
  checkArticle("Yapay zekâ", "Yapay zekâ"),
  checkArticle("Futbol tarihi", "Futbol tarihi"),
  checkBodyLinks(),
];

const results = await Promise.all(checks);
if (results.every(Boolean)) {
  console.log(`PASS Bilgi Ağacı wiki smoke checks against ${apiOrigin}`);
} else {
  process.exitCode = 1;
}
