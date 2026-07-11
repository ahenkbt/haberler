<?php
/**
 * AnkaraHaber — Son Haberler Sayfası
 * /son-haberler adresinde çalışır, sonsuz scroll + filtre destekler
 */
defined('ROOT') or die();

$anaRenk  = DB::setting('theme_renk_ana', '#CC0000');
$perPage  = 18;
$sayfa    = max(1, (int)($_GET['sayfa'] ?? 1));
$offset   = ($sayfa - 1) * $perPage;
$catFilter = trim($_GET['kategori'] ?? '');

$where  = "p.post_type IN ('news','post') AND p.status='published'";
$params = [];
if ($catFilter) {
    $where  .= " AND c.slug=?";
    $params[] = $catFilter;
}

$total = 0;
$posts = [];
$cats  = [];
try {
    $total = (int)DB::queryValue(
        "SELECT COUNT(*) FROM `{p}posts` p LEFT JOIN `{p}categories` c ON c.id=p.category_id WHERE {$where}",
        $params
    );
    $posts = DB::query(
        "SELECT p.*, c.name AS cat_name, c.slug AS cat_slug, c.color AS cat_color
         FROM `{p}posts` p
         LEFT JOIN `{p}categories` c ON c.id=p.category_id
         WHERE {$where}
         ORDER BY p.published_at DESC
         LIMIT {$perPage} OFFSET {$offset}",
        $params
    );
    $cats = DB::query("SELECT name, slug, color FROM `{p}categories` WHERE active=1 ORDER BY sort_order, name");
} catch (\Throwable) {}

$totalPages = $total > 0 ? ceil($total / $perPage) : 1;

Theme::partial('header', ['title' => 'Son Haberler']);
?>
<style>
:root{--ana:<?= e($anaRenk) ?>}
.sh-wrap{max-width:1280px;margin:0 auto;padding:20px 16px 48px}
.sh-baslik-blok{display:flex;align-items:center;gap:16px;margin-bottom:20px;padding:20px;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.06)}
.sh-baslik-ikon{width:48px;height:48px;background:var(--ana);border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;flex-shrink:0}
.sh-baslik-blok h1{font-size:22px;font-weight:900;color:#1a1a1a;margin:0 0 4px}
.sh-baslik-blok p{font-size:13px;color:#64748b;margin:0}
.sh-filter{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px}
.sh-filter a{padding:6px 14px;border:1px solid #e2e8f0;background:#fff;border-radius:20px;font-size:12px;font-weight:600;color:#475569;text-decoration:none;transition:.15s}
.sh-filter a.active,.sh-filter a:hover{border-color:var(--ana);background:var(--ana);color:#fff}
.sh-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-bottom:28px}
.sh-kart{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06);transition:.2s;display:flex;flex-direction:column}
.sh-kart:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,.1)}
.sh-kart-resim{height:170px;background:#f1f5f9 no-repeat center/cover;position:relative;flex-shrink:0}
.sh-kart-etiket{position:absolute;top:10px;left:10px;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;color:#fff}
.sh-kart-body{padding:14px;display:flex;flex-direction:column;flex:1}
.sh-kart-baslik{font-size:14px;font-weight:700;color:#1a1a1a;line-height:1.4;flex:1;margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.sh-kart-meta{font-size:11px;color:#94a3b8;display:flex;align-items:center;gap:8px}
.sh-kart-a{text-decoration:none;display:flex;flex-direction:column;flex:1}
.sh-pager{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:24px}
.sh-pager a,.sh-pager span{min-width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:8px;border:1px solid #e2e8f0;background:#fff;font-size:13px;font-weight:600;color:#475569;text-decoration:none}
.sh-pager .cur{background:var(--ana);border-color:var(--ana);color:#fff}
.sh-pager a:hover{border-color:var(--ana);color:var(--ana)}
</style>

<div class="sh-wrap">

  <div class="sh-baslik-blok">
    <div class="sh-baslik-ikon">⚡</div>
    <div>
      <h1>Son Haberler</h1>
      <p>Anlık güncellenen tüm haberler — <strong><?= number_format($total) ?></strong> haber</p>
    </div>
  </div>

  <!-- Kategori Filtresi -->
  <?php if (!empty($cats)): ?>
  <div class="sh-filter">
    <a href="/son-haberler" class="<?= !$catFilter?'active':'' ?>">Tümü</a>
    <?php foreach ($cats as $cat): ?>
    <a href="/son-haberler?kategori=<?= urlencode($cat['slug']) ?>"
       class="<?= $catFilter===$cat['slug']?'active':'' ?>"
       style="<?= $catFilter===$cat['slug']?"border-color:{$cat['color']};background:{$cat['color']}":"" ?>"><?= e($cat['name']) ?></a>
    <?php endforeach; ?>
  </div>
  <?php endif; ?>

  <!-- Haber Kartları -->
  <div class="sh-grid">
    <?php foreach ($posts as $post):
      $thumbUrl  = ap_thumb_url($post['cover_image'] ?? '', 'medium');
      $catColor  = $post['cat_color'] ?: $anaRenk;
      $catName   = $post['cat_name'] ?? '';
      $timeAgo   = ap_time_ago($post['published_at'] ?? $post['created_at']);
      $postUrl   = ap_url($post['slug'], $post['post_type']);
    ?>
    <div class="sh-kart">
      <a href="<?= e($postUrl) ?>" class="sh-kart-a">
        <div class="sh-kart-resim" style="background-image:url('<?= e($thumbUrl) ?>')">
          <?php if ($catName): ?>
          <span class="sh-kart-etiket" style="background:<?= e($catColor) ?>"><?= e($catName) ?></span>
          <?php endif; ?>
        </div>
        <div class="sh-kart-body">
          <div class="sh-kart-baslik"><?= e($post['title']) ?></div>
          <div class="sh-kart-meta">
            <span>🕐 <?= e($timeAgo) ?></span>
            <?php if (!empty($post['views'])): ?><span>👁 <?= number_format((int)$post['views']) ?></span><?php endif; ?>
          </div>
        </div>
      </a>
    </div>
    <?php endforeach; ?>
  </div>

  <?php if (empty($posts)): ?>
  <div style="text-align:center;padding:60px 16px;color:#94a3b8">
    <div style="font-size:48px;margin-bottom:12px">📭</div>
    <div style="font-size:16px;font-weight:600">Bu kategoride haber bulunamadı.</div>
    <a href="/son-haberler" style="display:inline-block;margin-top:12px;color:var(--ana);font-weight:700">Tüm Haberleri Gör</a>
  </div>
  <?php endif; ?>

  <!-- Sayfalama -->
  <?php if ($totalPages > 1): ?>
  <div class="sh-pager">
    <?php if ($sayfa > 1): ?><a href="?sayfa=<?= $sayfa-1 ?><?= $catFilter?"&kategori=$catFilter":'' ?>">←</a><?php endif; ?>
    <?php for ($p = max(1,$sayfa-3); $p <= min($totalPages,$sayfa+3); $p++): ?>
    <?php if ($p === $sayfa): ?>
    <span class="cur"><?= $p ?></span>
    <?php else: ?>
    <a href="?sayfa=<?= $p ?><?= $catFilter?"&kategori=$catFilter":'' ?>"><?= $p ?></a>
    <?php endif; ?>
    <?php endfor; ?>
    <?php if ($sayfa < $totalPages): ?><a href="?sayfa=<?= $sayfa+1 ?><?= $catFilter?"&kategori=$catFilter":'' ?>">→</a><?php endif; ?>
  </div>
  <?php endif; ?>

</div>

<?php Theme::partial('footer'); ?>
