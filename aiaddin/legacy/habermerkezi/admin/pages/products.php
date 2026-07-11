<?php
defined('ROOT') or die();
Auth::require('editor');
$csrf   = Security::csrf();
$action = $_POST['action'] ?? $_GET['action'] ?? '';
$editId = (int)($_GET['edit'] ?? 0);

// ─── Kaydet / Sil ───────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST' && Security::verifyCsrf($_POST['csrf'] ?? '')) {
    $title   = trim($_POST['title']   ?? '');
    $content = trim($_POST['content'] ?? '');
    $excerpt = trim($_POST['excerpt'] ?? '');
    $status  = in_array($_POST['status']??'', ['draft','published','private']) ? $_POST['status'] : 'draft';
    $pid     = (int)($_POST['id']     ?? 0);

    $price       = (float)str_replace(',','.',trim($_POST['price']     ?? '0'));
    $oldPrice    = (float)str_replace(',','.',trim($_POST['old_price'] ?? '0'));
    $stock       = trim($_POST['stock']       ?? '');
    $sku         = trim($_POST['sku']         ?? '');
    $catId       = (int)($_POST['product_cat_id'] ?? 0);
    $featured    = isset($_POST['featured']) ? 1 : 0;
    $freeShip    = isset($_POST['free_shipping']) ? 1 : 0;
    $weight      = trim($_POST['weight']      ?? '');

    // Görsel yükleme
    $coverImage = $_POST['existing_image'] ?? '';
    if (!empty($_FILES['cover_image']['tmp_name'])) {
        $ext   = strtolower(pathinfo($_FILES['cover_image']['name'], PATHINFO_EXTENSION));
        $allow = ['jpg','jpeg','png','webp','gif'];
        if (in_array($ext, $allow)) {
            $year   = date('Y');
            $month  = date('m');
            $dir    = UPLOADS_DIR . '/' . $year . '/' . $month;
            if (!is_dir($dir)) mkdir($dir, 0755, true);
            $fname  = 'product-' . time() . '-' . rand(100,999) . '.' . $ext;
            if (move_uploaded_file($_FILES['cover_image']['tmp_name'], $dir . '/' . $fname)) {
                $coverImage = '/uploads/' . $year . '/' . $month . '/' . $fname;
            }
        }
    }

    $slug = preg_replace('/\s+/', '-', mb_strtolower(trim($_POST['slug'] ?? '') ?: $title));
    $slug = preg_replace('/[^\w\-]/', '', $slug);

    if ($action === 'delete' && $pid) {
        DB::execute("UPDATE `{p}posts` SET status='trash' WHERE id=? AND post_type='product'", [$pid]);
        ap_flash('Ürün silindi.');
        header('Location: /admin/?page=products'); exit;
    }

    if ($title && $action === 'save') {
        if ($pid) {
            DB::execute("UPDATE `{p}posts` SET title=?,slug=?,content=?,excerpt=?,cover_image=?,status=?,featured=?,updated_at=NOW() WHERE id=? AND post_type='product'",
                [$title,$slug,$content,$excerpt,$coverImage,$status,$featured,$pid]);
        } else {
            $pid = (int)DB::insert("INSERT INTO `{p}posts` (post_type,title,slug,content,excerpt,cover_image,status,featured,published_at) VALUES ('product',?,?,?,?,?,?,?,NOW())",
                [$title,$slug,$content,$excerpt,$coverImage,$status,$featured]);
        }
        // Post meta kaydet
        $metas = ['price'=>$price,'old_price'=>$oldPrice,'stock'=>$stock,'sku'=>$sku,'product_category_id'=>$catId,'free_shipping'=>$freeShip,'weight'=>$weight];
        foreach ($metas as $k => $v) {
            DB::execute("INSERT INTO `{p}post_meta` (post_id,meta_key,meta_val) VALUES (?,?,?) ON DUPLICATE KEY UPDATE meta_val=VALUES(meta_val)",
                [$pid,$k,$v]);
        }
        ap_flash('Ürün kaydedildi.');
        header('Location: /admin/?page=products&edit=' . $pid); exit;
    }
}

