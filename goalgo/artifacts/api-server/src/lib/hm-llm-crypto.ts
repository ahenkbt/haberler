import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Haber Merkezi LLM anahtarları (AES-256-GCM).
 *
 * Ortam: HM_LLM_KEY_SECRET
 * Aynı değer Node API ve VPS PHP (/docker/php-theme/ai-editor) sürecinde olmalı.
 * Anahtar yoksa değer `plain:` önekiyle saklanır; GET yine yalnızca son 4 karakteri döner.
 * PHP, secret tanımlanınca `plain:` satırlarını uygulama bir sonraki okumada şifreler.
 *
 * Biçim (secret varken): base64( iv[12] || tag[16] || ciphertext )
 * Anahtar malzemesi: SHA-256(HM_LLM_KEY_SECRET) → 32 bayt
 * Algoritma: aes-256-gcm
 *
 * PHP örneği:
 *   $key = hash('sha256', getenv('HM_LLM_KEY_SECRET'), true);
 *   $raw = base64_decode($api_key_enc);
 *   $iv = substr($raw, 0, 12);
 *   $tag = substr($raw, 12, 16);
 *   $ct = substr($raw, 28);
 *   $plain = openssl_decrypt($ct, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
 *   if (str_starts_with($api_key_enc, 'plain:')) $plain = substr($api_key_enc, 6);
 */

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;
const PLAIN_PREFIX = "plain:";

export function hmLlmKeySecret(): string {
  return String(process.env.HM_LLM_KEY_SECRET ?? "").trim();
}

function encryptionKey(): Buffer | null {
  const secret = hmLlmKeySecret();
  if (!secret) return null;
  return createHash("sha256").update(secret, "utf8").digest();
}

export function encryptLlmApiKey(plaintext: string): string {
  const value = String(plaintext ?? "");
  if (!value) return "";
  const key = encryptionKey();
  if (!key) return `${PLAIN_PREFIX}${value}`;
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptLlmApiKey(stored: string): string {
  const raw = String(stored ?? "");
  if (!raw) return "";
  if (raw.startsWith(PLAIN_PREFIX)) return raw.slice(PLAIN_PREFIX.length);
  const key = encryptionKey();
  if (!key) return "";
  try {
    const buf = Buffer.from(raw, "base64");
    if (buf.length <= IV_LEN + TAG_LEN) return "";
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const enc = buf.subarray(IV_LEN + TAG_LEN);
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

export function isPlaintextLlmStorage(stored: string): boolean {
  return String(stored ?? "").startsWith(PLAIN_PREFIX);
}
