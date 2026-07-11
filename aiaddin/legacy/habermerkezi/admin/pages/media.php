<?php defined('ROOT') or die(); Auth::require('author');

// Yükleme işlemi
if ($_SERVER['REQUEST_METHOD'] === 'POST' && Security::verifyCsrf()) {
    if (!empty($_FILES['files']['name'][0])) {
        $uploaded = 0; $errors = [];
        foreach ($_FILES['files']['name'] as $i => $name) {
            $file = ['name'=>$name,'tmp_name'=>$_FILES['files']['tmp_name'][$i],'type'=>$_FILES['files']['type'][$i],'size'=>$_FILES['files']['size'][$i],'error'=>$_FILES['files']['error'][$i]];
            $r = ap_upload_file($file, 'media');
            if (!empty($r['error'])) { $errors[] = $name . ': ' . $r['error']; continue; }
            $size = getimagesize($r['path'] ?? ROOT . '/uploads/' . $r['file']) ?: [0,0];
            DB::insert('media', [
                'filename'    => $r['file'],
                'path'        => $r['path'] ?? '/uploads/'.$r['file'],
                'mime_type'   => $file['type'],
                'size'        => $file['size'],
                'width'       => $size[0],
                'height'      => $size[1],
                'uploaded_by' => Auth::userId(),
                'created_at'  => date('Y-m-d H:i:s'),
            ]);
            $uploaded++;
        }
        ap_flash("$uploaded dosya yüklendi." . ($errors ? ' Hatalar: '.implode(', ',$errors) : ''));
    } elseif (ap_post('action') === 'delete') {
        $id   = Security::int(ap_post('id'));
        $item = DB::queryRow("SELECT * FROM `{p}media` WHERE id=?", [$id]);
        if ($item) {
            @unlink(ROOT . $item['path']);
            DB::delete('media', ['id'=>$id]);
            ap_flash('Dosya silindi.', 'warning');
        }
    } elseif (ap_post('action') === 'update') {
        DB::update('media', ['alt'=>Security::str(ap_post('alt')),'caption'=>Security::str(ap_post('caption'))], ['id'=>Security::int(ap_post('id'))]);
        ap_flash('Güncellendi.');
    }
    ap_redirect('/admin?page=media');
}

$page  = max(1, (int)($_GET['p'] ?? 1));
$perPage = 24;
$total = DB::queryValue("SELECT COUNT(*) FROM `{p}media`") ?? 0;
$items = DB::query("SELECT * FROM `{p}media` ORDER BY id DESC LIMIT {$perPage} OFFSET " . (($page-1)*$perPage));

