<?php defined('ROOT') or die(); Auth::require('admin');

/**
 * AhenkPress İçe Aktarma Sayfası
 * - Köşe yazarlarını JSON'dan yükler  → ap_columnists
 * - Köşe yazılarını JSON'dan yükler   → ap_posts (post_type='columnist')
 *
 * Desteklenen JSON formatları:
 *  1) AhenkPress temiz formatı   : { "kind":"columnists"|"posts", "items":[{...}] }
 *  2) Eski WordPress ahb formatı : { "type":"__tbl_ky_yazarlar__"|"__ky_makaleler__", "items":[{...}] }
 */

$result = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && Security::verifyCsrf()) {
    $action = ap_post('action');

    // ========== JSON dosyası yükle ve içe aktar ==========
    if ($action === 'import' && !empty($_FILES['jsonfile']['tmp_name'])) {
        $tmp = $_FILES['jsonfile']['tmp_name'];
        $raw = file_get_contents($tmp);
        $data = json_decode($raw, true);

        if (!is_array($data) || empty($data['items']) || !is_array($data['items'])) {
            ap_flash('Geçersiz JSON: items dizisi bulunamadı.', 'danger');
            ap_redirect('/admin?page=import');
        }

        // Format türünü tespit et
        $kind = $data['kind'] ?? null;
        $type = $data['type'] ?? null;
        if (!$kind) {
            if ($type === '__tbl_ky_yazarlar__') $kind = 'columnists';
            elseif ($type === '__ky_makaleler__') $kind = 'posts';
        }

        if ($kind === 'columnists') {
            $result = ap_import_columnists($data['items']);
        } elseif ($kind === 'posts') {
            $result = ap_import_posts($data['items']);
        } else {
            ap_flash('JSON formatı tanınmadı. "kind" ya da "type" alanı eksik.', 'danger');
            ap_redirect('/admin?page=import');
        }

        ap_flash(
            sprintf('%s içe aktarma tamamlandı: %d eklendi, %d güncellendi, %d atlandı, %d hata.',
                $kind === 'columnists' ? 'Köşe Yazarları' : 'Köşe Yazıları',
                $result['inserted'], $result['updated'], $result['skipped'], $result['errors']
            ),
            $result['errors'] > 0 ? 'warning' : 'success'
        );
    }
}

/* ───────────── İçe aktarma fonksiyonları ───────────── */

function ap_import_columnists(array $items): array {
    $stats = ['inserted'=>0,'updated'=>0,'skipped'=>0,'errors'=>0,'log'=>[]];
    foreach ($items as $i => $row) {
        try {
            // Alan adlarını normalize et (eski ahb veya yeni temiz format)
            $name  = trim((string)($row['name']  ?? $row['ad_soyad']         ?? ''));
            $slug  = trim((string)($row['slug']  ?? ''));
            $title = trim((string)($row['title'] ?? $row['unvan']            ?? ''));
            $bio   = (string)($row['bio']        ?? $row['biyografi']        ?? '');
            $avatar= trim((string)($row['avatar']?? $row['foto']             ?? ''));
            $sort  = (int)($row['sort_order']    ?? $row['sira']             ?? 0);
            $active= (int)($row['active']        ?? $row['aktif']            ?? 1);
            $cat   = $row['created_at']          ?? $row['olusturma_tarihi'] ?? null;
            $extId = $row['id'] ?? null; // referans için (posts içe aktarımında lazım)

            if ($name === '') { $stats['skipped']++; continue; }
            if ($slug === '') $slug = Security::slug($name);

            $exists = DB::queryRow("SELECT id FROM `{p}columnists` WHERE slug=? LIMIT 1", [$slug]);
            $payload = [
                'name'       => $name,
                'slug'       => $slug,
                'title'      => $title,
                'bio'        => $bio,
                'avatar'     => $avatar,
                'sort_order' => $sort,
                'active'     => $active ? 1 : 0,
            ];
            if ($cat) $payload['created_at'] = $cat;

            if ($exists) {
                DB::update('columnists', $payload, ['id'=>$exists['id']]);
                $newId = (int)$exists['id'];
                $stats['updated']++;
            } else {
                $newId = DB::insert('columnists', $payload);
                $stats['inserted']++;
            }

            // Eski id → yeni id map (session'a kaydet, posts içe aktarımında kullanılır)
            if ($extId !== null) {
                $_SESSION['ap_import_columnist_map'][(string)$extId] = $newId;
            }
        } catch (\Throwable $e) {
            $stats['errors']++;
            $stats['log'][] = "satır $i: " . $e->getMessage();
        }
    }
    return $stats;
}

