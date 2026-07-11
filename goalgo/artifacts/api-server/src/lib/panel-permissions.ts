/**
 * Alt yönetici yetkileri — `panel_admin_users.permissions_json` dizisi ile eşleşir.
 * Tam yetkili: DB’de alan NULL/boş (tüm anahtarlar).
 */
export const PANEL_PERMISSION_KEYS = [
  "dashboard",
  "haberler",
  "hm_sites",
  "servis_saglayicilar",
  "haritalar",
  "teslimat",
  "site_ayarlari",
  "destek",
  "comms",
  "duyurular",
  "iletisim",
  "ulasim",
  "premium",
  "is_ortaklari",
  "kariyer",
  "turizm",
  "otomotiv",
] as const;

export type PanelPermissionKey = (typeof PANEL_PERMISSION_KEYS)[number];

export const PANEL_PERMISSION_LABELS: Record<PanelPermissionKey, string> = {
  dashboard: "Kontrol paneli özeti",
  haberler: "Haber / kategori / yazar / RSS / medya / video TV / AI içerik",
  hm_sites: "Haber merkezi (HM) siteleri ve içerik havuzu",
  servis_saglayicilar: "Servis sağlayıcı başvuruları ve onayları",
  haritalar: "Harita ve işletme yönetimi",
  teslimat: "Dükkan / teslimat / sipariş yönetimi",
  site_ayarlari: "Genel ayarlar, modüller, reklam alanları",
  destek: "Destek talepleri",
  comms: "Posta, duyuru merkezi (comms)",
  duyurular: "Platform duyuruları",
  iletisim: "İletişim mesajları",
  ulasim: "Ulaşım yönetimi",
  premium: "Premium / ücretlendirme",
  is_ortaklari: "İş ortağı başvuruları",
  kariyer: "Kariyer başvuruları",
  turizm: "Turizm & rezervasyon yönetimi",
  otomotiv: "Otomotiv ekosistemi yönetimi",
};

export function isValidPanelPermissionKey(s: string): s is PanelPermissionKey {
  return (PANEL_PERMISSION_KEYS as readonly string[]).includes(s);
}

export function normalizePanelPermissionsInput(raw: unknown): PanelPermissionKey[] | null {
  if (raw === undefined || raw === null) return null;
  if (!Array.isArray(raw)) return null;
  const out: PanelPermissionKey[] = [];
  for (const x of raw) {
    const k = String(x).trim();
    if (isValidPanelPermissionKey(k) && !out.includes(k)) out.push(k);
  }
  return out;
}
