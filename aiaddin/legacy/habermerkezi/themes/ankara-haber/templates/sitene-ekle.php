<?php
/**
 * AnkaraHaber — Sitene Ekle (Widget Kod Oluşturucu)
 * /sitene-ekle adresinde çalışır
 * İframe/embed widget kodu oluşturur
 */
defined('ROOT') or die();

$siteUrl  = rtrim(DB::setting('site_url', ''), '/');
$siteName = DB::setting('site_name', 'Haber');
$anaRenk  = DB::setting('theme_renk_ana', '#CC0000');

// Önizleme verileri
$mansetHaberler = [];
$sonHaberler    = [];
try {
    $mansetHaberler = DB::query(
        "SELECT p.title, p.slug, p.cover_image, c.name AS cat_name, c.color AS cat_color
         FROM `{p}posts` p LEFT JOIN `{p}categories` c ON c.id=p.category_id
         WHERE p.status='published' AND p.post_type IN ('news','post')
         ORDER BY p.published_at DESC LIMIT 6"
    );
    $sonHaberler = DB::query(
        "SELECT p.title, p.slug, p.published_at
         FROM `{p}posts` p
         WHERE p.status='published' AND p.post_type IN ('news','post')
         ORDER BY p.published_at DESC LIMIT 8"
    );
} catch (\Throwable) {}

