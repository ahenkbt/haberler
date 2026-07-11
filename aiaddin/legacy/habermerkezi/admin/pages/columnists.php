<?php defined('ROOT') or die(); Auth::require('editor');

if ($_SERVER['REQUEST_METHOD'] === 'POST' && Security::verifyCsrf()) {
    $action = ap_post('action');
    $id     = Security::int(ap_post('id'));

    if ($action === 'save') {
        $data = [
            'name'       => Security::str(ap_post('name')),
            'slug'       => Security::slug(ap_post('slug') ?: ap_post('name')),
            'title'      => Security::str(ap_post('title')),
            'bio'        => Security::str(ap_post('bio')),
            'sort_order' => Security::int(ap_post('sort_order')),
            'active'     => (int)!empty($_POST['active']),
        ];
        $data['slug'] = ap_unique_slug($data['slug'], DB::prefix().'columnists', 'slug', $id ?: null);
        if (!empty($_FILES['avatar']['name'])) {
            $r = ap_upload_file($_FILES['avatar'], 'avatars');
            if (empty($r['error'])) $data['avatar'] = $r['path'];
        }
        if ($id) { DB::update('columnists', $data, ['id'=>$id]); ap_flash('Güncellendi.'); }
        else     { DB::insert('columnists', $data); ap_flash('Eklendi.'); }
        ap_redirect('/admin?page=columnists');
    } elseif ($action === 'delete') {
        DB::delete('columnists', ['id'=>$id]);
        ap_flash('Silindi.', 'warning');
        ap_redirect('/admin?page=columnists');
    }
}

$columnists = DB::query("SELECT c.*, (SELECT COUNT(*) FROM `{p}posts` p WHERE p.columnist_id=c.id) post_count FROM `{p}columnists` c ORDER BY c.sort_order, c.name");

ap_admin_layout('Köşe Yazarları', function() use ($columnists) { ?>
<div class="ap-page-header">
  <h1 class="ap-page-title">Köşe Yazarları</h1>
  <button class="ap-btn ap-btn-primary" onclick="AP.modal.open('col-modal')">+ Yeni Yazar</button>
</div>

<div class="ap-card">
  <div class="ap-table-wrap">
    <table class="ap-table">
      <thead><tr><th>Yazar</th><th>Unvan</th><th>Yazı</th><th>Sıra</th><th>Durum</th><th>İşlem</th></tr></thead>
      <tbody>
      <?php foreach ($columnists as $c): ?>
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <img src="<?= e(ap_thumb_url($c['avatar'])) ?>" alt="" style="width:36px;height:36px;border-radius:50%;object-fit:cover;background:#f0f0f0">
            <div>
              <div style="font-weight:600"><?= e($c['name']) ?></div>
              <div class="text-xs text-muted"><?= e($c['slug']) ?></div>
            </div>
          </div>
        </td>
        <td class="text-sm"><?= e($c['title']??'—') ?></td>
        <td><?= $c['post_count'] ?></td>
        <td><?= $c['sort_order'] ?></td>
        <td><span class="ap-badge <?= $c['active']?'ap-badge-green':'ap-badge-gray' ?>"><?= $c['active']?'Aktif':'Pasif' ?></span></td>
        <td class="actions">
          <button class="ap-btn ap-btn-ghost ap-btn-sm" onclick='editCol(<?= json_encode($c) ?>)'>✏️ Düzenle</button>
          <form method="POST" style="display:inline" onsubmit="return AP.confirm('Silinsin mi?')">
            <?= Security::csrfField() ?><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="<?= $c['id'] ?>">
            <button class="ap-btn ap-btn-danger ap-btn-sm">🗑</button>
          </form>
        </td>
      </tr>
      <?php endforeach; ?>
      <?php if (empty($columnists)): ?><tr><td colspan="6" style="text-align:center;padding:30px;color:var(--ap-text-muted)">Henüz köşe yazarı eklenmedi.</td></tr><?php endif; ?>
      </tbody>
    </table>
  </div>
</div>

<div class="ap-modal-overlay hidden" id="col-modal">
  <div class="ap-modal">
    <div class="ap-modal-header">
      <span class="ap-modal-title" id="col-title">Yeni Köşe Yazarı</span>
      <button class="ap-icon-btn" onclick="AP.modal.close('col-modal')">✕</button>
    </div>
    <form method="POST" enctype="multipart/form-data">
      <?= Security::csrfField() ?>
      <input type="hidden" name="action" value="save">
      <input type="hidden" name="id" id="col-id" value="0">
      <div class="ap-modal-body">
        <div class="ap-form-row">
          <div class="ap-form-group">
            <label class="ap-label">Ad Soyad *</label>
            <input class="ap-input" type="text" name="name" id="col-name" required oninput="if(!document.getElementById('col-id').value||document.getElementById('col-id').value==='0') document.getElementById('col-slug').value=AP.slugify(this.value)">
          </div>
          <div class="ap-form-group">
            <label class="ap-label">Slug</label>
            <input class="ap-input" type="text" name="slug" id="col-slug">
          </div>
        </div>
        <div class="ap-form-row">
          <div class="ap-form-group">
            <label class="ap-label">Unvan</label>
            <input class="ap-input" type="text" name="title" id="col-ytitle" placeholder="Genel Yayın Yönetmeni">
          </div>
          <div class="ap-form-group">
            <label class="ap-label">Sıra</label>
            <input class="ap-input" type="number" name="sort_order" id="col-sort" value="0">
          </div>
        </div>
        <div class="ap-form-group">
          <label class="ap-label">Biyografi</label>
          <textarea class="ap-textarea" name="bio" id="col-bio" rows="3"></textarea>
        </div>
        <div class="ap-form-row">
          <div class="ap-form-group">
            <label class="ap-label">Avatar</label>
            <input class="ap-input" type="file" name="avatar" accept="image/*">
          </div>
          <div class="ap-form-group" style="display:flex;align-items:flex-end;padding-bottom:4px">
            <label class="ap-toggle">
              <input type="checkbox" name="active" id="col-active" value="1" checked>
              <div class="ap-toggle-slider"></div>
              <span class="ap-toggle-label">Aktif</span>
            </label>
          </div>
        </div>
      </div>
      <div class="ap-modal-footer">
        <button type="button" class="ap-btn ap-btn-ghost" onclick="AP.modal.close('col-modal')">İptal</button>
        <button type="submit" class="ap-btn ap-btn-primary">Kaydet</button>
      </div>
    </form>
  </div>
</div>
<script>
function editCol(c) {
  document.getElementById('col-title').textContent='Köşe Yazarı Düzenle';
  document.getElementById('col-id').value=c.id;
  document.getElementById('col-name').value=c.name||'';
  document.getElementById('col-slug').value=c.slug||'';
  document.getElementById('col-ytitle').value=c.title||'';
  document.getElementById('col-bio').value=c.bio||'';
  document.getElementById('col-sort').value=c.sort_order||0;
  document.getElementById('col-active').checked=!!parseInt(c.active);
  AP.modal.open('col-modal');
}
</script>
<?php });
