/** Ulaşım talep formu — servis tipine göre müsaitlik / hata mesajları */

const TRANSPORT_UNAVAILABLE_MESSAGES: Record<string, string> = {
  taxi: "Şu anda müsait taksi bulunmamaktadır.",
  tow: "Şu anda müsait çekici bulunmamaktadır.",
  courier: "Şu anda müsait kurye bulunmamaktadır.",
  cargo: "Şu anda müsait kargo hizmeti bulunmamaktadır.",
  rideshare: "Şu anda uygun araç paylaşımı bulunmamaktadır.",
  moving: "Şu anda müsait nakliyat hizmeti bulunmamaktadır.",
};

export function getTransportUnavailableMessage(requestType: string): string {
  const key = String(requestType ?? "").trim().toLowerCase();
  return (
    TRANSPORT_UNAVAILABLE_MESSAGES[key] ??
    "Şu anda seçilen hizmet için müsait sağlayıcı bulunmamaktadır."
  );
}

const GENERIC_TRANSPORT_FAILURE = "Talep alınamadı. Lütfen biraz sonra tekrar deneyin.";

function isNoProviderSignal(
  status: number,
  body: { error?: unknown; code?: unknown; requestType?: unknown } | null,
): boolean {
  const err = typeof body?.error === "string" ? body.error.trim() : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (err === "no_provider" || code === "no_provider") return true;
  if (status === 503 && /no.?provider|sağlayıcı|müsait|bulunmamaktadır/i.test(err)) return true;
  return /no.?provider|sağlayıcı.*(yok|bulunamadı)|müsait.*(yok|bulunmamaktadır)/i.test(err);
}

/** API yanıtını kullanıcı dostu forma çevirir; «Sunucu hatası» gösterilmez. */
export function mapTransportRequestError(
  requestType: string,
  status: number,
  body: { error?: unknown; code?: unknown; requestType?: unknown } | null,
): string {
  if (isNoProviderSignal(status, body)) {
    const rt =
      typeof body?.requestType === "string" && body.requestType.trim()
        ? body.requestType
        : requestType;
    return getTransportUnavailableMessage(rt);
  }

  const err = typeof body?.error === "string" ? body.error.trim() : "";
  if (status === 400 && err && err !== "Sunucu hatası") return err;
  if (err && err !== "Sunucu hatası" && status < 500) return err;

  return GENERIC_TRANSPORT_FAILURE;
}

/** Aktif sağlayıcı / araç var mı — ağ hatasında talebi engellemez (true döner). */
export async function checkTransportProviderAvailable(requestType: string): Promise<boolean | null> {
  const rt = String(requestType ?? "").trim().toLowerCase();
  if (!rt) return false;

  try {
    if (rt === "rideshare") {
      const res = await fetch("/api/transport/rides");
      if (!res.ok) return null;
      const data = await res.json();
      return Array.isArray(data) && data.length > 0;
    }
    const res = await fetch(`/api/transport/vehicles?type=${encodeURIComponent(rt)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0;
  } catch {
    return null;
  }
}
