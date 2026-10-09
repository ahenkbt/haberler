import test from "node:test";
import assert from "node:assert/strict";
import { sniffFile, safeFileName, validateContact, contactMailBodies, isHmSiteContactPath, handleHmSiteContactEdge } from "./hm-site-contact-edge.js";

const bytes = (...a) => new Uint8Array([...a, ...new Array(16).fill(0)]);

test("sniffFile: magic bytes decide, client type ignored", () => {
  assert.equal(sniffFile(bytes(0xff, 0xd8, 0xff, 0xe0), "a.png").mime, "image/jpeg");
  assert.equal(sniffFile(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), "x").ext, "png");
  assert.equal(sniffFile(bytes(0x25, 0x50, 0x44, 0x46, 0x2d), "x.pdf").kind, "pdf");
  assert.equal(sniffFile(bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1), "cv.doc").ext, "doc");
  assert.equal(sniffFile(bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1), "x.xls"), null);
  const zip = new TextEncoder().encode("PK\u0003\u0004....[Content_Types].xml....word/document.xml");
  assert.equal(sniffFile(zip, "cv.docx").ext, "docx");
  assert.equal(sniffFile(new TextEncoder().encode("PK\u0003\u0004....xl/workbook.xml........"), "a.docx"), null);
  assert.equal(sniffFile(new TextEncoder().encode("<html><script>alert(1)</script>"), "a.jpg"), null);
  assert.equal(sniffFile(new TextEncoder().encode("MZ\u0090\u0000............"), "a.pdf"), null);
});

test("safeFileName strips paths and odd chars", () => {
  assert.equal(safeFileName("../../etc/passwd.jpg", "jpg"), "passwd.jpg");
  assert.equal(safeFileName("Çağrı Ölçüm.PNG", "png"), "Çağrı Ölçüm.png");
  assert.equal(safeFileName("", "pdf"), "dosya.pdf");
});

test("validateContact", () => {
  const ok = { topic: "haber", name: "Ali Veli", email: "a@b.co", message: "Merhaba bu bir test mesajıdır.", kvkk: "1", ts: String(Date.now() - 10000) };
  assert.ok(validateContact(ok).value);
  assert.match(validateContact({ ...ok, topic: "x" }).error, /konu/);
  assert.match(validateContact({ ...ok, email: "nope" }).error, /e-posta/);
  assert.match(validateContact({ ...ok, kvkk: "" }).error, /KVKK/);
  assert.match(validateContact({ ...ok, message: "kısa" }).error, /en az/);
  assert.ok(validateContact({ ...ok, ts: String(Date.now()) }).bot);
  assert.match(validateContact({ ...ok, phone: "abc" }).error, /Telefon/);
});

test("contactMailBodies escapes and labels topic", () => {
  const m = contactMailBodies({ id: 5, topic: "sikayet", name: "<b>X</b>", email: "x@y.z", message: "Metin <script>", title: "" }, [{ name: "a.jpg", size: 2048 }], "Su Haber");
  assert.match(m.subject, /^\[İletişim · Şikayet\] Metin/);
  assert.ok(!m.html.includes("<script>"));
  assert.ok(m.html.includes("&lt;b&gt;X&lt;/b&gt;"));
  assert.ok(m.text.includes("Ekler: a.jpg (2 KB)"));
});

test("paths", () => {
  assert.ok(isHmSiteContactPath("/api/hm/public/contact"));
  assert.ok(isHmSiteContactPath("/api/hm/editor/site-contact/3/files/4"));
  assert.ok(!isHmSiteContactPath("/api/hm/editor/site-mail"));
});

test("contactNewsMessage: wrapped Postgres base64 becomes a one-line data: URL", async () => {
  const { contactNewsMessage } = await import("./hm-site-contact-edge.js");
  const { extractImageUrls } = await import("./hm-site-mail-to-news.js");
  const b64 = "/9j/4AAQSkZJRgABAQ".repeat(10);
  const wrapped = b64.match(/.{1,76}/g).join("\n");
  const msql = async () => [{ mime: "image/jpeg", b64: wrapped }];
  const m = await contactNewsMessage(msql, { id: 1, attachments: [{ id: 1, kind: "image" }], message: "Merhaba dünya, test mesajı.", title: "T", name: "A", email: "a@b.c" }, { id: 5 });
  const urls = extractImageUrls(m.body_html);
  assert.equal(urls.length, 1);
  assert.equal(urls[0], `data:image/jpeg;base64,${b64}`);
});

test("PATCH /api/hm/editor/site-contact (İletişim bilgilerini kaydet) falls through to the API", async () => {
  const req = new Request("https://ankara.gundemi.org/api/hm/editor/site-contact", { method: "PATCH", body: "{}" });
  assert.equal(await handleHmSiteContactEdge(req, {}, new URL(req.url)), null);
});
