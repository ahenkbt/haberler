import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isTukavHost,
  rewriteSpaShellOgForTukav,
  TUKAV_BRAND_NAME,
  TUKAV_OG_IMAGE_PATH,
} from "./tukav-brand-edge.js";

describe("tukav-brand-edge", () => {
  it("recognizes tukav hosts without touching other brands", () => {
    assert.equal(isTukavHost("tukav.org"), true);
    assert.equal(isTukavHost("www.tukav.org"), true);
    assert.equal(isTukavHost("https://tukav.org/"), true);
    assert.equal(isTukavHost("yekpare.net"), false);
    assert.equal(isTukavHost("turksav.org"), false);
    assert.equal(isTukavHost("turkatav.org"), false);
  });

  it("rewrites Yekpare SPA OG shell to TUKAV brand", () => {
    const spa = `<!DOCTYPE html><html><head>
<title>Yekpare Süper App</title>
<meta name="description" content="Şehri Yekpare Yaşa." />
<meta property="og:title" content="Yekpare Süper App — Sipariş" />
<meta property="og:description" content="Keşfet, Sipariş Et" />
<meta property="og:site_name" content="Yekpare Süper App" />
<meta property="og:url" content="https://yekpare.net/" />
<meta property="og:image" content="https://yekpare.net/opengraph.jpg" />
<meta name="twitter:title" content="Yekpare" />
<meta name="twitter:description" content="Yekpare" />
<meta name="twitter:image" content="https://yekpare.net/opengraph.jpg" />
<link rel="canonical" href="https://yekpare.net/" />
<script type="application/ld+json" data-yekpare-portal-jsonld="1">{"name":"Yekpare"}</script>
</head><body></body></html>`;
    const out = rewriteSpaShellOgForTukav(spa, "https://tukav.org");
    assert.match(
      out,
      new RegExp(`og:site_name" content="${TUKAV_BRAND_NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`),
    );
    assert.match(out, /og:title" content="TUKAV/);
    assert.match(out, /og:description" content="Türk Ruhunu Yaşat/);
    assert.match(
      out,
      new RegExp(`og:image" content="https://tukav\\.org${TUKAV_OG_IMAGE_PATH.replace(/\./g, "\\.")}"`),
    );
    assert.match(out, /canonical" href="https:\/\/tukav\.org\/"/);
    assert.equal(out.includes("Yekpare Süper App"), false);
    assert.equal(out.includes("yekpare.net/opengraph"), false);
    assert.equal(out.includes("data-yekpare-portal-jsonld"), false);
    assert.match(out, /"@type":"NGO"/);
  });
});
