<?php defined('ROOT') or die(); Auth::require('admin');

if ($_SERVER['REQUEST_METHOD'] === 'POST' && Security::verifyCsrf()) {
    $action = ap_post('action');
    $id = Security::int(ap_post('id'));

    if ($action === 'save') {
        $data = [
            'username'     => Security::str(ap_post('username')),
            'email'        => Security::email(ap_post('email')),
            'display_name' => Security::str(ap_post('display_name')),
            'role'         => in_array(ap_post('role'),['super_admin','admin','editor','author','columnist','subscriber'])?ap_post('role'):'author',
            'active'       => (int)!empty($_POST['active']),
        ];
        if ($id) {
            if (ap_post('password')) $data['password_hash'] = Auth::hashPassword(ap_post('password'));
            DB::update('users', $data, ['id'=>$id]);
            ap_flash('Kullanıcı güncellendi.');
        } else {
            if (!ap_post('password')) ap_ajax_error('Şifre zorunlu');
            $data['password_hash'] = Auth::hashPassword(ap_post('password'));
            $data['created_at'] = date('Y-m-d H:i:s');
            DB::insert('users', $data);
            ap_flash('Kullanıcı eklendi.');
        }
        ap_redirect('/admin?page=users');
    } elseif ($action === 'delete' && $id !== Auth::userId()) {
        DB::delete('users', ['id'=>$id]);
        ap_flash('Kullanıcı silindi.', 'warning');
        ap_redirect('/admin?page=users');
    }
}

$users = DB::query("SELECT * FROM `{p}users` ORDER BY id DESC");
$editUser = isset($_GET['edit']) ? DB::queryRow("SELECT * FROM `{p}users` WHERE id=?", [Security::int($_GET['edit'])]) : null;

ap_admin_layout('Kullanıcılar', function() use ($users, $editUser) { ?>
<div class="ap-page-header">
  <h1 class="ap-page-title">Kullanıcılar (<?= count($users) ?>)</h1>
  <button class="ap-btn ap-btn-primary" onclick="AP.modal.open('user-modal')">+ Yeni Kullanıcı</button>
</div>
<div class="ap-card">
  <div class="ap-table-wrap">
    <table class="ap-table">
      <thead><tr><th>Kullanıcı</th><th>E-posta</th><th>Rol</th><th>Durum</th><th>Son Giriş</th><th>İşlem</th></tr></thead>
      <tbody>
      <?php foreach ($users as $u): ?>
      <tr>
        <td>
          <div class="d-flex align-center gap-2">
            <div class="ap-user-avatar" style="width:32px;height:32px;font-size:12px;border-radius:50%;background:var(--ap-accent);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;flex-shrink:0"><?= strtoupper(substr($u['display_name']??'?',0,1)) ?></div>
            <div>
              <div style="font-weight:600"><?= e($u['display_name']) ?></div>
              <div class="text-xs text-muted">@<?= e($u['username']) ?></div>
            </div>
          </div>
        </td>
        <td class="text-sm"><?= e($u['email']) ?></td>
        <td>
          <?php $rc = ['super_admin'=>'ap-badge-purple','admin'=>'ap-badge-red','editor'=>'ap-badge-blue','author'=>'ap-badge-green','columnist'=>'ap-badge-orange','subscriber'=>'ap-badge-gray']; ?>
          <span class="ap-badge <?= $rc[$u['role']] ?? 'ap-badge-gray' ?>"><?= e($u['role']) ?></span>
        </td>
        <td><span class="ap-badge <?= $u['active']?'ap-badge-green':'ap-badge-gray' ?>"><?= $u['active']?'Aktif':'Pasif' ?></span></td>
        <td class="text-xs text-muted"><?= $u['last_login'] ? ap_date($u['last_login'],'d M Y') : '—' ?></td>
        <td class="actions">
          <button class="ap-btn ap-btn-ghost ap-btn-sm" onclick='editUser(<?= json_encode($u) ?>)'>Düzenle</button>
          <?php if ($u['id'] !== Auth::userId()): ?>
          <form method="POST" style="display:inline" onsubmit="return AP.confirm('Kullanıcı silinsin mi?')">
            <?= Security::csrfField() ?><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="<?= $u['id'] ?>">
            <button class="ap-btn ap-btn-danger ap-btn-sm">Sil</button>
          </form>
          <?php endif; ?>
        </td>
      </tr>
      <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</div>

<div class="ap-modal-overlay hidden" id="user-modal">
  <div class="ap-modal">
    <div class="ap-modal-header">
      <span class="ap-modal-title" id="user-modal-title">Yeni Kullanıcı</span>
      <button class="ap-icon-btn" onclick="AP.modal.close('user-modal')">✕</button>
    </div>
    <form method="POST">
      <?= Security::csrfField() ?>
      <input type="hidden" name="action" value="save">
      <input type="hidden" name="id" id="user-id" value="0">
      <div class="ap-modal-body">
        <div class="ap-form-row">
          <div class="ap-form-group">
            <label class="ap-label">Ad Soyad</label>
            <input class="ap-input" type="text" name="display_name" id="u-display" required>
          </div>
          <div class="ap-form-group">
            <label class="ap-label">Kullanıcı Adı</label>
            <input class="ap-input" type="text" name="username" id="u-username" required>
          </div>
        </div>
        <div class="ap-form-row">
          <div class="ap-form-group">
            <label class="ap-label">E-posta</label>
            <input class="ap-input" type="email" name="email" id="u-email" required>
          </div>
          <div class="ap-form-group">
            <label class="ap-label">Şifre <span id="u-pass-hint" class="text-muted text-xs">(boş = değiştirme)</span></label>
            <input class="ap-input" type="password" name="password" id="u-pass">
          </div>
        </div>
        <div class="ap-form-row">
          <div class="ap-form-group">
            <label class="ap-label">Rol</label>
            <select class="ap-select" name="role" id="u-role">
              <?php foreach (['subscriber'=>'Abone','columnist'=>'Köşe Yazarı','author'=>'Yazar','editor'=>'Editör','admin'=>'Yönetici','super_admin'=>'Süper Admin'] as $v=>$l): ?>
              <option value="<?= $v ?>"><?= $l ?></option>
              <?php endforeach; ?>
            </select>
          </div>
          <div class="ap-form-group" style="display:flex;align-items:flex-end;padding-bottom:4px">
            <label class="ap-toggle">
              <input type="checkbox" name="active" id="u-active" value="1" checked>
              <div class="ap-toggle-slider"></div>
              <span class="ap-toggle-label">Aktif</span>
            </label>
          </div>
        </div>
      </div>
      <div class="ap-modal-footer">
        <button type="button" class="ap-btn ap-btn-ghost" onclick="AP.modal.close('user-modal')">İptal</button>
        <button type="submit" class="ap-btn ap-btn-primary">Kaydet</button>
      </div>
    </form>
  </div>
</div>
<script>
function editUser(u) {
  document.getElementById('user-modal-title').textContent='Kullanıcı Düzenle';
  document.getElementById('user-id').value   = u.id;
  document.getElementById('u-display').value = u.display_name||'';
  document.getElementById('u-username').value= u.username||'';
  document.getElementById('u-email').value   = u.email||'';
  document.getElementById('u-role').value    = u.role||'author';
  document.getElementById('u-active').checked= !!parseInt(u.active);
  document.getElementById('u-pass-hint').style.display='inline';
  AP.modal.open('user-modal');
}
</script>
<?php });
