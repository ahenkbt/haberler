import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    console.error(`[security-check] ${message}`);
    process.exitCode = 1;
  }
}

function assertIncludes(rel, needle, message) {
  assert(read(rel).includes(needle), `${message} (${rel})`);
}

function assertNotIncludes(rel, needle, message) {
  assert(!read(rel).includes(needle), `${message} (${rel})`);
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "ai-call-center") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

for (const full of walk(root)) {
  const rel = path.relative(root, full).split(path.sep).join("/");
  if (rel === "scripts/security-regression-check.mjs") continue;
  if (!/\.(ts|tsx|js|mjs|md|env|example|json)$/.test(rel)) continue;
  const text = fs.readFileSync(full, "utf8");
  for (const forbidden of ["VITE_ADMIN_PASSWORD", "VITE_ADMIN_USERNAMES", "VITE_YEKPARE_ADMIN_SECRET"]) {
    assert(!text.includes(forbidden), `frontend admin secret reference must not return: ${forbidden} (${rel})`);
  }
}

assert(!fs.existsSync(path.join(root, "artifacts/ahenkpress/src/lib/adminBootstrapStorage.ts")), "admin password replay storage file must not exist");

assertIncludes("artifacts/api-server/src/routes/settings.ts", 'denyUnlessAdminMaintenance(req, res, "site_ayarlari")', "settings writes must require admin");
assertIncludes("artifacts/api-server/src/routes/ecommerce.ts", 'denyUnlessAdminMaintenance(req, res, "teslimat")', "payment/shop writes must require admin");
assertIncludes("artifacts/api-server/src/routes/map.ts", 'denyUnlessAdminMaintenance(req, res, "haritalar")', "map settings must require admin");
assertIncludes("artifacts/api-server/src/routes/map.ts", 'router.get("/admin/business-applications", async (req, res)', "business application admin list must inspect request auth");
assertIncludes("artifacts/api-server/src/routes/map.ts", 'router.post("/admin/map/businesses/:id/generate-credentials", async (req, res)', "owner credential reset must inspect request auth");
assertIncludes("artifacts/api-server/src/routes/map.ts", 'router.get("/map/admin/user-reviews", async (req, res)', "map review moderation must inspect request auth");
assertIncludes("artifacts/api-server/src/routes/tourism.ts", 'router.use("/tourism/admin"', "tourism admin routes must have a guard middleware");
assertIncludes("artifacts/api-server/src/routes/delivery.ts", 'router.get("/delivery/orders", async (req, res)', "delivery order admin list must inspect request auth");
assertIncludes("artifacts/api-server/src/routes/delivery.ts", 'router.put("/delivery/orders/:id/status", async (req, res)', "delivery order admin status update must inspect request auth");
assertIncludes("artifacts/api-server/src/routes/delivery.ts", 'router.get("/delivery/coupons", async (req, res)', "delivery coupon admin list must inspect request auth");
assertIncludes("artifacts/api-server/src/routes/media.ts", "hasUploadBearer", "media upload must require an authenticated bearer or admin session");
assertIncludes("artifacts/api-server/src/routes/rss.ts", 'denyUnlessAdminMaintenance(req, res, "haberler")', "RSS admin data must require admin");
assertIncludes("artifacts/api-server/src/routes/ai.ts", 'router.get("/ai/settings", async (req, res)', "AI settings GET must inspect request auth");

assertIncludes("artifacts/api-server/src/lib/serializers.ts", "maskedIfConfigured", "site settings serializer must mask configured secrets");
assertIncludes("artifacts/api-server/src/routes/providers.ts", "signVendorSessionToken", "vendor login must issue signed tokens");
assertIncludes("artifacts/api-server/src/routes/providers.ts", 'router.use("/providers", requireVendorSession)', "provider routes must require signed token middleware");
assertIncludes("artifacts/api-server/src/routes/providers.ts", "signCourierSessionToken", "courier login must issue signed tokens");
assertIncludes("artifacts/api-server/src/routes/providers.ts", 'router.use("/courier", requireCourierSession)', "courier routes must require signed token middleware");

assert(
  read("artifacts/ahenkpress/src/App.tsx").includes("/api/members/admin-panel-status") ||
    read("artifacts/ahenkpress/src/App.tsx").includes("verifyAdminPanelSession") ||
    read("artifacts/ahenkpress/src/components/ProtectedAdminRoute.tsx").includes("verifyAdminPanelSession"),
  "admin routes must verify server session status (ProtectedAdminRoute or App.tsx)",
);
assertIncludes("artifacts/ahenkpress/src/components/NewsArticleBody.tsx", "sanitizeHtml(part.html)", "news body HTML must be sanitized");
assertIncludes("artifacts/ahenkpress/src/components/HmAdSlotStrip.tsx", "sanitizeHtml(rewriteInlineHtmlImgSrc(h))", "ad slot HTML must be sanitized");
assertIncludes("artifacts/ahenkpress/src/pages/public/AnsiklopediDetay.tsx", "sanitizeHtml(html)", "wiki article HTML must be sanitized");
assertIncludes("artifacts/ahenkpress/src/pages/public/HaberAnasayfasi.tsx", "sanitizeHtml(rewriteInlineHtmlImgSrc(h))", "homepage ad HTML must be sanitized");
assertIncludes("artifacts/ahenkpress/src/components/HmNewsDetailSidebar.tsx", "sanitizeHtml(rewriteInlineHtmlImgSrc(h))", "news detail sidebar ad HTML must be sanitized");
assertIncludes("artifacts/ahenkpress/src/components/HmRssBreakingBand.tsx", "sanitizeHtml(String(item.contentHtml", "RSS preview HTML must be sanitized");
// Siparis.tsx artık ham HTML render etmiyor; geri eklenirse sanitize edilmeden girmesin.
assertNotIncludes("artifacts/ahenkpress/src/pages/public/Siparis.tsx", "dangerouslySetInnerHTML", "order landing must not inject raw HTML without sanitization");
assertIncludes("artifacts/ahenkpress/src/pages/public/Kesfet.tsx", "sanitizeHtml(html)", "discovery wiki HTML must be sanitized");
assertIncludes("artifacts/ahenkpress/src/components/HmPublicSiteFooter.tsx", "sanitizeHtml(rewritten)", "HM footer HTML must be sanitized");
assertIncludes("artifacts/ahenkpress/src/components/HmCorporateStaticHtmlPage.tsx", "sanitizeHtml(html)", "corporate static HTML must be sanitized");
assertIncludes("artifacts/ahenkpress/src/pages/admin/AnsiklopediYonetimi.tsx", "sanitizeHtml(r.snippet", "admin encyclopedia snippets must be sanitized");

assertNotIncludes("artifacts/api-server/src/lib/httpSecurity.ts", "CORS_STRICT_ORIGINS", "production CORS must be strict by default, not opt-in");
assertIncludes("artifacts/api-server/src/lib/httpSecurity.ts", "RELAX_CORS_IN_PRODUCTION", "temporary CORS relaxation must remain explicit");

if (!process.exitCode) {
  console.log("[security-check] OK");
}