// ─── Düzenle ────────────────────────────────────────────────────────────
$edit   = null;
$editMeta = [];
if ($editId) {
    $edit     = DB::queryRow("SELECT * FROM `{p}posts` WHERE id=? AND post_type='product'", [$editId]);
    if ($edit) {
        $rows = DB::query("SELECT meta_key,meta_val FROM `{p}post_meta` WHERE post_id=?", [$editId]);
        foreach ($rows as $r) $editMeta[$r['meta_key']] = $r['meta_val'];
    }
}

// ─── Liste ──────────────────────────────────────────────────────────────
$search   = trim($_GET['q'] ?? '');
$catFilter= (int)($_GET['cat'] ?? 0);
$pg       = max(1,(int)($_GET['p']??1));
$perPage  = 20;
$offset   = ($pg-1)*$perPage;
$where    = "post_type='product' AND status!='trash'";
$params   = [];
if ($search)    { $where .= ' AND (title LIKE ? OR slug LIKE ?)'; $params=array_merge($params,["%$search%","%$search%"]); }

$total    = (int)DB::queryValue("SELECT COUNT(*) FROM `{p}posts` WHERE $where", $params);
$products = DB::query("SELECT * FROM `{p}posts` WHERE $where ORDER BY created_at DESC LIMIT $perPage OFFSET $offset", $params);
$prodCats = DB::query("SELECT * FROM `{p}product_categories` ORDER BY name");

