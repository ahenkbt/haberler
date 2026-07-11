const { railwayApiOrigin } = require("./careerShared.js");

function headerValue(req, name) {
  const raw = req.headers[name] ?? req.headers[name.toLowerCase()];
  if (Array.isArray(raw)) return String(raw[0] ?? "").trim();
  return String(raw ?? "").trim();
}

async function verifyCareerAdmin(req) {
  const maintenanceSecret = String(process.env.ADMIN_MAINTENANCE_SECRET ?? "").trim();
  const maintenanceHeader = headerValue(req, "x-yekpare-admin-secret");
  if (maintenanceSecret && maintenanceHeader === maintenanceSecret) {
    return { ok: true };
  }

  const cookie = headerValue(req, "cookie");
  if (!cookie) {
    return {
      ok: false,
      status: 401,
      body: {
        success: false,
        error: "Bu işlem için yönetici paneline giriş yapmalısınız.",
        code: "ADMIN_REQUIRED",
      },
    };
  }

  try {
    const res = await fetch(`${railwayApiOrigin()}/api/members/admin-panel-status`, {
      headers: { accept: "application/json", cookie },
    });
    if (!res.ok) {
      return {
        ok: false,
        status: 401,
        body: {
          success: false,
          error: "Bu işlem için yönetici paneline giriş yapmalısınız.",
          code: "ADMIN_REQUIRED",
        },
      };
    }
    const data = await res.json();
    if (!data?.panelBootstrap) {
      return {
        ok: false,
        status: 401,
        body: {
          success: false,
          error: "Bu işlem için yönetici paneline giriş yapmalısınız.",
          code: "ADMIN_REQUIRED",
        },
      };
    }
    if (data.panelFullAdmin) return { ok: true };
    if (Array.isArray(data.permissions) && data.permissions.includes("kariyer")) {
      return { ok: true };
    }
    return {
      ok: false,
      status: 403,
      body: {
        success: false,
        error: "Bu işlem için yetkiniz yok.",
        code: "FORBIDDEN_PANEL_PERMISSION",
      },
    };
  } catch {
    return {
      ok: false,
      status: 503,
      body: { error: "Oturum doğrulanamadı." },
    };
  }
}

module.exports = { verifyCareerAdmin };
