import type { Request, RequestHandler, Response } from "express";
import { pipeline } from "node:stream/promises";
import { resolveMediaForGet } from "./mediaUploadService";
import { logger } from "./logger";

const SAFE_NAME = /^[a-zA-Z0-9._-]+$/;

/**
 * Oturum / JSON gövdesi / ağır `/api` zinciri olmadan yanıt verir.
 * Haber ve yazar `<img src="/api/media/uploads/…">` istekleri buradan karşılanır.
 */
export const sendPublicMediaUpload: RequestHandler = (req: Request, res: Response): void => {
  const name = String(req.params["name"] ?? "");
  if (!SAFE_NAME.test(name) || name.includes("..")) {
    res.status(400).end();
    return;
  }

  void (async () => {
    try {
      const resolved = await resolveMediaForGet(name);
      if (!resolved) {
        res.status(404).end();
        return;
      }
      if (resolved.kind === "redirect") {
        /* Legacy origin bu sunucunun kendisiyse (ör. Railway → Railway) sonsuz 302 döngüsü oluşur. */
        let redirectHost = "";
        try {
          redirectHost = new URL(resolved.url).hostname.toLowerCase();
        } catch {
          redirectHost = "";
        }
        const selfHost = String(req.hostname ?? "").toLowerCase();
        if (redirectHost && selfHost && redirectHost === selfHost) {
          res.status(404).end();
          return;
        }
        res.redirect(302, resolved.url);
        return;
      }
      if (resolved.kind === "stream") {
        if (resolved.contentType) res.type(resolved.contentType);
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        await pipeline(resolved.stream, res);
        return;
      }
      res.sendFile(
        resolved.path,
        {
          maxAge: 31536000000,
          immutable: true,
          headers: {
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        },
        (err) => {
          if (err) {
            logger.warn({ err, path: resolved.path }, "[media-get] sendFile");
            if (!res.headersSent) res.status(404).end();
          }
        },
      );
    } catch (e) {
      logger.error({ err: e, name }, "[media-get] resolve");
      if (!res.headersSent) res.status(500).end();
    }
  })();
};
