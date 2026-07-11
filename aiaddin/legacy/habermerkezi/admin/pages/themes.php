<?php defined('ROOT') or die(); Auth::require('admin');

$uploadMsg = '';

// ─── Yeni tema ZIP yükle ──────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['tema_yukle']) && Security::verifyCsrf()) {
    $file = $_FILES['tema_zip'] ?? null;
    if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
        $uploadMsg = 'error:Dosya yüklenemedi. Lütfen geçerli bir ZIP dosyası seçin.';
    } elseif ($file['size'] > 20 * 1024 * 1024) {
        $uploadMsg = 'error:Dosya çok büyük (maks. 20 MB).';
    } else {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime  = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        if (!in_array($mime, ['application/zip','application/x-zip','application/x-zip-compressed','application/octet-stream'])) {
            $uploadMsg = 'error:Sadece ZIP dosyası yüklenebilir.';
        } else {
            // ZipArchive ile çıkar
            $zip = new ZipArchive();
            if ($zip->open($file['tmp_name']) !== true) {
                $uploadMsg = 'error:ZIP dosyası açılamadı.';
            } else {
                // Tema klasör adını bul (ZIP içindeki ilk klasör)
                $firstName = '';
                for ($i = 0; $i < min($zip->numFiles, 50); $i++) {
                    $name = $zip->getNameIndex($i);
                    if (str_contains($name, '/')) {
                        $firstName = explode('/', $name)[0];
                        break;
                    }
                }
                if (!$firstName || preg_match('/[^a-zA-Z0-9\-_]/', $firstName)) {
                    $uploadMsg = 'error:Geçersiz tema yapısı. ZIP ana klasörü alfanümerik olmalı.';
                } else {
                    $destDir = THEMES_DIR . '/' . $firstName;
                    if (is_dir($destDir)) {
                        $uploadMsg = 'error:"' . e($firstName) . '" teması zaten mevcut. Önce mevcut temayı silin.';
                    } else {
                        $zip->extractTo(THEMES_DIR);
                        $zip->close();
                        $uploadMsg = 'success:' . e($firstName) . ' teması başarıyla yüklendi!';
                    }
                }
                if ($zip instanceof ZipArchive && $zip->numFiles > 0) {
                    try { $zip->close(); } catch (\Throwable) {}
                }
            }
        }
    }
}

// ─── Tema değiştir ────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['active_theme']) && Security::verifyCsrf()) {
    $theme = Security::str(ap_post('active_theme'));
    if ($theme) { DB::setSetting('active_theme', $theme); ap_flash('Tema değiştirildi.'); }
    ap_redirect('/admin?page=themes');
}

// ─── Tema sil ─────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['tema_sil']) && Security::verifyCsrf()) {
    $slug    = Security::str(ap_post('tema_sil'));
    $current = DB::setting('active_theme', '');
    if ($slug && $slug !== $current && preg_match('/^[a-zA-Z0-9\-_]+$/', $slug)) {
        $dir = THEMES_DIR . '/' . $slug;
        if (is_dir($dir)) {
            // Klasörü sil (recursive)
            $it = new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS);
            $ri = new RecursiveIteratorIterator($it, RecursiveIteratorIterator::CHILD_FIRST);
            foreach ($ri as $f) { $f->isDir() ? rmdir($f) : unlink($f); }
            rmdir($dir);
            ap_flash('"' . $slug . '" teması silindi.', 'success');
        }
    }
    ap_redirect('/admin?page=themes');
}

$themes  = Theme::available();
$current = DB::setting('active_theme', 'ankara-haber');

