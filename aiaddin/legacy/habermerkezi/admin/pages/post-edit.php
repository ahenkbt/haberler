<?php
/**
 * AhenkPress Admin — İçerik Editörü
 */
defined('ROOT') or die();
Auth::require('author');

$id       = Security::int($_GET['id'] ?? 0);
$postType = Security::str($_GET['type'] ?? 'post');
$post     = null;

if ($id) {
    $post = DB::queryRow("SELECT * FROM `{p}posts` WHERE id=?", [$id]);
    if (!$post) { ap_flash('İçerik bulunamadı.', 'error'); ap_redirect('/admin?page=posts'); }
    $postType = $post['post_type'];
}

$typeMeta = PostType::get($postType) ?? ['label' => ucfirst($postType), 'singular' => ucfirst($postType)];
$cats     = DB::query("SELECT * FROM `{p}categories` WHERE active=1 ORDER BY name");
$authors  = DB::query("SELECT id, display_name FROM `{p}users` WHERE active=1 AND role IN ('super_admin','admin','editor','author') ORDER BY display_name");
$columnists = DB::query("SELECT id, name FROM `{p}columnists` WHERE active=1 ORDER BY name");

// KAYDET
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!Security::verifyCsrf()) ap_ajax_error('CSRF hatası', 403);

    $title      = Security::str(ap_post('title'));
    $slug       = Security::slug(ap_post('slug') ?: $title);
    $content    = Security::kses(ap_post('content'));
    $excerpt    = Security::str(ap_post('excerpt'));
    $status     = in_array(ap_post('status'), ['published','draft','pending','archived']) ? ap_post('status') : 'draft';
    $catId      = Security::int(ap_post('category_id'));
    $authorId   = Security::int(ap_post('author_id')) ?: Auth::userId();
    $tags       = Security::str(ap_post('tags'));
    $isBreaking = (int)!empty($_POST['is_breaking']);
    $isFeatured = (int)!empty($_POST['is_featured']);
    $coverImg   = Security::str(ap_post('cover_image'));
    $colId      = Security::int(ap_post('columnist_id'));
    $metaTitle  = Security::str(ap_post('meta_title'));
    $metaDesc   = Security::str(ap_post('meta_desc'));

    if (!$title) ap_ajax_error('Başlık zorunlu');

    // Slug unique yap
    $slugTable = DB::prefix() . 'posts';
    $slug = ap_unique_slug($slug, $slugTable, 'slug', $id ?: null);

    $readTime = ap_read_time($content);
    $pubAt    = ($status === 'published') ? date('Y-m-d H:i:s') : null;

    $metaJson = json_encode(['seo_title' => $metaTitle, 'seo_desc' => $metaDesc]);

    $data = [
        'title'        => $title,
        'slug'         => $slug,
        'content'      => $content,
        'excerpt'      => $excerpt,
        'cover_image'  => $coverImg,
        'category_id'  => $catId ?: null,
        'author_id'    => $authorId,
        'columnist_id' => $colId ?: null,
        'status'       => $status,
        'tags'         => $tags,
        'is_breaking'  => $isBreaking,
        'is_featured'  => $isFeatured,
        'read_time'    => $readTime,
        'meta'         => $metaJson,
        'post_type'    => $postType,
    ];
    if ($pubAt && !$id) $data['published_at'] = $pubAt;

    // Resim yükleme
    if (!empty($_FILES['cover_file']['name'])) {
        $upload = ap_upload_file($_FILES['cover_file'], 'covers');
        if (empty($upload['error'])) $data['cover_image'] = $upload['path'];
    }

    if ($id) {
        DB::update('posts', $data, ['id' => $id]);
        // Medya tablosuna kaydet
        ap_flash('İçerik güncellendi.', 'success');
        ap_redirect("/admin?page=post-edit&id={$id}");
    } else {
        $newId = DB::insert('posts', $data);
        ap_flash('İçerik oluşturuldu.', 'success');
        ap_redirect("/admin?page=post-edit&id={$newId}");
    }
}

$title = $id ? 'Düzenle: ' . mb_substr($post['title'] ?? '', 0, 40) : 'Yeni ' . ($typeMeta['singular'] ?? $typeMeta['label']);

