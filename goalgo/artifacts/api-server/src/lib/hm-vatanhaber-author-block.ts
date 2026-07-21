/**
 * Vatanhaber köşe yazarları — Ankara HM sitelerinde (ASG / AHG) gösterilmez.
 * Editör panelinde silinemeyen / yeniden sızan isimler için savunma katmanı.
 */

const VATANHABER_BLOCKED_AUTHOR_NAMES = [
  "Kerim Bahadır",
  "KERİM BAHADIR",
  "Kerim Bahadir",
  "KERIM BAHADIR",
  "KERİM BAHADIR ERTAŞ",
  "KERIM BAHADIR ERTAS",
  "Kerim Bahadır Ertaş",
  "NUR DELİCE",
  "NUR DELICE",
  "Nur Delice",
  "HÜSNÜ KARABULUT",
  "HUSNU KARABULUT",
  "Hüsnü Karabulut",
  "Gül Akdemir",
  "GUL AKDEMIR",
  "Abidin ŞANVER",
  "Abidin SANVER",
  "FATİH DEMİREL",
  "FATIH DEMIREL",
  "Fatih Demirel",
  "Ayşegül SEÇİLMİŞ",
  "Aysegul SECILMIS",
  "Ayşegül Seçilmiş",
  "HÜSEYİN AKIN",
  "HUSEYIN AKIN",
  "Hüseyin Akın",
] as const;

function foldAuthorName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const BLOCKED_FOLDED = new Set(
  VATANHABER_BLOCKED_AUTHOR_NAMES.map((name) => foldAuthorName(name)),
);

function isAnkaraHmSite(siteSlug?: string | null, siteDomain?: string | null): boolean {
  const slug = (siteSlug || "").trim().toLowerCase();
  const domain = (siteDomain || "").trim().toLowerCase();
  if (slug === "asg" || slug === "ankarahabergundemi" || slug === "ahg") return true;
  if (slug.includes("ankarasehirgazetesi") || slug.includes("ankarahabergundemi")) return true;
  if (domain.includes("ankarasehirgazetesi") || domain.includes("ankarahabergundemi")) return true;
  return false;
}

function isAsgSite(siteSlug?: string | null, siteDomain?: string | null): boolean {
  const slug = (siteSlug || "").trim().toLowerCase();
  const domain = (siteDomain || "").trim().toLowerCase();
  if (slug === "asg" || slug.includes("ankarasehirgazetesi")) return true;
  if (domain.includes("ankarasehirgazetesi")) return true;
  return false;
}

/** ASG kurucusu (İmtiyaz Sahibi / Hüseyin Akın) korunur — VH kopyası değil. */
function isAsgFounderKeep(
  authorName: string | null | undefined,
  authorTitle: string | null | undefined,
): boolean {
  const title = (authorTitle || "").toLocaleLowerCase("tr-TR");
  if (title.includes("imtiyaz")) return true;
  const folded = foldAuthorName(authorName || "");
  return folded === "huseyin akin";
}

export type AnkaraAuthorHideInput = {
  siteSlug?: string | null;
  siteDomain?: string | null;
  authorName?: string | null;
  authorTitle?: string | null;
};

/** ASG / AHG gibi Ankara HM sitelerinde Vatanhaber yazarlarını gizle. */
export function shouldHideAuthorOnAnkaraHmSite(input: AnkaraAuthorHideInput): boolean {
  if (!isAnkaraHmSite(input.siteSlug, input.siteDomain)) return false;
  const folded = foldAuthorName(input.authorName || "");
  if (!folded) return false;

  const blocked =
    BLOCKED_FOLDED.has(folded) || folded.startsWith("kerim bahadir");
  if (!blocked) return false;

  // ASG kurucusunu (Hüseyin Akın / İmtiyaz) gizleme
  if (
    isAsgSite(input.siteSlug, input.siteDomain) &&
    isAsgFounderKeep(input.authorName, input.authorTitle)
  ) {
    return false;
  }

  return true;
}

export { VATANHABER_BLOCKED_AUTHOR_NAMES, foldAuthorName };
