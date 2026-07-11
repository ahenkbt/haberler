<?php
/**
 * AhenkPress Admin — Toplu Ürün & Kategori Import
 * CSV (virgülle veya noktalı virgülle) destekler.
 * Görsel: URL olarak girilir, dış linke bağlanır (sunucuya indirilmez).
 */
defined('ROOT') or die();
Auth::require('editor');

$csrf    = Security::csrf();
$tab     = $_GET['tab'] ?? 'products';
$results = null;

// ─── İşlem ──────────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST' && Security::verifyCsrf($_POST['csrf'] ?? '')) {

    $action = $_POST['action'] ?? '';

    // ── Kategori İmportu ────────────────────────────────────────────────────
    if ($action === 'import_categories') {
        $rows   = [];
        $errors = [];
        $ok     = 0;

        if (!empty($_FILES['csv_file']['tmp_name'])) {
            $handle = fopen($_FILES['csv_file']['tmp_name'], 'r');
            $header = null;
            $rowNum = 0;
            while (($row = fgetcsv($handle, 0, detectDelimiter($_FILES['csv_file']['tmp_name']))) !== false) {
                $rowNum++;
                if ($rowNum === 1) {
                    $header = array_map('strtolower', array_map('trim', $row));
                    continue;
                }
                if (empty(array_filter($row))) continue;
                $data = $header ? array_combine($header, array_pad($row, count($header), '')) : $row;

                $name  = trim($data['name'] ?? $data['isim'] ?? $data['ad'] ?? ($row[0] ?? ''));
                $desc  = trim($data['description'] ?? $data['aciklama'] ?? $data['açıklama'] ?? ($row[1] ?? ''));
                $slug  = trim($data['slug'] ?? '');
                $color = trim($data['color'] ?? $data['renk'] ?? '');

                if (!$name) { $errors[] = "Satır $rowNum: İsim boş, atlandı."; continue; }

                $slug = $slug ?: Security::slug($name);
                // Slug benzersizliği
                $existing = DB::queryRow("SELECT id FROM `{p}product_categories` WHERE slug=?", [$slug]);
                if ($existing) {
                    // Güncelle
                    DB::update('product_categories', ['name'=>$name,'description'=>$desc,'color'=>$color], ['id'=>$existing['id']]);
                    $ok++;
                } else {
                    DB::insert('product_categories', ['name'=>$name,'slug'=>$slug,'description'=>$desc,'color'=>$color,'active'=>1,'created_at'=>date('Y-m-d H:i:s')]);
                    $ok++;
                }
            }
            fclose($handle);
        }
        $results = ['action'=>'cat', 'ok'=>$ok, 'errors'=>$errors];
    }

    // ── Ürün İmportu ────────────────────────────────────────────────────────
    if ($action === 'import_products') {
        $errors    = [];
        $ok        = 0;
        $defaultStatus = $_POST['default_status'] ?? 'published';

        if (!empty($_FILES['csv_file']['tmp_name'])) {
            $delim  = detectDelimiter($_FILES['csv_file']['tmp_name']);
            $handle = fopen($_FILES['csv_file']['tmp_name'], 'r');
            $header = null;
            $rowNum = 0;
            while (($row = fgetcsv($handle, 0, $delim)) !== false) {
                $rowNum++;
                if ($rowNum === 1) {
                    $header = array_map('strtolower', array_map('trim', $row));
                    continue;
                }
                if (empty(array_filter($row))) continue;
                $d = $header ? array_combine($header, array_pad($row, count($header), '')) : [];

                $title  = trim($d['title'] ?? $d['baslik'] ?? $d['başlık'] ?? $d['name'] ?? $d['ad'] ?? ($row[0] ?? ''));
                if (!$title) { $errors[] = "Satır $rowNum: Başlık boş, atlandı."; continue; }

                $price    = (float)str_replace(',','.', $d['price'] ?? $d['fiyat'] ?? '0');
                $oldPrice = (float)str_replace(',','.', $d['old_price'] ?? $d['eski_fiyat'] ?? $d['indirimli_fiyat'] ?? '0');
                $stock    = trim($d['stock'] ?? $d['stok'] ?? '');
                $sku      = trim($d['sku'] ?? $d['kod'] ?? '');
                $content  = trim($d['description'] ?? $d['content'] ?? $d['icerik'] ?? $d['açıklama'] ?? '');
                $excerpt  = trim($d['excerpt'] ?? $d['ozet'] ?? $d['özet'] ?? '');
                $imgUrl   = trim($d['image'] ?? $d['image_url'] ?? $d['gorsel'] ?? $d['görsel'] ?? '');
                $weight   = trim($d['weight'] ?? $d['agirlik'] ?? $d['ağırlık'] ?? '');
                $freeShip = in_array(strtolower($d['free_shipping'] ?? $d['ucretsiz_kargo'] ?? ''), ['1','evet','yes','true']);
                $featured = in_array(strtolower($d['featured'] ?? $d['one_cikan'] ?? ''), ['1','evet','yes','true']);
                $catName  = trim($d['category'] ?? $d['kategori'] ?? '');
                $status   = in_array($d['status'] ?? '', ['published','draft','private']) ? $d['status'] : $defaultStatus;

                // Görsel URL doğrula — sadece dış link, sunucuya indirme
                if ($imgUrl && !preg_match('#^https?://#i', $imgUrl)) $imgUrl = '';

                // Slug
                $slug = Security::slug($title);
                $base = $slug; $i = 1;
                while (DB::queryValue("SELECT COUNT(*) FROM `{p}posts` WHERE slug=?", [$slug]) > 0) {
                    $slug = $base . '-' . $i++;
                }

                // Kategori
                $catId = 0;
                if ($catName) {
                    $catSlug   = Security::slug($catName);
                    $catRecord = DB::queryRow("SELECT id FROM `{p}product_categories` WHERE slug=?", [$catSlug]);
                    if ($catRecord) {
                        $catId = (int)$catRecord['id'];
                    } else {
                        $catId = (int)DB::insert('product_categories', [
                            'name' => $catName, 'slug' => $catSlug,
                            'active' => 1, 'created_at' => date('Y-m-d H:i:s')
                        ]);
                    }
                }

                $now = date('Y-m-d H:i:s');
                try {
                    $pid = (int)DB::insert(
                        "INSERT INTO `{p}posts` (post_type,title,slug,content,excerpt,cover_image,status,featured,published_at,created_at,updated_at)
                         VALUES ('product',?,?,?,?,?,?,?,?,?,?)",
                        [$title,$slug,$content,$excerpt,$imgUrl,$status,(int)$featured,$now,$now,$now]
                    );
                    // Meta
                    $metas = ['price'=>$price,'old_price'=>$oldPrice,'stock'=>$stock,'sku'=>$sku,
                              'product_category_id'=>$catId,'free_shipping'=>(int)$freeShip,'weight'=>$weight];
                    foreach ($metas as $k => $v) {
                        DB::execute(
                            "INSERT INTO `{p}post_meta` (post_id,meta_key,meta_val) VALUES (?,?,?) ON DUPLICATE KEY UPDATE meta_val=VALUES(meta_val)",
                            [$pid, $k, $v]
                        );
                    }
                    $ok++;
                } catch (\Throwable $e) {
                    $errors[] = "Satır $rowNum ($title): " . $e->getMessage();
                }
            }
            fclose($handle);
        }
        $results = ['action'=>'prod', 'ok'=>$ok, 'errors'=>$errors];
    }
}

