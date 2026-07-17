import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { existsSync } from "node:fs";
import path from "node:path";
import { logger } from "./logger.js";

function resolveFrontendDist(): string {
  const configured = process.env["FRONTEND_DIST_DIR"]?.trim();
  if (configured) {
    return path.resolve(configured);
  }

  return path.resolve(process.cwd(), "..", "ahenkpress", "dist", "public");
}

function setStaticCacheHeaders(res: Response, filePath: string): void {
  if (path.basename(filePath) === "index.html") {
    res.setHeader("Cache-Control", "no-store, max-age=0");
    return;
  }

  if (filePath.includes(`${path.sep}assets${path.sep}`)) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return;
  }

  res.setHeader("Cache-Control", "public, max-age=3600");
}

/** WhatsApp/Facebook vb. — SPA index.html içindeki sabit Yekpare OG etiketlerini okur. */
function isSocialPreviewBot(userAgent: string): boolean {
  const ua = String(userAgent ?? "").toLowerCase();
  return /whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|linkedinbot|slackbot|discordbot|pinterest|meta-externalagent/.test(
    ua,
  );
}

/** Haber paylaşım yolları — /api/public/og-html'in desteklediği path'ler. */
function isNewsSharePath(pathname: string): boolean {
  const p = String(pathname || "").replace(/\/+$/, "") || "/";
  return (
    /^\/haber\/[^/]+$/.test(p) ||
    /^\/haberler\/rss\/[^/]+$/.test(p) ||
    /^\/tr\/[^/]+\/haber\/[^/]+$/.test(p) ||
    /^\/tr\/[^/]+\/haberler\/rss\/[^/]+$/.test(p)
  );
}

/**
 * Worker OG yakalaması yoksa (veya eski Worker deploy edildiyse) botlar hâlâ
 * SPA index.html'e düşer. Origin'de /api/public/og-html'e yönlendir.
 */
function redirectSocialPreviewToOgHtml(req: Request, res: Response): boolean {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  if (!isSocialPreviewBot(req.get("user-agent") ?? "")) return false;

  const pathOnly = String(req.path || "/").replace(/\/+$/, "") || "/";
  if (!isNewsSharePath(pathOnly)) return false;

  const host = String(req.get("x-forwarded-host") || req.get("host") || "")
    .split(",")[0]
    .trim();
  const proto = String(req.get("x-forwarded-proto") || req.protocol || "https")
    .split(",")[0]
    .trim()
    .replace(/:$/, "");
  if (!host) return false;

  const origin = `${proto}://${host}`;
  const target = new URL("/api/public/og-html", origin);
  target.searchParams.set("path", pathOnly);
  target.searchParams.set("origin", origin);
  res.setHeader("Cache-Control", "public, max-age=300");
  res.setHeader("x-yekpare-og", "social-preview-origin-redirect");
  res.redirect(302, target.pathname + target.search);
  return true;
}

/** /yp ve Yektube yüzeyleri — portal index yerine Yektube SPA. */
function isYektubeSpaPath(pathname: string): boolean {
  const raw = String(pathname || "/") || "/";
  const last = raw.split("/").pop() || "";
  if (last.includes(".") && !/\.html?$/i.test(last)) return false;
  const p = raw.replace(/\/+$/, "") || "/";
  return (
    p === "/yp" ||
    p.startsWith("/yp/") ||
    p === "/muzik" ||
    p.startsWith("/muzik/") ||
    p === "/cocuk" ||
    p.startsWith("/cocuk/") ||
    p === "/canli" ||
    p.startsWith("/canli/") ||
    p === "/yek-gonder" ||
    p.startsWith("/yek-gonder/") ||
    p === "/yeklive" ||
    p.startsWith("/yeklive/") ||
    p === "/hesabim" ||
    p.startsWith("/hesabim/") ||
    p === "/studio" ||
    p.startsWith("/studio/") ||
    p === "/yektube" ||
    p.startsWith("/yektube/") ||
    p === "/yektube-v2" ||
    p.startsWith("/yektube-v2/")
  );
}

export function setupFrontendStatic(app: Express): boolean {
  const frontendDist = resolveFrontendDist();
  const indexHtml = path.join(frontendDist, "index.html");
  const yektubeIndexHtml = path.join(frontendDist, "yektube-v2", "index.html");

  if (!existsSync(indexHtml)) {
    logger.warn(
      { frontendDist },
      "Frontend dist bulunamadı; API kök health yanıtı kullanılacak",
    );
    return false;
  }

  app.use(
    express.static(frontendDist, {
      index: false,
      etag: true,
      lastModified: true,
      setHeaders: setStaticCacheHeaders,
    }),
  );

  const sendFrontendIndex = (req: Request, res: Response, next: NextFunction): void => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }

    if (redirectSocialPreviewToOgHtml(req, res)) return;

    const pathOnly = String(req.path || "/");
    const useYektube =
      existsSync(yektubeIndexHtml) && isYektubeSpaPath(pathOnly);
    const file = useYektube ? yektubeIndexHtml : indexHtml;

    res.setHeader("Cache-Control", "no-store, max-age=0");
    if (useYektube) {
      res.setHeader("x-yekpare-yektube-rewrite", "/yektube-v2/index.html");
    }
    res.sendFile(file, (err) => {
      if (err) next(err);
    });
  };

  app.get(/^\/map(?:\/.*)?$/i, sendFrontendIndex);
  app.get(/^\/maps(?:\/.*)?$/i, sendFrontendIndex);
  app.get(/^\/maps\/place(?:\/.*)?$/i, sendFrontendIndex);
  app.get(/^\/(?!api(?:\/|$)).*/, sendFrontendIndex);

  logger.info({ frontendDist }, "Frontend static assets mounted");
  return true;
}
