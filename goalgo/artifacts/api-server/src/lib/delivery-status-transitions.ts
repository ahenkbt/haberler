/**
 * Teslimat siparişi durum geçişleri — admin API ile işletme paneli tek sözlükten.
 */

export const DELIVERY_ALL_STATUSES = new Set([
  "pending", "confirmed", "preparing", "ready", "picked_up", "on_the_way", "delivered", "cancelled",
]);

/** Admin / yönetim API */
export const ADMIN_DELIVERY_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending:    ["confirmed", "cancelled"],
  confirmed:  ["preparing", "cancelled"],
  preparing:  ["ready", "on_the_way", "cancelled"],
  ready:      ["picked_up", "on_the_way", "delivered", "cancelled"],
  picked_up:  ["delivered", "on_the_way", "cancelled"],
  on_the_way: ["delivered", "cancelled"],
  delivered:  [],
  cancelled:  [],
};

/** İşletme paneli (providers) — admin’in ara durumlarına kısmi paralel */
export const VENDOR_DELIVERY_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending:    ["confirmed", "cancelled"],
  confirmed:  ["preparing", "cancelled"],
  preparing:  ["ready", "cancelled"],
  ready:      ["picked_up", "delivered"],
  picked_up:  ["delivered"],
  on_the_way: ["delivered", "cancelled"],
  delivered:  [],
  cancelled:  [],
};

/** Kurye paneli — atanmış siparişte teslimat akışı */
export const COURIER_DELIVERY_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending:    [],
  confirmed:  [],
  preparing:  [],
  ready:      ["picked_up"],
  picked_up:  ["on_the_way", "delivered"],
  on_the_way: ["delivered"],
  delivered:  [],
  cancelled:  [],
};

export function deliveryStatusTransitionAllowed(
  role: "admin" | "vendor" | "courier",
  from: string,
  to: string,
): { ok: true } | { ok: false; error: string } {
  if (from === to) return { ok: true };
  if (!DELIVERY_ALL_STATUSES.has(to)) return { ok: false, error: "Geçersiz hedef durum" };
  if (!DELIVERY_ALL_STATUSES.has(from)) {
    return { ok: false, error: `Sipariş kaydında bilinmeyen durum: ${from}` };
  }
  const map =
    role === "admin"
      ? ADMIN_DELIVERY_STATUS_TRANSITIONS
      : role === "vendor"
        ? VENDOR_DELIVERY_STATUS_TRANSITIONS
        : COURIER_DELIVERY_STATUS_TRANSITIONS;
  const allowed = map[from] ?? [];
  if (!allowed.includes(to)) {
    return { ok: false, error: `'${from}' durumundan '${to}' durumuna geçiş yapılamaz` };
  }
  return { ok: true };
}
