<?php defined('ROOT') or die(); Auth::require('subscriber');

if ($_SERVER['REQUEST_METHOD'] === 'POST' && Security::verifyCsrf()) {
    $userId = Auth::userId();
    $data = [
        'display_name' => Security::str(ap_post('display_name')),
        'email'        => Security::email(ap_post('email')),
        'bio'          => Security::str(ap_post('bio')),
    ];
    if (ap_post('new_password')) {
        if (ap_post('new_password') !== ap_post('confirm_password')) ap_flash('Şifreler eşleşmiyor.', 'error');
        else $data['password_hash'] = Auth::hashPassword(ap_post('new_password'));
    }
    if (!empty($_FILES['avatar']['name'])) {
        $r = ap_upload_file($_FILES['avatar'], 'avatars');
        if (empty($r['error'])) $data['avatar'] = $r['path'];
    }
    DB::update('users', $data, ['id'=>$userId]);
    ap_flash('Profil güncellendi.', 'success');
    ap_redirect('/admin?page=profile');
}

$user = DB::queryRow("SELECT * FROM `{p}users` WHERE id=?", [Auth::userId()]);

ap_admin_layout('Profilim', function() use ($user) { ?>
<div class="ap-page-header"><h1 class="ap-page-title">Profilim</h1></div>
<div style="max-width:600px">
  <form method="POST" enctype="multipart/form-data">
    <?= Security::csrfField() ?>
    <div class="ap-card" style="padding:24px">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px">
        <img src="<?= e(ap_thumb_url($user['avatar']??'')) ?>" alt="" style="width:72px;height:72px;border-radius:50%;object-fit:cover;background:var(--ap-bg-dark)">
        <div>
          <label class="ap-btn ap-btn-secondary ap-btn-sm" style="cursor:pointer">
            📷 Avatar Değiştir
            <input type="file" name="avatar" accept="image/*" style="display:none">
          </label>
        </div>
      </div>

      <div class="ap-form-row">
        <div class="ap-form-group">
          <label class="ap-label">Ad Soyad</label>
          <input class="ap-input" type="text" name="display_name" value="<?= e($user['display_name']??'') ?>" required>
        </div>
        <div class="ap-form-group">
          <label class="ap-label">E-posta</label>
          <input class="ap-input" type="email" name="email" value="<?= e($user['email']??'') ?>" required>
        </div>
      </div>

      <div class="ap-form-group">
        <label class="ap-label">Biyografi</label>
        <textarea class="ap-textarea" name="bio" rows="3"><?= e($user['bio']??'') ?></textarea>
      </div>

      <hr style="border-color:var(--ap-border);margin:20px 0">
      <div style="font-size:13px;font-weight:600;color:var(--ap-text-muted);margin-bottom:12px">Şifre Değiştir (boş = değişme)</div>

      <div class="ap-form-row">
        <div class="ap-form-group">
          <label class="ap-label">Yeni Şifre</label>
          <input class="ap-input" type="password" name="new_password">
        </div>
        <div class="ap-form-group">
          <label class="ap-label">Şifre Tekrar</label>
          <input class="ap-input" type="password" name="confirm_password">
        </div>
      </div>

      <div style="display:flex;justify-content:flex-end;margin-top:8px">
        <button type="submit" class="ap-btn ap-btn-primary">Kaydet</button>
      </div>
    </div>
  </form>
</div>
<?php });
