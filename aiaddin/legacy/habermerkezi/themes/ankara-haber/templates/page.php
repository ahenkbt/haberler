<?php
/**
 * AnkaraHaber — Statik Sayfa
 */
defined('ROOT') or die();
Theme::partial('header');

$post = Theme::var('post');
if (!$post) { http_response_code(404); include Theme::path('templates/404.php'); exit; }
?>
<main class="site-main">
  <div class="container" style="padding-top:24px">
    <div class="icerik-sidebar-sarici">
      <article style="background:#fff;border-radius:10px;padding:28px;box-shadow:0 2px 8px rgba(0,0,0,.07)">
        <header style="margin-bottom:20px;border-bottom:2px solid #f0f0f0;padding-bottom:16px">
          <h1 style="font-size:26px;font-weight:900;color:#1a1a1a;line-height:1.35"><?= e($post['title']) ?></h1>
          <?php if ($post['excerpt']): ?>
          <p style="font-size:14px;color:#666;margin-top:8px;line-height:1.6"><?= e($post['excerpt']) ?></p>
          <?php endif; ?>
          <div style="font-size:12px;color:#999;margin-top:8px">
            <i class="fa fa-calendar"></i> <?= ap_date($post['published_at']??$post['created_at']) ?>
          </div>
        </header>
        <?php if ($post['cover_image']): ?>
        <figure style="margin:0 0 22px;border-radius:8px;overflow:hidden">
          <img src="<?= e(ap_thumb_url($post['cover_image'])) ?>" alt="<?= e($post['title']) ?>"
               style="width:100%;max-height:420px;object-fit:cover;display:block" loading="lazy">
        </figure>
        <?php endif; ?>
        <div class="haber-icerik single-icerik-alani"><?= $post['content'] ?></div>
      </article>

      <aside class="sidebar">
        <?php Widget::area('sidebar'); ?>
      </aside>
    </div>
  </div>
</main>
<?php Theme::partial('footer'); ?>
