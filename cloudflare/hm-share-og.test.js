// og-preview 2026-10-08: corporate link previews (WhatsApp/Facebook/Telegram/X)
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildAhenkAgencyEntityHtml,
  buildHmNewsArticleOgHtml,
  buildHmSiteEntityHtml,
  finalizeHmShareOgHtml,
  hmBrandShareImage,
  sanitizeOgShareImages,
} from "./hm-html-boot.js";

describe("corporate share cards", () => {
  it("maps corporate hosts to 1200x630 cards", () => {
    assert.equal(hmBrandShareImage("https://www.vatankahramanlari.org/x").url, "https://vatankahramanlari.org/hm/share/vkd-og.jpg");
    assert.equal(hmBrandShareImage("vatankahramanlari.org.tr").url, "https://vatankahramanlari.org.tr/hm/share/vkd-og.jpg");
    assert.equal(hmBrandShareImage("tgd.tc").url, "https://tgd.tc/hm/share/tgd-og.jpg");
    assert.equal(hmBrandShareImage("trafikdernegi.com").width, 1200);
    assert.equal(hmBrandShareImage("ahenk.net.tr").url, "https://ahenk.net.tr/hm/share/ahenk-og.jpg");
    assert.equal(hmBrandShareImage("vatanhaber.net"), null);
  });

  it("replaces the generic app icon and adds size/alt/card", () => {
    const out = finalizeHmShareOgHtml(
      '<html><head><meta property="og:title" content="VKD"/><meta property="og:image" content="https://vatankahramanlari.org/apple-touch-icon.png"/></head></html>',
      "vatankahramanlari.org",
    );
    assert.match(out, /og:image" content="https:\/\/vatankahramanlari\.org\/hm\/share\/vkd-og\.jpg"/);
    assert.match(out, /og:image:width" content="1200"/);
    assert.match(out, /og:image:height" content="630"/);
    assert.match(out, /twitter:card" content="summary_large_image"/);
    assert.equal(out.includes("apple-touch-icon"), false);
  });

  it("keeps a real story image", () => {
    const html = buildHmNewsArticleOgHtml({ origin: "https://vatankahramanlari.org", path: "/haber/x", siteName: "VKD", title: "T", image: "https://cdn.example.com/a.jpg" });
    assert.match(html, /og:image" content="https:\/\/cdn\.example\.com\/a\.jpg"/);
    const noImg = buildHmNewsArticleOgHtml({ origin: "https://vatankahramanlari.org", path: "/haber/x", siteName: "VKD", title: "T", image: "" });
    assert.match(noImg, /vkd-og\.jpg/);
  });

  it("leaves non-corporate hosts unchanged", () => {
    const html = '<html><head><meta property="og:image" content="https://vatanhaber.net/apple-touch-icon.png"/></head></html>';
    assert.equal(finalizeHmShareOgHtml(html, "vatanhaber.net"), html);
    assert.match(sanitizeOgShareImages(html, "https://vatanhaber.net"), /apple-touch-icon/);
  });

  it("entity fallbacks carry the card and readable Turkish", () => {
    assert.match(buildHmSiteEntityHtml("trafik", "https://trafikdernegi.com", "/"), /tgd-og\.jpg/);
    const a = buildAhenkAgencyEntityHtml("/turkata-haber-ajansi");
    assert.match(a, /ahenk-og\.jpg/);
    assert.match(a, /müşteri hizmetleri/);
    assert.match(a, /TürkAta Haber Ajansı/);
    assert.equal(/[├┼─]/.test(a), false);
  });
});
