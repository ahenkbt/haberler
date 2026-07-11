/** Haberler.com makale HTML'inde gövde sonu (Kaynak satırı). */
function truncateHaberlerAfterKaynak(html: string): string {
  let out = String(html ?? "");
  const kaynakRe = /Kaynak:\s*[^<\n]{0,240}/i;
  const m = out.match(kaynakRe);
  if (!m || m.index === undefined || m.index < 60) return out;

  let end = m.index + m[0].length;
  const tail = out.slice(end);
  const close = tail.match(/^[\s\S]*?(?:<\/p>|<\/div>|<\/span>)/i);
  if (close?.[0]) end += close[0].length;
  return out.slice(0, end);
}

function truncateHaberlerAtMarkers(html: string): string {
  let out = html;
  const endMarkers = [
    'class="new3news-related',
    'class="hbRelated',
    'id="yorumAlan',
    'class="news-tags"',
    'class="new3detail-right"',
    'id="detaySag"',
    'class="new3card-reklam-container"',
    'id="yorum_blok"',
    'class="hbDetay"',
    'class="related-news',
    'class="ilgili-haber',
    'class="benzer-haber',
    "</article>",
    "<footer",
    'class="footer-container"',
    'class="footer-section"',
    'class="news-detail-container"',
    'class="news-container"',
    ">Yeni Haberler<",
    ">İlgili Haberler<",
    ">Benzer Haberler<",
    "UYGULAMAMIZI İNDİRİN",
    "Haberler.com:",
    "tiktok.com",
    "t.me/",
    "play.google.com",
    "apps.apple.com",
    "appgallery.huawei.com",
  ];
  const ends = endMarkers.map((m) => out.indexOf(m)).filter((i) => i > 80);
  if (ends.length) out = out.slice(0, Math.min(...ends));
  return out;
}

/** Haberler.com makale HTML'inden paylaşım, ilgili haber, footer ve site kromunu çıkarır. */
export function stripHaberlerShareAndChrome(html: string): string {
  let out = truncateHaberlerAtMarkers(truncateHaberlerAfterKaynak(String(html ?? "")));

  out = out
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<div[^>]*\bnew3detail-box-container\b[^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(/<div[^>]*\bnew3card-reklam-container\b[^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(/<div[^>]*\bnew3card-reklam\b[^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(/<div[^>]*\b(?:new3news-related|hbRelated|related-news|ilgili|benzer)[^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(/<ul[^>]*\b(?:related|ilgili|benzer)[^>]*>[\s\S]*?<\/ul>/gi, "")
    .replace(/<div[^>]*\bdetaySag\b[^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(/<div[^>]*\bnews-detail-container\b[^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(/<div[^>]*\bnews-container\b[^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(/<div[^>]*\bfooter[\w-]*\b[^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<div[^>]*\bid="detay_[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(
      /<a[^>]*(?:id="share-(?:facebook|twitter|whatsapp)"|facebook\.com\/sharer|twitter\.com\/intent|wa\.me\/\?|haberler\.com\/[^"]*-haberi|tiktok\.com|t\.me\/|play\.google|apps\.apple|appgallery)[^>]*>[\s\S]*?<\/a>/gi,
      "",
    )
    .replace(/<a[^>]*href="[^"]*(?:-haberi\/?|haberler\.com|tiktok\.com|t\.me\/|play\.google|apps\.apple)[^"]*"[^>]*>[\s\S]*?<\/a>/gi, "")
    .replace(
      /<img[^>]*(?:detail-(?:facebook|x|wp|news)|headericons\/(?:Facebook|whatsapp)|haberler\.com\/mstatic|haberler_white|haberler\.svg|appstore|google-play|appgallery|cnn|cnnturk|tiktok|telegram)[^>]*>/gi,
      "",
    )
    .replace(/<figure[^>]*class="[^"]*new3video-thumbnail[^"]*"[^>]*>[\s\S]*?<\/figure>/gi, "")
    .replace(/<h[1-6][^>]*>[^<]*(?:Yeni Haberler|İlgili Haberler|Benzer Haberler|UYGULAMAMIZI İNDİRİN)[^<]*<\/h[1-6]>/gi, "")
    .replace(/<section[^>]*>[\s\S]*?<\/section>/gi, (block) =>
      /haberler\.com|app\s*store|google\s*play|uygulamamızı\s*indir|tiktok|telegram/i.test(block) ? "" : block,
    )
    .replace(/<h1[^>]*\bid="title"[^>]*>[\s\S]*?<\/h1>/gi, "")
    .replace(/<[^>]+>[^<]*©\s*Copyright[^<]*<\/[^>]+>/gi, "")
    .replace(/©\s*Copyright\s*\d{4}[^<]*/gi, "")
    .replace(/Haberler\.com:\s*[^<]{0,800}/gi, "")
    .replace(/<p[^>]*>\s*<\/p>/gi, "")
    .replace(/<div[^>]*>\s*<\/div>/gi, "");

  return out.trim();
}