/** CSV sınırlayıcısını otomatik algıla (virgül veya noktalı virgül) */
function detectDelimiter(string $file): string {
    $f = fopen($file, 'r');
    $line = fgets($f);
    fclose($f);
    $sc = substr_count($line, ';');
    $c  = substr_count($line, ',');
    return $sc > $c ? ';' : ',';
}

ap_admin_layout('Toplu İçe Aktar', function() use ($csrf, $tab, $results) {
?>
<div class="ap-page-header">
  <h1 class="ap-page-title">Toplu İçe Aktar</h1>
  <div style="display:flex;gap:8px">
    <a href="/admin/?page=product-categories" class="ap-btn">Kategoriler</a>
    <a href="/admin/?page=products" class="ap-btn">← Ürünlere Dön</a>
  </div>
</div>

<?php if ($results): ?>
<div class="ap-card" style="padding:16px;margin-bottom:16px;border-color:<?= $results['ok']>0?'#238636':'#da3633' ?>">
  <strong><?= $results['action']==='cat' ? 'Kategori' : 'Ürün' ?> import sonucu:</strong>
  <span style="color:#56d364;margin-left:8px">✓ <?= $results['ok'] ?> kayıt işlendi</span>
  <?php if (!empty($results['errors'])): ?>
  <ul style="margin-top:8px;color:#f85149;font-size:13px">
    <?php foreach ($results['errors'] as $e): ?><li><?= e($e) ?></li><?php endforeach; ?>
  </ul>
  <?php endif; ?>
</div>
<?php endif; ?>

<!-- Sekmeler -->
<div style="display:flex;gap:0;border-bottom:1px solid var(--ap-border);margin-bottom:20px">
  <a href="?page=product-import&tab=products" class="ap-tab-link <?= $tab==='products'?'active':'' ?>"
     style="padding:10px 20px;font-size:14px;font-weight:600;text-decoration:none;border-bottom:2px solid <?= $tab==='products'?'var(--ap-accent)':'transparent' ?>;color:<?= $tab==='products'?'var(--ap-accent)':'var(--ap-text-muted)' ?>">
    📦 Ürün Import
  </a>
  <a href="?page=product-import&tab=categories" class="ap-tab-link <?= $tab==='categories'?'active':'' ?>"
     style="padding:10px 20px;font-size:14px;font-weight:600;text-decoration:none;border-bottom:2px solid <?= $tab==='categories'?'var(--ap-accent)':'transparent' ?>;color:<?= $tab==='categories'?'var(--ap-accent)':'var(--ap-text-muted)' ?>">
    🗂 Kategori Import
  </a>
</div>

<?php if ($tab === 'products'): ?>
<!-- ──────────────────── ÜRÜN IMPORT ──────────────────── -->
<div style="display:grid;grid-template-columns:1fr 340px;gap:20px;align-items:start">

  <div class="ap-card" style="padding:24px">
    <h3 style="margin-bottom:16px;font-size:15px">CSV Dosyası Yükle</h3>
    <form method="POST" enctype="multipart/form-data">
      <input type="hidden" name="action" value="import_products">
      <input type="hidden" name="csrf" value="<?= e($csrf) ?>">

      <div class="ap-form-group">
        <label class="ap-label">CSV Dosyası *</label>
        <input type="file" name="csv_file" accept=".csv,.txt" class="ap-input" style="padding:8px" required>
        <div class="ap-hint">Virgül (,) veya noktalı virgül (;) ile ayrılmış — UTF-8 kodlaması</div>
      </div>

      <div class="ap-form-group">
        <label class="ap-label">Varsayılan Yayın Durumu</label>
        <select name="default_status" class="ap-input">
          <option value="published">Yayında</option>
          <option value="draft">Taslak</option>
        </select>
        <div class="ap-hint">CSV'de "status" sütunu varsa sütun öncelikli.</div>
      </div>

      <button type="submit" class="ap-btn ap-btn-primary" style="width:100%">
        📤 Ürünleri İçe Aktar
      </button>
    </form>

    <hr style="margin:20px 0;border-color:var(--ap-border)">

    <!-- Örnek CSV indir -->
    <h4 style="margin-bottom:10px;font-size:14px">📥 Örnek CSV İndir</h4>
    <a href="data:text/csv;charset=utf-8,<?= rawurlencode(
        "title,price,old_price,stock,sku,category,description,excerpt,image,weight,free_shipping,featured,status\n" .
        "\"Örnek Ürün 1\",\"199.90\",\"249.90\",\"Stokta var\",\"SKU-001\",\"Elektronik\",\"Ürün açıklaması buraya yazılır.\",\"Kısa özet\",\"https://example.com/image.jpg\",\"0.5\",\"0\",\"0\",\"published\"\n" .
        "\"Örnek Ürün 2\",\"89.00\",\"\",\"15 adet\",\"SKU-002\",\"Giyim\",\"Detaylı açıklama.\",\"\",\"\",\"\",\"1\",\"1\",\"published\""
    ) ?>" download="urun-import-ornegi.csv"
       class="ap-btn" style="display:inline-flex;align-items:center;gap:6px;font-size:13px">
      ⬇ urun-import-ornegi.csv
    </a>
  </div>

  <!-- Sağ: Sütun Rehberi -->
  <div class="ap-card" style="padding:20px">
    <h4 style="margin-bottom:12px;font-size:14px">📋 CSV Sütun Rehberi</h4>
    <div style="font-size:12px;line-height:2">
      <?php $cols = [
        'title'        => 'Ürün adı (zorunlu)',
        'price'        => 'Satış fiyatı (₺)',
        'old_price'    => 'Önceki fiyat (indirim için)',
        'stock'        => 'Stok bilgisi (metin)',
        'sku'          => 'Ürün kodu / SKU',
        'category'     => 'Kategori adı (yoksa oluşturulur)',
        'description'  => 'Tam ürün açıklaması',
        'excerpt'      => 'Kısa özet',
        'image'        => 'Görsel URL (https://...)',
        'weight'       => 'Ağırlık kg cinsinden',
        'free_shipping'=> '1=ücretsiz kargo',
        'featured'     => '1=öne çıkan',
        'status'       => 'published / draft',
      ]; foreach ($cols as $k => $v): ?>
      <div style="display:flex;gap:8px;padding:3px 0;border-bottom:1px solid var(--ap-border)">
        <code style="color:var(--ap-accent);min-width:100px"><?= $k ?></code>
        <span class="text-muted"><?= $v ?></span>
      </div>
      <?php endforeach; ?>
    </div>
    <div style="margin-top:14px;padding:10px;background:var(--ap-bg);border-radius:6px;font-size:12px;color:var(--ap-text-muted)">
      💡 <strong>Görsel notu:</strong> Görseller sunucuya indirilmez. Dış kaynak URL'si (https://...) doğrudan saklanır. Görsel girilmezse tema varsayılan görseli kullanılır.
    </div>
  </div>
</div>

<?php else: ?>
<!-- ──────────────────── KATEGORİ IMPORT ──────────────────── -->
<div style="display:grid;grid-template-columns:1fr 300px;gap:20px;align-items:start">

  <div class="ap-card" style="padding:24px">
    <h3 style="margin-bottom:16px;font-size:15px">Kategori CSV Yükle</h3>
    <form method="POST" enctype="multipart/form-data">
      <input type="hidden" name="action" value="import_categories">
      <input type="hidden" name="csrf" value="<?= e($csrf) ?>">

      <div class="ap-form-group">
        <label class="ap-label">CSV Dosyası *</label>
        <input type="file" name="csv_file" accept=".csv,.txt" class="ap-input" style="padding:8px" required>
        <div class="ap-hint">Başlık satırı zorunlu. Virgül veya noktalı virgül ayırıcı.</div>
      </div>

      <button type="submit" class="ap-btn ap-btn-primary" style="width:100%">
        📤 Kategorileri İçe Aktar
      </button>
    </form>

    <hr style="margin:20px 0;border-color:var(--ap-border)">

    <h4 style="margin-bottom:10px;font-size:14px">📥 Örnek CSV İndir</h4>
    <a href="data:text/csv;charset=utf-8,<?= rawurlencode(
        "name,slug,description,color\n" .
        "\"Elektronik\",\"elektronik\",\"Elektronik ürünler kategorisi\",\"#388bfd\"\n" .
        "\"Giyim\",\"giyim\",\"Giyim ürünleri\",\"#e3b341\"\n" .
        "\"Ev & Yaşam\",\"ev-yasam\",\"Ev dekorasyon ve yaşam ürünleri\",\"\""
    ) ?>" download="kategori-import-ornegi.csv"
       class="ap-btn" style="display:inline-flex;align-items:center;gap:6px;font-size:13px">
      ⬇ kategori-import-ornegi.csv
    </a>
  </div>

  <div class="ap-card" style="padding:20px">
    <h4 style="margin-bottom:12px;font-size:14px">📋 Sütun Rehberi</h4>
    <div style="font-size:12px;line-height:2">
      <?php $catCols = [
        'name'        => 'Kategori adı (zorunlu)',
        'slug'        => 'URL kısa adı (boşsa otomatik)',
        'description' => 'Açıklama (isteğe bağlı)',
        'color'       => 'Renk kodu (#hex, isteğe bağlı)',
      ]; foreach ($catCols as $k => $v): ?>
      <div style="display:flex;gap:8px;padding:3px 0;border-bottom:1px solid var(--ap-border)">
        <code style="color:var(--ap-accent);min-width:80px"><?= $k ?></code>
        <span class="text-muted"><?= $v ?></span>
      </div>
      <?php endforeach; ?>
    </div>
    <div style="margin-top:14px;padding:10px;background:var(--ap-bg);border-radius:6px;font-size:12px;color:var(--ap-text-muted)">
      💡 Aynı slug'a sahip kategori varsa güncellenir, yoksa yeni oluşturulur.
    </div>
  </div>
</div>
<?php endif; ?>
<?php });
