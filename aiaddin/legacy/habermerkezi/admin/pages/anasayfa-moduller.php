<?php
/**
 * AhenkPress Admin — Anasayfa Modül Yönetimi
 * Sürükle-bırak ile anasayfa blok düzeni
 */
defined('ROOT') or die();

$csrf = Security::csrf();

// ─── Sıra kaydet (AJAX)
if (isset($_POST['save_order'])) {
    Security::verifyCsrf();
    $order = json_decode($_POST['order'] ?? '[]', true);
    if (is_array($order)) {
        DB::query("INSERT INTO `{p}settings`(`key`,`val`)VALUES(?,?)ON DUPLICATE KEY UPDATE`val`=?",
            ['homepage_module_order', json_encode($order), json_encode($order)]);
    }
    http_response_code(200);
    echo json_encode(['ok' => true]);
    exit;
}

// ─── Modül ayarlarını kaydet
if (isset($_POST['save_module_settings'])) {
    Security::verifyCsrf();
    $slug = preg_replace('/[^a-z0-9\-_]/', '', $_POST['module_slug'] ?? '');
    if ($slug) {
        $enabled = isset($_POST['module_enabled']) ? '1' : '0';
        DB::query("INSERT INTO `{p}settings`(`key`,`val`)VALUES(?,?)ON DUPLICATE KEY UPDATE`val`=?",
            ["module_{$slug}_enabled", $enabled, $enabled]);
        // Ekstra ayarlar
        foreach ($_POST as $k => $v) {
            if (str_starts_with($k, 'module_') && $k !== 'module_slug' && $k !== 'module_enabled') {
                $key = "module_{$slug}_" . substr($k, 7);
                DB::query("INSERT INTO `{p}settings`(`key`,`val`)VALUES(?,?)ON DUPLICATE KEY UPDATE`val`=?",
                    [$key, trim($v), trim($v)]);
            }
        }
        ap_flash('Modül ayarları kaydedildi.', 'success');
    }
    ap_redirect('/admin?page=anasayfa-moduller');
}

// ─── Modül tanımları
$modulesDefs = [
    'manset_slider' => [
        'label'  => 'Manşet Slider',
        'icon'   => '🎠',
        'desc'   => 'Anasayfa büyük haber slayt gösterisi',
        'color'  => '#CC0000',
        'settings' => [
            ['count',  'Haber Sayısı', 'number', '5'],
            ['height', 'Yükseklik (px)', 'number', '460'],
            ['auto',   'Otomatik Geçiş (sn, 0=kapalı)', 'number', '5'],
        ],
    ],
    'surmanset' => [
        'label'  => 'Sürgü Manşet',
        'icon'   => '📰',
        'desc'   => 'Sağ sütun küçük haber listesi',
        'color'  => '#1e40af',
        'settings' => [
            ['count', 'Haber Sayısı', 'number', '4'],
        ],
    ],
    'son_haberler' => [
        'label'  => 'Son Haberler Bandı',
        'icon'   => '🔴',
        'desc'   => 'Kırmızı başlıklı son dakika bandı',
        'color'  => '#dc2626',
        'settings' => [
            ['count', 'Haber Sayısı', 'number', '10'],
            ['speed', 'Kayan Hız (ms)', 'number', '30000'],
        ],
    ],
    'ikon_bant' => [
        'label'  => 'İkon Bant',
        'icon'   => '🔲',
        'desc'   => 'Kategorilerin ikonlu hızlı erişim bandı',
        'color'  => '#7c3aed',
        'settings' => [
            ['count', 'İkon Sayısı', 'number', '8'],
        ],
    ],
    'finans_bant' => [
        'label'  => 'Finans Bandı',
        'icon'   => '📈',
        'desc'   => 'Döviz, altın, borsa kayan bant',
        'color'  => '#059669',
        'settings' => [],
    ],
    'kategori_bloklar' => [
        'label'  => 'Kategori Blokları',
        'icon'   => '📦',
        'desc'   => 'Ana kategori haber bloklarını göster',
        'color'  => '#d97706',
        'settings' => [
            ['slugs', 'Kategoriler (virgülle slug)', 'text', 'gundem,ekonomi,dunya,spor'],
            ['per_cat', 'Her Kategoriden Haber', 'number', '5'],
        ],
    ],
    'kose_yazarlari' => [
        'label'  => 'Köşe Yazarları',
        'icon'   => '✍',
        'desc'   => 'Köşe yazarları ve son yazıları',
        'color'  => '#0891b2',
        'settings' => [
            ['count', 'Yazar Sayısı', 'number', '6'],
        ],
    ],
    'video_tv' => [
        'label'  => 'Video TV',
        'icon'   => '📺',
        'desc'   => 'Canlı TV kanalları ve videolar',
        'color'  => '#6d28d9',
        'settings' => [
            ['max', 'Gösterilecek Kanal', 'number', '6'],
        ],
    ],
    'reklam_blok' => [
        'label'  => 'Reklam Bloku',
        'icon'   => '📣',
        'desc'   => 'Anasayfaya özel reklam alanı',
        'color'  => '#9ca3af',
        'settings' => [
            ['code', 'Reklam HTML Kodu', 'textarea', ''],
        ],
    ],
];

