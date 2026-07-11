/**
 * Central place for secrets. Production must never use fallbacks.
 */
export function getSessionSecret(): string {
  const s = process.env["SESSION_SECRET"];
  if (s && s.trim().length >= 16) return s.trim();
  if (process.env["NODE_ENV"] === "production") {
    throw new Error(
      "Üretimde SESSION_SECRET zorunludur (Railway → goalgo servisi → Variables). " +
        "En az 16 karakterlik rastgele bir metin ekleyin; yoksa API açılmadan çöker (502). " +
        "Haber merkezi (HM) JWT için ayrıca HM_EDITOR_JWT_SECRET isteğe bağlıdır; yoksa oturum anahtarıyla imzalanır.",
    );
  }
  return "dev-only-session-secret-change-me";
}

/** PBX temsilci JWT imzalama — üretimde PBX_JWT_SECRET tercih edilir; yoksa SESSION_SECRET kullanılır. */
export function getPbxJwtSecret(): string {
  const s = String(process.env["PBX_JWT_SECRET"] ?? process.env["PBX_AGENT_JWT_SECRET"] ?? "").trim();
  if (s.length >= 16) return s;
  if (process.env["NODE_ENV"] === "production") {
    return getSessionSecret();
  }
  return "dev-pbx-secret-change-me";
}

/** HM editör / köşe yazarı JWT imza anahtarı (`hm.ts` ile aynı sıra). */
export function getHmEditorJwtSecret(): string {
  const s = String(process.env["HM_EDITOR_JWT_SECRET"] ?? "").trim();
  if (s) return s;
  return getSessionSecret();
}

/** Geliver webhook HMAC / paylaşımlı secret doğrulaması (`POST /api/providers/geliver/webhook`). */
export function getGeliverWebhookSecret(): string | null {
  const s = String(process.env["GELIVER_WEBHOOK_SECRET"] ?? "").trim();
  return s || null;
}
