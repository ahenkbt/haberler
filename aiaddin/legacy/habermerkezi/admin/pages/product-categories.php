<?php
defined('ROOT') or die();
Auth::require('editor');

$action = $_POST['action'] ?? '';
$csrf   = Security::csrf();

if ($action && Security::verifyCsrf($_POST['csrf'] ?? '')) {
    $name  = trim($_POST['name'] ?? '');
    $slug  = trim($_POST['slug'] ?? '') ?: mb_strtolower(preg_replace('/\s+/', '-', $name));
    $desc  = trim($_POST['description'] ?? '');
    $pid   = (int)($_POST['parent_id'] ?? 0);
    $id    = (int)($_POST['id'] ?? 0);

    if ($action === 'save' && $name) {
        if ($id) {
            DB::execute("UPDATE `{p}product_categories` SET name=?,slug=?,description=?,parent_id=? WHERE id=?",
                [$name,$slug,$desc,$pid,$id]);
            ap_flash('Kategori güncellendi.');
        } else {
            DB::execute("INSERT INTO `{p}product_categories` (name,slug,description,parent_id) VALUES (?,?,?,?)",
                [$name,$slug,$desc,$pid]);
            ap_flash('Kategori eklendi.');
        }
    } elseif ($action === 'delete' && $id) {
        DB::execute("DELETE FROM `{p}product_categories` WHERE id=?", [$id]);
        ap_flash('Kategori silindi.', 'warning');
    }
    header('Location: /admin/?page=product-categories');
    exit;
}

$cats   = DB::query("SELECT * FROM `{p}product_categories` ORDER BY parent_id, name");
$editId = (int)($_GET['edit'] ?? 0);
$edit   = $editId ? DB::queryRow("SELECT * FROM `{p}product_categories` WHERE id=?", [$editId]) : null;

ap_admin_layout('Ürün Kategorileri', function() use ($cats, $edit, $csrf) { ?>
<div class="ap-page-header">
  <h1 class="ap-page-title">Ürün Kategorileri</h1>
</div>
<div style="display:grid;grid-template-columns:340px 1fr;gap:20px;align-items:start">
  <!-- Form -->
  <div class="ap-card" style="padding:20px">
    <h3 style="margin-bottom:16px;font-size:15px"><?= $edit ? 'Kategori Düzenle' : 'Yeni Kategori' ?></h3>
    <form method="POST">
      <input type="hidden" name="action" value="save">
      <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
      <?php if ($edit): ?><input type="hidden" name="id" value="<?= $edit['id'] ?>"><?php endif; ?>
      <div class="ap-form-group">
        <label class="ap-label">Kategori Adı *</label>
        <input class="ap-input" name="name" required value="<?= e($edit['name'] ?? '') ?>" placeholder="Örn: Elektronik">
      </div>
      <div class="ap-form-group">
        <label class="ap-label">URL Kısa Ad (slug)</label>
        <input class="ap-input" name="slug" value="<?= e($edit['slug'] ?? '') ?>" placeholder="elektronik">
      </div>
      <div class="ap-form-group">
        <label class="ap-label">Üst Kategori</label>
        <select class="ap-input" name="parent_id">
          <option value="0">— Ana Kategori —</option>
          <?php foreach ($cats as $c): if ($edit && $c['id'] == $edit['id']) continue; ?>
          <option value="<?= $c['id'] ?>" <?= ($edit['parent_id']??0) == $c['id'] ? 'selected' : '' ?>>
            <?= e($c['name']) ?>
          </option>
          <?php endforeach; ?>
        </select>
      </div>
      <div class="ap-form-group">
        <label class="ap-label">Açıklama</label>
        <textarea class="ap-input" name="description" rows="3"><?= e($edit['description'] ?? '') ?></textarea>
      </div>
      <div style="display:flex;gap:8px">
        <button class="ap-btn ap-btn-primary" type="submit" style="flex:1"><?= $edit ? 'Güncelle' : 'Ekle' ?></button>
        <?php if ($edit): ?>
        <a href="/admin/?page=product-categories" class="ap-btn" style="flex:1;text-align:center">İptal</a>
        <?php endif; ?>
      </div>
    </form>
  </div>

  <!-- List -->
  <div class="ap-card" style="padding:0;overflow:hidden">
    <table class="ap-table" style="margin:0">
      <thead><tr><th>Kategori</th><th>Slug</th><th>Ürün</th><th>İşlem</th></tr></thead>
      <tbody>
        <?php foreach ($cats as $c): ?>
        <?php $count = (int)DB::queryValue("SELECT COUNT(*) FROM `{p}post_meta` pm JOIN `{p}posts` p ON p.id=pm.post_id WHERE pm.meta_key='product_category_id' AND pm.meta_val=? AND p.post_type='product' AND p.status='published'", [$c['id']]); ?>
        <tr>
          <td>
            <?php if ($c['parent_id']): ?><span style="color:var(--ap-text-muted);margin-right:8px">↳</span><?php endif; ?>
            <strong><?= e($c['name']) ?></strong>
          </td>
          <td><code><?= e($c['slug']) ?></code></td>
          <td><?= $count ?></td>
          <td>
            <a href="/admin/?page=product-categories&edit=<?= $c['id'] ?>" class="ap-btn ap-btn-sm">Düzenle</a>
            <form method="POST" style="display:inline" onsubmit="return confirm('Silmek istediğinizden emin misiniz?')">
              <input type="hidden" name="action" value="delete">
              <input type="hidden" name="id" value="<?= $c['id'] ?>">
              <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
              <button class="ap-btn ap-btn-sm" style="border:1px solid var(--ap-red);color:var(--ap-red);background:transparent">Sil</button>
            </form>
          </td>
        </tr>
        <?php endforeach; ?>
        <?php if (empty($cats)): ?>
        <tr><td colspan="4" style="text-align:center;color:var(--ap-text-muted);padding:30px">Henüz kategori yok</td></tr>
        <?php endif; ?>
      </tbody>
    </table>
  </div>
</div>
<?php });
