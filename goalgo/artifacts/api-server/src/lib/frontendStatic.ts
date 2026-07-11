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

export function setupFrontendStatic(app: Express): boolean {
  const frontendDist = resolveFrontendDist();
  const indexHtml = path.join(frontendDist, "index.html");

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

    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.sendFile(indexHtml, (err) => {
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
