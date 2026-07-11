import type { NextFunction, Request, Response } from "express";
import { sanitizeDisplayFields } from "./sanitizeDisplayText.js";

/** Tüm `/api` JSON yanıtlarında kullanıcıya görünen metin alanlarını temizler. */
export function attachDisplayTextSanitizer() {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => originalJson(sanitizeDisplayFields(body))) as typeof res.json;
    next();
  };
}
