/**
 * Opsiyonel VPS Traefik dynamic config — HM custom apex (PHP origin).
 * Soft-fail: HM_VPS_SSH_* yoksa skipped.
 */

import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type TraefikSyncAction = "skipped" | "ok" | "error" | "no_template";

export type TraefikSyncResult = {
  action: TraefikSyncAction;
  zone: string;
  remotePath?: string;
  message?: string;
};

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../../..");

const KNOWN_TRAEFIK_TEMPLATES: Record<string, { rel: string; remoteName: string }> = {
  "fix.tc": { rel: "hostinger/fixhaber/traefik-fixhaber.yml", remoteName: "fixhaber.yml" },
  "gundemi.org": { rel: "hostinger/gundemi-bolge/traefik-gundemi.yml", remoteName: "gundemi.yml" },
  "sosyalhizmetler.tr": {
    rel: "hostinger/gundemi-bolge/traefik-sosyalhizmetler.yml",
    remoteName: "sosyalhizmetler.yml",
  },
};

function renderGenericTraefikYaml(zone: string): string {
  const z = zone.trim().toLowerCase();
  const id = z.replace(/[^a-z0-9.-]/g, "-");
  return `# Auto-generated Traefik dynamic — ${z}
http:
  routers:
    hm-${id}:
      rule: "Host(\`${z}\`) || Host(\`www.${z}\`)"
      entryPoints: ["websecure"]
      service: hm-${id}-php
      tls:
        certResolver: letsencrypt
      priority: 20
    hm-${id}-http:
      rule: "Host(\`${z}\`) || Host(\`www.${z}\`)"
      entryPoints: ["web"]
      service: hm-${id}-php
      middlewares: ["hm-${id}-https-redirect"]
      priority: 20
  middlewares:
    hm-${id}-https-redirect:
      redirectScheme:
        scheme: https
        permanent: true
  services:
    hm-${id}-php:
      loadBalancer:
        passHostHeader: true
        servers:
          - url: "http://127.0.0.1:8095"
`;
}

async function loadTraefikYamlForZone(zone: string): Promise<string | null> {
  const known = KNOWN_TRAEFIK_TEMPLATES[zone];
  if (known) {
    const abs = path.join(REPO_ROOT, known.rel);
    try {
      return await readFile(abs, "utf8");
    } catch {
      return null;
    }
  }
  return renderGenericTraefikYaml(zone);
}

function sshEnv(): { host: string; user: string; password?: string } | null {
  const host = String(process.env.HM_VPS_SSH_HOST || process.env.GUNDEMI_PHP_SSH_HOST || "").trim();
  const user = String(process.env.HM_VPS_SSH_USER || "root").trim();
  const password = String(process.env.HM_VPS_SSH_PASSWORD || "").trim();
  if (!host) return null;
  return { host, user, password: password || undefined };
}

function spawnAsync(cmd: string, args: string[]): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (d) => {
      stderr += String(d);
    });
    child.on("close", (code) => resolve({ code: code ?? 1, stderr }));
  });
}

export async function syncTraefikDynamicForCustomApexZone(zone: string): Promise<TraefikSyncResult> {
  const z = zone.trim().toLowerCase();
  if (!z) return { action: "skipped", zone: z, message: "empty_zone" };
  const yaml = await loadTraefikYamlForZone(z);
  if (!yaml) {
    return { action: "no_template", zone: z, message: "template_read_failed" };
  }
  const ssh = sshEnv();
  if (!ssh) {
    return {
      action: "skipped",
      zone: z,
      message: "HM_VPS_SSH_HOST missing (Traefik sync manual)",
    };
  }
  const remoteName = KNOWN_TRAEFIK_TEMPLATES[z]?.remoteName ?? `${z.replace(/\./g, "-")}.yml`;
  const remote = `${ssh.user}@${ssh.host}:/docker/traefik/dynamic/${remoteName}`;
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "hm-traefik-"));
  const localFile = path.join(tmpDir, remoteName);
  try {
    await writeFile(localFile, yaml, "utf8");
    const scpArgs = ["-o", "StrictHostKeyChecking=no", localFile, remote];
    const scpCmd = ssh.password ? "sshpass" : "scp";
    const scpFullArgs = ssh.password ? ["-p", ssh.password, "scp", ...scpArgs] : scpArgs;
    const r = await spawnAsync(scpCmd, scpFullArgs);
    if (r.code !== 0) {
      return { action: "error", zone: z, remotePath: remoteName, message: r.stderr.slice(0, 400) };
    }
    console.warn(`[custom-apex-provision] Traefik dynamic installed — ${remoteName} on ${ssh.host}`);
    return { action: "ok", zone: z, remotePath: remoteName };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { action: "error", zone: z, remotePath: remoteName, message };
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
