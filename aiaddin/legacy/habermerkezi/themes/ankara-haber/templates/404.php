<?php
/**
 * AnkaraHaber — 404 Sayfası
 */
defined('ROOT') or die();
Theme::partial('header');
$siteUrl = ap_url();
?>
<main class="site-main">
  <div class="container" style="padding:80px 16px;text-align:center">
    <div style="font-size:96px;font-weight:900;color:#CC0000;line-height:1">404</div>
    <h1 style="font-size:28px;font-weight:900;color:#1a1a1a;margin:16px 0 10px">Sayfa Bulunamadı</h1>
    <p style="font-size:15px;color:#888;max-width:480px;margin:0 auto 28px;line-height:1.65">
      Aradığınız sayfa taşınmış, silinmiş veya hiç var olmamış olabilir.
    </p>
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
      <a href="<?= $siteUrl ?>" style="background:#CC0000;color:#fff;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px">
        <i class="fa fa-home"></i> Ana Sayfaya Dön
      </a>
      <a href="<?= e(ap_url('arama')) ?>" style="background:#1a1a1a;color:#fff;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px">
        <i class="fa fa-search"></i> Haber Ara
      </a>
    </div>

    <!-- Son haberler -->
    <div style="margin-top:56px">
      <h2 style="font-size:16px;font-weight:700;color:#1a1a1a;margin-bottom:18px">Son Haberler</h2>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;text-align:left">
        <?php
        try { $son = PostType::getPosts(['post_type'=>'news','status'=>'published','limit'=>4]); }
        catch (\Throwable) { $son = []; }
        foreach ($son as $s): ?>
        <a href="<?= e(ap_url($s['slug'])) ?>" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
          <img src="<?= e(ap_thumb_url($s['cover_image'])) ?>" alt="" style="width:100%;height:110px;object-fit:cover;display:block" loading="lazy">
          <div style="padding:10px">
            <div style="font-size:12px;font-weight:700;color:#1a1a1a;line-height:1.4;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden"><?= e($s['title']) ?></div>
          </div>
        </a>
        <?php endforeach; ?>
      </div>
    </div>
  </div>
</main>
<?php Theme::partial('footer'); ?>
