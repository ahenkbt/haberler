<?php
/**
 * AhenkPress Admin — İçerik Listesi (Yazılar/Haberler/Sayfalar)
 */
defined('ROOT') or die();
Auth::require('author');

$postType = Security::str($_GET['type'] ?? $_GET['post_type'] ?? 'news');
$typeMeta = PostType::get($postType) ?? ['label' => ucfirst($postType)];

// Toplu işlem
if ($_SERVER['REQUEST_METHOD'] === 'POST' && Security::verifyCsrf()) {
    $action = ap_post('bulk_action');
    $ids    = array_map('intval', (array)($_POST['ids'] ?? []));
    if ($ids) {
        $plist = implode(',', $ids);
        if ($action === 'delete') {
            DB::exec("DELETE FROM `{p}posts` WHERE id IN ({$plist})");
            ap_flash(count($ids) . ' içerik silindi.', 'success');
        } elseif (in_array($action, ['publish','draft','archived'])) {
            DB::exec("UPDATE `{p}posts` SET status=? WHERE id IN ({$plist})", [$action]);
            ap_flash(count($ids) . ' içerik güncellendi.', 'success');
        }
    }
    ap_redirect("/admin?page={$_GET['page']}&type={$postType}");
}

$search  = Security::str($_GET['s'] ?? '');
$status  = Security::str($_GET['status'] ?? '');
$catId   = Security::int($_GET['cat'] ?? 0);
$paged   = max(1, Security::int($_GET['paged'] ?? 1));
$perPage = 20;

$args = ['post_type' => $postType, 'limit' => $perPage, 'offset' => ($paged - 1) * $perPage];
if ($status) $args['status']      = $status;
if ($search) $args['search']      = $search;
if ($catId)  $args['category_id'] = $catId;
if (!$status) $args['status']     = 'any';

$posts = PostType::getPosts($args);
$total = PostType::countPosts(array_merge($args, ['limit' => null, 'offset' => null]));
$pages = ceil($total / $perPage);

$cats = DB::query("SELECT * FROM `{p}categories` WHERE active=1 ORDER BY name");

$pageId = $_GET['page'] ?? 'news';