ap_admin_layout('Temalar', function() use ($themes, $current, $uploadMsg) {

[$upType, $upText] = $uploadMsg ? explode(':', $uploadMsg, 2) : ['',''];
if ($upType === 'success'): ?>
<div class="ap-alert ap-alert-success" style="margin-bottom:16px">✓ <?= $upText ?></div>
<?php elseif ($upType === 'error'): ?>
<div class="ap-alert ap-alert-error" style="margin-bottom:16px">✗ <?= $upText ?></div>
<?php endif; ?>

<div class="ap-page-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
  <h1 class="ap-page-title">Temalar</h1>
  <button onclick="document.getElementById('temaYukleModal').style.display='flex'" class="ap-btn ap-btn-primary">
    ⬆ Yeni Tema Yükle
  </button>
</div>

<!-- Tema Yükleme Modalı -->
<div id="temaYukleModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;align-items:center;justify-content:center">
  <div style="background:var(--ap-surface);border-radius:12px;padding:28px;width:100%;max-width:480px;box-shadow:0 20px 60px rgba(0,0,0,.4)">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <h2 style="font-size:18px;font-weight:800;margin:0">Yeni Tema Yükle</h2>
      <button onclick="document.getElementById('temaYukleModal').style.display='none'"
              style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--ap-text-2)">✕</button>
    </div>
    <form method="POST" enctype="multipart/form-data">
      <?= Security::csrfField() ?>
      <input type="hidden" name="tema_yukle" value="1">
      <div class="ap-form-group">
        <label class="ap-label">Tema ZIP Dosyası (maks. 20 MB)</label>
        <div style="border:2px dashed var(--ap-border);border-radius:8px;padding:24px;text-align:center;cursor:pointer"
             onclick="document.getElementById('temaZipInput').click()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:36px;height:36px;display:block;margin:0 auto 8px;opacity:.4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <span id="temaZipLabel" style="color:var(--ap-text-2);font-size:13px">ZIP dosyasını seç veya buraya sürükle</span>
          <input type="file" id="temaZipInput" name="tema_zip" accept=".zip" style="display:none"
                 onchange="document.getElementById('temaZipLabel').textContent=this.files[0]?.name||'Seç'">
        </div>
        <div class="ap-hint">ZIP içinde tek bir tema klasörü olmalı (örn: <code>benim-temam/</code>). İçinde <code>theme.json</code> veya <code>templates/index.php</code> bulunmalı.</div>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button type="button" onclick="document.getElementById('temaYukleModal').style.display='none'" class="ap-btn ap-btn-ghost">İptal</button>
        <button type="submit" class="ap-btn ap-btn-primary">⬆ Yükle</button>
      </div>
    </form>
  </div>
</div>

<!-- Tema Kartları -->
<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
  <?php foreach ($themes as $t): $active = ($current === $t['slug']); ?>
  <div class="ap-card" style="overflow:hidden;<?= $active ? 'border:2px solid var(--ap-accent)' : '' ?>">
    <?php
    // Tema önizleme görseli
    $thumb = THEMES_DIR . '/' . $t['slug'] . '/screenshot.png';
    $thumbUrl = file_exists($thumb) ? '/themes/' . $t['slug'] . '/screenshot.png' : '';
    ?>
    <div style="height:160px;background:linear-gradient(135deg,#1a1d21,#2d3748);display:flex;align-items:center;justify-content:center;font-size:14px;color:#666;overflow:hidden">
      <?php if ($thumbUrl): ?>
        <img src="<?= e($thumbUrl) ?>" style="width:100%;height:100%;object-fit:cover">
      <?php else: ?>
        <div style="text-align:center">
          <div style="font-size:36px;margin-bottom:8px">📐</div>
          <div style="font-size:12px;color:#555">Tema Önizlemesi</div>
        </div>
      <?php endif; ?>
    </div>
    <div style="padding:16px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px">
        <div>
          <div style="font-weight:700;font-size:15px"><?= e($t['name'] ?? $t['slug']) ?></div>
          <div style="font-size:11px;color:var(--ap-text-2)"><?= e($t['version'] ?? '') ?></div>
        </div>
        <?php if ($active): ?><span class="ap-badge ap-badge-green">Aktif</span><?php endif; ?>
      </div>
      <p style="font-size:13px;color:var(--ap-text-2);margin-bottom:12px;min-height:36px"><?= e(mb_substr($t['description'] ?? '', 0, 100)) ?></p>
      <div style="display:flex;gap:6px">
        <?php if (!$active): ?>
        <form method="POST" style="flex:1">
          <?= Security::csrfField() ?>
          <input type="hidden" name="active_theme" value="<?= e($t['slug']) ?>">
          <button type="submit" class="ap-btn ap-btn-primary ap-btn-sm" style="width:100%">Aktif Et</button>
        </form>
        <form method="POST" onsubmit="return confirm('Bu temayı silmek istediğinize emin misiniz?')">
          <?= Security::csrfField() ?>
          <input type="hidden" name="tema_sil" value="<?= e($t['slug']) ?>">
          <button type="submit" class="ap-btn ap-btn-ghost ap-btn-sm" style="color:#f85149" title="Sil">🗑</button>
        </form>
        <?php else: ?>
        <div style="color:var(--ap-accent);font-size:12px;font-weight:600;flex:1;text-align:center;padding:7px">✓ Aktif Tema</div>
        <a href="/admin?page=tema-ayarlar" class="ap-btn ap-btn-ghost ap-btn-sm">⚙ Ayarlar</a>
        <?php endif; ?>
      </div>
    </div>
  </div>
  <?php endforeach; ?>
  <?php if (empty($themes)): ?>
  <div class="ap-card" style="text-align:center;padding:40px;color:var(--ap-text-2)">
    <div style="font-size:48px;margin-bottom:12px">📂</div>
    <div>Henüz yüklü tema yok.</div>
    <button onclick="document.getElementById('temaYukleModal').style.display='flex'" class="ap-btn ap-btn-primary" style="margin-top:12px">Tema Yükle</button>
  </div>
  <?php endif; ?>

  <!-- "Yeni Tema Ekle" kartı -->
  <div class="ap-card" style="overflow:hidden;border:2px dashed var(--ap-border);background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;min-height:240px"
       onclick="document.getElementById('temaYukleModal').style.display='flex'">
    <div style="text-align:center;color:var(--ap-text-2)">
      <div style="font-size:40px;margin-bottom:10px">➕</div>
      <div style="font-size:13px;font-weight:600">Yeni Tema Yükle</div>
    </div>
  </div>
</div>

<script>
// Modal ESC ile kapat
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.getElementById('temaYukleModal').style.display = 'none';
});
// ZIP sürükle-bırak
document.getElementById('temaYukleModal').addEventListener('dragover', e => e.preventDefault());
document.getElementById('temaYukleModal').addEventListener('drop', e => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (!file) return;
  const dt = new DataTransfer();
  dt.items.add(file);
  document.getElementById('temaZipInput').files = dt.files;
  document.getElementById('temaZipLabel').textContent = file.name;
});
</script>
<?php });
