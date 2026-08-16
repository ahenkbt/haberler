import type { Request, Response, NextFunction } from "express";

/**
 * Haber platformu geçişinde kapatılan süper app API'leri.
 * PBX / webphone SIP (FreePBX + tarayıcı softphone) canlı kalır — 410 dönmesin.
 */
const RETIRED_API_MODULES = new Set(["ai-call", "call-center"]);

export function isPortalSuperappModuleRetired(moduleId: string): boolean {
  return RETIRED_API_MODULES.has(moduleId);
}

export function portalSuperappModuleRetired(moduleId: string) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    if (!isPortalSuperappModuleRetired(moduleId)) {
      next();
      return;
    }
    res.status(410).json({
      error: "Bu modül kaldırıldı (haber platformu geçişi).",
      module: moduleId,
    });
  };
}
