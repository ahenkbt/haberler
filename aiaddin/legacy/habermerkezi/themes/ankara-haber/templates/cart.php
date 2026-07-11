<?php
defined('ROOT') or die();
Cart::init();
Theme::partial('header');
$items = Cart::items();
$total = Cart::total();
?>
<main class="container" style="max-width:1000px;margin:0 auto;padding:20px 12px">
  <h1 style="font-size:24px;font-weight:900;margin-bottom:20px;color:#111">🛒 Sepetim</h1>
  <?php if (empty($items)): ?>
  <div style="text-align:center;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:60px">
    <div style="font-size:56px;margin-bottom:16px">🛒</div>
    <h2 style="color:#374151;margin-bottom:8px">Sepetiniz boş</h2>
    <p style="color:#6b7280;margin-bottom:20px">Mağazamıza göz atın ve ürün ekleyin.</p>
    <a href="/magaza" style="padding:10px 24px;background:#CC0000;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">Alışverişe Başla</a>
  </div>
  <?php else: ?>
  <div style="display:grid;grid-template-columns:1fr 300px;gap:20px;align-items:start">
    <!-- Ürünler -->
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      <?php foreach ($items as $key => $item): ?>
      <div style="display:flex;gap:16px;padding:16px;border-bottom:1px solid #e5e7eb;align-items:center" id="cart-row-<?= htmlspecialchars($key,ENT_QUOTES) ?>">
        <?php if ($item['image']): ?>
        <img src="<?= e($item['image']) ?>" style="width:72px;height:72px;object-fit:cover;border-radius:6px">
        <?php else: ?>
        <div style="width:72px;height:72px;background:#f3f4f6;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:28px">📦</div>
        <?php endif; ?>
        <div style="flex:1">
          <div style="font-weight:600;font-size:15px;color:#111"><?= e($item['title']) ?></div>
          <div style="font-size:14px;color:#CC0000;font-weight:700;margin-top:2px"><?= number_format($item['price'],2) ?> ₺</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <button onclick="updateCart('<?= htmlspecialchars($key,ENT_QUOTES) ?>',<?= $item['qty']-1 ?>)" style="width:28px;height:28px;background:#f3f4f6;border:none;border-radius:4px;cursor:pointer;font-size:16px">−</button>
          <span style="min-width:24px;text-align:center;font-weight:600"><?= $item['qty'] ?></span>
          <button onclick="updateCart('<?= htmlspecialchars($key,ENT_QUOTES) ?>',<?= $item['qty']+1 ?>)" style="width:28px;height:28px;background:#f3f4f6;border:none;border-radius:4px;cursor:pointer;font-size:16px">+</button>
        </div>
        <div style="min-width:80px;text-align:right;font-weight:700"><?= number_format($item['price']*$item['qty'],2) ?> ₺</div>
        <button onclick="removeItem('<?= htmlspecialchars($key,ENT_QUOTES) ?>')" style="background:none;border:none;cursor:pointer;color:#ef4444;font-size:18px" title="Kaldır">×</button>
      </div>
      <?php endforeach; ?>
      <div style="padding:12px 16px;display:flex;justify-content:flex-end">
        <button onclick="clearCart()" style="font-size:13px;color:#6b7280;background:none;border:none;cursor:pointer">Sepeti Temizle</button>
      </div>
    </div>
    <!-- Özet -->
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;position:sticky;top:80px">
      <h3 style="font-size:17px;font-weight:800;margin-bottom:14px;color:#111">Sipariş Özeti</h3>
      <div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:8px"><span>Ara Toplam</span><span><?= number_format($total,2) ?> ₺</span></div>
      <div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:14px"><span>Kargo</span><span style="color:#059669">Hesaplanacak</span></div>
      <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:800;padding-top:12px;border-top:1px solid #e5e7eb;margin-bottom:16px">
        <span>Toplam</span><span style="color:#CC0000"><?= number_format($total,2) ?> ₺</span>
      </div>
      <a href="/odeme" style="display:block;width:100%;padding:12px;background:#CC0000;color:#fff;text-align:center;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none">Siparişi Tamamla →</a>
      <a href="/magaza" style="display:block;width:100%;padding:10px;text-align:center;font-size:14px;color:#6b7280;text-decoration:none;margin-top:8px">← Alışverişe Devam Et</a>
    </div>
  </div>
  <?php endif; ?>
</main>
<script>
function updateCart(key,qty){
  fetch('/api/cart/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key,qty})})
    .then(()=>location.reload());
}
function removeItem(key){
  fetch('/api/cart/remove',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key})})
    .then(()=>location.reload());
}
function clearCart(){
  fetch('/api/cart/clear',{method:'POST'}).then(()=>location.reload());
}
</script>
<?php Theme::partial('footer'); ?>
