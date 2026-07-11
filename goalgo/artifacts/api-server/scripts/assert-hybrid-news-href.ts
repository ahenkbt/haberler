import assert from "node:assert/strict";
import {
  coercePublicHybridNewsHref,
  isExternalNewsHref,
  mapPublicHybridNewsLinkFields,
} from "../../ahenkpress/src/lib/hybridNewsHref.ts";

const cases: Array<{ label: string; item: Parameters<typeof coercePublicHybridNewsHref>[0]; want: string }> = [
  {
    label: "rss protocol-relative href",
    item: { id: "rss:abc123", source: "rss", href: "//ntv.com.tr/gundem/test-haber" },
    want: "/haberler/rss/abc123",
  },
  {
    label: "rss absolute ntv href",
    item: { id: "rss:abc123", source: "rss", href: "https://www.ntv.com.tr/gundem/test-haber" },
    want: "/haberler/rss/abc123",
  },
  {
    label: "db protocol-relative href",
    item: { id: "db:42", slug: "ornek-haber", source: "db", href: "//ntv.com.tr/gundem/test-haber" },
    want: "/haber/ornek-haber",
  },
  {
    label: "db slug path",
    item: { id: "db:42", slug: "ornek-haber", source: "db", href: "/haber/ornek-haber" },
    want: "/haber/ornek-haber",
  },
  {
    label: "rss id prefix without source",
    item: { id: "rss:deadbeef", href: "//ntv.com.tr/" },
    want: "/haberler/rss/deadbeef",
  },
  {
    label: "rss source ignores poisoned href",
    item: { id: "rss:feed9", source: "rss", href: "https://www.ntv.com.tr/gundem/x" },
    want: "/haberler/rss/feed9",
  },
];

for (const { label, item, want } of cases) {
  const href = coercePublicHybridNewsHref(item);
  assert.equal(href, want, `${label}: href mismatch`);
  assert.equal(isExternalNewsHref(href), false, `${label}: must not be external`);
  assert.match(href, /^\//, `${label}: must be site-relative`);
}

const row = mapPublicHybridNewsLinkFields({
  id: "rss:feed1",
  source: "rss",
  title: "Test",
  href: "//ntv.com.tr/haber",
});
assert.equal(row.href, "/haberler/rss/feed1");
assert.equal(isExternalNewsHref(row.href), false);

console.log(`assert-hybrid-news-href: ${cases.length + 1} checks passed`);
