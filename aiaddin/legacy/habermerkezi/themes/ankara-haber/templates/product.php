<?php
// Ürün Detay Sayfası
defined('ROOT') or die();
$slug    = $_GET['slug'] ?? '';
$product = DB::queryRow("SELECT * FROM `{p}posts` WHERE slug=? AND post_type='product' AND status='published'", [$slug]);
if (!$product) { http_response_code(404); Theme::partial('header'); echo '<div style="text-align:center;padding:80px"><h2>Ürün bulunamadı</h2><a href="/magaza">← Mağazaya Dön</a></div>'; Theme::partial('footer'); return; }

$pm    = DB::query("SELECT meta_key,meta_val FROM `{p}post_meta` WHERE post_id=?", [$product['id']]);
$meta  = array_column($pm,'meta_val','meta_key');
$price    = (float)($meta['price']    ?? 0);
$oldPrice = (float)($meta['old_price'] ?? 0);
$discount = ($oldPrice>0&&$price<$oldPrice) ? round(100-($price/$oldPrice*100)) : 0;
$catName  = '';
if (!empty($meta['product_category_id'])) {
    $cat     = DB::queryRow("SELECT name,slug FROM `{p}product_categories` WHERE id=?", [$meta['product_category_id']]);
    $catName = $cat['name'] ?? '';
}
$payMethods = Payment::enabled();
Theme::partial('header');
?>
<main class="container" style="max-width:1100px;margin:0 auto;padding:20px 12px">
  <!-- Breadcrumb -->
  <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:#888;margin-bottom:20px">
    <a href="/" style="color:#888">Ana Sayfa</a> ›
    <a href="/magaza" style="color:#888">Mağaza</a>
    <?php if ($catName): ?> › <a href="/magaza?cat=<?= e($meta['product_category_id']) ?>" style="color:#888"><?= e($catName) ?></a><?php endif; ?> ›
    <span><?= e($product['title']) ?></span>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:30px">
    <!-- Görsel -->
    <div>
      <?php if ($product['cover_image']): ?>
      <img src="<?= e($product['cover_image']) ?>" alt="<?= e($product['title']) ?>" style="width:100%;border-radius:8px;object-fit:cover;max-height:420px">
      <?php else: ?>
      <div style="height:360px;background:#f3f4f6;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:80px">📦</div>
      <?php endif; ?>
    </div>

    <!-- Bilgiler -->
    <div>
      <?php if ($catName): ?><div style="font-size:12px;color:#CC0000;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px"><?= e($catName) ?></div><?php endif; ?>
      <h1 style="font-size:26px;font-weight:900;color:#111;margin-bottom:12px;line-height:1.3"><?= e($product['title']) ?></h1>

      <?php if ($product['excerpt']): ?>
      <p style="font-size:15px;color:#4b5563;margin-bottom:16px;line-height:1.7"><?= e($product['excerpt']) ?></p>
      <?php endif; ?>

      <!-- Fiyat -->
      <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:16px">
        <span style="font-size:32px;font-weight:900;color:#CC0000"><?= number_format($price,2) ?> ₺</span>
        <?php if ($oldPrice > 0): ?>
        <span style="font-size:18px;text-decoration:line-through;color:#9ca3af"><?= number_format($oldPrice,2) ?> ₺</span>
        <span style="background:#CC0000;color:#fff;font-size:12px;font-weight:700;padding:3px 8px;border-radius:4px">-%<?= $discount ?></span>
        <?php endif; ?>
      </div>

      <!-- Stok -->
      <?php if (!empty($meta['stock'])): ?>
      <div style="font-size:13px;color:#059669;font-weight:600;margin-bottom:12px">✓ <?= e($meta['stock']) ?></div>
      <?php endif; ?>

      <!-- Adet + Sepet -->
      <div style="display:flex;gap:10px;margin-bottom:20px">
        <div style="display:flex;align-items:center;border:1px solid #d1d5db;border-radius:6px;overflow:hidden">
          <button onclick="changeQty(-1)" style="padding:8px 12px;background:none;border:none;font-size:18px;cursor:pointer;color:#374151">−</button>
          <input id="qty" type="number" value="1" min="1" style="width:50px;text-align:center;border:none;font-size:16px;font-weight:600;outline:none">
          <button onclick="changeQty(1)" style="padding:8px 12px;background:none;border:none;font-size:18px;cursor:pointer;color:#374151">+</button>
        </div>
        <button onclick="addToCart(<?= $product['id'] ?>)" style="flex:1;padding:10px;background:#CC0000;color:#fff;border:none;border-radius:6px;font-size:15px;font-weight:700;cursor:pointer">
          🛒 Sepete Ekle
        </button>
      </div>

      <!-- Ödeme Yöntemleri -->
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin-bottom:16px">
        <div style="font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;margin-bottom:8px">Kabul Edilen Ödemeler</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          <?php foreach ($payMethods as $m): ?>
          <span style="background:#f3f4f6;padding:5px 10px;border-radius:6px;font-size:13px"><?= Payment::icon($m) ?> <?= Payment::label($m) ?></span>
          <?php endforeach; ?>
        </div>
        <?php if (!empty($meta['free_shipping'])): ?>
        <div style="margin-top:8px;font-size:13px;color:#059669;font-weight:600">🚚 Ücretsiz Kargo</div>
        <?php endif; ?>
      </div>

      <!-- SKU -->
      <?php if (!empty($meta['sku'])): ?>
      <div style="font-size:12px;color:#9ca3af">Ürün Kodu: <?= e($meta['sku']) ?></div>
      <?php endif; ?>
    </div>
  </div>

  <!-- Açıklama -->
  <?php if ($product['content']): ?>
  <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:28px;margin-top:20px">
    <h2 style="font-size:18px;font-weight:800;margin-bottom:16px;color:#111">Ürün Açıklaması</h2>
    <div style="font-size:15px;line-height:1.8;color:#374151"><?= nl2br(e($product['content'])) ?></div>
  </div>
  <?php endif; ?>
</main>

<div id="cart-toast" style="display:none;position:fixed;bottom:20px;right:20px;background:#111;color:#fff;padding:12px 20px;border-radius:8px;font-size:14px;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.3)">
  ✓ Ürün sepete eklendi — <a href="/sepet" style="color:#f59e0b;font-weight:600">Sepeti Gör</a>
</div>
<script>
function changeQty(d){const q=document.getElementById('qty');q.value=Math.max(1,parseInt(q.value||1)+d);}
function addToCart(id){
  const qty=parseInt(document.getElementById('qty').value)||1;
  fetch('/api/cart/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product_id:id,qty})})
    .then(r=>r.json()).then(d=>{
      const t=document.getElementById('cart-toast');t.style.display='block';
      setTimeout(()=>t.style.display='none',3500);
      const c=document.querySelector('.cart-count');if(c&&d.count)c.textContent=d.count;
    });
}
</script>
<?php Theme::partial('footer'); ?>