ap_admin_layout('Medya Kütüphanesi', function() use ($items, $total, $page, $perPage) { ?>
<div class="ap-page-header">
  <div>
    <h1 class="ap-page-title">Medya Kütüphanesi</h1>
    <p class="ap-page-desc">Toplam <?= $total ?> dosya</p>
  </div>
  <button class="ap-btn ap-btn-primary" onclick="document.getElementById('upload-zone').click()">+ Dosya Yükle</button>
</div>

<!-- Sürükle bırak alanı -->
<div class="ap-dropzone" id="dropzone-area" style="border:2px dashed var(--ap-border);border-radius:8px;padding:30px;text-align:center;background:var(--ap-bg-card);margin-bottom:16px;cursor:pointer;transition:border-color .2s"
     onclick="document.getElementById('upload-zone').click()"
     ondragover="event.preventDefault();this.style.borderColor='var(--ap-accent)'"
     ondragleave="this.style.borderColor='var(--ap-border)'"
     ondrop="handleDrop(event)">
  <div style="font-size:36px;margin-bottom:8px">📁</div>
  <p style="color:var(--ap-text-muted);font-size:14px">Dosyaları buraya sürükleyin veya tıklayın</p>
  <p class="text-xs text-muted">JPG, PNG, GIF, WebP, SVG, PDF — Max 10MB</p>
</div>

<form method="POST" enctype="multipart/form-data" id="upload-form">
  <?= Security::csrfField() ?>
  <input type="file" id="upload-zone" name="files[]" multiple accept="image/*,application/pdf" style="display:none" onchange="document.getElementById('upload-form').submit()">
</form>

<!-- Medya Izgara -->
<div class="ap-card">
  <div class="ap-media-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;padding:16px">
    <?php foreach ($items as $item): ?>
    <?php $isImg = str_starts_with($item['mime_type']??'', 'image'); ?>
    <div class="ap-media-item" style="background:var(--ap-bg-dark);border-radius:6px;overflow:hidden;cursor:pointer;position:relative;aspect-ratio:1" onclick='showMedia(<?= json_encode($item) ?>)'>
      <?php if ($isImg): ?>
      <img src="<?= e($item['path']) ?>" alt="<?= e($item['alt']??'') ?>" style="width:100%;height:100%;object-fit:cover;display:block" loading="lazy">
      <?php else: ?>
      <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:6px;color:var(--ap-text-muted)">
        <span style="font-size:32px">📄</span>
        <span style="font-size:10px;text-align:center;padding:0 6px"><?= e(mb_substr($item['filename'],0,20)) ?></span>
      </div>
      <?php endif; ?>
      <div class="ap-media-overlay" style="position:absolute;inset:0;background:rgba(0,0,0,.5);display:none;align-items:center;justify-content:center">
        <span style="color:#fff;font-size:12px;font-weight:600">Düzenle</span>
      </div>
    </div>
    <?php endforeach; ?>
    <?php if (empty($items)): ?>
    <div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--ap-text-muted)">Henüz dosya yok.</div>
    <?php endif; ?>
  </div>
  <?php echo ap_pagination($total, $perPage, $page, '/admin?page=media&p={page}'); ?>
</div>

<!-- Medya Detay Modal -->
<div class="ap-modal-overlay hidden" id="media-modal">
  <div class="ap-modal" style="max-width:700px">
    <div class="ap-modal-header">
      <span class="ap-modal-title">Medya Detayı</span>
      <button class="ap-icon-btn" onclick="AP.modal.close('media-modal')">✕</button>
    </div>
    <div class="ap-modal-body" id="media-modal-body" style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
    </div>
    <div class="ap-modal-footer">
      <form method="POST" id="media-del-form" onsubmit="return AP.confirm('Dosya silinsin mi?')">
        <?= Security::csrfField() ?><input type="hidden" name="action" value="delete"><input type="hidden" name="id" id="del-media-id">
        <button type="submit" class="ap-btn ap-btn-danger ap-btn-sm">🗑 Sil</button>
      </form>
      <button class="ap-btn ap-btn-ghost" onclick="AP.modal.close('media-modal')">Kapat</button>
      <button class="ap-btn ap-btn-primary" onclick="document.getElementById('media-update-form').submit()">Kaydet</button>
    </div>
  </div>
</div>

<style>
.ap-media-item:hover .ap-media-overlay{display:flex!important}
</style>
<script>
function showMedia(item) {
  document.getElementById('del-media-id').value = item.id;
  const isImg = (item.mime_type||'').startsWith('image');
  document.getElementById('media-modal-body').innerHTML = `
    <div>
      ${isImg ? `<img src="${item.path}" style="width:100%;border-radius:8px;max-height:280px;object-fit:contain;background:#111">` : `<div style="text-align:center;padding:40px;font-size:48px">📄</div>`}
      <div style="margin-top:10px;font-size:12px;color:var(--ap-text-muted)">
        <div>${item.filename}</div>
        <div>${item.mime_type||''} — ${Math.round(item.size/1024)} KB</div>
        ${item.width ? `<div>${item.width}×${item.height}px</div>` : ''}
        <div>${item.created_at||''}</div>
      </div>
      <button class="ap-btn ap-btn-ghost ap-btn-sm" style="margin-top:10px;width:100%" onclick="navigator.clipboard.writeText('${item.path}');AP.toast('Kopyalandı','success')">Yolu Kopyala</button>
    </div>
    <form method="POST" id="media-update-form">
      <input type="hidden" name="_csrf" value="${document.querySelector('meta[name=csrf]')?.content||''}">
      <input type="hidden" name="action" value="update">
      <input type="hidden" name="id" value="${item.id}">
      <div class="ap-form-group">
        <label class="ap-label">Alt Metni</label>
        <input class="ap-input" type="text" name="alt" value="${item.alt||''}">
      </div>
      <div class="ap-form-group">
        <label class="ap-label">Açıklama</label>
        <textarea class="ap-textarea" name="caption" rows="3">${item.caption||''}</textarea>
      </div>
    </form>
  `;
  AP.modal.open('media-modal');
}

function handleDrop(e) {
  e.preventDefault();
  const dt = new DataTransfer();
  for (const f of e.dataTransfer.files) dt.items.add(f);
  document.getElementById('upload-zone').files = dt.files;
  document.getElementById('upload-form').submit();
}
</script>
<?php });