function ap_import_posts(array $items): array {
    $stats = ['inserted'=>0,'updated'=>0,'skipped'=>0,'errors'=>0,'log'=>[]];
    $colMap = $_SESSION['ap_import_columnist_map'] ?? [];

    // Yazar map yoksa, mevcut DB'den eski id eşlemesi yapamayız; eski id ile DB'deki id'lerin
    // birebir aynı olduğunu varsay (önce yazarları içe aktarmak şart!).
    $useDirectMap = empty($colMap);

    foreach ($items as $i => $row) {
        try {
            $title  = trim((string)($row['title'] ?? ''));
            $slug   = trim((string)($row['slug']  ?? ''));
            $content= (string)($row['content']    ?? '');
            $excerpt= (string)($row['excerpt']    ?? '');
            $status = (string)($row['status']     ?? 'published');
            if ($status === 'publish') $status = 'published';
            if (!in_array($status, ['published','draft','pending','archived'], true)) $status = 'draft';

            // Eski yazar id (ahb formatında meta._ky_yazar_id, yeni formatta columnist_id_old veya columnist_id)
            $oldYzId = $row['columnist_id_old'] ?? ($row['meta']['_ky_yazar_id'] ?? null);
            $colId   = $row['columnist_id'] ?? null;
            if (!$colId && $oldYzId !== null && (int)$oldYzId > 0) {
                if ($useDirectMap) {
                    $exists = DB::queryRow("SELECT id FROM `{p}columnists` WHERE id=?", [(int)$oldYzId]);
                    if ($exists) $colId = (int)$exists['id'];
                } else {
                    $colId = $colMap[(string)$oldYzId] ?? null;
                }
            }

            $date = $row['published_at'] ?? $row['date'] ?? null;
            if ($date === '0000-00-00 00:00:00') $date = null;

            if ($title === '' && $content === '') { $stats['skipped']++; continue; }
            if ($slug === '') $slug = Security::slug($title ?: 'yazi-' . time());

            // Gutenberg blok yorumlarını temizle
            $content = preg_replace('/<!--\s*\/?wp:[^>]*-->/', '', $content);
            $content = trim($content);

            $payload = [
                'post_type'    => 'columnist',
                'title'        => $title,
                'slug'         => $slug,
                'content'      => $content,
                'excerpt'      => $excerpt,
                'columnist_id' => $colId ?: null,
                'status'       => $status,
                'published_at' => $date,
            ];

            $exists = DB::queryRow("SELECT id FROM `{p}posts` WHERE slug=? AND post_type='columnist' LIMIT 1", [$slug]);
            if ($exists) {
                DB::update('posts', $payload, ['id'=>$exists['id']]);
                $stats['updated']++;
            } else {
                DB::insert('posts', $payload);
                $stats['inserted']++;
            }
        } catch (\Throwable $e) {
            $stats['errors']++;
            $stats['log'][] = "satır $i: " . $e->getMessage();
        }
    }
    return $stats;
}

/* ───────────── Sayfa görünümü ───────────── */

