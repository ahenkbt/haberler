import type { NextFunction, Request, RequestHandler, Response } from "express";
import { hmEditorJwtGrantsHaberlerPanel } from "./hmEditorJwt.js";
import type { PanelPermissionKey } from "./panel-permissions.js";

function maintenanceSecretOk(req: Request): boolean {
  const secret = String(process.env["ADMIN_MAINTENANCE_SECRET"] ?? "").trim();
  const header = String(req.headers["x-yekpare-admin-secret"] ?? "").trim();
  return Boolean(secret && header === secret);
}

/** Oturumda `panelPermissions` yoksa veya null ise tam yetkili (eski davranış + ana yönetici). */
export function isPanelFullAdminSession(req: Request): boolean {
  if (!req.session?.panelBootstrap) return false;
  const p = req.session.panelPermissions;
  if (p === undefined || p === null) return true;
  return false;
}

export function panelHasPermission(req: Request, permission: PanelPermissionKey): boolean {
  if (maintenanceSecretOk(req)) return true;
  if (!req.session?.panelBootstrap) return false;
  if (isPanelFullAdminSession(req)) return true;
  const list = req.session.panelPermissions;
  return Array.isArray(list) && list.includes(permission);
}

/**
 * Bakım / tohum / migrate gibi riskli uçlar:
 * - Yönetici paneli oturumu + isteğe bağlı izin anahtarı
 * - veya `ADMIN_MAINTENANCE_SECRET` + `X-Yekpare-Admin-Secret`
 */
function hmEditorJwtHasPanelPermission(req: Request, permission: PanelPermissionKey): boolean {
  if (!hmEditorJwtGrantsHaberlerPanel(req)) return false;
  return permission === "haberler";
}

export function denyUnlessAdminMaintenance(
  req: Request,
  res: Response,
  permission: PanelPermissionKey,
): boolean {
  if (maintenanceSecretOk(req)) return true;
  if (!req.session?.panelBootstrap) {
    if (hmEditorJwtHasPanelPermission(req, permission)) return true;
    res.status(401).json({
      success: false,
      error: "Bu işlem için yönetici paneline giriş yapmalısınız.",
      code: "ADMIN_REQUIRED",
    });
    return false;
  }
  if (panelHasPermission(req, permission)) return true;
  res.status(403).json({
    success: false,
    error: "Bu işlem için yetkiniz yok.",
    code: "FORBIDDEN_PANEL_PERMISSION",
  });
  return false;
}

/** `permissions` içinden en az birine sahip oturumlar geçer (AI test gibi çift kapı). */
export function denyUnlessAdminMaintenanceAny(
  req: Request,
  res: Response,
  permissions: readonly PanelPermissionKey[],
): boolean {
  if (maintenanceSecretOk(req)) return true;
  if (!req.session?.panelBootstrap) {
    if (permissions.some((p) => hmEditorJwtHasPanelPermission(req, p))) return true;
    res.status(401).json({
      success: false,
      error: "Bu işlem için yönetici paneline giriş yapmalısınız.",
      code: "ADMIN_REQUIRED",
    });
    return false;
  }
  if (isPanelFullAdminSession(req)) return true;
  for (const p of permissions) {
    if (panelHasPermission(req, p)) return true;
  }
  res.status(403).json({
    success: false,
    error: "Bu işlem için yetkiniz yok.",
    code: "FORBIDDEN_PANEL_PERMISSION",
  });
  return false;
}

/** Yalnızca tam yetkili (panel hesapları, başka kullanıcıya yetki atama). */
export function denyUnlessFullPanelAdmin(req: Request, res: Response): boolean {
  if (maintenanceSecretOk(req)) return true;
  if (!req.session?.panelBootstrap) {
    res.status(401).json({ success: false, error: "Yönetici oturumu gerekli." });
    return false;
  }
  if (!isPanelFullAdminSession(req)) {
    res.status(403).json({ success: false, error: "Bu işlem yalnızca ana yönetici içindir." });
    return false;
  }
  return true;
}

export function denyUnlessPanelPerm(permission: PanelPermissionKey): RequestHandler {
  return (req, res, next): void => {
    if (denyUnlessAdminMaintenance(req, res, permission)) next();
  };
}

/** `GET /categories?scope=admin` — siteye özel kategori satırları dahil tam liste (panel + bakım sırrı). */
export function canListAllNewsCategories(req: Request): boolean {
  if (maintenanceSecretOk(req)) return true;
  if (!req.session?.panelBootstrap) return false;
  if (isPanelFullAdminSession(req)) return true;
  return panelHasPermission(req, "haberler");
}
