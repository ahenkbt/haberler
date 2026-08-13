export const HM_TEPE_MANSET_OPT_IN_REV = "tepe-manset-opt-in-v1";

/**
 * Bir kerelik: tüm sitelerde Tepe manşeti kapat (opt-in).
 * Editör panelden açtıktan sonra bu rev sayesinde tekrar kapanmaz.
 */
export function nextTepeMansetLayoutPatch(
  prev: Record<string, unknown>,
): Record<string, unknown> | null {
  if (prev.hmTepeMansetOptInRev === HM_TEPE_MANSET_OPT_IN_REV) return null;
  return {
    ...prev,
    hmNewsTepeMansetEnabled: false,
    hmTepeMansetOptInRev: HM_TEPE_MANSET_OPT_IN_REV,
  };
}