ap_admin_layout($edit ? 'Ürün Düzenle' : 'Ürünler', function() use ($products,$total,$pg,$perPage,$search,$edit,$editMeta,$editId,$csrf,$prodCats) { ?>
<div class="ap-page-header">
  <h1 class="ap-page-title"><?= $edit ? 'Ürün Düzenle' : 'Ürünler' ?> <?php if (!$edit): ?><span class="ap-badge"><?= $total ?></span><?php endif; ?></h1>
  <div style="display:flex;gap:8px">
    <?php if ($edit): ?>
    <a href="/admin/?page=products" class="ap-btn">← Listeye Dön</a>
    <?php else: ?>
    <a href="/admin/?page=product-categories" class="ap-btn">Kategoriler</a>
    <a href="/admin/?page=product-import" class="ap-btn" title="CSV ile toplu ürün/kategori ekle">📤 Toplu İçe Aktar</a>
    <a href="/admin/?page=products&edit=0" class="ap-btn ap-btn-primary">+ Yeni Ürün</a>
    <?php endif; ?>
  </div>
</div>

<?php if ($edit !== null): ?>
<!-- ─── Ürün Formu ─── -->
<form method="POST" enctype="multipart/form-data">
<input type="hidden" name="action" value="save">
<input type="hidden" name="csrf" value="<?= e($csrf) ?>">
<input type="hidden" name="id" value="<?= $editId ?>">

<div style="display:grid;grid-template-columns:1fr 320px;gap:20px;align-items:start">
  <div>
    <!-- Başlık -->
    <div class="ap-card" style="padding:20px;margin-bottom:16px">
      <div class="ap-form-group">
        <label class="ap-label">Ürün Adı *</label>
        <input class="ap-input" name="title" required value="<?= e($edit['title']??'') ?>" style="font-size:18px;font-weight:600" placeholder="Ürün adı...">
      </div>
      <div class="ap-form-group">
        <label class="ap-label">URL Kısa Ad</label>
        <input class="ap-input" name="slug" value="<?= e($edit['slug']??'') ?>" placeholder="otomatik-olusturulur">
      </div>
      <div class="ap-form-group">
        <label class="ap-label">Ürün Açıklaması</label>
        <textarea class="ap-input" name="content" rows="8" placeholder="Ürün hakkında detaylı açıklama..."><?= e($edit['content']??'') ?></textarea>
      </div>
      <div class="ap-form-group">
        <label class="ap-label">Kısa Açıklama (Özet)</label>
        <textarea class="ap-input" name="excerpt" rows="2" placeholder="Listede görünen kısa açıklama..."><?= e($edit['excerpt']??'') ?></textarea>
      </div>
    </div>

    <!-- Fiyat -->
    <div class="ap-card" style="padding:20px;margin-bottom:16px">
      <h3 style="margin-bottom:14px;font-size:15px">💰 Fiyat Bilgileri</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="ap-form-group">
          <label class="ap-label">Satış Fiyatı (₺) *</label>
          <input class="ap-input" name="price" type="number" step="0.01" min="0" required value="<?= e($editMeta['price']??'') ?>" placeholder="0.00">
        </div>
        <div class="ap-form-group">
          <label class="ap-label">İndirimli Öncesi Fiyat (₺)</label>
          <input class="ap-input" name="old_price" type="number" step="0.01" min="0" value="<?= e($editMeta['old_price']??'') ?>" placeholder="0.00">
        </div>
        <div class="ap-form-group">
          <label class="ap-label">Stok Durumu</label>
          <input class="ap-input" name="stock" value="<?= e($editMeta['stock']??'') ?>" placeholder="Stokta var / 50 adet / Tükendi">
        </div>
        <div class="ap-form-group">
          <label class="ap-label">SKU / Ürün Kodu</label>
          <input class="ap-input" name="sku" value="<?= e($editMeta['sku']??'') ?>" placeholder="URN-001">
        </div>
        <div class="ap-form-group">
          <label class="ap-label">Ağırlık (kg)</label>
          <input class="ap-input" name="weight" value="<?= e($editMeta['weight']??'') ?>" placeholder="0.5">
        </div>
        <div class="ap-form-group" style="display:flex;align-items:flex-end">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" name="free_shipping" <?= ($editMeta['free_shipping']??0)?'checked':'' ?>>
            <span>Ücretsiz Kargo</span>
          </label>
        </div>
      </div>
    </div>
  </div>

  <!-- Sağ Panel -->
  <div>
    <!-- Durum -->
    <div class="ap-card" style="padding:16px;margin-bottom:12px">
      <div class="ap-form-group">
        <label class="ap-label">Yayın Durumu</label>
        <select class="ap-input" name="status">
          <option value="draft"     <?= ($edit['status']??'')==='draft'     ?'selected':''?>>Taslak</option>
          <option value="published" <?= ($edit['status']??'')==='published' ?'selected':''?>>Yayında</option>
          <option value="private"   <?= ($edit['status']??'')==='private'   ?'selected':''?>>Gizli</option>
        </select>
      </div>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:12px">
        <input type="checkbox" name="featured" <?= ($edit['featured']??0)?'checked':'' ?>>
        <span style="font-size:13px">Öne Çıkan Ürün</span>
      </label>
      <button class="ap-btn ap-btn-primary" type="submit" style="width:100%">Kaydet</button>
      <?php if ($editId && $edit): ?>
      <a href="/urun/<?= e($edit['slug']) ?>" target="_blank" class="ap-btn" style="width:100%;text-align:center;margin-top:8px;display:block">Önizle →</a>
      <?php endif; ?>
    </div>

    <!-- Kategori -->
    <div class="ap-card" style="padding:16px;margin-bottom:12px">
      <label class="ap-label">Ürün Kategorisi</label>
      <select class="ap-input" name="product_cat_id">
        <option value="0">— Kategori Seç —</option>
        <?php foreach ($prodCats as $pc): ?>
        <option value="<?= $pc['id'] ?>" <?= ($editMeta['product_category_id']??0) == $pc['id'] ? 'selected' : '' ?>>
          <?= e($pc['name']) ?>
        </option>
        <?php endforeach; ?>
      </select>
      <a href="/admin/?page=product-categories" style="font-size:12px;color:var(--ap-accent);display:block;margin-top:6px">+ Yeni Kategori Ekle</a>
    </div>

    <!-- Görsel -->
    <div class="ap-card" style="padding:16px">
      <label class="ap-label">Ürün Görseli</label>
      <?php if (!empty($edit['cover_image'])): ?>
      <img src="<?= e($edit['cover_image']) ?>" style="width:100%;border-radius:6px;margin-bottom:10px;max-height:200px;object-fit:cover">
      <?php endif; ?>
      <input type="hidden" name="existing_image" value="<?= e($edit['cover_image']??'') ?>">
      <input type="file" name="cover_image" accept="image/*" class="ap-input" style="padding:8px">
      <p class="text-muted" style="font-size:12px;margin-top:6px">JPG, PNG, WebP desteklenir</p>
    </div>
  </div>
</div>
</form>

<?php else: ?>
<!-- ─── Ürün Listesi ─── -->
<form method="GET" style="display:flex;gap:10px;margin-bottom:16px">
  <input type="hidden" name="page" value="products">
  <input class="ap-input" name="q" value="<?= e($search) ?>" placeholder="Ürün ara..." style="max-width:300px">
  <button class="ap-btn ap-btn-primary" type="submit">Ara</button>
</form>

<div class="ap-card" style="padding:0;overflow:hidden">
  <table class="ap-table" style="margin:0">
    <thead><tr><th style="width:60px">Görsel</th><th>Ürün Adı</th><th>Fiyat</th><th>Stok</th><th>Durum</th><th>İşlem</th></tr></thead>
    <tbody>
      <?php foreach ($products as $pr):
        $pm = DB::query("SELECT meta_key,meta_val FROM `{p}post_meta` WHERE post_id=?", [$pr['id']]);
        $meta = array_column($pm, 'meta_val', 'meta_key');
      ?>
      <tr>
        <td>
          <?php if ($pr['cover_image']): ?>
          <img src="<?= e($pr['cover_image']) ?>" style="width:48px;height:48px;object-fit:cover;border-radius:4px">
          <?php else: ?><div style="width:48px;height:48px;background:var(--ap-border);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:20px">📦</div><?php endif; ?>
        </td>
        <td>
          <strong><?= e($pr['title']) ?></strong>
          <?php if (!empty($meta['sku'])): ?><br><small class="text-muted">SKU: <?= e($meta['sku']) ?></small><?php endif; ?>
        </td>
        <td>
          <strong><?= number_format((float)($meta['price']??0),2) ?> ₺</strong>
          <?php if (!empty($meta['old_price']) && $meta['old_price']>0): ?>
          <br><small style="text-decoration:line-through;color:var(--ap-text-muted)"><?= number_format((float)$meta['old_price'],2) ?> ₺</small>
          <?php endif; ?>
        </td>
        <td><?= e($meta['stock'] ?? '—') ?></td>
        <td><span class="ap-badge ap-badge-<?= $pr['status']==='published'?'green':'gray' ?>"><?= $pr['status']==='published'?'Yayında':'Taslak' ?></span></td>
        <td>
          <a href="/admin/?page=products&edit=<?= $pr['id'] ?>" class="ap-btn ap-btn-sm">Düzenle</a>
          <form method="POST" style="display:inline" onsubmit="return confirm('Ürünü silmek istiyor musunuz?')">
            <input type="hidden" name="action" value="delete">
            <input type="hidden" name="id" value="<?= $pr['id'] ?>">
            <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
            <button class="ap-btn ap-btn-sm" style="border:1px solid var(--ap-red);color:var(--ap-red);background:transparent">Sil</button>
          </form>
        </td>
      </tr>
      <?php endforeach; ?>
      <?php if (empty($products)): ?>
      <tr><td colspan="6" style="text-align:center;padding:40px;color:var(--ap-text-muted)">
        Henüz ürün yok. <a href="/admin/?page=products&edit=0" style="color:var(--ap-accent)">İlk ürünü ekle →</a>
      </td></tr>
      <?php endif; ?>
    </tbody>
  </table>
</div>
<?php endif; ?>
<?php });
