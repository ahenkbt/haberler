export const HM_TEPE_MANSET_OPT_IN_REV = "tepe-manset-opt-in-v1";
/** Bir kerelik: tüm HM sitelerinde Tepe manşeti varsayılan açık. */
export const HM_TEPE_MANSET_DEFAULT_ON_REV = "tepe-manset-default-on-v2";

/**
 * Bir kerelik: Tepe manşeti aç (default ON).
 * Editör panelden kapattıktan sonra bu rev sayesinde tekrar açılmaz.
 */
export function nextTepeMansetLayoutPatch(
  prev: Record<string, unknown>,
): Record<string, unknown> | null {
  if (prev.hmTepeMansetOptInRev === HM_TEPE_MANSET_DEFAULT_ON_REV) return null;
  return {
    ...prev,
    hmNewsTepeMansetEnabled: true,
    hmTepeMansetOptInRev: HM_TEPE_MANSET_DEFAULT_ON_REV,
  };
}