// Mevcut sıralama
$savedOrder = [];
try {
    $r = DB::queryRow("SELECT `val` FROM `{p}settings` WHERE `key`='homepage_module_order'");
    if ($r && $r['val']) $savedOrder = json_decode($r['val'], true) ?: [];
} catch (\Throwable) {}

// Sıralama uygula
$orderedModules = [];
foreach ($savedOrder as $slug) {
    if (isset($modulesDefs[$slug])) {
        $orderedModules[$slug] = $modulesDefs[$slug];
    }
}
foreach ($modulesDefs as $slug => $def) {
    if (!isset($orderedModules[$slug])) $orderedModules[$slug] = $def;
}

// Modül enabled durumları ve ayarları
$moduleStates = [];
foreach (array_keys($modulesDefs) as $slug) {
    $enabled = DB::queryRow("SELECT `val` FROM `{p}settings` WHERE `key`=?", ["module_{$slug}_enabled"]);
    $moduleStates[$slug]['enabled'] = $enabled ? (bool)(int)$enabled['val'] : true;
    foreach ($modulesDefs[$slug]['settings'] as $sett) {
        $sv = DB::queryRow("SELECT `val` FROM `{p}settings` WHERE `key`=?", ["module_{$slug}_{$sett[0]}"]);
        $moduleStates[$slug][$sett[0]] = $sv ? $sv['val'] : $sett[3];
    }
}

