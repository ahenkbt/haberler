<?php
/**
 * AhenkPress Admin — İkon Bant Yönetimi
 * Manşet altındaki kısa yönlendirme butonlarını yönetir.
 */
defined('ROOT') or die();
Auth::require();

$csrf = Security::csrf();
$msg  = '';

// ─── Varsayılan bant öğeleri ───────────────────────────────────────────────
$defaults = [
    ['icon'=>'fa-fire',        'url'=>'son-haberler', 'label'=>'SON HABERLER', 'sub'=>'Güncel haberler',   'enabled'=>true],
    ['icon'=>'fa-city',        'url'=>'gundem',       'label'=>'GÜNDEM',       'sub'=>'Gündem haberleri',  'enabled'=>true],
    ['icon'=>'fa-chart-line',  'url'=>'ekonomi',      'label'=>'EKONOMİ',      'sub'=>'Ekonomi haberleri', 'enabled'=>true],
    ['icon'=>'fa-globe',       'url'=>'dunya',        'label'=>'DÜNYA',        'sub'=>'Dünya haberleri',   'enabled'=>true],
    ['icon'=>'fa-futbol',      'url'=>'spor',         'label'=>'SPOR',         'sub'=>'Spor haberleri',    'enabled'=>true],
    ['icon'=>'fa-pen-nib',     'url'=>'yazarlar',     'label'=>'YAZARLAR',     'sub'=>'Köşe yazıları',     'enabled'=>true],
    ['icon'=>'fa-play-circle', 'url'=>'video-tv',     'label'=>'VIDEO TV',     'sub'=>'Canlı yayın',       'enabled'=>true],
    ['icon'=>'fa-list',        'url'=>'tum-haberler', 'label'=>'TÜM HABERLER','sub'=>'Haberler arşivi',   'enabled'=>true],
];

// Mevcut değerleri yükle — eksik alanları güvenle doldur
$raw   = DB::setting('bant_items', '');
$saved = $raw ? (json_decode($raw, true) ?: []) : [];
if (empty($saved)) {
    $items = $defaults;
} else {
    $items = array_map(function($it) {
        return [
            'icon'    => $it['icon']    ?? 'fa-circle',
            'url'     => $it['url']     ?? '',
            'label'   => $it['label']   ?? '',
            'sub'     => $it['sub']     ?? '',
            'enabled' => isset($it['enabled']) ? (bool)$it['enabled'] : true,
        ];
    }, $saved);
}

// ─── POST: Kaydet ─────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['bant_kaydet'])) {
    Security::verifyCsrf();
    $newItems = [];
    $icons    = $_POST['icon']    ?? [];
    $urls     = $_POST['url']     ?? [];
    $labels   = $_POST['label']   ?? [];
    $subs     = $_POST['sub']     ?? [];
    $enabled  = $_POST['enabled'] ?? [];

    foreach ($icons as $i => $icon) {
        $label = trim($labels[$i] ?? '');
        $url   = trim($urls[$i]   ?? '');
        if (!$label || !$url) continue;
        $newItems[] = [
            'icon'    => preg_replace('/[^a-z0-9\-]/', '', trim($icon)),
            'url'     => ltrim(trim($url), '/'),
            'label'   => $label,
            'sub'     => trim($subs[$i] ?? ''),
            'enabled' => isset($enabled[$i]),
        ];
    }
    DB::setSetting('bant_items', json_encode($newItems, JSON_UNESCAPED_UNICODE));
    DB::setSetting('theme_ikon_bant', '1');
    $items = $newItems;
    $msg   = 'success';
}

// ─── POST: Varsayılana Sıfırla ────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['bant_sifirla'])) {
    Security::verifyCsrf();
    DB::setSetting('bant_items', json_encode($defaults, JSON_UNESCAPED_UNICODE));
    $items = $defaults;
    $msg   = 'reset';
}

