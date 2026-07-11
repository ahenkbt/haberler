const { json, readJsonBody } = require("../../../../_lib/careerShared.js");
const { markCareerApplicationRead } = require("../../../../_lib/careerDb.js");
const { verifyCareerAdmin } = require("../../../../_lib/careerAuth.js");

module.exports = async function handler(req, res) {
  res.setHeader("x-yekpare-career-api", "vercel");
  if (req.method !== "PATCH") {
    json(res, 405, { error: "Yalnızca PATCH desteklenir." });
    return;
  }

  const auth = await verifyCareerAdmin(req);
  if (!auth.ok) {
    json(res, auth.status, auth.body);
    return;
  }

  const id = Number(req.query?.id);
  if (!Number.isFinite(id) || id < 1) {
    json(res, 400, { error: "Geçersiz kayıt." });
    return;
  }

  let body = {};
  try {
    body = await readJsonBody(req);
  } catch {
    body = {};
  }
  const reviewNote =
    body && body.reviewNote != null ? String(body.reviewNote).trim().slice(0, 2000) : null;

  try {
    const result = await markCareerApplicationRead(id, reviewNote);
    if (!result.ok) {
      json(res, 503, { error: "Veritabanı bağlantısı yapılandırılmamış." });
      return;
    }
    json(res, 200, { ok: true });
  } catch {
    json(res, 500, { error: "Güncellenemedi." });
  }
};
