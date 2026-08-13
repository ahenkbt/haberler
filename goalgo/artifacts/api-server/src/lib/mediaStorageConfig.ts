/** S3 uyumlu nesne depolama (Cloudflare R2, AWS S3, MinIO). */
export type MediaStorageMode = "volume" | "s3";

/** `MEDIA_STORAGE_MODE`: volume | s3 | auto (varsayılan). */
export type MediaStoragePreference = "volume" | "s3" | "auto";

/** S3 canlı yazma/okuma başarısız olunca otomatik volume'a düş. */
let runtimeS3Disabled = false;

export type S3EnvDiagnostics = {
  bucket: boolean;
  accessKey: boolean;
  secret: boolean;
  endpoint: boolean;
};

/** healthz: Railway'de değişken adı / boş değer teşhisi (gizli değer sızdırmaz). */
export type S3EnvHealthDetails = S3EnvDiagnostics & {
  /** `S3_ENDPOINT` anahtarı process.env'de var mı (boş string dahil). */
  endpointRawPresent: boolean;
  /** Trim + tırnak temizliği sonrası kaç karakter (0 = boş veya yok). */
  endpointLength: number;
  /** Hangi env anahtarından okundu; yoksa null. */
  endpointSource: string | null;
  /** Yapıştırılmış env bloğundan R2 hostu ayıklandı. */
  endpointCoerced?: boolean;
  /** Ayıklanmış R2 S3 API URL'si kullanılabilir. */
  endpointReady?: boolean;
  /** Host'un ilk 4 karakteri (gizli URL yok). */
  endpointHostPrefix4?: string | null;
  /** Env bloğu + bilinen dual-write hostları. */
  endpointCandidateCount?: number;
};

/** Railway / panel kopyala-yapıştır: tırnak, BOM, satır sonu. */
export function normalizeEnvValue(value: string | undefined): string {
  if (value == null) return "";
  let v = value.replace(/^\uFEFF/, "").trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v.replace(/\r?\n/g, "");
}

