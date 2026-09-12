import type { Request, RequestHandler, Response } from "express";
import { imageFetchHeaders, isAllowedExternalImageUrl } from "./mediaUploadService.js";
import { logger } from "./logger.js";
import {
  NEWS_COVER_PROXY_MAX_BYTES,
  NEWS_COVER_PROXY_TIMEOUT_MS,
  parseNewsCoverProxyTarget,
} from "./news-cover-proxy.js";

const IMAGE_TYPE_RE = /^image\/(jpeg|jpg|png|gif|webp|avif|bmp|svg\+xml)$/i;

/**
 * GET `/api/media/news-cover?u=` — oturum/rate-limit dışı.
 * SHA/RSS hotlink kırık kapaklarını aynı kökenden gösterir.
 */
export const sendPublicNewsCoverProxy: RequestHandler = (req: Request, res: Response): void => {
  const raw = typeof req.query.u === "string" ? req.query.u : "";
  const target = parseNewsCoverProxyTarget(raw);
  if (!target) {
    res.status(400).end();
    return;
  }

  void (async () => {
    try {
      if (!(await isAllowedExternalImageUrl(target.toString()))) {
        res.status(400).end();
        return;
      }
      const upstream = await fetch(target.toString(), {
        redirect: "follow",
        signal: AbortSignal.timeout(NEWS_COVER_PROXY_TIMEOUT_MS),
        headers: imageFetchHeaders(target.toString()),
      });
      if (upstream.url && !(await isAllowedExternalImageUrl(upstream.url))) {
        res.status(400).end();
        return;
      }
      if (!upstream.ok) {
        res.status(upstream.status === 404 ? 404 : 502).end();
        return;
      }
      const contentLength = Number(upstream.headers.get("content-length") ?? "0");
      if (Number.isFinite(contentLength) && contentLength > NEWS_COVER_PROXY_MAX_BYTES) {
        res.status(413).end();
        return;
      }
      const declaredType = (upstream.headers.get("content-type") ?? "").split(";")[0]?.trim() ?? "";
      const buf = Buffer.from(await upstream.arrayBuffer());
      if (!buf.length || buf.length > NEWS_COVER_PROXY_MAX_BYTES) {
        res.status(502).end();
        return;
      }
      const mime = IMAGE_TYPE_RE.test(declaredType) ? declaredType : sniffImageMime(buf);
      if (!mime) {
        res.status(415).end();
        return;
      }
      res.setHeader("Content-Type", mime);
      res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.status(200).end(buf);
    } catch (err) {
      logger.warn(
        { err: err instanceof Error ? err.message.slice(0, 160) : err },
        "[news-cover-proxy] fetch failed",
      );
      if (!res.headersSent) res.status(502).end();
    }
  })();
};

function sniffImageMime(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (buf.length >= 6) {
    const sig = buf.subarray(0, 6).toString("ascii");
    if (sig === "GIF87a" || sig === "GIF89a") return "image/gif";
  }
  if (buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") {
    return "image/webp";
  }
  return null;
}
