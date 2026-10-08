import test from "node:test";
import assert from "node:assert/strict";
import {
  conventionalAddressForHost,
  conventionalAddressesForSite,
  ownedMailDomainsForSite,
  isHmNewsSite,
} from "./hm-site-mail-convention.js";
import { decodeQpIfEncoded } from "./hm-site-mail-edge.js";

test("quoted-printable bodies are decoded for display only when clearly encoded", () => {
  assert.equal(decodeQpIfEncoded("Edit=C3=B6r paneli =C3=A7ok"), "Editör paneli çok");
  assert.equal(decodeQpIfEncoded("a=b and c=d"), "a=b and c=d");
  assert.equal(decodeQpIfEncoded("Editör"), "Editör");
});

test("convention: subdomain sites use <sub>@<parent>, apex domains bilgi@<domain>", () => {
  assert.equal(conventionalAddressForHost("kibris.gundemi.org"), "kibris@gundemi.org");
  assert.equal(conventionalAddressForHost("www.sosyalhizmetler.tr"), "bilgi@sosyalhizmetler.tr");
  assert.equal(conventionalAddressForHost("gundemi.org"), "bilgi@gundemi.org");
  assert.equal(conventionalAddressForHost("ankarasehirgazetesi.com.tr"), "bilgi@ankarasehirgazetesi.com.tr");
  assert.equal(conventionalAddressForHost("yeni.fix.tc"), "yeni@fix.tc");
  assert.equal(conventionalAddressForHost("haberler.pages.dev"), "");
});

test("convention: site addresses and owned domains", () => {
  const site = { id: 9, slug: "kibris", domain: "kibris.gundemi.org", domain2: "kibris.fix.tc" };
  assert.deepEqual(conventionalAddressesForSite(site), ["kibris@gundemi.org", "kibris@fix.tc"]);
  assert.deepEqual(ownedMailDomainsForSite(site), []);
  assert.deepEqual(ownedMailDomainsForSite({ id: 1, slug: "sosyal", domain: "sosyalhizmetler.tr" }), ["sosyalhizmetler.tr"]);
  assert.equal(isHmNewsSite({ id: 5, slug: "vkd", domain: "vkd.org.tr" }), false);
});
