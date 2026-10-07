/**
 * HM editör RSS kampanya Çalıştır — Container soğukken 503 / düz metin
 * yanıtlarını JSON'a çevir + yeniden deneme kararı.
 */

export function isRssCampaignRunBusyStatus(status, bodyOrText) {
  const code = Number(status) || 0;
  if (code === 502 || code === 503 || code === 504) return true;
  const raw =
    typeof bodyOrText === "string"
      ? bodyOrText
      : String(bodyOrText?.error || bodyOrText?.message || "");
  return /uyanıyor|meşgul|Failed to start container|provisioning|timeout|Sunucu yanıtı okunamadı/i.test(
    raw,
  );
}

/**
 * Upstream (Container) gövdesini her zaman JSON'a çevir.
 * Düz metin 503 ("Failed to start container…") → anlaşılır Türkçe hata.
 */
export function normalizeRssCampaignRunUpstreamResponse(status, text) {
  const code = Number(status) || 0;
  const trimmed = String(text ?? "").trim();
  let parsed = null;
  if (trimmed) {
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      parsed = null;
    }
  } else {
    parsed = {};
  }

  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    if (isRssCampaignRunBusyStatus(code, parsed) && code >= 500) {
      return {
        status: code,
        body: {
          ...parsed,
          accepted: false,
          error:
            String(parsed.error || parsed.message || "").trim() ||
            "Sunucu uyanıyor. 15–20 sn bekleyip tekrar Çalıştır’a basın.",
        },
      };
    }
    return { status: code || 200, body: parsed };
  }

  const busy = isRssCampaignRunBusyStatus(code, trimmed);
  return {
    status: busy ? (code >= 500 ? code : 503) : code || 502,
    body: {
      accepted: false,
      added: 0,
      skipped: 0,
      errors: 1,
      error: busy
        ? "Sunucu uyanıyor. 15–20 sn bekleyip tekrar Çalıştır’a basın."
        : trimmed.slice(0, 200) || "Kampanya çalıştırılamadı",
    },
  };
}

export function rssCampaignRunRetryDelayMs(attempt) {
  const n = Math.max(0, Math.trunc(attempt));
  return Math.min(12_000, 1500 * Math.max(1, n));
}
