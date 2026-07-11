<?php defined('ROOT') or die(); Auth::require('editor');

// İşlemler
if ($_SERVER['REQUEST_METHOD'] === 'POST' && Security::verifyCsrf()) {
    $action = ap_post('action');
    if ($action === 'save') {
        $id    = Security::int(ap_post('id'));
        $data  = [
            'name'       => Security::str(ap_post('name')),
            'slug'       => Security::slug(ap_post('slug') ?: ap_post('name')),
            'parent_id'  => Security::int(ap_post('parent_id')) ?: null,
            'color'      => preg_match('/^#[0-9a-fA-F]{3,6}$/', ap_post('color')) ? ap_post('color') : '#CC0000',
            'sort_order' => Security::int(ap_post('sort_order')),
            'active'     => 1,
        ];
        $slugTable = DB::prefix() . 'categories';
        $data['slug'] = ap_unique_slug($data['slug'], $slugTable, 'slug', $id ?: null);
        if ($id) { DB::update('categories', $data, ['id'=>$id]); ap_flash('Kategori güncellendi.'); }
        else     { DB::insert('categories', $data); ap_flash('Kategori eklendi.'); }
        ap_redirect('/admin?page=categories');
    } elseif ($action === 'delete') {
        $id = Security::int(ap_post('id'));
        DB::exec("UPDATE `{p}posts` SET category_id=NULL WHERE category_id=?", [$id]);
        DB::delete('categories', ['id'=>$id]);
        ap_flash('Kategori silindi.', 'warning');
        ap_redirect('/admin?page=categories');
    }
}

$cats = DB::query("SELECT c.*, (SELECT COUNT(*) FROM `{p}posts` p WHERE p.category_id=c.id) as post_count FROM `{p}categories` c ORDER BY c.sort_order, c.name");
$editCat = null;
if (isset($_GET['edit'])) $editCat = DB::queryRow("SELECT * FROM `{p}categories` WHERE id=?", [Security::int($_GET['edit'])]);

ap_admin_layout('Kategoriler', function() use ($cats, $editCat) { ?>
<div class="ap-page-header">
  <h1 class="ap-page-title">Kategoriler</h1>
  <button class="ap-btn ap-btn-primary" onclick="AP.modal.open('cat-modal')">+ Yeni Kategori</button>
</div>
<div class="ap-card">
  <div class="ap-table-wrap">
    <table class="ap-table">
      <thead><tr><th>İsim</th><th>Slug</th><th>Renk</th><th>İçerik</th><th>Sıra</th><th>İşlem</th></tr></thead>
      <tbody>
      <?php foreach ($cats as $c): ?>
      <tr>
        <td><strong><?= e($c['name']) ?></strong></td>
        <td class="text-muted text-sm"><?= e($c['slug']) ?></td>
        <td><span class="color-swatch" style="background:<?= e($c['color']) ?>"></span> <?= e($c['color']) ?></td>
        <td><?= $c['post_count'] ?></td>
        <td><?= $c['sort_order'] ?></td>
        <td class="actions">
          <button class="ap-btn ap-btn-ghost ap-btn-sm" onclick='editCat(<?= json_encode($c) ?>)'>Düzenle</button>
          <form method="POST" style="display:inline" onsubmit="return AP.confirm('Kategori silinsin mi?')">
            <?= Security::csrfField() ?>
            <input type="hidden" name="action" value="delete">
            <input type="hidden" name="id" value="<?= $c['id'] ?>">
            <button class="ap-btn ap-btn-danger ap-btn-sm">Sil</button>
          </form>
        </td>
      </tr>
      <?php endforeach; ?>
      <?php if (empty($cats)): ?><tr><td colspan="6" style="text-align:center;padding:30px;color:var(--ap-text-muted)">Kategori bulunamadı.</td></tr><?php endif; ?>
      </tbody>
    </table>
  </div>
</div>

<!-- Modal -->
<div class="ap-modal-overlay hidden" id="cat-modal">
  <div class="ap-modal">
    <div class="ap-modal-header">
      <span class="ap-modal-title" id="cat-modal-title">Yeni Kategori</span>
      <button class="ap-icon-btn" onclick="AP.modal.close('cat-modal')">✕</button>
    </div>
    <form method="POST" id="cat-form">
      <?= Security::csrfField() ?>
      <input type="hidden" name="action" value="save">
      <input type="hidden" name="id" id="cat-id" value="0">
      <div class="ap-modal-body">
        <div class="ap-form-group">
          <label class="ap-label">İsim *</label>
          <input class="ap-input" type="text" name="name" id="cat-name" required oninput="if(!document.getElementById('cat-id').value||document.getElementById('cat-id').value==='0') document.getElementById('cat-slug').value=AP.slugify(this.value)">
        </div>
        <div class="ap-form-row">
          <div class="ap-form-group">
            <label class="ap-label">Slug</label>
            <input class="ap-input" type="text" name="slug" id="cat-slug">
          </div>
          <div class="ap-form-group">
            <label class="ap-label">Renk</label>
            <input class="ap-input" type="color" name="color" id="cat-color" value="#CC0000" style="height:38px;padding:2px 6px;cursor:pointer">
          </div>
        </div>
        <div class="ap-form-row">
          <div class="ap-form-group">
            <label class="ap-label">Üst Kategori</label>
            <select class="ap-select" name="parent_id" id="cat-parent">
              <option value="">— Yok —</option>
              <?php foreach ($cats as $c): ?>
              <option value="<?= $c['id'] ?>"><?= e($c['name']) ?></option>
              <?php endforeach; ?>
            </select>
          </div>
          <div class="ap-form-group">
            <label class="ap-label">Sıra</label>
            <input class="ap-input" type="number" name="sort_order" id="cat-sort" value="0">
          </div>
        </div>
      </div>
      <div class="ap-modal-footer">
        <button type="button" class="ap-btn ap-btn-ghost" onclick="AP.modal.close('cat-modal')">İptal</button>
        <button type="submit" class="ap-btn ap-btn-primary">Kaydet</button>
      </div>
    </form>
  </div>
</div>
<script>
function editCat(c) {
  document.getElementById('cat-modal-title').textContent = 'Kategori Düzenle';
  document.getElementById('cat-id').value    = c.id;
  document.getElementById('cat-name').value  = c.name;
  document.getElementById('cat-slug').value  = c.slug;
  document.getElementById('cat-color').value = c.color || '#CC0000';
  document.getElementById('cat-sort').value  = c.sort_order || 0;
  const par = document.getElementById('cat-parent');
  if (par) par.value = c.parent_id || '';
  AP.modal.open('cat-modal');
}
</script>
<?php });
