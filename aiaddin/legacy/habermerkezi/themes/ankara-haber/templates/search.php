<?php
/**
 * AnkaraHaber — Arama Sonuçları
 */
defined('ROOT') or die();
Theme::partial('header');

$q       = trim((string)($_GET['q'] ?? ''));
$page    = max(1,(int)($_GET['p']??1));
$perPage = 16;
$results = [];
$total   = 0;

if ($q !== '') {
    try {
        $like  = '%' . $q . '%';
        $total = (int)DB::queryValue(
            "SELECT COUNT(*) FROM `{p}posts` WHERE status='published' AND post_type IN ('news','columnist','post') AND (title LIKE ? OR excerpt LIKE ?)",
            [$like,$like]
        );
        $offset = ($page-1)*$perPage;
        $results= DB::query(
            "SELECT p.*, c.name AS cat_name, c.slug AS cat_slug FROM `{p}posts` p
             LEFT JOIN `{p}categories` c ON c.id=p.category_id
             WHERE p.status='published' AND p.post_type IN ('news','columnist','post')
             AND (p.title LIKE ? OR p.excerpt LIKE ?)
             ORDER BY p.published_at DESC LIMIT {$perPage} OFFSET {$offset}",
            [$like,$like]
        );
    } catch (\Throwable) {}
}
$siteUrl = ap_url();
?>
<main class="site-main">
  <div class="container" style="padding-top:24px">

    <!-- Arama Kutusu -->
    <div style="background:#fff;border-radius:10px;padding:24px;margin-bottom:22px;box-shadow:0 2px 8px rgba(0,0,0,.07)">
      <form action="<?= e(ap_url('arama')) ?>" method="GET" style="display:flex;gap:10px">
        <input type="text" name="q" value="<?= e($q) ?>" placeholder="Haber, yazar veya konu ara..."
               style="flex:1;padding:12px 16px;border:2px solid #e0e0e0;border-radius:8px;font-size:15px;outline:none;font-family:inherit"
               onfocus="this.style.borderColor='#CC0000'" onblur="this.style.borderColor='#e0e0e0'">
        <button type="submit"
                style="background:#CC0000;color:#fff;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer;border:none">
          <i class="fa fa-search"></i> Ara
        </button>
      </form>
      <?php if ($q !== ''): ?>
      <div style="font-size:13px;color:#888;margin-top:10px">
        "<strong><?= e($q) ?></strong>" için <?= number_format($total) ?> sonuç bulundu.
      </div>
      <?php endif; ?>
    </div>

    <?php if ($q === ''): ?>
    <div style="text-align:center;padding:60px;color:#888">
      <div style="font-size:48px;margin-bottom:12px">🔍</div>
      <p>Aramak istediğiniz kelimeyi yazın.</p>
    </div>
    <?php elseif (empty($results)): ?>
    <div style="text-align:center;padding:60px;color:#888">
      <div style="font-size:48px;margin-bottom:12px">😔</div>
      <p>"<?= e($q) ?>" ile ilgili sonuç bulunamadı.</p>
      <a href="<?= $siteUrl ?>" style="color:#CC0000;font-weight:700">Ana Sayfaya Dön →</a>
    </div>
    <?php else: ?>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">
      <?php foreach ($results as $h): ?>
      <article>
        <a href="<?= e(ap_url($h['slug'])) ?>" style="display:block;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);transition:.2s"
           onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform=''">
          <div style="height:140px;background-image:url('<?= e(ap_thumb_url($h['cover_image'])) ?>');background-size:cover;background-position:center;position:relative">
            <?php if ($h['post_type']==='columnist'): ?>
            <span style="position:absolute;top:6px;left:6px;background:#CC0000;color:#fff;font-size:9px;font-weight:700;padding:2px 6px;border-radius:2px">KÖŞE</span>
            <?php endif; ?>
          </div>
          <div style="padding:12px">
            <?php if (!empty($h['cat_name'])): ?>
            <span style="font-size:10px;color:#CC0000;font-weight:700;text-transform:uppercase"><?= e($h['cat_name']) ?></span>
            <?php endif; ?>
            <h3 style="font-size:13px;font-weight:700;color:#1a1a1a;line-height:1.4;margin:4px 0 8px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden"><?= e($h['title']) ?></h3>
            <div style="font-size:11px;color:#888"><i class="fa fa-clock"></i> <?= ap_time_ago($h['published_at']??$h['created_at']) ?></div>
          </div>
        </a>
      </article>
      <?php endforeach; ?>
    </div>

    <?php if ($total > $perPage): ?>
    <div class="sayfalama" style="margin-top:28px">
      <?= ap_pagination($total, $perPage, $page, ap_url('arama') . '?q=' . urlencode($q) . '&p={page}') ?>
    </div>
    <?php endif; ?>
    <?php endif; ?>

  </div>
</main>
<?php Theme::partial('footer'); ?>