ap_admin_layout($typeMeta['label'], function() use ($posts, $total, $pages, $paged, $cats, $search, $status, $catId, $postType, $typeMeta, $pageId) {
?>
<div class="ap-page-header">
  <div>
    <h1 class="ap-page-title"><?= e($typeMeta['label']) ?></h1>
    <p class="ap-page-desc">Toplam <?= $total ?> içerik</p>
  </div>
  <a href="/admin?page=post-edit&type=<?= e($postType) ?>" class="ap-btn ap-btn-primary">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    Yeni <?= e($typeMeta['singular'] ?? $typeMeta['label']) ?>
  </a>
</div>

<!-- Filtreler -->
<div class="ap-card" style="margin-bottom:16px;padding:12px 16px">
  <form method="GET" action="/admin" style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">
    <input type="hidden" name="page" value="<?= e($pageId) ?>">
    <input type="hidden" name="type" value="<?= e($postType) ?>">

    <div class="ap-search-box" style="flex:1;min-width:200px">
      <svg class="search-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input class="ap-input" type="text" name="s" placeholder="Başlıkta ara..." value="<?= e($search) ?>">
    </div>

    <select class="ap-select" name="status" style="width:140px">
      <option value="">Tüm Durumlar</option>
      <option value="published" <?= $status==='published'?'selected':'' ?>>Yayında</option>
      <option value="draft"     <?= $status==='draft'?'selected':'' ?>>Taslak</option>
      <option value="pending"   <?= $status==='pending'?'selected':'' ?>>Bekliyor</option>
      <option value="archived"  <?= $status==='archived'?'selected':'' ?>>Arşiv</option>
    </select>

    <select class="ap-select" name="cat" style="width:160px">
      <option value="">Tüm Kategoriler</option>
      <?php foreach ($cats as $c): ?>
      <option value="<?= $c['id'] ?>" <?= $catId==$c['id']?'selected':'' ?>><?= e($c['name']) ?></option>
      <?php endforeach; ?>
    </select>

    <button class="ap-btn ap-btn-secondary" type="submit">Filtrele</button>
    <?php if ($search || $status || $catId): ?>
    <a href="/admin?page=<?= e($pageId) ?>&type=<?= e($postType) ?>" class="ap-btn ap-btn-ghost">Temizle</a>
    <?php endif; ?>
  </form>
</div>

<div class="ap-card">
  <form method="POST" id="bulk-form">
    <?= Security::csrfField() ?>
    <input type="hidden" name="bulk_action" id="bulk-action-val">

    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:10px">
        <select class="ap-select" id="bulk-action-select" style="width:160px">
          <option value="">Toplu İşlem</option>
          <option value="publish">Yayınla</option>
          <option value="draft">Taslağa Al</option>
          <option value="archived">Arşivle</option>
          <option value="delete">Sil</option>
        </select>
        <button type="button" class="ap-btn ap-btn-secondary ap-btn-sm" onclick="applyBulk()">Uygula</button>
      </div>
      <span class="text-muted text-sm"><?= $total ?> kayıt | Sayfa <?= $paged ?>/<?= max(1,$pages) ?></span>
    </div>

    <div class="ap-table-wrap">
      <table class="ap-table" id="posts-table">
        <thead>
          <tr>
            <th style="width:30px"><input type="checkbox" class="ap-check-all" onchange="toggleAll(this)"></th>
            <th>Başlık</th>
            <th>Kategori</th>
            <th>Yazar</th>
            <th>Durum</th>
            <th>Görüntüleme</th>
            <th>Tarih</th>
            <th>İşlem</th>
          </tr>
        </thead>
        <tbody>
          <?php if (empty($posts)): ?>
          <tr><td colspan="8" style="text-align:center;color:var(--ap-text-muted);padding:30px">İçerik bulunamadı.</td></tr>
          <?php endif; ?>
          <?php foreach ($posts as $p): ?>
          <tr>
            <td><input type="checkbox" class="ap-check-item" name="ids[]" value="<?= $p['id'] ?>"></td>
            <td>
              <div class="d-flex align-center gap-1">
                <?php if ($p['cover_image']): ?>
                <img src="<?= e(ap_thumb_url($p['cover_image'])) ?>" class="post-thumb" alt="">
                <?php endif; ?>
                <div>
                  <a href="/admin?page=post-edit&id=<?= $p['id'] ?>" style="font-weight:500;color:var(--ap-text)"><?= e(mb_substr($p['title'],0,70)) ?></a>
                  <?php if ($p['ai_generated'] ?? 0): ?><span class="ap-badge ap-badge-purple text-xs">🤖 AI</span><?php endif; ?>
                  <?php if ($p['is_breaking'] ?? 0): ?><span class="ap-badge ap-badge-red text-xs">Son Dakika</span><?php endif; ?>
                  <div class="text-xs text-muted mt-1">
                    <a href="/admin?page=post-edit&id=<?= $p['id'] ?>">Düzenle</a> ·
                    <a href="#" onclick="return deletePost(<?= $p['id'] ?>)" style="color:var(--ap-red)">Sil</a> ·
                    <a href="/<?= e($p['slug']) ?>" target="_blank">Görüntüle</a>
                  </div>
                </div>
              </div>
            </td>
            <td><?= $p['cat_name'] ? e($p['cat_name']) : '<span class="text-muted">—</span>' ?></td>
            <td class="text-sm"><?= e($p['author_name'] ?? '—') ?></td>
            <td>
              <?php
              $bmap = ['published'=>'ap-badge-green','draft'=>'ap-badge-gray','pending'=>'ap-badge-orange','archived'=>'ap-badge-red'];
              $lmap = ['published'=>'Yayında','draft'=>'Taslak','pending'=>'Bekliyor','archived'=>'Arşiv'];
              ?>
              <span class="ap-badge <?= $bmap[$p['status']] ?? 'ap-badge-gray' ?>"><?= $lmap[$p['status']] ?? e($p['status']) ?></span>
            </td>
            <td class="text-sm"><?= number_format($p['views']) ?></td>
            <td class="text-xs text-muted"><?= $p['published_at'] ? ap_date($p['published_at'], 'd M Y') : '—' ?></td>
            <td>
              <div class="actions">
                <a href="/admin?page=post-edit&id=<?= $p['id'] ?>" class="ap-btn ap-btn-ghost ap-btn-sm ap-btn-icon" title="Düzenle">✏️</a>
                <a href="/<?= e($p['slug']) ?>" target="_blank" class="ap-btn ap-btn-ghost ap-btn-sm ap-btn-icon" title="Görüntüle">🔗</a>
              </div>
            </td>
          </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </form>

  <!-- Pagination -->
  <?php if ($pages > 1): ?>
  <div class="ap-pagination" style="margin-top:12px">
    <?php for ($i = 1; $i <= $pages; $i++): ?>
    <a href="/admin?page=<?= e($pageId) ?>&type=<?= e($postType) ?>&paged=<?= $i ?>&s=<?= urlencode($search) ?>&status=<?= e($status) ?>"
       class="<?= $i === $paged ? 'active' : '' ?>"><?= $i ?></a>
    <?php endfor; ?>
  </div>
  <?php endif; ?>
</div>

<script>
function toggleAll(master) {
  document.querySelectorAll('.ap-check-item').forEach(c => c.checked = master.checked);
}
function applyBulk() {
  const action = document.getElementById('bulk-action-select').value;
  if (!action) { AP.toast('Lütfen bir işlem seçin', 'warning'); return; }
  const selected = [...document.querySelectorAll('.ap-check-item:checked')];
  if (!selected.length) { AP.toast('Lütfen en az bir öğe seçin', 'warning'); return; }
  if (action === 'delete' && !AP.confirm(`${selected.length} içerik kalıcı olarak silinecek. Emin misiniz?`)) return;
  document.getElementById('bulk-action-val').value = action;
  document.getElementById('bulk-form').submit();
}
function deletePost(id) {
  if (!AP.confirm('Bu içeriği silmek istiyor musunuz?')) return false;
  const form = document.createElement('form');
  form.method = 'POST';
  form.innerHTML = `<input name="_csrf" value="<?= Security::csrf() ?>"><input name="bulk_action" value="delete"><input type="checkbox" name="ids[]" value="${id}" checked>`;
  document.body.appendChild(form);
  form.submit();
  return false;
}
</script>
<?php
});
