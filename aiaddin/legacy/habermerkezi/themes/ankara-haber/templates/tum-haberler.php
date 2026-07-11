<?php
/**
 * AnkaraHaber — Tüm Haberler Arşivi
 * Route: /tum-haberler
 */
defined('ROOT') or die();
Theme::partial('header');

$page    = max(1, (int)($_GET['p'] ?? 1));
$perPage = 20;
$filtre  = trim($_GET['filtre'] ?? '');  // kategori slug filtresi
$catId   = 0;
$catObj  = null;

if ($filtre) {
    try { $catObj = DB::queryRow("SELECT * FROM `{p}categories` WHERE slug=?", [$filtre]); } catch (\Throwable) {}
    if ($catObj) $catId = (int)$catObj['id'];
}

$total    = 0;
$haberler = [];
try {
    $where   = "post_type='news' AND status='published'" . ($catId ? " AND category_id={$catId}" : '');
    $total   = (int)DB::queryValue("SELECT COUNT(*) FROM `{p}posts` WHERE $where");
    $offset  = ($page - 1) * $perPage;
    $haberler = DB::query(
        "SELECT p.*, c.name AS cat_name, c.slug AS cat_slug, c.color AS cat_color
         FROM `{p}posts` p
         LEFT JOIN `{p}categories` c ON c.id = p.category_id
         WHERE $where
         ORDER BY p.published_at DESC
         LIMIT $perPage OFFSET $offset"
    );
} catch (\Throwable) {}

$kategoriler = [];
try { $kategoriler = DB::query("SELECT * FROM `{p}categories` WHERE active=1 ORDER BY sort_order LIMIT 20"); } catch (\Throwable) {}

$siteUrl  = ap_url();
$baseUrl  = ap_url('tum-haberler') . ($filtre ? '?filtre=' . urlencode($filtre) . '&p={page}' : '?p={page}');
?>
<main class="site-main">
  <div class="container" style="padding-top:24px;padding-bottom:40px">

    <!-- Başlık -->
    <div style="background:#fff;border-radius:10px;padding:20px 24px;margin-bottom:22px;box-shadow:0 2px 8px rgba(0,0,0,.07);display:flex;align-items:center;gap:14px;flex-wrap:wrap">
      <div style="width:6px;height:44px;background:#CC0000;border-radius:4px;flex-shrink:0"></div>
      <div style="flex:1;min-width:200px">
        <h1 style="font-size:22px;font-weight:900;color:#1a1a1a;margin:0 0 4px">
          <?= $catObj ? 'Kategori: ' . e($catObj['name']) : 'Tüm Haberler' ?>
        </h1>
        <div style="font-size:13px;color:#888"><?= number_format($total) ?> haber</div>
      </div>
      <!-- Kategori filtre -->
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        <a href="<?= e(ap_url('tum-haberler')) ?>"
           style="padding:5px 12px;border-radius:20px;font-size:12px;font-weight:700;<?= !$filtre ? 'background:#CC0000;color:#fff' : 'background:#f0f0f0;color:#555' ?>">
          Tümü
        </a>
        <?php foreach ($kategoriler as $kat): ?>
        <a href="<?= e(ap_url('tum-haberler')) ?>?filtre=<?= urlencode($kat['slug']) ?>"
           style="padding:5px 12px;border-radius:20px;font-size:12px;font-weight:700;<?= $filtre===$kat['slug'] ? 'background:#CC0000;color:#fff' : 'background:#f0f0f0;color:#555' ?>">
          <?= e($kat['name']) ?>
        </a>
        <?php endforeach; ?>
      </div>
    </div>

    <!-- Haber Grid -->
    <?php if (!empty($haberler)): ?>
    <div class="tum-haberler-grid">
      <?php foreach ($haberler as $h):
            $renk = $h['cat_color'] ?? '#CC0000'; ?>
      <article>
        <a href="<?= e(ap_url($h['slug'])) ?>"
           style="display:block;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);transition:.22s;height:100%"
           onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 20px rgba(0,0,0,.14)'"
           onmouseout="this.style.transform='';this.style.boxShadow='0 2px 8px rgba(0,0,0,.08)'">
          <div style="height:160px;background-image:url('<?= e(ap_thumb_url($h['cover_image'])) ?>');background-size:cover;background-position:center;position:relative">
            <?php if ($h['is_breaking']): ?>
            <span style="position:absolute;top:8px;left:8px;background:#CC0000;color:#fff;font-size:9px;font-weight:800;padding:2px 7px;border-radius:3px;letter-spacing:.3px">⚡ SON DAKİKA</span>
            <?php elseif (!empty($h['cat_name'])): ?>
            <span style="position:absolute;top:8px;left:8px;background:<?= e($renk) ?>;color:#fff;font-size:9px;font-weight:800;padding:2px 7px;border-radius:3px"><?= e($h['cat_name']) ?></span>
            <?php endif; ?>
          </div>
          <div style="padding:12px">
            <h3 style="font-size:13px;font-weight:700;color:#1a1a1a;line-height:1.4;margin:0 0 8px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">
              <?= e($h['title']) ?>
            </h3>
            <div style="font-size:11px;color:#888;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <span><i class="fa fa-clock"></i> <?= ap_time_ago($h['published_at']??$h['created_at']) ?></span>
              <?php if (!empty($h['author_name'])): ?>
              <span><i class="fa fa-user"></i> <?= e($h['author_name']) ?></span>
              <?php endif; ?>
            </div>
          </div>
        </a>
      </article>
      <?php endforeach; ?>
    </div>

    <!-- Sayfalama -->
    <?php if ($total > $perPage): ?>
    <div class="sayfalama" style="margin-top:28px">
      <?= ap_pagination($total, $perPage, $page, $baseUrl) ?>
    </div>
    <?php endif; ?>

    <?php else: ?>
    <div style="background:#fff;border-radius:10px;padding:60px;text-align:center;color:#888">
      <div style="font-size:48px;margin-bottom:12px">📭</div>
      <p>Henüz haber eklenmemiş.</p>
      <a href="<?= $siteUrl ?>" style="color:#CC0000;font-weight:700">Ana Sayfaya Dön →</a>
    </div>
    <?php endif; ?>

  </div>
</main>
<?php Theme::partial('footer'); ?>
