<?php
/**
 * AnkaraHaber — Yazar Arşiv Sayfası
 */
defined('ROOT') or die();
Theme::partial('header');

$columnist = Theme::var('columnist');
$page      = max(1,(int)($_GET['p']??1));
$perPage   = 12;
$total     = 0;
$yazilar   = [];
if ($columnist) {
    try {
        $total   = (int)DB::queryValue("SELECT COUNT(*) FROM `{p}posts` WHERE post_type='columnist' AND status='published' AND columnist_id=?", [$columnist['id']]);
        $yazilar = PostType::getPosts(['post_type'=>'columnist','status'=>'published','limit'=>$perPage,'offset'=>($page-1)*$perPage]);
        $yazilar = array_filter($yazilar, fn($p) => $p['columnist_id'] == $columnist['id']);
        $yazilar = array_values($yazilar);
    } catch (\Throwable) {}
}
$siteUrl = ap_url();
?>
<main class="site-main">
  <div class="container" style="padding-top:20px">

    <!-- Yazar Kartı -->
    <?php if ($columnist): ?>
    <div style="background:linear-gradient(135deg,#1a1a1a 0,#2d2d2d 100%);border-radius:14px;padding:32px;margin-bottom:28px;display:flex;gap:24px;align-items:center;flex-wrap:wrap">
      <img src="<?= e(ap_thumb_url($columnist['avatar'])) ?>" alt="<?= e($columnist['name']) ?>"
           style="width:120px;height:120px;border-radius:50%;object-fit:cover;border:4px solid #CC0000;flex-shrink:0">
      <div style="flex:1;min-width:200px">
        <div style="font-size:26px;font-weight:900;color:#fff;margin-bottom:6px"><?= e($columnist['name']) ?></div>
        <div style="font-size:14px;color:#CC0000;font-weight:600;margin-bottom:12px"><?= e($columnist['title']??'') ?></div>
        <?php if ($columnist['bio']): ?>
        <p style="font-size:13px;color:rgba(255,255,255,.75);line-height:1.65;max-width:600px"><?= nl2br(e($columnist['bio'])) ?></p>
        <?php endif; ?>
        <div style="margin-top:14px;font-size:12px;color:rgba(255,255,255,.5)"><?= number_format($total) ?> köşe yazısı</div>
      </div>
    </div>
    <?php endif; ?>

    <!-- Yazılar -->
    <?php if (!empty($yazilar)): ?>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:18px">
      <?php foreach ($yazilar as $y): ?>
      <article>
        <a href="<?= e(ap_url($y['slug'])) ?>" style="display:block;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);transition:.2s"
           onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,.14)'"
           onmouseout="this.style.transform='';this.style.boxShadow='0 2px 8px rgba(0,0,0,.08)'">
          <?php if ($y['cover_image']): ?>
          <img src="<?= e(ap_thumb_url($y['cover_image'])) ?>" alt="<?= e($y['title']) ?>"
               style="width:100%;height:160px;object-fit:cover;display:block" loading="lazy">
          <?php else: ?>
          <div style="width:100%;height:100px;background:#f5f5f5;display:flex;align-items:center;justify-content:center;font-size:36px">✍️</div>
          <?php endif; ?>
          <div style="padding:14px">
            <h3 style="font-size:14px;font-weight:700;color:#1a1a1a;line-height:1.4;margin:0 0 8px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden"><?= e($y['title']) ?></h3>
            <div style="font-size:11px;color:#888"><i class="fa fa-clock"></i> <?= ap_time_ago($y['published_at']??$y['created_at']) ?></div>
          </div>
        </a>
      </article>
      <?php endforeach; ?>
    </div>

    <?php if ($total > $perPage): ?>
    <div class="sayfalama" style="margin-top:28px">
      <?= ap_pagination($total, $perPage, $page, ap_url('yazar/'.($columnist['slug']??'')) . '?p={page}') ?>
    </div>
    <?php endif; ?>

    <?php else: ?>
    <div style="background:#fff;border-radius:10px;padding:60px;text-align:center;color:#888">
      <div style="font-size:48px;margin-bottom:12px">✍️</div>
      <p>Henüz köşe yazısı eklenmemiş.</p>
    </div>
    <?php endif; ?>

  </div>
</main>
<?php Theme::partial('footer'); ?>
