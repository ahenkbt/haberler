<?php
/**
 * AnkaraHaber — Köşe Yazısı Detay
 */
defined('ROOT') or die();
Theme::partial('header');

$post = Theme::var('post');
if (!$post) { http_response_code(404); include Theme::path('templates/404.php'); exit; }

$columnist = null;
if ($post['columnist_id']) {
    try { $columnist = DB::queryRow("SELECT * FROM `{p}columnists` WHERE id=?", [$post['columnist_id']]); } catch (\Throwable) {}
}

$sonYazilar = [];
if ($post['columnist_id']) {
    try {
        $sonYazilar = PostType::getPosts(['post_type'=>'columnist','status'=>'published','limit'=>5]);
        $sonYazilar = array_filter($sonYazilar, fn($p) => $p['id'] !== $post['id'] && $p['columnist_id'] == $post['columnist_id']);
        $sonYazilar = array_slice(array_values($sonYazilar), 0, 4);
    } catch (\Throwable) {}
}

$siteUrl  = ap_url();
$postUrl  = ap_url($post['slug']);
$shareUrl = rawurlencode($postUrl);
$shareTitle = rawurlencode($post['title']);
?>
<main class="site-main haber-detay-main">
  <div class="container" style="padding-top:20px">

    <!-- Yazar Bant -->
    <?php if ($columnist): ?>
    <div style="background:linear-gradient(135deg,#1a1a1a 0,#2d2d2d 100%);border-radius:10px;padding:24px;margin-bottom:22px;display:flex;align-items:center;gap:20px">
      <img src="<?= e(ap_thumb_url($columnist['avatar'])) ?>" alt="<?= e($columnist['name']) ?>"
           style="width:90px;height:90px;border-radius:50%;object-fit:cover;border:3px solid #CC0000;flex-shrink:0">
      <div>
        <div style="font-size:20px;font-weight:900;color:#fff"><?= e($columnist['name']) ?></div>
        <div style="font-size:13px;color:#CC0000;margin-bottom:8px;font-weight:600"><?= e($columnist['title']??'') ?></div>
        <?php if ($columnist['bio']): ?>
        <div style="font-size:13px;color:rgba(255,255,255,.7);line-height:1.55"><?= e(mb_substr($columnist['bio'],0,180)) ?>…</div>
        <?php endif; ?>
      </div>
    </div>
    <?php endif; ?>

    <div class="icerik-sidebar-sarici">
      <article class="haber-detay-icerik">

        <!-- Başlık -->
        <header style="background:#fff;padding:22px;border-radius:10px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,.07)">
          <span style="display:inline-block;background:#CC0000;color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:3px;margin-bottom:10px;letter-spacing:.5px">KÖŞE YAZISI</span>
          <h1 style="font-size:26px;font-weight:900;color:#1a1a1a;line-height:1.35;margin:0 0 12px"><?= e($post['title']) ?></h1>
          <?php if ($post['excerpt']): ?>
          <p style="font-size:14px;color:#555;line-height:1.65;border-left:3px solid #CC0000;padding-left:12px"><?= e($post['excerpt']) ?></p>
          <?php endif; ?>
          <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;font-size:12px;color:#888;margin-top:12px">
            <?php if ($columnist): ?><span><i class="fa fa-pen-nib"></i> <?= e($columnist['name']) ?></span><?php endif; ?>
            <span><i class="fa fa-calendar"></i> <?= ap_date($post['published_at']??$post['created_at']) ?></span>
            <span><i class="fa fa-eye"></i> <?= number_format((int)$post['views']) ?> okuma</span>
          </div>
          <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
            <a href="https://www.facebook.com/sharer/sharer.php?u=<?= $shareUrl ?>" target="_blank" rel="noopener" style="background:#1877F2;color:#fff;padding:6px 12px;border-radius:5px;font-size:11px;font-weight:600;display:flex;align-items:center;gap:4px"><i class="fab fa-facebook-f"></i> Facebook</a>
            <a href="https://wa.me/?text=<?= $shareTitle ?>%20<?= $shareUrl ?>" target="_blank" rel="noopener" style="background:#25D366;color:#fff;padding:6px 12px;border-radius:5px;font-size:11px;font-weight:600;display:flex;align-items:center;gap:4px"><i class="fab fa-whatsapp"></i> WhatsApp</a>
            <a href="https://t.me/share/url?url=<?= $shareUrl ?>&text=<?= $shareTitle ?>" target="_blank" rel="noopener" style="background:#0088CC;color:#fff;padding:6px 12px;border-radius:5px;font-size:11px;font-weight:600;display:flex;align-items:center;gap:4px"><i class="fab fa-telegram"></i> Telegram</a>
          </div>
        </header>

        <!-- Kapak -->
        <?php if ($post['cover_image']): ?>
        <figure style="margin:0 0 18px;border-radius:10px;overflow:hidden">
          <img src="<?= e(ap_thumb_url($post['cover_image'])) ?>" alt="<?= e($post['title']) ?>"
               style="width:100%;max-height:480px;object-fit:cover;display:block" loading="lazy">
        </figure>
        <?php endif; ?>

        <!-- İçerik -->
        <div class="haber-icerik single-icerik-alani"><?= $post['content'] ?></div>

        <!-- Yazar Diğer Yazıları -->
        <?php if (!empty($sonYazilar)): ?>
        <div style="margin-top:28px">
          <h3 style="font-size:15px;font-weight:800;color:#1a1a1a;margin-bottom:14px;border-left:4px solid #CC0000;padding-left:10px">
            <?= $columnist ? e($columnist['name']).' Diğer Yazıları' : 'Diğer Yazılar' ?>
          </h3>
          <div style="display:flex;flex-direction:column;gap:10px">
            <?php foreach ($sonYazilar as $y): ?>
            <a href="<?= e(ap_url($y['slug'])) ?>" style="display:flex;gap:12px;align-items:center;background:#fff;padding:12px;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.08)">
              <?php if ($y['cover_image']): ?>
              <img src="<?= e(ap_thumb_url($y['cover_image'])) ?>" alt="" style="width:72px;height:52px;object-fit:cover;border-radius:6px;flex-shrink:0" loading="lazy">
              <?php endif; ?>
              <div>
                <div style="font-size:13px;font-weight:700;color:#1a1a1a;line-height:1.4"><?= e($y['title']) ?></div>
                <div style="font-size:11px;color:#888;margin-top:3px"><i class="fa fa-clock"></i> <?= ap_time_ago($y['published_at']??$y['created_at']) ?></div>
              </div>
            </a>
            <?php endforeach; ?>
          </div>
        </div>
        <?php endif; ?>

      </article>

      <aside class="sidebar">
        <?php Widget::area('sidebar'); ?>
        <div class="widget">
          <h3 class="widget-title"><i class="fa fa-pen-nib"></i> Köşe Yazarları</h3>
          <?php
          try { $tYazarlar = DB::query("SELECT * FROM `{p}columnists` WHERE active=1 ORDER BY sort_order LIMIT 8"); }
          catch (\Throwable) { $tYazarlar = []; }
          foreach ($tYazarlar as $ty): ?>
          <a href="<?= e(ap_url('yazar/'.$ty['slug'])) ?>" style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f0f0f0">
            <img src="<?= e(ap_thumb_url($ty['avatar'])) ?>" alt="<?= e($ty['name']) ?>" style="width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0">
            <div>
              <div style="font-size:13px;font-weight:700;color:#1a1a1a"><?= e($ty['name']) ?></div>
              <div style="font-size:11px;color:#888"><?= e($ty['title']??'') ?></div>
            </div>
          </a>
          <?php endforeach; ?>
        </div>
      </aside>
    </div>
  </div>
</main>
<?php Theme::partial('footer'); ?>
