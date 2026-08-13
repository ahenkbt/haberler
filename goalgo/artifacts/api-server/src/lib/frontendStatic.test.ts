import { afterEach, describe, expect, it } from "vitest";
import express from "express";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { isYektubeSpaPath, setupFrontendStatic } from "./frontendStatic.js";

const originalDist = process.env["FRONTEND_DIST_DIR"];

afterEach(() => {
  if (originalDist === undefined) delete process.env["FRONTEND_DIST_DIR"];
  else process.env["FRONTEND_DIST_DIR"] = originalDist;
});

async function listen(app: express.Express): Promise<{ origin: string; close: () => Promise<void> }> {
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("no listen address");
  return {
    origin: `http://127.0.0.1:${addr.port}`,
    close: () => new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  };
}

describe("frontendStatic yektube fallback", () => {
  it("detects Yektube SPA paths including Worker rewrite target", () => {
    expect(isYektubeSpaPath("/yp")).toBe(true);
    expect(isYektubeSpaPath("/yektube-v2/index.html")).toBe(true);
    expect(isYektubeSpaPath("/yektube-v2/assets/index-x.js")).toBe(false);
    expect(isYektubeSpaPath("/tr/ahg")).toBe(false);
  });

  it("serves git-tracked public/yektube-v2 when portal dist is absent", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "yt-fe-"));
    const distPublic = path.join(root, "ahenkpress", "dist", "public");
    const yektube = path.join(root, "ahenkpress", "public", "yektube-v2");
    mkdirSync(path.join(yektube, "assets"), { recursive: true });
    mkdirSync(distPublic, { recursive: true });
    writeFileSync(
      path.join(yektube, "index.html"),
      `<!doctype html><title>Yektube</title><script src="/yektube-v2/assets/index-DY9zYfzz.js"></script>`,
    );
    writeFileSync(path.join(yektube, "assets", "index-DY9zYfzz.js"), "window.__YT=1");
    process.env["FRONTEND_DIST_DIR"] = distPublic;

    const app = express();
    const portalMounted = setupFrontendStatic(app);
    expect(portalMounted).toBe(false);

    const { origin, close } = await listen(app);
    try {
      const indexRes = await fetch(`${origin}/yektube-v2/index.html`);
      expect(indexRes.status).toBe(200);
      expect(await indexRes.text()).toContain("Yektube");

      const jsRes = await fetch(`${origin}/yektube-v2/assets/index-DY9zYfzz.js`);
      expect(jsRes.status).toBe(200);
      expect(await jsRes.text()).toContain("window.__YT=1");

      const ypRes = await fetch(`${origin}/yp/`);
      expect(ypRes.status).toBe(200);
      expect(ypRes.headers.get("x-yekpare-yektube-rewrite")).toBe("/yektube-v2/index.html");
      expect(await ypRes.text()).toContain("Yektube");
    } finally {
      await close();
    }
  });
});