ap_admin_layout('Anasayfa Modülleri', function() use ($csrf, $orderedModules, $moduleStates) { ?>

<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
  <div>
    <h1 style="font-size:20px;font-weight:900;margin:0">🗂 Anasayfa Modül Yönetimi</h1>
    <p style="color:var(--ap-text-2);font-size:12px;margin:4px 0 0">
      Blokları sürükleyerek sıralayın · Anahtarı kapatarak gizleyin
    </p>
  </div>
  <div style="display:flex;gap:8px">
    <button id="saveOrderBtn" class="ap-btn ap-btn-primary" onclick="saveOrder()">💾 Sırayı Kaydet</button>
    <a href="/" target="_blank" class="ap-btn ap-btn-ghost">🌐 Önizle →</a>
  </div>
</div>

<div style="display:grid;grid-template-columns:1fr 320px;gap:16px;align-items:start">

  <!-- Sol: Sürükle-bırak liste -->
  <div>
    <div class="ap-card">
      <div class="ap-card-header">
        <h2 class="ap-card-title">Modül Sırası</h2>
        <span style="font-size:12px;color:var(--ap-text-2)">Sürükleyerek sıralayın</span>
      </div>
      <div id="moduleList" style="display:grid;gap:8px">
        <?php foreach ($orderedModules as $slug => $def): ?>
        <?php $enabled = $moduleStates[$slug]['enabled']; ?>
        <div class="module-item" data-slug="<?= $slug ?>"
             style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--ap-surface-2);
                    border-radius:10px;cursor:grab;border:2px solid <?= $enabled?'var(--ap-border)':'#374151' ?>;
                    opacity:<?= $enabled?'1':'0.5' ?>;transition:all .2s;user-select:none">
          <span style="color:var(--ap-text-3);font-size:18px;cursor:grab" title="Sürükle">⠿</span>
          <span style="font-size:22px"><?= $def['icon'] ?></span>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:14px"><?= e($def['label']) ?></div>
            <div style="font-size:12px;color:var(--ap-text-2)"><?= e($def['desc']) ?></div>
          </div>
          <!-- Toggle switch -->
          <label style="cursor:pointer;display:flex;align-items:center;gap:6px" title="Aktif/Pasif" onclick="toggleModule('<?= $slug ?>', this)">
            <div class="toggle-track" style="width:42px;height:22px;border-radius:11px;background:<?= $enabled?'var(--ap-accent)':'#374151' ?>;position:relative;transition:background .2s">
              <div style="width:18px;height:18px;border-radius:50%;background:#fff;position:absolute;top:2px;left:<?= $enabled?'22':'2' ?>px;transition:left .2s;box-shadow:0 1px 3px #0004"></div>
            </div>
          </label>
          <!-- Ayarlar butonu -->
          <?php if (!empty($def['settings'])): ?>
          <button type="button" onclick="openSettings('<?= $slug ?>')"
                  class="ap-btn ap-btn-sm" style="background:var(--ap-surface-3);color:var(--ap-text)">⚙</button>
          <?php endif; ?>
          <!-- Renk çubuğu -->
          <div style="width:4px;height:40px;border-radius:2px;background:<?= $def['color'] ?>"></div>
        </div>
        <?php endforeach; ?>
      </div>
    </div>
  </div>

  <!-- Sağ: Bilgi ve önizleme -->
  <div>
    <div class="ap-card">
      <div class="ap-card-header"><h2 class="ap-card-title">📐 Sayfa Düzeni Önizleme</h2></div>
      <div style="font-size:12px;color:var(--ap-text-2);margin-bottom:12px">
        Aktif modüllerin anasayfadaki görünüm sırası:
      </div>
      <div id="previewList" style="display:grid;gap:4px">
        <?php $num = 1; foreach ($orderedModules as $slug => $def): if (!$moduleStates[$slug]['enabled']) continue; ?>
        <div class="preview-item" data-slug="<?= $slug ?>" style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:<?= $def['color'] ?>15;border-radius:6px;border-left:3px solid <?= $def['color'] ?>">
          <span style="font-size:11px;font-weight:900;color:<?= $def['color'] ?>;min-width:16px"><?= $num++ ?></span>
          <span style="font-size:14px"><?= $def['icon'] ?></span>
          <span style="font-size:12px;font-weight:600"><?= e($def['label']) ?></span>
        </div>
        <?php endforeach; ?>
      </div>
    </div>

    <div class="ap-card" style="margin-top:12px">
      <div class="ap-card-header"><h2 class="ap-card-title">💡 Kullanım</h2></div>
      <div style="font-size:12px;line-height:1.8;color:var(--ap-text-2)">
        <p>· <strong>⠿ Sürükle</strong> ikonunu tutarak sıralayın</p>
        <p>· <strong>Toggle</strong> ile modülü gizleyin/gösterin</p>
        <p>· <strong>⚙ Ayarlar</strong> ile modül seçeneklerini değiştirin</p>
        <p>· Kaydet'e tıklayarak sırayı kaydedin</p>
      </div>
    </div>
  </div>
</div>

<!-- Modül Ayarları Modal -->
<div id="moduleModal" style="display:none;position:fixed;inset:0;z-index:9999;background:#00000088;align-items:center;justify-content:center">
  <div style="background:var(--ap-surface);border-radius:14px;width:480px;max-width:95vw;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px #0008">
    <div style="padding:16px 20px;border-bottom:1px solid var(--ap-border);display:flex;align-items:center;justify-content:space-between">
      <span id="modalTitle" style="font-weight:700;font-size:16px">Modül Ayarları</span>
      <button onclick="closeModal()" style="background:none;border:none;font-size:20px;color:var(--ap-text-2);cursor:pointer">✕</button>
    </div>
    <form method="POST" id="moduleSettingsForm" style="padding:20px">
      <input type="hidden" name="_csrf" value="<?= e($csrf) ?>">
      <input type="hidden" name="save_module_settings" value="1">
      <input type="hidden" name="module_slug" id="modalSlug" value="">
      <div id="modalFields" style="display:grid;gap:12px"></div>
      <div style="margin-top:16px;display:flex;gap:8px">
        <button type="submit" class="ap-btn ap-btn-primary">💾 Kaydet</button>
        <button type="button" onclick="closeModal()" class="ap-btn ap-btn-ghost">İptal</button>
      </div>
    </form>
  </div>
</div>

<!-- Modül ayar verileri (JS için) -->
<script>
const MODULES = <?= json_encode(array_map(function($def, $slug) use ($moduleStates) {
    return [
        'slug'     => $slug,
        'label'    => $def['label'],
        'icon'     => $def['icon'],
        'settings' => $def['settings'],
        'state'    => $moduleStates[$slug] ?? [],
        'enabled'  => $moduleStates[$slug]['enabled'] ?? true,
    ];
}, $orderedModules, array_keys($orderedModules)), JSON_UNESCAPED_UNICODE) ?>;
let moduleEnabled = {};
MODULES.forEach(m => { moduleEnabled[m.slug] = m.enabled; });

// ─── Drag & Drop (native HTML5)
let dragSrc = null;
const list  = document.getElementById('moduleList');

list.querySelectorAll('.module-item').forEach(item => {
  item.draggable = true;
  item.addEventListener('dragstart', e => {
    dragSrc = item;
    item.style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'move';
  });
  item.addEventListener('dragend', () => {
    item.style.opacity = '';
    list.querySelectorAll('.module-item').forEach(i => i.style.outline = '');
    updatePreview();
  });
  item.addEventListener('dragover', e => {
    e.preventDefault();
    if (item !== dragSrc) item.style.outline = '2px dashed var(--ap-accent)';
  });
  item.addEventListener('dragleave', () => { item.style.outline = ''; });
  item.addEventListener('drop', e => {
    e.preventDefault();
    item.style.outline = '';
    if (dragSrc && item !== dragSrc) {
      const items = [...list.querySelectorAll('.module-item')];
      const si = items.indexOf(dragSrc), di = items.indexOf(item);
      if (si < di) list.insertBefore(dragSrc, item.nextSibling);
      else         list.insertBefore(dragSrc, item);
    }
    updatePreview();
  });
});

// ─── Toggle
function toggleModule(slug, label) {
  moduleEnabled[slug] = !moduleEnabled[slug];
  const item = document.querySelector(`.module-item[data-slug="${slug}"]`);
  if (!item) return;
  const track = item.querySelector('.toggle-track');
  const knob  = track?.querySelector('div');
  if (track) track.style.background = moduleEnabled[slug] ? 'var(--ap-accent)' : '#374151';
  if (knob)  knob.style.left = moduleEnabled[slug] ? '22px' : '2px';
  item.style.opacity     = moduleEnabled[slug] ? '1' : '0.5';
  item.style.borderColor = moduleEnabled[slug] ? 'var(--ap-border)' : '#374151';
  updatePreview();
}

// ─── Önizleme güncelle
function updatePreview() {
  const prev    = document.getElementById('previewList');
  const items   = [...list.querySelectorAll('.module-item')];
  prev.innerHTML = '';
  let n = 1;
  items.forEach(item => {
    const slug = item.dataset.slug;
    if (!moduleEnabled[slug]) return;
    const m = MODULES.find(x => x.slug === slug);
    if (!m) return;
    const div = document.createElement('div');
    div.className = 'preview-item';
    div.dataset.slug = slug;
    div.innerHTML = `<span style="font-size:11px;font-weight:900;min-width:16px;color:inherit">${n++}</span>
      <span style="font-size:14px">${m.icon}</span>
      <span style="font-size:12px;font-weight:600">${m.label}</span>`;
    prev.appendChild(div);
  });
}

// ─── Sırayı kaydet
function saveOrder() {
  const order = [...list.querySelectorAll('.module-item')].map(i => i.dataset.slug);
  const btn = document.getElementById('saveOrderBtn');
  btn.textContent = '⏳ Kaydediliyor…';
  btn.disabled = true;
  const fd = new FormData();
  fd.append('_csrf', '<?= e($csrf) ?>');
  fd.append('save_order', '1');
  fd.append('order', JSON.stringify(order));
  // Save enabled states to hidden form
  const toggleSaves = [];
  order.forEach(slug => {
    toggleSaves.push(fetch(`/admin?page=anasayfa-moduller`, {
      method: 'POST',
      body: (() => {
        const f = new FormData();
        f.append('_csrf', '<?= e($csrf) ?>');
        f.append('save_module_settings', '1');
        f.append('module_slug', slug);
        if (moduleEnabled[slug]) f.append('module_enabled', '1');
        return f;
      })()
    }));
  });
  fetch('/admin?page=anasayfa-moduller', { method: 'POST', body: fd })
    .then(() => Promise.all(toggleSaves))
    .then(() => {
      btn.textContent = '✅ Kaydedildi!';
      setTimeout(() => { btn.textContent = '💾 Sırayı Kaydet'; btn.disabled = false; }, 1500);
    })
    .catch(() => { btn.textContent = '❌ Hata'; btn.disabled = false; });
}

// ─── Modül Ayarları Modal
function openSettings(slug) {
  const m = MODULES.find(x => x.slug === slug);
  if (!m || !m.settings || !m.settings.length) return;
  document.getElementById('modalTitle').textContent = m.icon + ' ' + m.label + ' Ayarları';
  document.getElementById('modalSlug').value = slug;
  const fields = document.getElementById('modalFields');
  fields.innerHTML = '';
  if (moduleEnabled[slug] !== undefined) {
    const chk = document.createElement('label');
    chk.style.cssText = 'display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px 0;border-bottom:1px solid var(--ap-border);margin-bottom:8px';
    chk.innerHTML = `<input type="checkbox" name="module_enabled" value="1" ${moduleEnabled[slug]?'checked':''}>
      <strong>Modülü Aktif Et</strong>`;
    fields.appendChild(chk);
  }
  m.settings.forEach(([key, label, type, def]) => {
    const val = (m.state && m.state[key] !== undefined) ? m.state[key] : def;
    const wrap = document.createElement('div');
    wrap.className = 'ap-form-group';
    wrap.style.margin = '0';
    if (type === 'textarea') {
      wrap.innerHTML = `<label class="ap-label">${label}</label>
        <textarea name="module_${key}" class="ap-input" rows="4">${val}</textarea>`;
    } else {
      wrap.innerHTML = `<label class="ap-label">${label}</label>
        <input type="${type}" name="module_${key}" class="ap-input" value="${val}">`;
    }
    fields.appendChild(wrap);
  });
  const modal = document.getElementById('moduleModal');
  modal.style.display = 'flex';
}
function closeModal() {
  document.getElementById('moduleModal').style.display = 'none';
}
document.getElementById('moduleModal').addEventListener('click', e => {
  if (e.target === document.getElementById('moduleModal')) closeModal();
});
</script>
<?php });