const R2_API_URL_RE = /https?:\/\/[a-z0-9][a-z0-9.-]*\.r2\.cloudflarestorage\.com/gi;
const R2_API_HOST_RE = /(?:^|[\s"'=\n\r])([a-z0-9][a-z0-9.-]*\.r2\.cloudflarestorage\.com)/gi;

/** Render env (PR #103): 2 aydır dual-write bu R2 S3 hostuna yazdı. */
export const RENDER_R2_S3_ENDPOINT =
  "https://fb9f9c9dc1991b7cc17ba58ab3c2e8726.r2.cloudflarestorage.com";

/** wrangler.toml account_id — Worker secret bloğunda yanlışlıkla ilk sıraya düşebiliyor. */
export const CF_ACCOUNT_R2_S3_ENDPOINT =
  "https://16f5b996194174624e7969a3658bd2bb.r2.cloudflarestorage.com";

function normalizeR2EndpointUrl(raw: string): string {
  return raw.replace(/\/+$/, "").replace(/^http:\/\//i, "https://");
}

function isR2S3ApiHost(host: string): boolean {
  return /\.r2\.cloudflarestorage\.com$/i.test(host);
}

function r2S3UrlFromValue(value: string | undefined): string | null {
  const n = normalizeR2EndpointUrl(String(value ?? "").trim());
  if (!n) return null;
  try {
    const host = new URL(/^https?:\/\//i.test(n) ? n : `https://${n}`).hostname;
    if (!isR2S3ApiHost(host)) return null;
    return `https://${host}`;
  } catch {
    return null;
  }
}

/**
 * GitHub/Worker secret'ına env bloğu yapıştırılınca S3_ENDPOINT 300+ karakter olabiliyor.
 * R2 API hostunu ayıkla; r2.dev public URL'sini S3 endpoint sanma.
 * Dual-write (Render) hostu listedeyse her zaman ilk sıradadır.
 */
export function coerceR2S3Endpoint(raw: string | undefined): string {
  const all = listR2S3EndpointCandidates(raw);
  return all[0] ?? "";
}

/** Env bloğundaki tüm R2 S3 hostları + Render'da 2 aydır yazılan kanonik host. */
export function listR2S3EndpointCandidates(
  raw?: string,
  extraAccountIds: readonly string[] = [],
): string[] {
  const blob: string[] = [];
  const seenBlob = new Set<string>();
  const addBlob = (value: string | undefined) => {
    const url = r2S3UrlFromValue(value);
    if (!url || seenBlob.has(url)) return;
    seenBlob.add(url);
    blob.push(url);
  };

  const text = String(raw ?? "");
  for (const m of text.matchAll(R2_API_URL_RE)) addBlob(m[0]);
  for (const m of text.matchAll(R2_API_HOST_RE)) addBlob(`https://${m[1]}`);

  const extras: string[] = [];
  const seenExtra = new Set<string>();
  const addExtra = (value: string | undefined) => {
    const url = r2S3UrlFromValue(value);
    if (!url || seenExtra.has(url) || seenBlob.has(url)) return;
    seenExtra.add(url);
    extras.push(url);
  };

  for (const id of extraAccountIds) {
    const hex = String(id ?? "").replace(/[^a-f0-9]/gi, "");
    if (hex.length >= 32) addExtra(`https://${hex}.r2.cloudflarestorage.com`);
  }

  const hasR2 = blob.length > 0;
  // Uzun yapıştırma bloğu regex kaçırsa bile dual-write hostunu dene.
  if (hasR2 || text.length > 180) {
    addExtra(RENDER_R2_S3_ENDPOINT);
    addExtra(CF_ACCOUNT_R2_S3_ENDPOINT);
  }

  const out: string[] = [];
  const seen = new Set<string>();
  const push = (url: string) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    out.push(url);
  };

  const render = r2S3UrlFromValue(RENDER_R2_S3_ENDPOINT);
  if (render && (seenBlob.has(render) || seenExtra.has(render))) push(render);
  for (const u of blob) push(u);
  for (const u of extras) push(u);

  if (out.length === 0) {
    const v = normalizeEnvValue(raw);
    if (v && v.length <= 180) {
      const n = normalizeR2EndpointUrl(/^https?:\/\//i.test(v) ? v : `https://${v}`);
      try {
        const url = new URL(n);
        if (url.hostname) push(`${url.protocol}//${url.host}`.replace(/\/+$/, ""));
      } catch {
        /* ignore */
      }
    }
  }

  return out;
}

const S3_ENDPOINT_KEYS = [
  "S3_ENDPOINT",
  "S3_API_ENDPOINT",
  "AWS_ENDPOINT_URL",
  "AWS_ENDPOINT",
  "R2_ENDPOINT",
  "CLOUDFLARE_R2_ENDPOINT",
  "S3_ENDPOINT_URL",
] as const;

function readFirstEnv(keys: readonly string[]): { key: string; value: string } | null {
  for (const key of keys) {
    const value = normalizeEnvValue(process.env[key]);
    if (value) return { key, value };
  }
  return null;
}

/** R2/S3 API endpoint — alias, trim ve yapıştırılmış env bloğundan ayıklama. */
export function getS3Endpoint(): string {
  const hit = readFirstEnv(S3_ENDPOINT_KEYS);
  return hit ? coerceR2S3Endpoint(hit.value) : "";
}

/** GET/HEAD: tüm aday hostlar (Render dual-write önce). Env yoksa boş. */
export function getS3EndpointCandidates(): string[] {
  const hit = readFirstEnv(S3_ENDPOINT_KEYS);
  if (!hit) return [];
  return listR2S3EndpointCandidates(hit.value);
}

export function s3EndpointHostPrefixFromUrl(ep: string | null | undefined): string | null {
  if (!ep) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(ep) ? ep : `https://${ep}`);
    const host = url.hostname;
    if (!host) return null;
    return host.length <= 4 ? host : host.slice(0, 4);
  } catch {
    return null;
  }
}

export function s3EnvDiagnostics(): S3EnvDiagnostics {
  return {
    bucket: Boolean(normalizeEnvValue(process.env.S3_BUCKET)),
    accessKey: Boolean(normalizeEnvValue(process.env.S3_ACCESS_KEY_ID)),
    secret: Boolean(normalizeEnvValue(process.env.S3_SECRET_ACCESS_KEY)),
    endpoint: Boolean(getS3Endpoint()),
  };
}

export function s3EnvHealthDetails(): S3EnvHealthDetails {
  const hit = readFirstEnv(S3_ENDPOINT_KEYS);
  const endpointLength = hit?.value.length ?? 0;
  const candidates = hit ? listR2S3EndpointCandidates(hit.value) : [];
  const coerced = candidates[0] ?? "";
  return {
    ...s3EnvDiagnostics(),
    endpointRawPresent: Object.prototype.hasOwnProperty.call(process.env, "S3_ENDPOINT"),
    endpointLength,
    endpointSource: hit?.key ?? null,
    endpointCoerced: coerced.length > 0 && coerced.length !== endpointLength,
    endpointReady: Boolean(coerced),
    endpointHostPrefix4: s3EndpointHostPrefixFromUrl(coerced),
    endpointCandidateCount: candidates.length,
  };
}

/** healthz / log: endpoint URL değerini sızdırmadan host'un ilk 4 karakteri. */
export function s3EndpointHostPrefix4(): string | null {
  return s3EndpointHostPrefixFromUrl(getS3Endpoint());
}

/** Açılışta endpoint'in container'a ulaşıp ulaşmadığını doğrula (gizli değer yok). */
export function logS3EndpointStartupHint(): void {
  const prefix = s3EndpointHostPrefix4();
  const source = readFirstEnv(S3_ENDPOINT_KEYS)?.key;
  if (prefix) {
    console.info(
      `[goalgo] S3 endpoint host ön eki: ${prefix}… (kaynak: ${source ?? "bilinmiyor"})`,
    );
    return;
  }
  if (Object.prototype.hasOwnProperty.call(process.env, "S3_ENDPOINT")) {
    console.warn(
      "[goalgo] S3_ENDPOINT anahtarı process.env'de var ama çözümlenemedi (boş, tırnaklı veya geçersiz URL)",
    );
    return;
  }
  const aliasHit = S3_ENDPOINT_KEYS.find(
    (k) => k !== "S3_ENDPOINT" && normalizeEnvValue(process.env[k]),
  );
  if (aliasHit) {
    console.warn(
      `[goalgo] ${aliasHit} tanımlı ama S3_ENDPOINT yok — healthz endpointSource ile doğrulayın`,
    );
  }
}

/** Tam S3/R2: bucket, anahtarlar ve endpoint (R2 için endpoint zorunlu). */
export function isS3MediaConfigured(): boolean {
  const d = s3EnvDiagnostics();
  return d.bucket && d.accessKey && d.secret && d.endpoint;
}

/** En az bir S3 değişkeni var ama tam yapılandırma yok. */
export function hasPartialS3Config(): boolean {
  const d = s3EnvDiagnostics();
  const any = d.bucket || d.accessKey || d.secret || d.endpoint;
  return any && !isS3MediaConfigured();
}

export function getMediaStoragePreference(): MediaStoragePreference {
  const raw = normalizeEnvValue(process.env.MEDIA_STORAGE_MODE).toLowerCase();
  if (raw === "volume" || raw === "local" || raw === "disk") return "volume";
  if (raw === "s3" || raw === "r2" || raw === "cloudflare") return "s3";
  return "auto";
}

/** S3 probe veya upload hatası sonrası bir sonraki isteklerde volume kullan. */
export function noteS3RuntimeFailure(reason?: string): void {
  if (runtimeS3Disabled) return;
  runtimeS3Disabled = true;
  console.warn(
    `[goalgo] S3/R2 devre dışı — yüklemeler site diskine yazılacak${reason ? `: ${reason}` : ""}`,
  );
}

export function isRuntimeS3Disabled(): boolean {
  return runtimeS3Disabled;
}

/** Test / yeniden deneme: runtime kilidini aç. */
export function resetRuntimeS3Disabled(): void {
  runtimeS3Disabled = false;
}

/** Okuma/yazma için S3 kullanılacak mı — `isS3MediaConfigured` tek başına yeterli değil (Render volume modu). */
export function shouldUseS3ForMediaIo(): boolean {
  return getMediaStorageMode() === "s3" && !runtimeS3Disabled;
}

/**
 * Temmuz 2026 dual-write dosyaları: TLS/probe R2'yi kapattıysa tekrar deneme (EPROTO her görseli bekletmesin).
 */
export function shouldReadS3ForMediaIo(): boolean {
  return isS3MediaConfigured() && !runtimeS3Disabled;
}

/** R2/S3 uç noktasına TLS veya ağ hatası (404 değil). */
export function isS3TransportError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e ?? "");
  return /EPROTO|ssl3_read_bytes|handshake|certificate|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ECONNRESET|socket hang up/i.test(
    msg,
  );
}

