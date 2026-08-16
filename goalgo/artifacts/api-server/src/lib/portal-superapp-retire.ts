import type { Request, Response, NextFunction } from "express";

/**
 * Haber platformu geçişinde kapatılan süper app API'leri.
 * PBX / webphone SIP (FreePBX + tarayıcı softphone) canlı kalır — 410 dönmesin.
 *
 * `call-center` ve `ai-call` router'ları `/api` altına önek olmadan bağlanır.
 * `router.use(portalSuperappModuleRetired(...))` bu yüzden yalnızca kendi
 * yol önekini 410'lamalı; aksi halde `/api/pbx/*` ve eşleşmeyen diğer
 * uçlar da "module: call-center" 410 alır (webphone açılmaz).
 */
const RETIRED_API_MODULES = new Set(["ai-call", "call-center"]);

export function isPortalSuperappModuleRetired(moduleId: string): boolean {
  return RETIRED_API_MODULES.has(moduleId);
}

export function requestPathMatchesRetiredModule(path: string, moduleId: string): boolean {
  const raw = String(path || "").split("?")[0] ?? "";
  const p = `/${raw.replace(/^\/+/, "")}`.replace(/\/+$/, "") || "/";
  const prefix = `/${moduleId}`;
  return p === prefix || p.startsWith(`${prefix}/`) || p === `/api${prefix}` || p.startsWith(`/api${prefix}/`);
}

export function portalSuperappModuleRetired(moduleId: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!isPortalSuperappModuleRetired(moduleId)) {
      next();
      return;
    }
    if (!requestPathMatchesRetiredModule(req.path || req.url || "", moduleId)) {
      next();
      return;
    }
    res.status(410).json({
      error: "Bu modül kaldırıldı (haber platformu geçişi).",
      module: moduleId,
    });
  };
}
