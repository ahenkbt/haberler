/**
 * /admin/giris soğuk Container — busy tespiti ve yeniden deneme gecikmesi.
 * Login.tsx ile aynı kurallar (Worker tarafı auth path retry için de kullanılır).
 */

export function isPanelLoginBusyStatus(status, bodyOrText) {
  const code = Number(status) || 0;
  if (code === 502 || code === 503 || code === 504) return true;
  const raw =
    typeof bodyOrText === "string"
      ? bodyOrText
      : String(bodyOrText?.error || bodyOrText?.message || "");
  return /uyanıyor|meşgul|Failed to start container|Durable Object reset|provisioning|timeout|origin-budget/i.test(
    String(raw || ""),
  );
}

/** attempt 0-based → ms (üst sınır ~15s). */
export function panelLoginRetryDelayMs(attempt) {
  const n = Math.max(0, Math.trunc(attempt));
  return Math.min(15_000, 2000 * Math.max(1, n));
}

export function panelLoginBusyUserMessage() {
  return "Sunucu henüz uyanıyor. 15–20 sn bekleyip tekrar Giriş Yap’a basın.";
}