ap_admin_layout($title, function() use ($post, $postType, $typeMeta, $cats, $authors, $columnists, $id) {
?>
<form method="POST" enctype="multipart/form-data" id="post-form">
<?= Security::csrfField() ?>

<div class="ap-page-header">
  <div>
    <h1 class="ap-page-title"><?= e($post ? 'İçerik Düzenle' : 'Yeni ' . $typeMeta['label']) ?></h1>
  </div>
  <div style="display:flex;gap:8px">
    <button type="submit" name="status" value="draft" class="ap-btn ap-btn-secondary">Taslak Kaydet</button>
    <button type="submit" name="status" value="published" class="ap-btn ap-btn-primary" onclick="syncContent()">Yayınla</button>
  </div>
</div>

<div class="ap-grid-sidebar">
  <!-- Sol: Editör -->
  <div style="display:flex;flex-direction:column;gap:14px">
    <div class="ap-card">
      <div class="ap-form-group">
        <label class="ap-label" for="ap-title">Başlık *</label>
        <input class="ap-input" type="text" id="ap-title" name="title" value="<?= e($post['title'] ?? '') ?>" required placeholder="İçerik başlığını girin" style="font-size:16px;font-weight:600">
      </div>
      <div class="ap-form-group">
        <label class="ap-label" for="ap-slug">URL Slug</label>
        <div class="ap-input-group">
          <input class="ap-input" type="text" id="ap-slug" name="slug" value="<?= e($post['slug'] ?? '') ?>" placeholder="url-slug-otomatik">
          <button type="button" class="ap-btn ap-btn-secondary" onclick="document.getElementById('ap-slug').value=AP.slugify(document.getElementById('ap-title').value)">Üret</button>
        </div>
      </div>

      <!-- İçerik Editörü -->
      <div class="ap-form-group">
        <label class="ap-label">İçerik</label>
        <div class="ap-editor-wrap">
          <div class="ap-editor-toolbar">
            <button type="button" class="ap-editor-btn" data-cmd="bold" title="Kalın"><b>B</b></button>
            <button type="button" class="ap-editor-btn" data-cmd="italic" title="İtalik"><i>I</i></button>
            <button type="button" class="ap-editor-btn" data-cmd="underline" title="Altı Çizili"><u>U</u></button>
            <div class="ap-editor-sep"></div>
            <button type="button" class="ap-editor-btn" data-cmd="formatBlock" onclick="document.execCommand('formatBlock',false,'h2')" title="Başlık 2">H2</button>
            <button type="button" class="ap-editor-btn" data-cmd="formatBlock" onclick="document.execCommand('formatBlock',false,'h3')" title="Başlık 3">H3</button>
            <div class="ap-editor-sep"></div>
            <button type="button" class="ap-editor-btn" data-cmd="insertUnorderedList" title="Liste">≡</button>
            <button type="button" class="ap-editor-btn" data-cmd="insertOrderedList" title="Sıralı">1.</button>
            <button type="button" class="ap-editor-btn" data-cmd="blockquote" onclick="document.execCommand('formatBlock',false,'blockquote')" title="Alıntı">"</button>
            <div class="ap-editor-sep"></div>
            <button type="button" class="ap-editor-btn" data-cmd="createLink" title="Link">🔗</button>
            <button type="button" class="ap-editor-btn" data-cmd="insertImage" title="Resim">🖼</button>
            <div class="ap-editor-sep"></div>
            <button type="button" class="ap-editor-btn" data-cmd="undo" title="Geri">↩</button>
            <button type="button" class="ap-editor-btn" data-cmd="redo" title="İleri">↪</button>
          </div>
          <div class="ap-editor-area" id="post-content" contenteditable="true"><?= $post['content'] ?? '' ?></div>
        </div>
        <textarea name="content" id="content-hidden" style="display:none"><?= e($post['content'] ?? '') ?></textarea>
      </div>

      <!-- Özet -->
      <div class="ap-form-group">
        <label class="ap-label" for="excerpt">Özet</label>
        <textarea class="ap-textarea" id="excerpt" name="excerpt" rows="3" placeholder="Kısa özet (SEO ve liste görünümleri için)"><?= e($post['excerpt'] ?? '') ?></textarea>
      </div>
    </div>

    <!-- SEO Kartı -->
    <div class="ap-card">
      <div class="ap-card-header"><div class="ap-card-title">🔍 SEO Ayarları</div></div>
      <?php $meta = json_decode($post['meta'] ?? '{}', true); ?>
      <div class="ap-form-group">
        <label class="ap-label">Meta Başlık</label>
        <input class="ap-input" type="text" name="meta_title" value="<?= e($meta['seo_title'] ?? '') ?>" placeholder="Sayfa başlığı (boş bırakılırsa içerik başlığı kullanılır)">
      </div>
      <div class="ap-form-group">
        <label class="ap-label">Meta Açıklama</label>
        <textarea class="ap-textarea" name="meta_desc" rows="2" placeholder="Arama motoru açıklaması (150-160 karakter)"><?= e($meta['seo_desc'] ?? '') ?></textarea>
      </div>
      <div class="ap-form-group">
        <label class="ap-label">Etiketler (virgülle ayırın)</label>
        <input class="ap-input" type="text" name="tags" value="<?= e($post['tags'] ?? '') ?>" placeholder="siyaset, ekonomi, teknoloji">
      </div>
    </div>
  </div>

  <!-- Sağ Panel -->
  <div class="ap-side-panel">
    <!-- Yayın Ayarları -->
    <div class="ap-card">
      <div class="ap-card-header"><div class="ap-card-title">Yayın</div></div>

      <div class="ap-form-group">
        <label class="ap-label">Durum</label>
        <select class="ap-select" name="status" id="post-status">
          <?php
          $s = $post['status'] ?? 'draft';
          foreach (['published'=>'Yayında','draft'=>'Taslak','pending'=>'İncelemede','archived'=>'Arşiv'] as $v=>$l):
          ?>
          <option value="<?= $v ?>" <?= $s===$v?'selected':'' ?>><?= $l ?></option>
          <?php endforeach; ?>
        </select>
      </div>

      <div class="ap-form-group">
        <label class="ap-label">Yazar</label>
        <select class="ap-select" name="author_id">
          <?php foreach ($authors as $a): ?>
          <option value="<?= $a['id'] ?>" <?= ($post['author_id']??Auth::userId())==$a['id']?'selected':'' ?>><?= e($a['display_name']) ?></option>
          <?php endforeach; ?>
        </select>
      </div>

      <div style="display:flex;flex-direction:column;gap:8px;margin-top:6px">
        <label class="ap-toggle">
          <input type="checkbox" name="is_breaking" value="1" <?= ($post['is_breaking'] ?? 0) ? 'checked' : '' ?>>
          <div class="ap-toggle-slider"></div>
          <span class="ap-toggle-label">🔴 Son Dakika</span>
        </label>
        <label class="ap-toggle">
          <input type="checkbox" name="is_featured" value="1" <?= ($post['is_featured'] ?? 0) ? 'checked' : '' ?>>
          <div class="ap-toggle-slider"></div>
          <span class="ap-toggle-label">⭐ Öne Çıkan</span>
        </label>
      </div>
    </div>

    <!-- Kapak Görseli -->
    <div class="ap-card">
      <div class="ap-card-header"><div class="ap-card-title">Kapak Görseli</div></div>
      <div class="ap-upload-area" id="cover-area" style="padding:20px">
        <?php if (!empty($post['cover_image'])): ?>
        <img id="cover-preview" src="<?= e(ap_thumb_url($post['cover_image'])) ?>" style="max-width:100%;border-radius:5px">
        <?php else: ?>
        <div id="cover-placeholder" style="color:var(--ap-text-muted);font-size:13px">
          <div style="font-size:24px;margin-bottom:6px">📷</div>
          Görsel yüklemek için tıklayın
        </div>
        <img id="cover-preview" style="display:none;max-width:100%;border-radius:5px">
        <?php endif; ?>
      </div>
      <input type="file" id="cover-file" name="cover_file" accept="image/*" style="display:none">
      <input type="hidden" name="cover_image" id="cover-path" value="<?= e($post['cover_image'] ?? '') ?>">
      <div style="margin-top:8px">
        <input class="ap-input ap-input-sm" type="text" placeholder="veya görsel URL yapıştırın" id="cover-url-input" style="font-size:12px">
        <button type="button" class="ap-btn ap-btn-ghost ap-btn-sm" style="margin-top:4px;width:100%" onclick="useUrlAsThumb()">URL Kullan</button>
      </div>
    </div>

    <!-- Kategori -->
    <div class="ap-card">
      <div class="ap-card-header"><div class="ap-card-title">Kategori</div></div>
      <select class="ap-select" name="category_id">
        <option value="">— Kategorisiz —</option>
        <?php foreach ($cats as $c): ?>
        <option value="<?= $c['id'] ?>" <?= ($post['category_id']??0)==$c['id']?'selected':'' ?>><?= e($c['name']) ?></option>
        <?php endforeach; ?>
      </select>
    </div>

    <!-- Köşe Yazarı -->
    <?php if (!empty($columnists)): ?>
    <div class="ap-card">
      <div class="ap-card-header"><div class="ap-card-title">Köşe Yazarı</div></div>
      <select class="ap-select" name="columnist_id">
        <option value="">— Seçin —</option>
        <?php foreach ($columnists as $c): ?>
        <option value="<?= $c['id'] ?>" <?= ($post['columnist_id']??0)==$c['id']?'selected':'' ?>><?= e($c['name']) ?></option>
        <?php endforeach; ?>
      </select>
    </div>
    <?php endif; ?>
  </div>
</div>
</form>

<script>
// Content sync
function syncContent() {
  document.getElementById('content-hidden').value = document.getElementById('post-content').innerHTML;
}
document.getElementById('post-form').addEventListener('submit', syncContent);

// Auto-slug
AP.autoSlug('ap-title', 'ap-slug');

// Cover image
AP.dropzone('cover-area', 'cover-file');
AP.imagePreview('cover-file', 'cover-preview');
document.getElementById('cover-file').addEventListener('change', function() {
  const prev = document.getElementById('cover-preview');
  const ph   = document.getElementById('cover-placeholder');
  if (this.files[0]) { if(ph) ph.style.display='none'; prev.style.display='block'; }
});
function useUrlAsThumb() {
  const url = document.getElementById('cover-url-input').value.trim();
  if (!url) return;
  document.getElementById('cover-path').value = url;
  const img = document.getElementById('cover-preview');
  img.src = url; img.style.display = 'block';
  const ph = document.getElementById('cover-placeholder');
  if (ph) ph.style.display = 'none';
}

// Editor
AP.editor.init('post-content');
</script>
<?php
});
