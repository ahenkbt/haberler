/** Çanakkale cephesi şehit listesi PDF metninden kayıt ayrıştırma. */

const BRANCH_WORDS = new Set([
  "PİYADE",
  "SÜVARİ",
  "İSTİHKAM",
  "TOPÇU",
  "TANK",
  "SANCAK",
  "MUHAFIZ",
  "TÜFEKÇİ",
  "HAFİF",
  "AĞIR",
  "HAFİF SANCAK",
  "HAFIF SANCAK",
]);

const RANK_WORDS = new Set([
  "ER",
  "ONBAŞI",
  "ONB.",
  "ÇAVUŞ",
  "ÇVŞ.",
  "YÜZBAŞI",
  "YZB.",
  "BINBAŞI",
  "BNB.",
  "ÜSTEĞMEN",
  "ÜST.",
  "MULAZIM",
  "MUL.",
  "SB.",
  "ADAY",
  "ADAYI",
  "KOMİSER",
  "KOM.",
  "KOMD.",
  "KOMD. ER",
  "YD.SB.",
  "YD.SB. ADAY",
  "YD.SB. ADAYI",
  "KOMD. ER",
  "KOMD.ER",
]);

const EXTRA_PROVINCES = [
  "KOSOVA",
  "BAĞDAT",
  "BEYRUT",
  "HAYFA",
  "DİRZOR",
  "DIRZOR",
  "MACARISTAN",
  "SURİYE",
  "YUNANISTAN",
  "BULGARISTAN",
  "KIRIM",
  "GEVGİLİ MUHACİRLERİNDEN İZMİR",
  "GEVGILI MUHACIRLERINDEN IZMIR",
];

export const TR_PROVINCES_UPPER = [
  "ADANA",
  "ADIYAMAN",
  "AFYONKARAHİSAR",
  "AĞRI",
  "AKSARAY",
  "AMASYA",
  "ANKARA",
  "ANTALYA",
  "ARDAHAN",
  "ARTVİN",
  "AYDIN",
  "BALIKESİR",
  "BARTIN",
  "BATMAN",
  "BAYBURT",
  "BİLECİK",
  "BİNGÖL",
  "BİTLİS",
  "BOLU",
  "BURDUR",
  "BURSA",
  "ÇANAKKALE",
  "ÇANKIRI",
  "ÇORUM",
  "DENİZLİ",
  "DİYARBAKIR",
  "DÜZCE",
  "EDİRNE",
  "ELAZIĞ",
  "ERZİNCAN",
  "ERZURUM",
  "ESKİŞEHİR",
  "GAZİANTEP",
  "GİRESUN",
  "GÜMÜŞHANE",
  "HAKKARİ",
  "HATAY",
  "IĞDIR",
  "ISPARTA",
  "İSTANBUL",
  "İZMİR",
  "KAHRAMANMARAŞ",
  "KARABÜK",
  "KARAMAN",
  "KARS",
  "KASTAMONU",
  "KAYSERİ",
  "KIRIKKALE",
  "KIRKLARELİ",
  "KIRŞEHİR",
  "KİLİS",
  "KOCAELİ",
  "KONYA",
  "KÜTAHYA",
  "MALATYA",
  "MANİSA",
  "MARDİN",
  "MERSİN",
  "MUĞLA",
  "MUŞ",
  "NEVŞEHİR",
  "NİĞDE",
  "ORDU",
  "OSMANİYE",
  "RİZE",
  "SAKARYA",
  "SAMSUN",
  "SİİRT",
  "SİNOP",
  "SİVAS",
  "ŞANLIURFA",
  "ŞIRNAK",
  "TEKİRDAĞ",
  "TOKAT",
  "TRABZON",
  "TUNCELİ",
  "UŞAK",
  "VAN",
  "YALOVA",
  "YOZGAT",
  "ZONGULDAK",
  ...EXTRA_PROVINCES,
].sort((a, b) => b.length - a.length);

export type CanakkaleSehitRecord = {
  serialNo: number;
  name: string;
  fatherName: string;
  birthYear: number | null;
  nickname: string;
  province: string;
  district: string;
  bucak: string;
  village: string;
  branchClass: string;
  rank: string;
  unitText: string;
  martyrdomPlace: string;
  martyrdomDate: string;
  searchText: string;
};

