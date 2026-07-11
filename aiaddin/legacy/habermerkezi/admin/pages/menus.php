<?php defined('ROOT') or die(); Auth::require('editor');

if ($_SERVER['REQUEST_METHOD'] === 'POST' && Security::verifyCsrf()) {
    $action = ap_post('action');
    $id     = Security::int(ap_post('id'));

    if ($action === 'save') {
        $name  = Security::str(ap_post('name'));
        $slug  = Security::slug(ap_post('slug') ?: $name);
        $loc   = Security::str(ap_post('location'));
        $items = json_decode(ap_post('items_json'), true) ?: [];
        // Sanitize items
        $clean = [];
        foreach ($items as $item) {
            $clean[] = [
                'label' => Security::str($item['label'] ?? ''),
                'url'   => Security::str($item['url'] ?? '#'),
                'type'  => in_array($item['type']??'',['link','category','page'])?$item['type']:'link',
                'target'=> ($item['target']??'') === '_blank' ? '_blank' : '',
                'children' => [],
            ];
        }
        $data = ['name'=>$name,'slug'=>$slug,'location'=>$loc,'items'=>json_encode($clean, JSON_UNESCAPED_UNICODE)];
        if ($id) { DB::update('menus', $data, ['id'=>$id]); ap_flash('Menü güncellendi.'); }
        else     { DB::insert('menus', $data); ap_flash('Menü oluşturuldu.'); }
        ap_redirect('/admin?page=menus');
    } elseif ($action === 'delete') {
        DB::delete('menus', ['id'=>$id]);
        ap_flash('Menü silindi.', 'warning');
        ap_redirect('/admin?page=menus');
    }
}

$menus   = DB::query("SELECT * FROM `{p}menus` ORDER BY id DESC");
$cats    = DB::query("SELECT id,name,slug FROM `{p}categories` WHERE active=1 ORDER BY sort_order LIMIT 30");
$pages   = DB::query("SELECT id,title,slug FROM `{p}posts` WHERE post_type='page' AND status='published' LIMIT 30");
$editMenu = isset($_GET['edit']) ? DB::queryRow("SELECT * FROM `{p}menus` WHERE id=?", [Security::int($_GET['edit'])]) : null;