Theme::partial('header', ['title' => 'Sitene Ekle']);
?>
<style>
:root{--ana:<?= e($anaRenk) ?>}
.se-wrap{max-width:1100px;margin:0 auto;padding:24px 16px 60px}
.se-hero{text-align:center;padding:40px 16px;background:linear-gradient(135deg,#1a1a1a 0%,#2d0000 100%);border-radius:16px;margin-bottom:28px;color:#fff}
.se-hero h1{font-size:28px;font-weight:900;margin-bottom:8px}
.se-hero p{font-size:14px;color:rgba(255,255,255,.7);max-width:540px;margin:0 auto}
.se-kart{background:#fff;border-radius:14px;box-shadow:0 2px 12px rgba(0,0,0,.07);overflow:hidden;margin-bottom:20px}
.se-kart-baslik{padding:16px 20px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:10px;font-size:16px;font-weight:800;color:#1a1a1a}
.se-kart-icerik{padding:20px}
.se-ongizle{background:#f8fafc;border-radius:10px;padding:12px;margin-bottom:14px;max-height:200px;overflow:auto}
.se-kod-wrap{position:relative}
.se-kod{background:#1e293b;color:#a8dadc;font-size:11px;font-family:monospace;padding:14px;border-radius:8px;overflow:auto;max-height:160px;white-space:pre;line-height:1.6}
.se-kopyala{position:absolute;top:8px;right:8px;background:var(--ana);color:#fff;border:none;padding:5px 12px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer}
.se-kopyala:hover{opacity:.85}
.se-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.se-haber-satir{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9}
.se-haber-satir:last-child{border:none}
.se-haber-baslik{font-size:12px;font-weight:600;color:#1a1a1a;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.se-haber-zaman{font-size:10px;color:#94a3b8;white-space:nowrap}
.se-manset-mini{display:flex;gap:8px;flex-wrap:wrap}
.se-manset-item{flex:0 0 calc(50% - 4px);background:#f8fafc;border-radius:8px;overflow:hidden}
.se-manset-img{width:100%;height:70px;background:#e2e8f0 no-repeat center/cover}
.se-manset-adi{font-size:11px;font-weight:600;color:#1a1a1a;padding:6px 8px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}

@media(max-width:600px){.se-grid{grid-template-columns:1fr}}
</style>

<div class="se-wrap">

  <div class="se-hero">
    <h1>📡 Sitene Ekle</h1>
    <p><?= e($siteName) ?> içeriklerini kendi web sitenizde ücretsiz yayınlayın. İstediğiniz şablonu seçin ve kodu yapıştırın — içerikler otomatik güncellenir.</p>
  </div>

  <div class="se-grid">

    <!-- ŞABLON 1: Son Haberler Bandı -->
    <div class="se-kart">
      <div class="se-kart-baslik">📰 Son Haberler Bandı</div>
      <div class="se-kart-icerik">
        <div class="se-ongizle">
          <?php foreach (array_slice($sonHaberler, 0, 5) as $h): ?>
          <div class="se-haber-satir">
            <div style="flex:1">
              <div class="se-haber-baslik"><?= e($h['title']) ?></div>
            </div>
            <div class="se-haber-zaman"><?= ap_time_ago($h['published_at']) ?></div>
          </div>
          <?php endforeach; ?>
        </div>
        <div class="se-kod-wrap">
          <div class="se-kod" id="kod1"><?php
$kod1 = '<script>
(function(){
  var s=document.createElement("script");
  s.src="' . $siteUrl . '/api/widget.js?tip=son-haberler&limit=8";
  document.head.appendChild(s);
})();
</script>
<div id="ahk-son-haberler"></div>';
echo htmlspecialchars($kod1);
?></div>
          <button class="se-kopyala" onclick="seKopyala('kod1',this)">Kopyala</button>
        </div>
        <div style="margin-top:8px;font-size:11px;color:#94a3b8">Alternatif: iFrame yöntemi</div>
        <div class="se-kod-wrap" style="margin-top:6px">
          <div class="se-kod" id="kod1b"><?php
$kod1b = '<iframe src="' . $siteUrl . '/embed/son-haberler" width="320" height="400" frameborder="0" scrolling="auto" style="border-radius:10px"></iframe>';
echo htmlspecialchars($kod1b);
?></div>
          <button class="se-kopyala" onclick="seKopyala('kod1b',this)">Kopyala</button>
        </div>
      </div>
    </div>

    <!-- ŞABLON 2: Manşet Haberler -->
    <div class="se-kart">
      <div class="se-kart-baslik">🖼 Manşet Haberleri</div>
      <div class="se-kart-icerik">
        <div class="se-ongizle">
          <div class="se-manset-mini">
            <?php foreach (array_slice($mansetHaberler, 0, 4) as $h):
              $img = $h['cover_image'] ? ap_thumb_url($h['cover_image'], 'small') : '';
            ?>
            <div class="se-manset-item">
              <?php if ($img): ?><div class="se-manset-img" style="background-image:url('<?= e($img) ?>')"></div><?php endif; ?>
              <div class="se-manset-adi"><?= e($h['title']) ?></div>
            </div>
            <?php endforeach; ?>
          </div>
        </div>
        <div class="se-kod-wrap">
          <div class="se-kod" id="kod2"><?php
$kod2 = '<iframe src="' . $siteUrl . '/embed/manseta" width="640" height="360" frameborder="0" allowfullscreen style="border-radius:12px;max-width:100%"></iframe>';
echo htmlspecialchars($kod2);
?></div>
          <button class="se-kopyala" onclick="seKopyala('kod2',this)">Kopyala</button>
        </div>
      </div>
    </div>

    <!-- ŞABLON 3: Ticker (Kayan Bant) -->
    <div class="se-kart">
      <div class="se-kart-baslik">📡 Kayan Haber Bandı (Ticker)</div>
      <div class="se-kart-icerik">
        <div class="se-ongizle" style="background:#1a1a1a;border-radius:8px;padding:10px;white-space:nowrap;overflow:hidden">
          <span style="color:#CC0000;font-weight:700;font-size:12px">SON DAKİKA</span>
          <span style="color:#fff;font-size:12px;animation:slide 8s linear infinite;display:inline-block;margin-left:12px">
            <?= e(implode(' • ', array_column(array_slice($sonHaberler, 0, 3), 'title'))) ?>
          </span>
        </div>
        <div class="se-kod-wrap" style="margin-top:12px">
          <div class="se-kod" id="kod3"><?php
$kod3 = '<iframe src="' . $siteUrl . '/embed/ticker" width="100%" height="48" frameborder="0" scrolling="no" style="max-width:100%;border-radius:4px"></iframe>';
echo htmlspecialchars($kod3);
?></div>
          <button class="se-kopyala" onclick="seKopyala('kod3',this)">Kopyala</button>
        </div>
      </div>
    </div>

    <!-- ŞABLON 4: RSS Besleme -->
    <div class="se-kart">
      <div class="se-kart-baslik">📶 RSS Besleme Linki</div>
      <div class="se-kart-icerik">
        <p style="font-size:12px;color:#64748b;margin-bottom:12px">RSS okuyucunuza ekleyerek tüm haberleri takip edin.</p>
        <div class="se-kod-wrap">
          <div class="se-kod" id="kod4"><?= htmlspecialchars($siteUrl . '/feed.xml') ?></div>
          <button class="se-kopyala" onclick="seKopyala('kod4',this)">Kopyala</button>
        </div>
        <div style="margin-top:10px;font-size:11px;color:#94a3b8">Kategori bazlı: <code><?= e($siteUrl) ?>/feed.xml?kategori=gundem</code></div>
      </div>
    </div>

  </div>

  <div style="margin-top:20px;padding:16px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;font-size:12px;color:#92400e">
    💡 <strong>Not:</strong> Embed kodları gerçek zamanlı olarak <?= e($siteName) ?> sunucusundan içerik çeker.
    Sitenizde iframe'lere izin verilen bir içerik güvenliği politikası olduğundan emin olun.
    Sorun yaşarsanız RSS besleme yöntemini tercih edin.
  </div>

</div>

<script>
function seKopyala(id, btn) {
  var el = document.getElementById(id);
  var text = el.innerText || el.textContent;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text.trim()).then(function(){
      btn.textContent = '✅ Kopyalandı';
      setTimeout(function(){ btn.textContent = 'Kopyala'; }, 2000);
    });
  } else {
    var ta = document.createElement('textarea');
    ta.value = text.trim();
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    btn.textContent = '✅ Kopyalandı';
    setTimeout(function(){ btn.textContent = 'Kopyala'; }, 2000);
  }
}
</script>

<?php Theme::partial('footer'); ?>