function normalizeSpaces(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

function isYearToken(token: string): boolean {
  return /^(18|19)\d{2}$/.test(token);
}

function isDateToken(token: string): boolean {
  return /^\d{2}\/\d{2}\/\d{3,4}$/.test(token);
}

function isUnitNumber(token: string): boolean {
  return /^\d+$/.test(token);
}

function findProvinceIndex(tokens: string[]): number {
  for (let i = 0; i < tokens.length; i += 1) {
    const upper = tokens[i].toUpperCase();
    for (const province of TR_PROVINCES_UPPER) {
      if (upper === province || upper.includes(province)) return i;
    }
  }
  return -1;
}

function isBranchOrRank(token: string): boolean {
  const u = token.toUpperCase();
  if (BRANCH_WORDS.has(u)) return true;
  if (RANK_WORDS.has(u)) return true;
  if (u.startsWith("YD.SB")) return true;
  return false;
}

function parseNameSection(tokens: string[], start: number, provinceIndex: number) {
  const section = tokens.slice(start, provinceIndex).filter((t) => t !== "-");
  let birthYear: number | null = null;
  const nameParts: string[] = [];

  for (const token of section) {
    if (isYearToken(token)) {
      birthYear = Number(token);
      continue;
    }
    nameParts.push(token);
  }

  let fatherName = "";
  if (nameParts.length >= 2) {
    const last = nameParts[nameParts.length - 1].toUpperCase();
    if (
      last.endsWith("OĞLU") ||
      last.endsWith("OGLU") ||
      last.endsWith("ZADE") ||
      last.endsWith("KIZI") ||
      last.includes("OĞULLARI") ||
      last.includes("OGLULARI")
    ) {
      fatherName = nameParts.pop() ?? "";
    }
  }

  return {
    name: normalizeSpaces(nameParts.join(" ")),
    fatherName: normalizeSpaces(fatherName),
    nickname: "",
    birthYear,
  };
}

function parseLocationAndMilitary(tokens: string[], provinceIndex: number) {
  const rest = tokens.slice(provinceIndex);
  const province = rest[0] ?? "";
  let idx = 1;
  const geo: string[] = [];

  while (idx < rest.length && !isBranchOrRank(rest[idx] ?? "") && !isUnitNumber(rest[idx] ?? "")) {
    if (isDateToken(rest[idx] ?? "")) break;
    geo.push(rest[idx] ?? "");
    idx += 1;
    if (geo.length >= 4) break;
  }

  let branchClass = "";
  let rank = "";
  if (idx < rest.length && BRANCH_WORDS.has((rest[idx] ?? "").toUpperCase())) {
    branchClass = rest[idx] ?? "";
    idx += 1;
  }
  if (idx < rest.length && isBranchOrRank(rest[idx] ?? "")) {
    rank = rest[idx] ?? "";
    idx += 1;
  } else if (idx < rest.length && (rest[idx] ?? "").toUpperCase() === "ER") {
    rank = rest[idx] ?? "";
    idx += 1;
  }

  const unitNumbers: string[] = [];
  while (idx < rest.length && isUnitNumber(rest[idx] ?? "")) {
    unitNumbers.push(rest[idx] ?? "");
    idx += 1;
    if (unitNumbers.length >= 6) break;
  }

  const martyrdomDate = rest[rest.length - 1] && isDateToken(rest[rest.length - 1]) ? rest[rest.length - 1] : "";
  const placeTokens = rest.slice(idx, martyrdomDate ? rest.length - 1 : rest.length);
  const martyrdomPlace = normalizeSpaces(placeTokens.join(" "));

  return {
    province: normalizeSpaces(province),
    district: normalizeSpaces(geo[0] ?? ""),
    bucak: normalizeSpaces(geo[1] ?? ""),
    village: normalizeSpaces(geo[2] ?? ""),
    branchClass: normalizeSpaces(branchClass),
    rank: normalizeSpaces(rank),
    unitText: unitNumbers.join(" "),
    martyrdomPlace,
    martyrdomDate: martyrdomDate ?? "",
  };
}

export function parseCanakkaleSehitRecordLine(serialNo: number, rawLine: string): CanakkaleSehitRecord | null {
  const line = normalizeSpaces(rawLine.replace(/\t/g, " "));
  if (!line) return null;

  const tokens = line.split(" ").filter(Boolean);
  if (tokens.length < 4) return null;

  let start = 1;
  if (tokens[1] === "-") start = 2;

  const provinceIndex = findProvinceIndex(tokens.slice(start));
  if (provinceIndex < 0) return null;
  const absoluteProvinceIndex = start + provinceIndex;

  const identity = parseNameSection(tokens, start, absoluteProvinceIndex);
  const details = parseLocationAndMilitary(tokens, absoluteProvinceIndex);

  if (!identity.name && !details.province) return null;

  const searchText = normalizeSpaces(
    [
      serialNo,
      identity.name,
      identity.fatherName,
      identity.nickname,
      details.province,
      details.district,
      details.bucak,
      details.village,
      details.branchClass,
      details.rank,
      details.unitText,
      details.martyrdomPlace,
      details.martyrdomDate,
    ]
      .filter(Boolean)
      .join(" "),
  ).toLocaleLowerCase("tr-TR");

  return {
    serialNo,
    name: identity.name || "—",
    fatherName: identity.fatherName,
    birthYear: identity.birthYear,
    nickname: identity.nickname,
    ...details,
    searchText,
  };
}

export function parseCanakkaleSehitleriText(fullText: string): CanakkaleSehitRecord[] {
  const cleaned = fullText
    .replace(/ÇANAKKALE CEPHESİ ŞEHİT LİSTESİ/gi, "")
    .replace(/S\.NO\s+ADI\s+BABA ADI[\s\S]*?ŞEHADET YERİ\s+TARİHİ/gi, "")
    .replace(/-- \d+ of \d+ --/g, "");

  const records: CanakkaleSehitRecord[] = [];
  const lines = cleaned.split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(/^(\d+)\s+(.*)$/);
    if (!match) continue;
    const serialNo = Number(match[1]);
    if (!Number.isFinite(serialNo) || serialNo <= 0) continue;
    const parsed = parseCanakkaleSehitRecordLine(serialNo, match[2] ?? "");
    if (parsed) records.push(parsed);
  }

  return records;
}