ap_admin_layout('Menüler', function() use ($menus, $cats, $pages, $editMenu) { ?>
<div class="ap-page-header">
  <h1 class="ap-page-title">Menü Yönetimi</h1>
  <button class="ap-btn ap-btn-primary" onclick="openMenuForm()">+ Yeni Menü</button>
</div>

<?php if ($editMenu || isset($_GET['new'])): ?>
<?php $m = $editMenu ?? ['id'=>0,'name'=>'','slug'=>'','location'=>'main-nav','items'=>'[]']; ?>
<div class="ap-card" style="padding:20px;margin-bottom:16px">
  <h3 style="margin:0 0 16px;font-size:15px;font-weight:700"><?= $m['id']?'Menü Düzenle':'Yeni Menü' ?></h3>
  <form method="POST" id="menu-form">
    <?= Security::csrfField() ?>
    <input type="hidden" name="action" value="save">
    <input type="hidden" name="id" value="<?= $m['id'] ?>">
    <input type="hidden" name="items_json" id="items-json" value="<?= e($m['items']??'[]') ?>">

    <div class="ap-form-row">
      <div class="ap-form-group">
        <label class="ap-label">Menü Adı</label>
        <input class="ap-input" type="text" name="name" value="<?= e($m['name']) ?>" required>
      </div>
      <div class="ap-form-group">
        <label class="ap-label">Konum</label>
        <select class="ap-select" name="location">
          <?php foreach (['main-nav'=>'Ana Navigasyon','footer-menu'=>'Footer','top-bar'=>'Üst Bar'] as $v=>$l): ?>
          <option value="<?= $v ?>" <?= ($m['location']??'')===$v?'selected':'' ?>><?= $l ?></option>
          <?php endforeach; ?>
        </select>
      </div>
    </div>

    <div class="ap-form-row" style="align-items:flex-start">
      <!-- Öğe Ekle -->
      <div style="flex:1">
        <div class="ap-label" style="margin-bottom:8px">Öğe Ekle</div>
        <div style="background:var(--ap-bg-dark);border-radius:6px;padding:12px;display:flex;flex-direction:column;gap:8px">
          <div style="font-size:12px;color:var(--ap-text-muted);font-weight:600">Kategoriler</div>
          <?php foreach ($cats as $c): ?>
          <button type="button" class="ap-btn ap-btn-ghost ap-btn-sm" style="justify-content:flex-start" onclick="addItem('<?= e(addslashes($c['name'])) ?>','<?= ap_url($c['slug']) ?>','category')">+ <?= e($c['name']) ?></button>
          <?php endforeach; ?>
          <div style="font-size:12px;color:var(--ap-text-muted);font-weight:600;margin-top:6px">Sayfalar</div>
          <?php foreach ($pages as $p): ?>
          <button type="button" class="ap-btn ap-btn-ghost ap-btn-sm" style="justify-content:flex-start" onclick="addItem('<?= e(addslashes($p['title'])) ?>','<?= ap_url($p['slug']) ?>','page')">+ <?= e($p['title']) ?></button>
          <?php endforeach; ?>
          <div style="font-size:12px;color:var(--ap-text-muted);font-weight:600;margin-top:6px">Özel Link</div>
          <div style="display:flex;gap:6px">
            <input class="ap-input" type="text" id="custom-label" placeholder="Etiket">
            <input class="ap-input" type="url"  id="custom-url"   placeholder="URL" value="https://">
            <button type="button" class="ap-btn ap-btn-primary ap-btn-sm" onclick="addCustom()">+</button>
          </div>
        </div>
      </div>

      <!-- Menü Öğeleri -->
      <div style="flex:2">
        <div class="ap-label" style="margin-bottom:8px">Menü Öğeleri <span class="text-muted text-xs">(sürükleyerek sıralayın)</span></div>
        <div id="menu-items" style="min-height:80px;border:1px solid var(--ap-border);border-radius:6px;padding:8px;display:flex;flex-direction:column;gap:6px">
          <!-- JS tarafından doldurulur -->
        </div>
      </div>
    </div>

    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
      <a href="/admin?page=menus" class="ap-btn ap-btn-ghost">İptal</a>
      <button type="submit" class="ap-btn ap-btn-primary">Kaydet</button>
    </div>
  </form>
</div>
<?php endif; ?>

<!-- Mevcut Menüler -->
<div class="ap-card">
  <div class="ap-table-wrap">
    <table class="ap-table">
      <thead><tr><th>Ad</th><th>Slug</th><th>Konum</th><th>Öğe Sayısı</th><th>İşlem</th></tr></thead>
      <tbody>
      <?php foreach ($menus as $m): $items = json_decode($m['items']??'[]',true)??[]; ?>
      <tr>
        <td style="font-weight:600"><?= e($m['name']) ?></td>
        <td class="text-sm text-muted"><?= e($m['slug']) ?></td>
        <td class="text-sm"><?= e($m['location']) ?></td>
        <td><?= count($items) ?></td>
        <td class="actions">
          <a href="/admin?page=menus&edit=<?= $m['id'] ?>" class="ap-btn ap-btn-ghost ap-btn-sm">✏️ Düzenle</a>
          <form method="POST" style="display:inline" onsubmit="return AP.confirm('Menü silinsin mi?')">
            <?= Security::csrfField() ?><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="<?= $m['id'] ?>">
            <button class="ap-btn ap-btn-danger ap-btn-sm">🗑</button>
          </form>
        </td>
      </tr>
      <?php endforeach; ?>
      <?php if (empty($menus)): ?><tr><td colspan="5" style="text-align:center;padding:30px;color:var(--ap-text-muted)">Henüz menü oluşturulmadı.</td></tr><?php endif; ?>
      </tbody>
    </table>
  </div>
</div>

<script>
let menuItems = <?= json_encode(json_decode($editMenu['items']??'[]',true)??[], JSON_UNESCAPED_UNICODE) ?>;

function renderItems() {
  const el = document.getElementById('menu-items');
  if (!el) return;
  el.innerHTML = menuItems.length ? '' : '<p style="text-align:center;color:var(--ap-text-muted);font-size:13px;padding:20px 0">Öğe yok.</p>';
  menuItems.forEach((item, i) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;background:var(--ap-bg-dark);border-radius:4px;padding:8px 12px;border:1px solid var(--ap-border)';
    row.innerHTML = `<span style="cursor:grab;color:var(--ap-text-muted)">⠿</span>
      <span style="flex:1;font-size:13px;font-weight:600">${item.label}</span>
      <span style="font-size:11px;color:var(--ap-text-muted);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.url}</span>
      <button type="button" onclick="removeItem(${i})" style="background:none;border:none;color:var(--ap-danger);cursor:pointer;font-size:16px">✕</button>`;
    el.appendChild(row);
  });
  document.getElementById('items-json').value = JSON.stringify(menuItems);
}

function addItem(label, url, type) {
  menuItems.push({label, url, type, target:'', children:[]});
  renderItems();
}

function addCustom() {
  const label = document.getElementById('custom-label').value.trim();
  const url   = document.getElementById('custom-url').value.trim();
  if (!label || !url) { AP.toast('Etiket ve URL gerekli','warning'); return; }
  menuItems.push({label, url, type:'link', target:'', children:[]});
  document.getElementById('custom-label').value = '';
  document.getElementById('custom-url').value = 'https://';
  renderItems();
}

function removeItem(i) { menuItems.splice(i,1); renderItems(); }
function openMenuForm() { location.href = '/admin?page=menus&new=1'; }

renderItems();
</script>
<?php });
