<?php
defined('ROOT') or die();
Auth::require('admin');

$action = $_POST['action'] ?? $_GET['action'] ?? '';
$slug   = preg_replace('/[^a-z0-9\-_]/', '', $_POST['slug'] ?? $_GET['slug'] ?? '');
$msg    = '';
$msgType = 'success';

if ($action && Security::verifyCsrf($_POST['csrf'] ?? '')) {
    switch ($action) {
        case 'activate':
            Module::activate($slug) ? ap_flash('"' . $slug . '" modülü aktifleştirildi.') : ap_flash('Aktifleştirme başarısız.', 'error');
            break;
        case 'deactivate':
            Module::deactivate($slug);
            ap_flash('"' . $slug . '" modülü devre dışı bırakıldı.', 'warning');
            break;
        case 'delete':
            Module::delete($slug) ? ap_flash('"' . $slug . '" silindi.') : ap_flash('Silme başarısız.', 'error');
            break;
        case 'upload':
            if (!empty($_FILES['zip']['tmp_name'])) {
                $result = Module::installZip($_FILES['zip']['tmp_name']);
                ap_flash($result['msg'], $result['ok'] ? 'success' : 'error');
                if ($result['ok']) Module::activate($result['slug']);
            }
            break;
    }
    header('Location: /admin/?page=modules');
    exit;
}

$csrf    = Security::csrf();
$modules = Module::all();

ap_admin_layout('Modüller', function() use ($modules, $csrf) { ?>
<div class="ap-page-header">
  <div>
    <h1 class="ap-page-title">Modüller</h1>
    <p class="text-muted" style="font-size:13px;margin-top:2px">WordPress eklentilerine benzer şekilde AhenkPress fonksiyonlarını genişletin</p>
  </div>
  <button class="ap-btn ap-btn-primary" onclick="document.getElementById('upload-modal').style.display='flex'">
    + Modül Yükle
  </button>
</div>

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px">
  <?php foreach ($modules as $m): ?>
  <?php $isActive = $m['active']; ?>
  <div class="ap-card" style="padding:20px;border-left:3px solid <?= $isActive ? 'var(--ap-green)' : 'var(--ap-border)' ?>">
    <div style="display:flex;align-items:flex-start;gap:12px">
      <div style="width:44px;height:44px;background:<?= $isActive ? 'var(--ap-green)' : 'var(--ap-border)' ?>;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">
        <?= $m['icon'] ?? '🔌' ?>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:15px;margin-bottom:2px"><?= e($m['name'] ?? $m['slug']) ?></div>
        <div class="text-muted" style="font-size:12px;margin-bottom:6px">v<?= e($m['version'] ?? '1.0') ?> · <?= e($m['author'] ?? 'AhenkPress') ?></div>
        <p style="font-size:13px;color:var(--ap-text-muted);margin-bottom:12px;line-height:1.5"><?= e($m['description'] ?? '') ?></p>
        <div style="display:flex;gap:8px;align-items:center">
          <?php if ($isActive): ?>
          <span class="ap-badge ap-badge-green">✓ Aktif</span>
          <form method="POST" style="margin:0">
            <input type="hidden" name="action" value="deactivate">
            <input type="hidden" name="slug" value="<?= e($m['slug']) ?>">
            <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
            <button class="ap-btn ap-btn-sm" style="background:transparent;border:1px solid var(--ap-border);padding:3px 10px;font-size:12px">Devre Dışı</button>
          </form>
          <?php else: ?>
          <span class="ap-badge" style="background:var(--ap-border);color:var(--ap-text-muted)">Pasif</span>
          <form method="POST" style="margin:0">
            <input type="hidden" name="action" value="activate">
            <input type="hidden" name="slug" value="<?= e($m['slug']) ?>">
            <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
            <button class="ap-btn ap-btn-sm ap-btn-primary" style="padding:3px 10px;font-size:12px">Aktifleştir</button>
          </form>
          <form method="POST" style="margin:0" onsubmit="return confirm('Bu modülü silmek istiyor musunuz?')">
            <input type="hidden" name="action" value="delete">
            <input type="hidden" name="slug" value="<?= e($m['slug']) ?>">
            <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
            <button class="ap-btn ap-btn-sm" style="background:transparent;border:1px solid var(--ap-red);color:var(--ap-red);padding:3px 10px;font-size:12px">Sil</button>
          </form>
          <?php endif; ?>
        </div>
      </div>
    </div>
  </div>
  <?php endforeach; ?>

  <?php if (empty($modules)): ?>
  <div class="ap-card" style="text-align:center;padding:60px;color:var(--ap-text-muted);grid-column:1/-1">
    <div style="font-size:48px;margin-bottom:16px">🔌</div>
    <h3 style="margin-bottom:8px;color:var(--ap-text)">Henüz modül yok</h3>
    <p style="font-size:13px">ZIP formatında modül yükleyebilir veya <code>/modules/</code> klasörüne manuel ekleyebilirsiniz.</p>
  </div>
  <?php endif; ?>
</div>

<!-- Upload Modal -->
<div id="upload-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;align-items:center;justify-content:center">
  <div style="background:var(--ap-card);border:1px solid var(--ap-border);border-radius:12px;padding:28px;width:420px;max-width:95vw">
    <h3 style="margin-bottom:16px">ZIP ile Modül Yükle</h3>
    <form method="POST" enctype="multipart/form-data">
      <input type="hidden" name="action" value="upload">
      <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
      <div style="border:2px dashed var(--ap-border);border-radius:8px;padding:28px;text-align:center;margin-bottom:16px">
        <div style="font-size:32px;margin-bottom:8px">📦</div>
        <p style="font-size:13px;color:var(--ap-text-muted);margin-bottom:12px">AhenkPress modülü ZIP dosyası seçin</p>
        <input type="file" name="zip" accept=".zip" required style="font-size:13px">
      </div>
      <div style="font-size:12px;color:var(--ap-text-muted);margin-bottom:16px">
        Modül klasör yapısı: <code>modül-adı/module.json</code> + <code>modül-adı/main.php</code>
      </div>
      <div style="display:flex;gap:10px">
        <button class="ap-btn ap-btn-primary" type="submit" style="flex:1">Yükle ve Kur</button>
        <button type="button" class="ap-btn" onclick="document.getElementById('upload-modal').style.display='none'" style="flex:1">İptal</button>
      </div>
    </form>
  </div>
</div>

<div class="ap-card" style="margin-top:24px;padding:20px">
  <h3 style="margin-bottom:12px;font-size:15px">Modül Geliştirici Kılavuzu</h3>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:13px">
    <div>
      <div style="font-weight:600;margin-bottom:6px;color:var(--ap-accent)">📁 Klasör Yapısı</div>
      <pre style="background:var(--ap-bg);padding:12px;border-radius:6px;font-size:12px;line-height:1.8;overflow:auto">/modules/
  modulum/
    module.json   ← Bilgiler
    main.php      ← Ana kod
    install.php   ← Kurulum (opsiyonel)
    admin/        ← Admin sayfaları</pre>
    </div>
    <div>
      <div style="font-weight:600;margin-bottom:6px;color:var(--ap-accent)">📄 module.json</div>
      <pre style="background:var(--ap-bg);padding:12px;border-radius:6px;font-size:12px;line-height:1.8;overflow:auto">{
  "name": "Modül Adı",
  "version": "1.0.0",
  "description": "Açıklama",
  "author": "Geliştirici",
  "icon": "🔧",
  "requires": "5.0"
}</pre>
    </div>
  </div>
</div>
<?php });
