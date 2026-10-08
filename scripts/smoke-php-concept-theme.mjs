/**
 * Post-deploy smoke: PHP brand /assets/theme.css must go through Worker bridge
 * with concept chrome (--ys-nav) and x-yekpare-php-concept-colors.
 *
 * Usage:
 *   node scripts/smoke-php-concept-theme.mjs
 *   HOSTS=yesilvatan.gen.tr node scripts/smoke-php-concept-theme.mjs
 */
const HOSTS = String(
  process.env.HOSTS ||
    "yesilvatan.gen.tr,yerel.net.tr,sehitgazi.org.tr,turksav.org,dunyasaglik.org,fix.tc",
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const EXPECT_NAV = Object.freeze({
  "yesilvatan.gen.tr": "#0b6e4f",
  "yerel.net.tr": "#0b6e4f",
  "sehitgazi.org.tr": "#a50e1e",
  "turksav.org": "#1f3b63",
  "dunyasaglik.org": "#0a7ea4",
  "fix.tc": "#002B5C",
});

async function check(host) {
  const url = `https://${host}/assets/theme.css?smoke=${Date.now()}`;
  const res = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
  });
  const ct = String(res.headers.get("content-type") || "");
  const frontend = String(res.headers.get("x-yekpare-frontend") || "");
  const concept = String(res.headers.get("x-yekpare-php-concept-colors") || "");
  const body = await res.text();
  const wantNav = EXPECT_NAV[host];
  const problems = [];
  if (res.status !== 200) problems.push(`status=${res.status}`);
  if (!/text\/css/i.test(ct)) problems.push(`content-type=${ct || "(missing)"}`);
  if (frontend !== "php-news-brand-theme-css") {
    problems.push(`x-yekpare-frontend=${frontend || "(missing)"}`);
  }
  if (concept !== "v1") {
    problems.push(`x-yekpare-php-concept-colors=${concept || "(missing)"}`);
  }
  if (!body.includes("hm-php-concept-colors:")) {
    problems.push("missing hm-php-concept-colors marker");
  }
  if (wantNav && !body.includes(`--ys-nav:${wantNav}`)) {
    problems.push(`missing --ys-nav:${wantNav}`);
  }
  // Origin-only CSS keeps navy defaults without Worker prefix.
  if (/--ys-nav:\s*#0b2a5b/i.test(body) && !body.includes("hm-php-concept-colors:")) {
    problems.push("origin navy --ys-nav without concept prefix");
  }
  return {
    ok: problems.length === 0,
    status: res.status,
    ct,
    frontend,
    concept,
    problems,
    snippet: body.slice(0, 160).replace(/\s+/g, " "),
  };
}

async function main() {
  let failed = 0;
  for (const host of HOSTS) {
    try {
      const r = await check(host);
      console.log(
        `${r.ok ? "OK" : "FAIL"} ${host} status=${r.status} tag=${r.frontend || "-"} concept=${r.concept || "-"}`,
      );
      if (!r.ok) {
        console.error(`  problems: ${r.problems.join("; ")}`);
        console.error(`  snippet: ${r.snippet}`);
        failed += 1;
      } else {
        console.log(`  snippet: ${r.snippet}`);
      }
    } catch (err) {
      console.error(`FAIL ${host} ${err?.message || err}`);
      failed += 1;
    }
  }
  if (failed) {
    console.error(`\n[smoke-php-concept-theme] ${failed} check(s) failed`);
    process.exitCode = 1;
    return;
  }
  console.log(`\n[smoke-php-concept-theme] all checks passed (${HOSTS.length} hosts)`);
}

main().catch((e) => {
  console.error("[smoke-php-concept-theme] fatal", e);
  process.exitCode = 1;
});
