<?php
// Mağaza Ana Sayfası — Tüm Ürünler
defined('ROOT') or die();
Theme::partial('header');

$catId  = (int)($_GET['cat'] ?? 0);
$search = trim($_GET['q']   ?? '');
$pg     = max(1, (int)($_GET['p'] ?? 1));
$ppp    = 12;
$offset = ($pg - 1) * $ppp;

$where  = "p.post_type='product' AND p.status='published'";
$params = [];
if ($search) { $where .= ' AND p.title LIKE ?'; $params[] = "%$search%"; }
if ($catId)  {
    $where .= ' AND pm_cat.meta_val=?';
    $params[] = $catId;
    $catJoin  = "LEFT JOIN `{p}post_meta` pm_cat ON pm_cat.post_id=p.id AND pm_cat.meta_key='product_category_id'";
} else {
    $catJoin = "LEFT JOIN `{p}post_meta` pm_cat ON pm_cat.post_id=p.id AND pm_cat.meta_key='product_category_id'";
}

$total    = (int)DB::queryValue("SELECT COUNT(*) FROM `{p}posts` p $catJoin WHERE $where", $params);
$products = DB::query("SELECT p.* FROM `{p}posts` p $catJoin WHERE $where ORDER BY p.featured DESC, p.published_at DESC LIMIT $ppp OFFSET $offset", $params);
$cats     = DB::query("SELECT * FROM `{p}product_categories` ORDER BY name");
$curCat   = $catId ? DB::queryRow("SELECT * FROM `{p}product_categories` WHERE id=?", [$catId]) : null;
$siteName = DB::setting('site_name','');
?>
<main class="container" style="max-width:1200px;margin:0 auto;padding:20px 12px">
  <!-- Breadcrumb -->
  <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:#888;margin-bottom:20px">
    <a href="/" style="color:#888">Ana Sayfa</a> › <span>Mağaza</span>
    <?php if ($curCat): ?> › <span><?= e($curCat['name']) ?></span><?php endif; ?>
  </div>

  <div style="display:grid;grid-template-columns:220px 1fr;gap:24px;align-items:start">
    <!-- Sidebar -->
    <aside>
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:16px">
        <form method="GET">
          <input type="hidden" name="cat" value="<?= $catId ?>">
          <input type="text" name="q" value="<?= e($search) ?>" placeholder="Ürün ara..." style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:14px">
        </form>
      </div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:16px">
        <div style="font-weight:700;font-size:14px;margin-bottom:10px;color:#374151">Kategoriler</div>
        <a href="/magaza" style="display:block;padding:5px 0;font-size:14px;color:<?= !$catId?'#CC0000':'#6b7280' ?>;font-weight:<?= !$catId?'600':'400' ?>">Tüm Ürünler (<?= $total ?>)</a>
        <?php foreach ($cats as $cat):
          $c2 = (int)DB::queryValue("SELECT COUNT(*) FROM `{p}post_meta` pm JOIN `{p}posts` p ON p.id=pm.post_id WHERE pm.meta_key='product_category_id' AND pm.meta_val=? AND p.post_type='product' AND p.status='published'", [$cat['id']]);
        ?>
        <a href="/magaza?cat=<?= $cat['id'] ?>" style="display:block;padding:5px 0;font-size:14px;color:<?= $catId==$cat['id']?'#CC0000':'#6b7280' ?>;font-weight:<?= $catId==$cat['id']?'600':'400' ?>">
          <?= e($cat['name']) ?> <span style="color:#9ca3af">(<?= $c2 ?>)</span>
        </a>
        <?php endforeach; ?>
      </div>
    </aside>

    <!-- Ürün Grid -->
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h1 style="font-size:20px;font-weight:800;color:#111"><?= $curCat ? e($curCat['name']) : 'Tüm Ürünler' ?></h1>
        <span style="font-size:13px;color:#6b7280"><?= $total ?> ürün</span>
      </div>

      <?php if (empty($products)): ?>
      <div style="text-align:center;padding:60px;background:#fff;border-radius:10px;border:1px solid #e5e7eb">
        <div style="font-size:48px;margin-bottom:12px">📦</div>
        <p style="color:#6b7280">Bu kategoride ürün bulunamadı.</p>
        <a href="/magaza" style="display:inline-block;margin-top:12px;padding:8px 20px;background:#CC0000;color:#fff;border-radius:6px;text-decoration:none;font-size:14px">Tüm Ürünlere Bak</a>
      </div>
      <?php else: ?>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px">
        <?php foreach ($products as $pr):
          $pm = DB::query("SELECT meta_key,meta_val FROM `{p}post_meta` WHERE post_id=?", [$pr['id']]);
          $meta = array_column($pm,'meta_val','meta_key');
          $price    = (float)($meta['price']    ?? 0);
          $oldPrice = (float)($meta['old_price'] ?? 0);
          $discount = ($oldPrice > 0 && $price < $oldPrice) ? round(100 - ($price/$oldPrice*100)) : 0;
        ?>
        <a href="/urun/<?= e($pr['slug']) ?>" style="text-decoration:none;color:inherit">
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;transition:box-shadow .2s;hover:shadow-md">
            <div style="position:relative;height:190px;background:#f3f4f6;overflow:hidden">
              <?php if ($pr['cover_image']): ?>
              <img src="<?= e($pr['cover_image']) ?>" alt="<?= e($pr['title']) ?>" style="width:100%;height:100%;object-fit:cover;transition:transform .3s">
              <?php else: ?>
              <div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:48px">📦</div>
              <?php endif; ?>
              <?php if ($discount > 0): ?>
              <span style="position:absolute;top:8px;left:8px;background:#CC0000;color:#fff;font-size:11px;font-weight:700;padding:3px 7px;border-radius:4px">-%<?= $discount ?></span>
              <?php endif; ?>
              <?php if ($pr['featured']): ?>
              <span style="position:absolute;top:8px;right:8px;background:#f59e0b;color:#fff;font-size:10px;font-weight:700;padding:3px 7px;border-radius:4px">⭐ ÖNE ÇIKAN</span>
              <?php endif; ?>
            </div>
            <div style="padding:12px">
              <div style="font-size:13px;font-weight:600;color:#111;margin-bottom:6px;line-height:1.4;height:36px;overflow:hidden"><?= e($pr['title']) ?></div>
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">
                <span style="font-size:17px;font-weight:800;color:#CC0000"><?= number_format($price,2) ?> ₺</span>
                <?php if ($oldPrice > 0): ?>
                <span style="font-size:12px;text-decoration:line-through;color:#9ca3af"><?= number_format($oldPrice,2) ?> ₺</span>
                <?php endif; ?>
              </div>
              <button onclick="event.preventDefault();addToCart(<?= $pr['id'] ?>)" style="width:100%;padding:7px;background:#CC0000;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer">
                Sepete Ekle
              </button>
            </div>
          </div>
        </a>
        <?php endforeach; ?>
      </div>

      <?php if ($total > $ppp):
        $pages = ceil($total/$ppp); ?>
      <div style="display:flex;gap:6px;justify-content:center;margin-top:24px">
        <?php for($i=1;$i<=$pages;$i++): ?>
        <a href="?cat=<?=$catId?>&p=<?=$i?>" style="padding:6px 12px;border:1px solid <?=$i===$pg?'#CC0000':'#e5e7eb'?>;border-radius:6px;font-size:13px;background:<?=$i===$pg?'#CC0000':'#fff'?>;color:<?=$i===$pg?'#fff':'#374151'?>;"><?=$i?></a>
        <?php endfor; ?>
      </div>
      <?php endif; ?>
      <?php endif; ?>
    </div>
  </div>
</main>

<!-- Sepet Toast -->
<div id="cart-toast" style="display:none;position:fixed;bottom:20px;right:20px;background:#111;color:#fff;padding:12px 20px;border-radius:8px;font-size:14px;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.3)">
  ✓ Ürün sepete eklendi — <a href="/sepet" style="color:#f59e0b;font-weight:600">Sepeti Gör</a>
</div>
<script>
function addToCart(id) {
  fetch('/api/cart/add', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product_id:id,qty:1})})
    .then(r=>r.json()).then(d=>{
      const t=document.getElementById('cart-toast');
      t.style.display='block';
      setTimeout(()=>t.style.display='none',3000);
      const c=document.querySelector('.cart-count');
      if(c&&d.count)c.textContent=d.count;
    });
}
</script>
<?php Theme::partial('footer'); ?>
