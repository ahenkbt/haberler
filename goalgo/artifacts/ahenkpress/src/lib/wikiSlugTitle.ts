/**
 * Ansiklopedi URL slug → Vikipedi başlık adayları.
 * API `wikiSlugTitle.ts` ile senkron tutulmalı.
 */

export function slugToWikiTitle(slug: string): string {
  let s = String(slug ?? "").trim();
  for (let i = 0; i < 2; i++) {
    if (!/%[0-9A-Fa-f]{2}/.test(s)) break;
    try {
      const next = decodeURIComponent(s);
      if (next === s) break;
      s = next;
    } catch {
      break;
    }
  }
  return s.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

function hasTurkishChars(s: string): boolean {
  return /[ğüşıöçĞÜŞİÖÇ]/.test(s);
}

function titleCaseTrWord(word: string): string {
  if (!word) return word;
  const lower = word.toLocaleLowerCase("tr-TR");
  return lower.charAt(0).toLocaleUpperCase("tr-TR") + lower.slice(1);
}

export function titleCaseTurkish(s: string): string {
  return s.split(/\s+/).filter(Boolean).map(titleCaseTrWord).join(" ");
}

function dotlessIVariants(word: string, limit = 8): string[] {
  const lower = word.toLowerCase();
  const iIndexes = [...lower].reduce<number[]>((indexes, char, index) => {
    if (char === "i") indexes.push(index);
    return indexes;
  }, []);
  if (iIndexes.length === 0) return [];

  const out = new Set<string>();
  const maxMask = Math.min(1 << iIndexes.length, 1 << 4);
  for (let mask = 1; mask < maxMask && out.size < limit; mask++) {
    const chars = [...word];
    iIndexes.forEach((charIndex, bit) => {
      if (mask & (1 << bit)) chars[charIndex] = chars[charIndex] === "I" ? "I" : "ı";
    });
    out.add(chars.join(""));
  }
  return [...out];
}

function turkishWordAsciiVariants(word: string): string[] {
  const w = word.trim();
  if (!w || hasTurkishChars(w)) return [w];
  const out = new Set<string>([w]);
  const lower = w.toLowerCase();
  const push = (v: string) => {
    if (v) out.add(v);
  };

  const wholeWord: Record<string, string[]> = {
    turkiye: ["Türkiye"],
    istanbul: ["İstanbul"],
    izmir: ["İzmir"],
    ankara: ["Ankara"],
    internet: ["İnternet"],
    blok: ["Blok"],
    zinciri: ["zinciri"],
    blokzinciri: ["Blokzinciri"],
    muzik: ["Müzik"],
    calisan: ["çalışan"],
    calisanlar: ["çalışanlar"],
    gazeteci: ["gazeteci"],
    gazeteciler: ["gazeteciler"],
    gun: ["gün"],
    gunu: ["günü"],
    findik: ["fındık"],
    kustuk: ["kuştuk"],
    penalti: ["penaltı"],
    vurus: ["vuruş"],
    vuruslari: ["vuruşları"],
    vuruslar: ["vuruşlar"],
    savas: ["savaş"],
    savasi: ["savaşı"],
    canakkale: ["Çanakkale"],
    cumhuriyet: ["cumhuriyet"],
    kibris: ["Kıbrıs"],
    ogretmen: ["öğretmen"],
    ogretmeni: ["öğretmeni"],
    cocuk: ["çocuk"],
    bayrami: ["bayramı"],
    bayram: ["bayram"],
    mudurlugu: ["müdürlüğü"],
    mudurluk: ["müdürlük"],
    bakanligi: ["bakanlığı"],
    baskanligi: ["başkanlığı"],
    genel: ["genel"],
    egemenlik: ["egemenlik"],
    emniyet: ["emniyet"],
  };
  if (wholeWord[lower]) {
    for (const v of wholeWord[lower]) push(v);
    return [...out];
  }

  if (/vuruslari$/i.test(w)) push(w.replace(/vuruslari$/i, "vuruşları"));
  if (/vuruslar$/i.test(w)) push(w.replace(/vuruslar$/i, "vuruşlar"));
  if (/vurus$/i.test(w) && !/vuruslar/i.test(w)) push(w.replace(/vurus$/i, "vuruş"));
  if (/calis/i.test(w)) push(w.replace(/calis/gi, "çalış"));
  if (/gunu$/i.test(w)) push(w.replace(/gunu$/i, "günü"));
  if (/gun$/i.test(w)) push(w.replace(/gun$/i, "gün"));
  if (/penalti$/i.test(w)) push(w.replace(/penalti$/i, "penaltı"));
  if (/savasi$/i.test(w)) push(w.replace(/savasi$/i, "savaşı"));
  if (/savas$/i.test(w) && !/savasi$/i.test(w)) push(w.replace(/savas$/i, "savaş"));
  if (/ligi$/i.test(w)) push(w.replace(/ligi$/i, "liği"));
  if (/lugu$/i.test(w)) push(w.replace(/lugu$/i, "lüğü"));
  if (/luk$/i.test(w) && !/lugu$/i.test(w)) push(w.replace(/luk$/i, "lük"));
  if (/mudurlugu$/i.test(w)) push(w.replace(/mudurlugu$/i, "müdürlüğü"));
  if (/mudurluk$/i.test(w)) push(w.replace(/mudurluk$/i, "müdürlük"));
  if (/bakanligi$/i.test(w)) push(w.replace(/bakanligi$/i, "bakanlığı"));
  if (/baskanligi$/i.test(w)) push(w.replace(/baskanligi$/i, "başkanlığı"));
  if (/bayrami$/i.test(w)) push(w.replace(/bayrami$/i, "bayramı"));
  if (/cocuk$/i.test(w)) push(w.replace(/cocuk$/i, "çocuk"));
  if (/lari$/i.test(w) && !/vuruslari$/i.test(w)) push(w.replace(/lari$/i, "ları"));
  if (/leri$/i.test(w)) push(w.replace(/leri$/i, "leri"));
  if (/i$/i.test(w) && w.length > 2 && !/penalti$/i.test(w) && !/bayrami$/i.test(w)) {
    push(`${w.slice(0, -1)}ı`);
  }
  for (const variant of dotlessIVariants(w)) push(variant);

  if (/^[a-z]+$/i.test(w)) {
    push(w.replace(/s(?=u)/gi, "ş"));
    push(w.replace(/c(?=[aeiou])/gi, "ç"));
    push(w.replace(/g(?=[aeiou])/gi, "ğ"));
    push(w.replace(/u/g, "ü"));
    push(w.replace(/o/g, "ö"));
  }

  return [...out].slice(0, 10);
}

function trailingPunctuationVariants(title: string): string[] {
  const t = title.trim();
  if (!t || /[.!?…]$/.test(t)) return [];
  return [`${t}...`, `${t}…`, `${t}.`, `${t}?`, `${t}!`];
}

function cartesianLimited(arrays: string[][], limit: number): string[][] {
  let results: string[][] = [[]];
  for (const arr of arrays) {
    const next: string[][] = [];
    for (const prefix of results) {
      for (const item of arr.slice(0, 4)) {
        next.push([...prefix, item]);
        if (next.length >= limit) break;
      }
      if (next.length >= limit) break;
    }
    results = next.slice(0, limit);
  }
  return results;
}

export function turkishWikiTitleCandidates(slugOrTitle: string, max = 64): string[] {
  const base = slugToWikiTitle(slugOrTitle);
  const ordered: string[] = [];
  const seen = new Set<string>();
  const add = (t: string) => {
    const x = String(t ?? "").trim().replace(/\s+/g, " ");
    if (!x || seen.has(x)) return;
    seen.add(x);
    ordered.push(x);
  };

  add(base);
  const titled = titleCaseTurkish(base);
  if (titled !== base) add(titled);

  const words = base.split(/\s+/).filter(Boolean);
  if (words.length === 0) return ordered;

  const perWord = words.map(turkishWordAsciiVariants);
  const turkified = words
    .map((w, i) => perWord[i]!.find((v) => hasTurkishChars(v)) ?? perWord[i]![0]!)
    .join(" ");
  add(turkified);
  const turkifiedTitled = titleCaseTurkish(turkified);
  if (turkifiedTitled !== turkified) add(turkifiedTitled);

  if (base.includes(" ")) add(base.replace(/ /g, "_"));

  for (const combo of cartesianLimited(perWord, 16)) {
    const joined = combo.join(" ");
    add(joined);
    add(titleCaseTurkish(joined));
  }

  for (const v of perWord.flat()) add(v);

  const expanded = ordered.slice();
  const expandedSeen = new Set<string>();
  for (const title of expanded) expandedSeen.add(title);
  const addExpanded = (title: string) => {
    if (!title || expandedSeen.has(title)) return;
    expandedSeen.add(title);
    expanded.push(title);
  };
  for (const title of ordered) {
    addExpanded(title);
    for (const variant of trailingPunctuationVariants(title)) addExpanded(variant);
  }

  return expanded.slice(0, max);
}
