import { describe, expect, it } from "vitest";
import { isHmTgdPremiumBody, parseHmTgdPremiumBody } from "./hmTgdPremiumPage";

describe("hmTgdPremiumPage", () => {
  it("detects tgd-archive and hm-tgd-page bodies", () => {
    expect(isHmTgdPremiumBody("<p>x</p>", "tgd-archive")).toBe(true);
    expect(isHmTgdPremiumBody('<div class="hm-tgd-page"><h1>A</h1></div>')).toBe(true);
    expect(isHmTgdPremiumBody("<p>plain</p>", "wordpress-template")).toBe(false);
  });

  it("extracts title, lead and hero image for premium shell", () => {
    const html = `<div class="hm-tgd-page">
<p><img src="https://example.com/hero.jpg"/></p>
<h1>Seviye 3 Baş Denetçi</h1>
<p>Sistem kurucu ve bağımsız denetçidir. Sahada günlük operasyonda yer almaz.</p>
<h2>Görevler</h2>
<ul><li>Risk analizi</li></ul>
</div>`;
    const parsed = parseHmTgdPremiumBody(html, "Fallback");
    expect(parsed.title).toBe("Seviye 3 Baş Denetçi");
    expect(parsed.lead).toMatch(/Sistem kurucu/);
    expect(parsed.heroImage).toBe("https://example.com/hero.jpg");
    expect(parsed.bodyHtml).toContain("<h2>Görevler</h2>");
    expect(parsed.bodyHtml).not.toContain("<h1>");
    expect(parsed.bodyHtml).not.toContain("hero.jpg");
  });
});
