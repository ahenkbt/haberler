<?php
/**
 * AnkaraHaber — Tüm Yazarlar Listesi
 * Route: /yazarlar  (AhenkPress bunu otomatik bulur)
 */
defined('ROOT') or die();
Theme::partial('header');

$yazarlar = [];
try {
    $yazarlar = DB::query("
        SELECT c.*,
               COUNT(p.id) AS yazi_sayisi,
               MAX(p.published_at) AS son_yazi_tarihi
        FROM `{p}columnists` c
        LEFT JOIN `{p}posts` p ON p.columnist_id = c.id
                               AND p.status = 'published'
                               AND p.post_type = 'columnist'
        WHERE c.active = 1
        GROUP BY c.id
        ORDER BY c.sort_order, c.id
    ");
} catch (\Throwable) {
    // Basit fallback
    try { $yazarlar = DB::query("SELECT * FROM `{p}columnists` WHERE active=1 ORDER BY sort_order"); } catch (\Throwable) {}
}

$siteUrl = ap_url();
$siteName= DB::setting('site_name', 'Ankara Haber');
?>
<main class="site-main">
  <div class="container" style="padding-top:24px;padding-bottom:40px">

    <!-- Sayfa Başlık -->
    <div style="background:#fff;border-radius:10px;padding:20px 24px;margin-bottom:28px;box-shadow:0 2px 8px rgba(0,0,0,.07);display:flex;align-items:center;gap:14px">
      <div style="width:6px;height:44px;background:#CC0000;border-radius:4px;flex-shrink:0"></div>
      <div>
        <h1 style="font-size:22px;font-weight:900;color:#1a1a1a;margin:0 0 4px">Köşe Yazarları</h1>
        <p style="font-size:13px;color:#666;margin:0"><?= e($siteName) ?> köşe yazarlarının tüm yazıları</p>
      </div>
    </div>

    <!-- Yazarlar Grid -->
    <?php if (!empty($yazarlar)): ?>
    <div class="yazarlar-grid-buyuk">
      <?php foreach ($yazarlar as $y): ?>
      <div class="yazar-kart">
        <a href="<?= e(ap_url('yazar/' . $y['slug'])) ?>" class="yazar-kart-link">
          <?php if ($y['avatar']): ?>
            <img src="<?= e(ap_thumb_url($y['avatar'])) ?>" alt="<?= e($y['name']) ?>" class="yazar-kart-resim" loading="lazy">
          <?php else: ?>
            <div class="yazar-kart-resim" style="background:linear-gradient(135deg,#1a1a1a,#CC0000);display:flex;align-items:center;justify-content:center">
              <span style="font-size:52px;color:rgba(255,255,255,.3)">✍️</span>
            </div>
          <?php endif; ?>
        </a>
        <div class="yazar-kart-ic">
          <div class="yazar-kart-ad"><?= e($y['name']) ?></div>
          <?php if ($y['title']): ?>
          <div class="yazar-kart-unvan"><?= e($y['title']) ?></div>
          <?php endif; ?>
          <?php if ($y['bio']): ?>
          <div class="yazar-kart-bio"><?= e($y['bio']) ?></div>
          <?php endif; ?>
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px">
            <?php if ($y['yazi_sayisi'] > 0): ?>
            <span style="font-size:11px;color:#888"><i class="fa fa-pen-nib"></i> <?= number_format((int)$y['yazi_sayisi']) ?> yazı</span>
            <?php endif; ?>
            <a href="<?= e(ap_url('yazar/' . $y['slug'])) ?>" class="yazar-kart-btn">Yazıları Oku →</a>
          </div>
        </div>
      </div>
      <?php endforeach; ?>
    </div>

    <?php else: ?>
    <div style="background:#fff;border-radius:10px;padding:60px;text-align:center;color:#888">
      <div style="font-size:48px;margin-bottom:12px">✍️</div>
      <h2 style="font-size:18px;font-weight:700;color:#1a1a1a;margin-bottom:8px">Henüz Köşe Yazarı Eklenmemiş</h2>
      <p style="margin-bottom:20px">Admin panelinden köşe yazarı ekleyebilirsiniz.</p>
      <?php if (Auth::check()): ?>
      <a href="/admin?page=columnists" style="background:#CC0000;color:#fff;padding:10px 24px;border-radius:8px;font-weight:700">
        <i class="fa fa-plus"></i> Yazar Ekle
      </a>
      <?php endif; ?>
    </div>
    <?php endif; ?>

  </div>
</main>
<?php Theme::partial('footer'); ?>
