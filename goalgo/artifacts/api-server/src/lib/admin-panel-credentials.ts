/**
 * Yönetim paneli giriş kimlikleri — Cloudflare Container env + bootstrap yedekleri.
 * Pages (goalgo-cloudflare mailBootstrap) ile aynı varsayılanlar.
 */

export const DEFAULT_ADMIN_USERNAME = "ahenkbt";
export const DEFAULT_ADMIN_PASSWORD = "Ahenk2006*";
/** Önceki kurulum şifresi — env/DB güncellenene kadar kabul. */
export const LEGACY_ADMIN_PASSWORDS = ["Ahen2006*"] as const;

/** Sık yazım hatası: ahenbt ↔ ahenkbt */
const USERNAME_ALIASES: Record<string, readonly string[]> = {
  ahenkbt: ["ahenbt"],
  ahenbt: ["ahenkbt"],
};

export function normalizeAdminUsername(username: string): string {
  return String(username ?? "")
    .trim()
    .replace(/^\uFEFF/, "")
    .toLowerCase();
}

export function adminUsernamesMatch(allowed: string, input: string): boolean {
  const a = String(allowed ?? "").trim();
  const u = String(input ?? "").trim();
  if (!a || !u) return false;
  if (a.includes("@") || u.includes("@")) {
    return a.toLowerCase() === u.toLowerCase();
  }
  const aLower = a.toLowerCase();
  const uLower = u.toLowerCase();
  if (aLower === uLower) return true;
  const aliases = USERNAME_ALIASES[aLower];
  return Boolean(aliases?.includes(uLower));
}

/** Env listesi yoksa bootstrap kullanıcıları (ahenkbt + yaygın yazım ahenbt). */
export function resolveAdminPanelUsernames(usersRaw?: string | null): string[] {
  const raw = String(usersRaw ?? "").trim();
  if (raw) {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [DEFAULT_ADMIN_USERNAME, "ahenbt"];
}

export function resolveAdminPanelPassword(passRaw?: string | null): string {
  const pass = String(passRaw ?? "").trim();
  return pass || DEFAULT_ADMIN_PASSWORD;
}

/** Env şifresi + bilinen bootstrap/legacy şifreler (Pages passwordMatchesBootstrap ile uyumlu). */
export function acceptedAdminPanelPasswords(passRaw?: string | null): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (p: string) => {
    const s = String(p ?? "").trim();
    if (s && !seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  };
  add(resolveAdminPanelPassword(passRaw));
  add(DEFAULT_ADMIN_PASSWORD);
  for (const p of LEGACY_ADMIN_PASSWORDS) add(p);
  return out;
}

export function verifyAdminPanelCredentialsEnv(
  username: string,
  password: string,
  opts?: { usersRaw?: string | null; passRaw?: string | null },
): boolean {
  const allowed = resolveAdminPanelUsernames(opts?.usersRaw ?? process.env["ADMIN_PANEL_USERNAMES"]);
  if (!allowed.length) return false;
  const userOk = allowed.some((a) => adminUsernamesMatch(a, username));
  if (!userOk) return false;
  const accepted = acceptedAdminPanelPasswords(opts?.passRaw ?? process.env["ADMIN_PANEL_PASSWORD"]);
  const pass = String(password ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/[\r\n]+$/g, "")
    .trimEnd();
  return accepted.includes(pass);
}

/** Operatör ipucu: secret hiç yoksa 401 metnini netleştir. */
export function adminPanelEnvConfigured(): boolean {
  const pass = String(process.env["ADMIN_PANEL_PASSWORD"] ?? "").trim();
  const users = String(process.env["ADMIN_PANEL_USERNAMES"] ?? "").trim();
  return Boolean(pass && users);
}
