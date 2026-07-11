import assert from "node:assert/strict";
import {
  slugToWikiTitle,
  titleCaseTurkish,
  turkishWikiTitleCandidates,
} from "../src/lib/wikiSlugTitle.ts";

function includesCandidate(slug: string, expected: string): void {
  const candidates = turkishWikiTitleCandidates(slug);
  assert.ok(
    candidates.some((c) => c === expected || c.toLocaleLowerCase("tr-TR") === expected.toLocaleLowerCase("tr-TR")),
    `"${slug}" candidates should include "${expected}", got: ${candidates.join(" | ")}`,
  );
}

assert.equal(slugToWikiTitle("Cahit_Arf"), "Cahit Arf");
assert.equal(slugToWikiTitle("Seri_penalti_vuruslari"), "Seri penalti vuruslari");
assert.equal(slugToWikiTitle("Mustafa_Necati"), "Mustafa Necati");
assert.equal(slugToWikiTitle("Ankara"), "Ankara");
assert.equal(slugToWikiTitle("istanbul"), "istanbul");
assert.equal(slugToWikiTitle("orhan-pamuk"), "orhan pamuk");

includesCandidate("Seri_penalti_vuruslari", "Seri penaltı vuruşları");
includesCandidate("Cahit_Arf", "Cahit Arf");
includesCandidate("Mustafa_Necati", "Mustafa Necati");
includesCandidate("Ankara", "Ankara");
includesCandidate("istanbul", "İstanbul");
includesCandidate("findik", "Fındık");
includesCandidate("orhan-pamuk", "Orhan Pamuk");
includesCandidate("milyonlarca-kustuk", "Milyonlarca Kuştuk...");
includesCandidate("calisan-gazeteciler-gunu", "Çalışan Gazeteciler Günü");
includesCandidate("ulusal-egemenlik-ve-cocuk-bayrami", "Ulusal Egemenlik Ve Çocuk Bayramı");
includesCandidate("emniyet-genel-mudurlugu", "Emniyet Genel Müdürlüğü");

assert.equal(titleCaseTurkish("istanbul"), "İstanbul");
assert.equal(titleCaseTurkish("ankara"), "Ankara");

console.log("assert-wiki-slug-titles: ok");
