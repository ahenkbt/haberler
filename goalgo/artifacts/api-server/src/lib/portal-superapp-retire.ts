import type { Request, Response, NextFunction } from "express";

/** Veritabanından düşürülen / arşivlenen süper app modülleri — API 410 döner. */
const RETIRED_API_MODULES = new Set(["pbx", "ai-call", "call-center"]);

export function portalSuperappModuleRetired(moduleId: string) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    if (!RETIRED_API_MODULES.has(moduleId)) {
      next();
      return;
    }
    res.status(410).json({
      error: "Bu modül kaldırıldı (haber platformu geçişi).",
      module: moduleId,
    });
  };
}
