import { describe, expect, it } from "vitest";
import { aiNewsSystemPrompt, editorYonelimRewriteRules } from "./aiNewsPrompts.js";

describe("editör yönelim tonu", () => {
  it("yönelim verilmezse eski prompta ton kuralı eklemez", () => {
    const prompt = aiNewsSystemPrompt({ langInstruction: "Haberi Türkçe yaz." });
    expect(prompt).not.toContain("Kaynağın net ve açık tonunu koru");
    expect(prompt).not.toContain("özellikle ılımlı");
    expect(prompt).toContain("profesyonel bir haber editörüsün");
  });

  it("sol yeniden yazar ama kaynak tonunu korur", () => {
    const rules = editorYonelimRewriteRules("sol");
    expect(rules).toContain("yeniden yaz");
    expect(rules).toContain("aynen kopyalama");
    expect(rules).toContain("tonunu koru");
    const prompt = aiNewsSystemPrompt({ langInstruction: "Haberi Türkçe yaz.", siteYonelim: "sol" });
    expect(prompt).toContain(rules);
  });

  it("karma dengeli, sağ daha ılımlı", () => {
    const karma = editorYonelimRewriteRules("karma");
    const sag = editorYonelimRewriteRules("Sağ");
    expect(karma).toContain("orta ve dengeli");
    expect(sag).toContain("ılımlı, yumuşak ve tarafsız");
    expect(sag).not.toContain("tonunu koru");
    expect(aiNewsSystemPrompt({ langInstruction: "Haberi Türkçe yaz.", siteYonelim: "sag" })).toContain(sag);
  });
});