ap_admin_layout('İçe Aktar', function() use ($result) { ?>
<div class="ap-page-header">
  <div>
    <h1 class="ap-page-title">İçe Aktar</h1>
    <p class="ap-page-desc">JSON dosyalarını yükleyerek köşe yazarlarını ve köşe yazılarını içe aktarın.</p>
  </div>
</div>

<div class="ap-card" style="padding:24px;margin-bottom:20px">
  <h3 style="margin:0 0 8px;font-size:15px;font-weight:700">📋 Önemli Sıra</h3>
  <ol style="margin:0;padding-left:22px;color:var(--ap-text-muted);font-size:13px;line-height:1.8">
    <li><strong>ÖNCE</strong> köşe yazarları JSON dosyasını yükleyin (<code>columnists.json</code>).</li>
    <li><strong>SONRA</strong> köşe yazıları JSON dosyasını yükleyin (<code>posts.json</code>).<br>
        Yazılar yazarlara bağlandığı için, yazarların önce eklenmiş olması gerekir.</li>
    <li>Aynı slug'a sahip kayıtlar otomatik olarak <strong>güncellenir</strong>; tekrar tekrar çalıştırabilirsiniz.</li>
  </ol>
</div>

<form method="POST" enctype="multipart/form-data" class="ap-card" style="padding:24px">
  <?= Security::csrfField() ?>
  <input type="hidden" name="action" value="import">

  <div class="ap-form-group">
    <label class="ap-label">JSON Dosyası</label>
    <input type="file" name="jsonfile" accept=".json,application/json" required class="ap-form-control">
    <p style="margin:6px 0 0;font-size:12px;color:var(--ap-text-muted)">
      Desteklenen formatlar: AhenkPress temiz JSON (<code>kind: "columnists"</code> / <code>"posts"</code>)
      veya eski WordPress ahb-export formatı (<code>type: "__tbl_ky_yazarlar__"</code> / <code>"__ky_makaleler__"</code>).
    </p>
  </div>

  <div style="display:flex;gap:10px;margin-top:18px">
    <button type="submit" class="ap-btn ap-btn-primary">İçe Aktar</button>
    <a href="/admin?page=columnists" class="ap-btn">Köşe Yazarlarına Git</a>
    <a href="/admin?page=posts" class="ap-btn">Yazılara Git</a>
  </div>
</form>

<?php if ($result): ?>
<div class="ap-card" style="padding:20px;margin-top:18px">
  <h3 style="margin:0 0 12px;font-size:14px;font-weight:700">Sonuç</h3>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">
    <div style="padding:12px;border-radius:8px;background:#ecfdf5;border:1px solid #a7f3d0">
      <div style="font-size:11px;color:#065f46;font-weight:600">EKLENDİ</div>
      <div style="font-size:22px;font-weight:700;color:#047857"><?= (int)$result['inserted'] ?></div>
    </div>
    <div style="padding:12px;border-radius:8px;background:#eff6ff;border:1px solid #bfdbfe">
      <div style="font-size:11px;color:#1e40af;font-weight:600">GÜNCELLENDİ</div>
      <div style="font-size:22px;font-weight:700;color:#1d4ed8"><?= (int)$result['updated'] ?></div>
    </div>
    <div style="padding:12px;border-radius:8px;background:#fefce8;border:1px solid #fef08a">
      <div style="font-size:11px;color:#854d0e;font-weight:600">ATLANDI</div>
      <div style="font-size:22px;font-weight:700;color:#a16207"><?= (int)$result['skipped'] ?></div>
    </div>
    <div style="padding:12px;border-radius:8px;background:#fef2f2;border:1px solid #fecaca">
      <div style="font-size:11px;color:#991b1b;font-weight:600">HATA</div>
      <div style="font-size:22px;font-weight:700;color:#b91c1c"><?= (int)$result['errors'] ?></div>
    </div>
  </div>
  <?php if (!empty($result['log'])): ?>
  <details>
    <summary style="cursor:pointer;font-weight:600;font-size:13px">Hata günlüğünü göster (<?= count($result['log']) ?>)</summary>
    <pre style="background:#fafafe;padding:12px;border-radius:6px;font-size:11px;max-height:240px;overflow:auto;margin-top:8px"><?= e(implode("\n", $result['log'])) ?></pre>
  </details>
  <?php endif; ?>
</div>
<?php endif; ?>

<?php });