export function getMediaStorageMode(): MediaStorageMode {
  const pref = getMediaStoragePreference();
  if (pref === "volume") return "volume";
  if (runtimeS3Disabled) return "volume";
  if (isS3MediaConfigured()) {
    // MEDIA_STORAGE_MODE=s3|r2 veya auto — Cloudflare R2 birincil depo.
    if (pref === "s3" || pref === "auto") return "s3";
  }
  if (pref === "s3") return "volume";
  return "volume";
}

export function s3PublicBaseUrl(): string | null {
  const raw = normalizeEnvValue(process.env.S3_PUBLIC_BASE_URL);
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

export function isProductionRuntime(): boolean {
  if (process.env.NODE_ENV === "production") return true;
  if (normalizeEnvValue(process.env.RAILWAY_ENVIRONMENT_NAME)) return true;
  if (normalizeEnvValue(process.env.RAILWAY_SERVICE_NAME)) return true;
  return false;
}

export function hasPersistentVolumeMount(): boolean {
  if (normalizeEnvValue(process.env.RAILWAY_VOLUME_MOUNT_PATH)) return true;
  if (normalizeEnvValue(process.env.MEDIA_UPLOAD_ROOT)) return true;
  if (normalizeEnvValue(process.env.RENDER_DISK_MOUNT_PATH)) return true;
  return false;
}

function formatS3Diagnostics(d: S3EnvDiagnostics): string {
  const on = (ok: boolean) => (ok ? "var" : "yok");
  return `S3_BUCKET=${on(d.bucket)}, S3_ACCESS_KEY_ID=${on(d.accessKey)}, S3_SECRET_ACCESS_KEY=${on(d.secret)}, S3_ENDPOINT=${on(d.endpoint)}`;
}

/**
 * Üretimde geçici diskte medya kaybını önler: volume veya tam S3 zorunlu.
 * Kısmi S3 (ör. endpoint eksik) + Railway Volume varsa API açılır, volume kullanılır.
 * Acil bypass: `SKIP_MEDIA_STORAGE_CHECK=1`
 */
export function assertProductionMediaStorage(): void {
  if (process.env.SKIP_MEDIA_STORAGE_CHECK === "1") return;
  if (!isProductionRuntime()) return;

  if (isS3MediaConfigured()) return;

  if (hasPartialS3Config()) {
    const d = s3EnvDiagnostics();
    const diag = formatS3Diagnostics(d);
    if (hasPersistentVolumeMount()) {
      console.error(
        `[goalgo] UYARI: S3 yapılandırması eksik (${diag}). Kalıcı Railway Volume kullanılacak. ` +
          "R2 için goalgo servisi → Variables → S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com (değişkeni silip yeniden ekleyin, redeploy).",
      );
      return;
    }
    const endpointHint = !d.endpoint
      ? "S3_ENDPOINT eksik veya boş — Cloudflare R2 için https://<account_id>.r2.cloudflarestorage.com ekleyin (yanlış serviste, tırnaklı değer veya yazım hatası olabilir). "
      : "";
    throw new Error(
      `S3 kısmen tanımlı, tamamlanmamış (${diag}). ${endpointHint}` +
        "Kalıcı depolama için tam S3/R2 veya Railway Volume ekleyin. Acil bypass: SKIP_MEDIA_STORAGE_CHECK=1",
    );
  }

  if (hasPersistentVolumeMount()) return;

  const msg =
    "Üretim ortamında kalıcı medya depolama yok: Cloudflare R2 (S3_BUCKET + S3_ACCESS_KEY_ID + S3_SECRET_ACCESS_KEY + S3_ENDPOINT) veya MEDIA_UPLOAD_ROOT tanımlayın. " +
    "Geçici diskte yüklemeler deploy sonrası kaybolur. Acil bypass: SKIP_MEDIA_STORAGE_CHECK=1";
  throw new Error(msg);
}
