const { json } = require("../../_lib/careerShared.js");
const { listCareerApplications } = require("../../_lib/careerDb.js");
const { verifyCareerAdmin } = require("../../_lib/careerAuth.js");

module.exports = async function handler(req, res) {
  res.setHeader("x-yekpare-career-api", "vercel");
  if (req.method !== "GET") {
    json(res, 405, { error: "Yalnızca GET desteklenir." });
    return;
  }

  const auth = await verifyCareerAdmin(req);
  if (!auth.ok) {
    json(res, auth.status, auth.body);
    return;
  }

  const url = new URL(req.url || "", "http://localhost");
  const page = Math.max(1, parseInt(String(url.searchParams.get("page") ?? "1"), 10) || 1);
  const unreadOnly = String(url.searchParams.get("unread") ?? "") === "1";

  try {
    const result = await listCareerApplications({ page, unreadOnly });
    if (!result.ok) {
      json(res, 503, { error: "Veritabanı bağlantısı yapılandırılmamış." });
      return;
    }
    json(res, 200, {
      applications: result.applications,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (e) {
    json(res, 500, { error: String(e instanceof Error ? e.message : e) });
  }
};