ap_admin_layout('Bant Yönetimi', function() use ($csrf, $items, $msg, $defaults) {

if ($msg === 'success'): ?>
<div class="ap-alert ap-alert-success" style="margin-bottom:16px">✓ Bant öğeleri başarıyla kaydedildi.</div>
<?php elseif ($msg === 'reset'): ?>
<div class="ap-alert ap-alert-info" style="margin-bottom:16px">↩ Bant varsayılan değerlere döndürüldü.</div>
<?php endif; ?>

<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
  <div>
    <h1 style="font-size:20px;font-weight:800;margin:0">İkon Bant Yönetimi</h1>
    <p style="color:var(--ap-text-2);font-size:13px;margin:4px 0 0">Manşet/slider altında görünen kısa yönlendirme butonları.</p>
  </div>
  <div style="display:flex;gap:8px">
    <form method="POST" style="display:inline">
      <input type="hidden" name="_csrf" value="<?= e($csrf) ?>">
      <button name="bant_sifirla" value="1" class="ap-btn ap-btn-ghost" onclick="return confirm('Varsayılan değerlere dön?')">↩ Varsayılana Dön</button>
    </form>
    <button onclick="bantEkle()" class="ap-btn ap-btn-secondary">+ Öğe Ekle</button>
    <button form="bant-form" type="submit" class="ap-btn ap-btn-primary">💾 Kaydet</button>
  </div>
</div>

<!-- Önizleme -->
<div class="ap-card" style="margin-bottom:16px">
  <div class="ap-card-header" style="cursor:pointer" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
    <h2 class="ap-card-title">👁 Canlı Önizleme</h2>
    <span style="font-size:12px;color:var(--ap-text-2)">Tıkla göster/gizle</span>
  </div>
  <div id="onizleme-wrap" style="padding:12px;background:#111;border-radius:0 0 8px 8px">
    <div id="bant-onizleme" style="display:flex;flex-wrap:wrap;gap:8px;padding:8px 0"></div>
  </div>
</div>

<!-- Düzenleme Tablosu -->
<div class="ap-card">
  <div class="ap-card-header"><h2 class="ap-card-title">Bant Öğeleri</h2></div>
  <form id="bant-form" method="POST">
    <input type="hidden" name="_csrf" value="<?= e($csrf) ?>">
    <input type="hidden" name="bant_kaydet" value="1">

    <div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="border-bottom:1px solid var(--ap-border)">
          <th style="padding:8px 6px;text-align:left;color:var(--ap-text-2);font-weight:600;width:36px">Sıra</th>
          <th style="padding:8px 6px;text-align:left;color:var(--ap-text-2);font-weight:600">FA İkon</th>
          <th style="padding:8px 6px;text-align:left;color:var(--ap-text-2);font-weight:600">Başlık</th>
          <th style="padding:8px 6px;text-align:left;color:var(--ap-text-2);font-weight:600">Alt Metin</th>
          <th style="padding:8px 6px;text-align:left;color:var(--ap-text-2);font-weight:600">URL / Slug</th>
          <th style="padding:8px 6px;text-align:center;color:var(--ap-text-2);font-weight:600;width:60px">Aktif</th>
          <th style="padding:8px 6px;text-align:center;color:var(--ap-text-2);font-weight:600;width:80px">Sil</th>
        </tr>
      </thead>
      <tbody id="bant-tbody">
        <?php foreach ($items as $i => $item): ?>
        <tr class="bant-row" style="border-bottom:1px solid var(--ap-border)">
          <td style="padding:8px 6px;color:var(--ap-text-2);font-weight:700;text-align:center;cursor:grab">☰</td>
          <td style="padding:6px">
            <div style="display:flex;align-items:center;gap:6px">
              <i class="fa <?= e($item['icon'] ?? 'fa-circle') ?>" style="color:#CC0000;font-size:16px;width:18px;text-align:center"></i>
              <input type="text" name="icon[]" value="<?= e($item['icon'] ?? '') ?>" class="ap-input" style="font-size:12px;padding:4px 6px;font-family:monospace" placeholder="fa-fire" oninput="updatePreview()">
            </div>
          </td>
          <td style="padding:6px">
            <input type="text" name="label[]" value="<?= e($item['label'] ?? '') ?>" class="ap-input" style="font-size:12px;padding:4px 6px;text-transform:uppercase" placeholder="BAŞLIK" oninput="updatePreview()">
          </td>
          <td style="padding:6px">
            <input type="text" name="sub[]" value="<?= e($item['sub'] ?? '') ?>" class="ap-input" style="font-size:12px;padding:4px 6px" placeholder="Alt açıklama" oninput="updatePreview()">
          </td>
          <td style="padding:6px">
            <input type="text" name="url[]" value="<?= e($item['url'] ?? '') ?>" class="ap-input" style="font-size:12px;padding:4px 6px;font-family:monospace" placeholder="slug veya /tam/url">
          </td>
          <td style="padding:6px;text-align:center">
            <input type="checkbox" name="enabled[<?= $i ?>]" value="1" <?= ($item['enabled'] ?? true) ? 'checked' : '' ?> style="width:16px;height:16px" onchange="updatePreview()">
          </td>
          <td style="padding:6px;text-align:center">
            <button type="button" onclick="this.closest('tr').remove();updatePreview()" style="background:none;border:none;color:#f85149;cursor:pointer;font-size:16px" title="Sil">✕</button>
          </td>
        </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
    </div>

    <div style="padding:12px;border-top:1px solid var(--ap-border);display:flex;justify-content:flex-end;gap:8px">
      <button type="button" onclick="bantEkle()" class="ap-btn ap-btn-ghost">+ Öğe Ekle</button>
      <button type="submit" class="ap-btn ap-btn-primary">💾 Değişiklikleri Kaydet</button>
    </div>
  </form>
</div>

<div class="ap-card" style="margin-top:16px">
  <div class="ap-card-header"><h2 class="ap-card-title">ℹ Popüler FontAwesome İkonları</h2></div>
  <div style="display:flex;flex-wrap:wrap;gap:8px;padding:12px">
    <?php foreach ([
      'fa-fire','fa-city','fa-chart-line','fa-globe','fa-futbol','fa-pen-nib','fa-play-circle',
      'fa-list','fa-newspaper','fa-camera','fa-tv','fa-rss','fa-star','fa-bolt','fa-heart',
      'fa-shopping-cart','fa-map-marker-alt','fa-calendar','fa-car','fa-home','fa-money-bill',
      'fa-video','fa-music','fa-book','fa-building','fa-users','fa-flag','fa-sun','fa-cloud-rain',
    ] as $ico): ?>
    <button type="button" class="ap-btn ap-btn-ghost" style="font-size:12px;padding:5px 10px" onclick="navigator.clipboard.writeText('<?= $ico ?>');this.style.background='var(--ap-accent-subtle)';setTimeout(()=>this.style.background='',600)" title="Kopyala: <?= $ico ?>">
      <i class="fa <?= $ico ?>"></i> <?= $ico ?>
    </button>
    <?php endforeach; ?>
  </div>
</div>

<script>
let rowTemplate = `
<tr class="bant-row" style="border-bottom:1px solid var(--ap-border)">
  <td style="padding:8px 6px;color:var(--ap-text-2);font-weight:700;text-align:center;cursor:grab">☰</td>
  <td style="padding:6px">
    <div style="display:flex;align-items:center;gap:6px">
      <i class="fa fa-circle" style="color:#CC0000;font-size:16px;width:18px;text-align:center"></i>
      <input type="text" name="icon[]" value="fa-circle" class="ap-input" style="font-size:12px;padding:4px 6px;font-family:monospace" placeholder="fa-fire" oninput="updatePreview()">
    </div>
  </td>
  <td style="padding:6px"><input type="text" name="label[]" value="" class="ap-input" style="font-size:12px;padding:4px 6px;text-transform:uppercase" placeholder="BAŞLIK" oninput="updatePreview()"></td>
  <td style="padding:6px"><input type="text" name="sub[]" value="" class="ap-input" style="font-size:12px;padding:4px 6px" placeholder="Alt açıklama"></td>
  <td style="padding:6px"><input type="text" name="url[]" value="" class="ap-input" style="font-size:12px;padding:4px 6px;font-family:monospace" placeholder="slug-url"></td>
  <td style="padding:6px;text-align:center"><input type="checkbox" name="enabled[NEW]" value="1" checked style="width:16px;height:16px" onchange="updatePreview()"></td>
  <td style="padding:6px;text-align:center"><button type="button" onclick="this.closest('tr').remove();updatePreview()" style="background:none;border:none;color:#f85149;cursor:pointer;font-size:16px">✕</button></td>
</tr>`;

function bantEkle() {
    const tbody = document.getElementById('bant-tbody');
    const idx = tbody.querySelectorAll('tr').length;
    tbody.insertAdjacentHTML('beforeend', rowTemplate.replace('NEW', idx));
    updatePreview();
}

function updatePreview() {
    const rows  = document.querySelectorAll('#bant-tbody .bant-row');
    const wrap  = document.getElementById('bant-onizleme');
    let html    = '';
    rows.forEach(row => {
        const cb = row.querySelector('input[type=checkbox]');
        if (cb && !cb.checked) return;
        const icon  = (row.querySelector('input[name="icon[]"]')?.value || 'fa-circle').trim();
        const label = (row.querySelector('input[name="label[]"]')?.value || '').trim();
        const sub   = (row.querySelector('input[name="sub[]"]')?.value || '').trim();
        if (!label) return;
        html += `<div style="display:flex;align-items:center;gap:8px;background:#1e1e1e;border-radius:8px;padding:10px 14px;min-width:130px">
          <div style="width:32px;height:32px;background:#CC0000;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <i class="fa ${icon}" style="color:#fff;font-size:13px"></i>
          </div>
          <div>
            <div style="font-size:11px;font-weight:700;color:#fff">${label}</div>
            <div style="font-size:10px;color:#aaa">${sub}</div>
          </div>
        </div>`;
    });
    wrap.innerHTML = html || '<span style="color:#666;font-size:13px">Aktif öğe yok</span>';
}

// Sürükle-bırak sıralama (SortableJS olmadan basit)
(function() {
    let drag = null;
    const tbody = document.getElementById('bant-tbody');
    tbody.addEventListener('dragstart', e => {
        drag = e.target.closest('tr');
        drag.style.opacity = '0.5';
    });
    tbody.addEventListener('dragend', e => {
        if (drag) drag.style.opacity = '';
        drag = null;
        updatePreview();
    });
    tbody.addEventListener('dragover', e => {
        e.preventDefault();
        const over = e.target.closest('tr');
        if (over && drag && over !== drag) {
            const rect = over.getBoundingClientRect();
            const mid  = rect.top + rect.height / 2;
            if (e.clientY < mid) over.parentNode.insertBefore(drag, over);
            else over.parentNode.insertBefore(drag, over.nextSibling);
        }
    });
    tbody.querySelectorAll('tr').forEach(tr => tr.setAttribute('draggable', 'true'));
    const obs = new MutationObserver(() => {
        tbody.querySelectorAll('tr[draggable!="true"]').forEach(tr => tr.setAttribute('draggable','true'));
    });
    obs.observe(tbody, {childList:true});
})();

updatePreview();
</script>
<?php
}); // ap_admin_layout
