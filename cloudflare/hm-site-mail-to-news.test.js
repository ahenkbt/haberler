import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanSubject,
  htmlToText,
  trimMailText,
  textToParagraphHtml,
  extractImageUrls,
  suggestCategory,
  buildDraftFromMail,
  parseFromHeader,
  makeSpot,
} from "./hm-site-mail-to-news.js";

test("subject: Re/Fwd/YNT/İLT prefixes removed", () => {
  assert.equal(cleanSubject("Fwd: RE: YNT: Belediyeden yeni park"), "Belediyeden yeni park");
  assert.equal(cleanSubject("[Dış] İLT: Fw: Basın bülteni"), "Basın bülteni");
  assert.equal(cleanSubject("Retro festival başladı"), "Retro festival başladı");
});

test("body: signature, disclaimer, quoted reply trimmed; forwarded part used", () => {
  const t = "Merhaba,\n\nİlçemizde yeni park açıldı.\n\nSaygılarımla\nAli Veli\nBu e-posta gizlidir.";
  assert.equal(trimMailText(t), "Merhaba,\n\nİlçemizde yeni park açıldı.");
  const fwd = "bilginize\n\n---------- Forwarded message ---------\nFrom: A <a@b.c>\nDate: 8 Eki\nSubject: X\nTo: b@c.d\n\nHaber metni burada.\n\n> eski yanıt";
  assert.equal(trimMailText(fwd), "Haber metni burada.");
  assert.equal(trimMailText("Metin\n\nOn Thu, Oct 8, 2026 Ali <a@b.c> wrote:\n> alıntı"), "Metin");
  assert.equal(trimMailText("Metin\n\nSent from my iPhone"), "Metin");
});

test("html: flattened to safe paragraphs (no scripts, no attributes)", () => {
  const txt = htmlToText('<p onclick="x()">Bir <b>iki</b></p><script>alert(1)</script><div>Üç&nbsp;&amp; dört</div>');
  assert.equal(txt, "Bir iki\n\nÜç & dört");
  assert.equal(textToParagraphHtml('a <img src=x onerror=alert(1)>\n\nb'), "<p>a &lt;img src=x onerror=alert(1)&gt;</p>\n<p>b</p>");
});

test("images: http(s)/data pictures kept, pixels/logos/cid skipped", () => {
  const html = '<img src="cid:abc"><img src="https://x.com/pixel.gif" width="1"><img src="https://x.com/logo.png"><img src="https://x.com/foto1.jpg" width="800"><img src="data:image/png;base64,AAAA">';
  assert.deepEqual(extractImageUrls(html), ["https://x.com/foto1.jpg", "data:image/png;base64,AAAA"]);
});

test("category suggestion uses the site's own categories", () => {
  const cats = [{ slug: "gundem", name: "Gündem" }, { slug: "spor", name: "Spor" }, { slug: "ekonomi", name: "Ekonomi" }];
  assert.equal(suggestCategory("Galatasaray maçı 3 gol ile kazandı, teknik direktör açıklama yaptı", cats), "spor");
  assert.equal(suggestCategory("Asgari ücret ve enflasyon açıklandı", cats), "ekonomi");
  assert.equal(suggestCategory("Belediye yeni park açtı", cats), "gundem");
  assert.equal(suggestCategory("Su tasarrufu için kampanya; maçı izledi", cats), "spor");
  assert.equal(suggestCategory("Tasarruf için yeni kampanya", [...cats, { slug: "dunya", name: "Dünya" }]), "gundem");
  assert.equal(suggestCategory("x", []), "");
});

test("draft from mail", () => {
  const d = buildDraftFromMail({ subject: "Fwd: Park açıldı", text: "Kentimizde yeni park hizmete girdi. Açılışa çok sayıda vatandaş katıldı.\n\nİyi çalışmalar", html: "" });
  assert.equal(d.title, "Park açıldı");
  assert.match(d.content, /^<p>Kentimizde yeni park/);
  assert.doesNotMatch(d.content, /İyi çalışmalar/);
  assert.ok(makeSpot(d.bodyText).startsWith("Kentimizde"));
  assert.deepEqual(parseFromHeader('"Ali Veli" <Ali@X.com>'), { name: "Ali Veli", email: "ali@x.com" });
});
