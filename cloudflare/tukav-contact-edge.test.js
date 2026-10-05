import assert from "node:assert/strict";
import test from "node:test";
import { patchTukavContactPayload, patchTukavOrganization } from "./tukav-contact-edge.js";

test("tukav iletişim e-postasını ve telefonunu değiştirir", () => {
  const patched = patchTukavOrganization({
    slug: "turk-kulturunu-arastirma-ve-tanitma-vakfi",
    customDomain: "tukav.org",
    email: "tukav06@gmail.com",
    phone: "0541 3136245",
    whatsapp: "0541 3136245",
    workingHours: "tukav06@gmail.com",
    pages: [{ body: "Yazın: tukav06@gmail.com veya 0541 3136245" }],
  });
  assert.equal(patched.email, "bilgi@tukav.org");
  assert.equal(patched.phone, "0532 229 1892");
  assert.equal(patched.whatsapp, "0532 229 1892");
  assert.equal(patched.workingHours, "Pazartesi – Cuma: 09:00 – 18:00");
  assert.equal(patched.pages[0].body, "Yazın: bilgi@tukav.org veya 0532 229 1892");
});

test("başka kuruluşun iletişimine dokunmaz", () => {
  const other = {
    slug: "baska",
    email: "bilgi@ornek.org",
    phone: "0312 000 00 00",
  };
  assert.equal(patchTukavOrganization(other), other);
  const payload = patchTukavContactPayload({
    organization: {
      slug: "turkatav",
      email: "tukav06@gmail.com",
      phone: "0541 313 62 45",
      whatsapp: "",
    },
    organizations: [other],
  });
  assert.equal(payload.organization.email, "bilgi@tukav.org");
  assert.equal(payload.organization.phone, "0532 229 1892");
  assert.equal(payload.organizations[0].email, "bilgi@ornek.org");
});
