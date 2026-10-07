/**
 * Post-deploy smoke: regional gundemi.org theme.css/js must be real CSS/JS, not
 * Worker Traefik-gap 503 HTML (unstyled sites).
 *
 * Usage:
 *   node scripts/smoke-gundemi-assets.mjs
 *   HOSTS=akdeniz,marmara node scripts/smoke-gundemi-assets.mjs
 */
const HOSTS = String(process.env.HOSTS || "akdeniz,marmara,ege")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const PATHS = [
  { path: "/assets/theme.css", wantType: /text\/css/i, tag: "gundemi-php-theme-asset" },
  { path: "/assets/theme.js", wantType: /javascript|ecmascript/i, tag: "gundemi-php-theme-asset" },
  { path: "/gundemi/logos/akdeniz-gundemi.png", wantType: /image\//i, host: "akdeniz", optionalTag: true },
];

async function check(url, { wantType, tag, optionalTag }) {
  const res = await fetch(url, { method: "GET", redirect: "follow" });
  const ct = String(res.headers.get("content-type") || "");
  const frontend = String(res.headers.get("x-yekpare-frontend") || "");
  const body = await res.text();
  const problems = [];
  if (res.status !== 200) problems.push(`status=${res.status}`);
  if (!wantType.test(ct)) problems.push(`content-type=${ct || "(missing)"}`);
  if (frontend === "gundemi-php-traefik-gap") problems.push("x-yekpare-frontend=gundemi-php-traefik-gap");
  if (tag && !optionalTag && frontend && frontend !== tag && !frontend.startsWith("gundemi-php-theme-asset")) {
    problems.push(`x-yekpare-frontend=${frontend}`);
  }
  if (body.includes("PHP tema bekleniyor")) problems.push("gap-html-body");
  if (/theme\.css/i.test(url) && body.length < 500) problems.push(`css-too-short len=${body.length}`);
  return { ok: problems.length === 0, status: res.status, ct, frontend, problems, len: body.length };
}

async function main() {
  let failed = 0;
  for (const host of HOSTS) {
    for (const spec of PATHS) {
      if (spec.host && spec.host !== host) continue;
      const url = `https://${host}.gundemi.org${spec.path}`;
      try {
        const r = await check(url, spec);
        const line = `${r.ok ? "OK" : "FAIL"} ${url} status=${r.status} ct=${r.ct} tag=${r.frontend || "-"} len=${r.len}`;
        console.log(line);
        if (!r.ok) {
          console.error(`  problems: ${r.problems.join("; ")}`);
          failed += 1;
        }
      } catch (err) {
        console.error(`FAIL ${url} ${err?.message || err}`);
        failed += 1;
      }
    }
  }
  if (failed) {
    console.error(`\n[smoke-gundemi-assets] ${failed} check(s) failed`);
    process.exitCode = 1;
    return;
  }
  console.log(`\n[smoke-gundemi-assets] all checks passed (${HOSTS.length} hosts)`);
}

main().catch((e) => {
  console.error("[smoke-gundemi-assets] fatal", e);
  process.exitCode = 1;
});
