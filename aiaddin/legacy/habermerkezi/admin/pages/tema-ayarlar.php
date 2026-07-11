<?php
/**
 * AhenkPress — Tema Ayarları (orijinal customizer.php birebir)
 * Renkler | Logo | Navbar | Navbar Özel Linkler | Footer | Sosyal Medya | Per-Tab Renkler | Görseller
 */
defined('ROOT') or die();

/* ── Kategorileri al (navbar için) ─── */
$categories = DB::query("SELECT id,name,slug FROM `{p}categories` ORDER BY name ASC") ?: [];

/* ── Kaydet ─────────────────────────── */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['tema_ayar_kaydet'])) {
    Security::verifyCsrf();

    $alanlar = [
        // Renkler
        'ana_renk','ikincil_renk','navbar_renk','navbar_yazi_renk',
        'ust_bar_renk','son_dakika_renk','finans_renk',
        // Logo
        'logo_metin1','logo_metin2','header_stili','logo_resim',
        // Navbar
        'navbar_kategori_sluglari',
        'navbar_link1_baslik','navbar_link1_url',
        'navbar_link2_baslik','navbar_link2_url',
        'navbar_link3_baslik','navbar_link3_url',
        'navbar_link4_baslik','navbar_link4_url',
        // Görsel
        'placeholder_resim',
        // Footer
        'footer_aciklama','footer_telif',
        // İletişim
        'iletisim_adres','iletisim_telefon','iletisim_email',
        // Sosyal Medya
        'sosyal_whatsapp','sosyal_facebook','sosyal_twitter',
        'sosyal_instagram','sosyal_youtube','sosyal_telegram',
        // Logo boyutu
        'logo_yukseklik',
    ];

    // ── Logo dosyası yükle ───────────────────────────────────────
    if (!empty($_FILES['logo_dosya']['tmp_name']) && $_FILES['logo_dosya']['error'] === UPLOAD_ERR_OK) {
        $file    = $_FILES['logo_dosya'];
        $ext     = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowed = ['jpg','jpeg','png','gif','svg','webp'];
        if (in_array($ext, $allowed) && $file['size'] < 5*1024*1024) {
            $uploadDir = ROOT . '/uploads/';
            if (!is_dir($uploadDir)) @mkdir($uploadDir, 0755, true);
            $newName = 'logo_' . time() . '.' . $ext;
            $dest    = $uploadDir . $newName;
            if (move_uploaded_file($file['tmp_name'], $dest)) {
                $logoUrl = '/uploads/' . $newName;
                DB::execute("INSERT INTO `{p}settings`(`key`,`val`) VALUES(?,?) ON DUPLICATE KEY UPDATE `val`=?",
                    ['logo_resim', $logoUrl, $logoUrl]);
                // POST'tan kaldır (dosya yüklendiyse metin alanını geçersiz say)
                $_POST['logo_resim'] = $logoUrl;
            }
        }
    }

    // Favicon yükle
    if (!empty($_FILES['favicon_dosya']['tmp_name']) && $_FILES['favicon_dosya']['error'] === UPLOAD_ERR_OK) {
        $file    = $_FILES['favicon_dosya'];
        $ext     = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowed = ['ico','png','jpg','gif','svg'];
        if (in_array($ext, $allowed) && $file['size'] < 1*1024*1024) {
            $uploadDir = ROOT . '/uploads/';
            if (!is_dir($uploadDir)) @mkdir($uploadDir, 0755, true);
            $newName = 'favicon_' . time() . '.' . $ext;
            $dest    = $uploadDir . $newName;
            if (move_uploaded_file($file['tmp_name'], $dest)) {
                $favUrl = '/uploads/' . $newName;
                DB::execute("INSERT INTO `{p}settings`(`key`,`val`) VALUES(?,?) ON DUPLICATE KEY UPDATE `val`=?",
                    ['favicon', $favUrl, $favUrl]);
            }
        }
    }

    foreach ($alanlar as $k) {
        $val = trim($_POST[$k] ?? '');
        DB::execute(
            "INSERT INTO `{p}settings`(`key`,`val`) VALUES(?,?) ON DUPLICATE KEY UPDATE `val`=?",
            [$k, $val, $val]
        );
    }

    // Per-tab menü renkleri (her kategori için)
    foreach ($categories as $cat) {
        $slug = $cat['slug'];
        foreach (['bg','yazi','hover'] as $tip) {
            $k   = "tab_renk_{$slug}_{$tip}";
            $val = trim($_POST[$k] ?? '');
            DB::execute(
                "INSERT INTO `{p}settings`(`key`,`val`) VALUES(?,?) ON DUPLICATE KEY UPDATE `val`=?",
                [$k, $val, $val]
            );
        }
    }

    ap_flash('Tema ayarları kaydedildi.', 'success');
    ap_redirect('/admin/?page=tema-ayarlar');
}

/* ── Setting helper ─────────────────── */
function ts(string $key, string $default = ''): string {
    return DB::setting($key, $default);
}

ap_admin_layout('Tema Ayarları', function() use ($categories) {
?>
<style>
.ta-wrap{max-width:1000px}
.ta-hd{background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;padding:22px 26px;border-radius:12px;margin-bottom:20px}
.ta-hd h1{margin:0;font-size:20px;font-weight:700}
.ta-hd p{margin:6px 0 0;font-size:13px;color:#9ca3af}
.ta-tabs{display:flex;gap:0;margin-bottom:20px;border-bottom:2px solid #e5e7eb;flex-wrap:wrap}
.ta-tab{padding:10px 16px;font-size:13px;font-weight:600;color:#6b7280;text-decoration:none;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;transition:.15s;background:none;border-top:none;border-left:none;border-right:none}
.ta-tab:hover,.ta-tab.active{color:#e94560;border-bottom-color:#e94560}
.ta-section{display:none}.ta-section.active{display:block}
.panel{background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:14px}
.ph{background:#f9fafb;border-bottom:1px solid #e5e7eb;padding:12px 18px;font-weight:700;font-size:14px;color:#374151}
.pb{padding:18px}
.form-table{width:100%;border-collapse:separate;border-spacing:0}
.form-table th{width:240px;font-size:13px;font-weight:600;color:#374151;text-align:left;vertical-align:top;padding:12px 16px 12px 0}
.form-table td{padding:10px 0}
.form-table td small{display:block;margin-top:4px;font-size:11px;color:#9ca3af}
.form-table input[type=text],
.form-table input[type=url],
.form-table input[type=email],
.form-table input[type=tel],
.form-table select,
.form-table textarea{width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px}
.form-table textarea{min-height:80px;resize:vertical}
.color-row{display:flex;align-items:center;gap:8px}
.color-row input[type=color]{width:44px;height:38px;padding:2px;border:1px solid #d1d5db;border-radius:6px;cursor:pointer}
.color-row input[type=text]{flex:1}
.link-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.tab-renk-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.tab-renk-grup{border:1px solid #e5e7eb;border-radius:8px;padding:10px}
.tab-renk-grup label{display:block;font-size:11px;font-weight:600;color:#6b7280;margin-bottom:4px;text-transform:uppercase}
.gorsel-preview{max-width:200px;margin-top:8px;border-radius:6px;border:1px solid #e5e7eb}
.ta-kaydet{background:#e94560;border-color:#e94560;color:#fff;font-weight:700;font-size:15px;padding:12px 36px}
.ta-kaydet:hover{background:#c73652;border-color:#c73652;color:#fff}
.css-preview-box{background:#1a1a2e;border-radius:8px;padding:14px 16px;font-family:Consolas,Monaco,monospace;font-size:12px;color:#a5f3fc;margin-top:12px;white-space:pre-wrap;max-height:200px;overflow-y:auto}
.sticker{display:inline-block;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:700;background:#dbeafe;color:#1e40af;vertical-align:middle;margin-left:4px}
</style>

<div class="ta-wrap">
  <div class="ta-hd">
    <h1>🎨 Tema Ayarları</h1>
    <p>Sitenizin görünümünü, renklerini, logosunu ve sosyal medya bilgilerini bu sayfadan yönetin.</p>
  </div>

  <form method="POST" id="temaForm" enctype="multipart/form-data">
    <?= Security::csrfField() ?>

    <!-- SEKMELER -->
    <div class="ta-tabs">
      <button type="button" class="ta-tab active" data-tab="renkler">🎨 Renkler</button>
      <button type="button" class="ta-tab" data-tab="logo">🏷 Logo & Site Adı</button>
      <button type="button" class="ta-tab" data-tab="navbar">🔗 Navbar</button>
      <button type="button" class="ta-tab" data-tab="tab-renkler">🌈 Sekme Renkleri</button>
      <button type="button" class="ta-tab" data-tab="footer">📄 Footer</button>
      <button type="button" class="ta-tab" data-tab="sosyal">📱 İletişim & Sosyal</button>
      <button type="button" class="ta-tab" data-tab="gorsel">🖼 Görseller</button>
    </div>

    <!-- ═══ RENKLER ═══ -->
    <div class="ta-section active" id="tab-renkler-section" data-section="renkler">
      <div class="panel">
        <div class="ph">🎨 Site Renkleri</div>
        <div class="pb">
          <p style="font-size:13px;color:#6b7280;margin-bottom:16px">Bu renkler CSS değişkenleri olarak tüm siteye otomatik uygulanır.</p>
          <table class="form-table">
            <?php
            $renk_alanlari = [
                'ana_renk'         => ['Ana Renk',             '#CC0000', 'Butonlar, rozetler, vurgu rengi'],
                'ikincil_renk'     => ['İkincil Renk',         '#1a1a2e', 'Başlıklar, koyu arka planlar'],
                'navbar_renk'      => ['Navbar Arkaplanı',     '#1a1a2e', 'Üst menü arka plan rengi'],
                'navbar_yazi_renk' => ['Navbar Yazı Rengi',    '#ffffff', 'Üst menü yazı ve ikon rengi'],
                'ust_bar_renk'     => ['Üst Bar Rengi',        '#e94560', 'En üstteki ince bant (son dakika / duyuru bandı)'],
                'son_dakika_renk'  => ['Son Dakika Rozeti',    '#e94560', 'Haber detayında son dakika rozetinin rengi'],
                'finans_renk'      => ['Finans Bandı Rengi',   '#1a3a2e', 'Sayfanın en altındaki finans/banka kuru bandı'],
            ];
            foreach ($renk_alanlari as $k => [$label, $default, $acik]): $val = ts($k, $default); ?>
            <tr>
              <th><?= e($label) ?></th>
              <td>
                <div class="color-row">
                  <input type="color" value="<?= e($val ?: $default) ?>" oninput="document.getElementById('<?= e($k) ?>').value=this.value">
                  <input type="text" name="<?= e($k) ?>" id="<?= e($k) ?>" value="<?= e($val ?: $default) ?>" placeholder="<?= e($default) ?>"
                    oninput="if(/^#[0-9a-fA-F]{6}$/.test(this.value)) this.previousElementSibling.value=this.value">
                </div>
                <small><?= e($acik) ?></small>
              </td>
            </tr>
            <?php endforeach; ?>
          </table>
          <div class="css-preview-box" id="cssPreview">/* Renkleri değiştirdikçe burada CSS çıktısını göreceksiniz */</div>
        </div>
      </div>
    </div>

    <!-- ═══ LOGO & SİTE ADI ═══ -->
    <div class="ta-section" data-section="logo">
      <div class="panel">
        <div class="ph">🏷 Logo & Site Başlığı</div>
        <div class="pb">
          <table class="form-table">
            <tr>
              <th>Logo Metin 1. Kısım</th>
              <td>
                <input type="text" name="logo_metin1" value="<?= e(ts('logo_metin1','ANKARA')) ?>" placeholder="ANKARA">
                <small>Ana harf grubunun 1. kısmı. Siyah/koyu renkte görünür.</small>
              </td>
            </tr>
            <tr>
              <th>Logo Metin 2. Kısım <span class="sticker">Renkli</span></th>
              <td>
                <input type="text" name="logo_metin2" value="<?= e(ts('logo_metin2','HABER')) ?>" placeholder="HABER">
                <small>Ana renkle (kırmızı vb.) vurgulanacak 2. kısım.</small>
              </td>
            </tr>
            <tr>
              <th>Header Stili</th>
              <td>
                <select name="header_stili">
                  <option value="klasik" <?= ts('header_stili','klasik')==='klasik'?'selected':'' ?>>Klasik (Logo sol, menü sağ)</option>
                  <option value="odatv"  <?= ts('header_stili','klasik')==='odatv'?'selected':'' ?>>ODA TV Minimal (Logo ortada, menü altında)</option>
                </select>
                <small>Sitenin üst kısmının genel düzeni.</small>
              </td>
            </tr>
            <tr>
              <th>Site Logosu (Resim) <span class="sticker">Yükle</span></th>
              <td>
                <?php $mevcut_logo = ts('logo_resim'); ?>
                <?php if ($mevcut_logo): ?>
                <div style="margin-bottom:8px;padding:8px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;display:inline-flex;align-items:center;gap:10px">
                  <img src="<?= e($mevcut_logo) ?>" alt="Mevcut Logo" style="max-height:50px;max-width:200px;object-fit:contain">
                  <span style="font-size:11px;color:#888">Mevcut logo</span>
                </div><br>
                <?php endif; ?>
                <input type="file" name="logo_dosya" accept="image/*" style="padding:4px 0">
                <input type="text" name="logo_resim" value="<?= e($mevcut_logo) ?>" placeholder="https://... veya /uploads/logo.png" style="margin-top:6px">
                <small>Resim yükleyin (.jpg .png .svg .webp) veya URL girin. Boş bırakırsanız metin logosu gösterilir.</small>
              </td>
            </tr>
            <tr>
              <th>Favicon <span class="sticker">Yükle</span></th>
              <td>
                <?php $mevcut_fav = ts('favicon'); ?>
                <?php if ($mevcut_fav): ?>
                <div style="margin-bottom:6px"><img src="<?= e($mevcut_fav) ?>" alt="Favicon" style="width:32px;height:32px;object-fit:contain"></div>
                <?php endif; ?>
                <input type="file" name="favicon_dosya" accept=".ico,.png,.jpg,.gif,.svg" style="padding:4px 0">
                <small>Tarayıcı sekmesinde görünen simge (.ico veya .png, max 1MB).</small>
              </td>
            </tr>
            <tr>
              <th>Logo Yüksekliği (px)</th>
              <td>
                <input type="text" name="logo_yukseklik" value="<?= e(ts('logo_yukseklik','50')) ?>" placeholder="50" style="width:100px">
                <small>Logo görselinin piksel yüksekliği. Sadece resimli logo kullanılıyorsa etkindir.</small>
              </td>
            </tr>
          </table>
        </div>
      </div>
    </div>

    <!-- ═══ NAVBAR ═══ -->
    <div class="ta-section" data-section="navbar">
      <div class="panel">
        <div class="ph">🔗 Navbar Kategorileri</div>
        <div class="pb">
          <table class="form-table">
            <tr>
              <th>Kategori Slugları</th>
              <td>
                <input type="text" name="navbar_kategori_sluglari" value="<?= e(ts('navbar_kategori_sluglari')) ?>" placeholder="gundem,ekonomi,spor,magazin,yasam">
                <small>Menüde gösterilecek kategorilerin slug'larını virgülle yazın. Sıra menüde sırayı belirler.</small>
                <?php if (!empty($categories)): ?>
                <div style="margin-top:8px;display:flex;gap:4px;flex-wrap:wrap">
                  <?php foreach ($categories as $cat): ?>
                  <button type="button" class="slug-ekle-btn" data-slug="<?= e($cat['slug']) ?>" style="padding:3px 8px;font-size:11px;border:1px solid #d1d5db;border-radius:12px;background:#fff;cursor:pointer;color:#374151">
                    + <?= e($cat['name']) ?>
                  </button>
                  <?php endforeach; ?>
                </div>
                <?php endif; ?>
              </td>
            </tr>
          </table>
        </div>
      </div>

      <div class="panel">
        <div class="ph">🔗 Navbar Özel Linkler <span class="sticker">4 adet</span></div>
        <div class="pb">
          <p style="font-size:13px;color:#6b7280;margin-bottom:14px">Kategoriler dışında menüye eklemek istediğiniz özel linkler (örn: Canlı TV, Yazarlar, RSS).</p>
          <?php for ($i = 1; $i <= 4; $i++): ?>
          <div style="margin-bottom:12px;padding:12px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb">
            <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:8px">Özel Link <?= $i ?></div>
            <div class="link-grid">
              <div>
                <label style="font-size:12px;font-weight:600;color:#6b7280;display:block;margin-bottom:3px">Başlık</label>
                <input type="text" name="navbar_link<?= $i ?>_baslik" value="<?= e(ts("navbar_link{$i}_baslik")) ?>" placeholder="Canlı TV">
              </div>
              <div>
                <label style="font-size:12px;font-weight:600;color:#6b7280;display:block;margin-bottom:3px">URL</label>
                <input type="url" name="navbar_link<?= $i ?>_url" value="<?= e(ts("navbar_link{$i}_url")) ?>" placeholder="https://siteadi.com/canli">
              </div>
            </div>
          </div>
          <?php endfor; ?>
        </div>
      </div>
    </div>

    <!-- ═══ SEKME (TAB) RENKLERİ ═══ -->
    <div class="ta-section" data-section="tab-renkler">
      <div class="panel">
        <div class="ph">🌈 Per-Sekme Menü Renkleri</div>
        <div class="pb">
          <p style="font-size:13px;color:#6b7280;margin-bottom:16px">Her kategori sekmesi için ayrı arka plan, yazı ve hover rengi belirleyebilirsiniz. Boş bırakılırsa varsayılan navbar renkleri kullanılır.</p>
          <?php if (empty($categories)): ?>
          <p style="color:#9ca3af">Önce Kategoriler sayfasından kategori eklemeniz gerekiyor.</p>
          <?php else: ?>
          <?php foreach ($categories as $cat): $slug=$cat['slug']; ?>
          <div style="margin-bottom:12px;padding:12px;border:1px solid #e5e7eb;border-radius:8px;border-left:4px solid <?= e(ts("tab_renk_{$slug}_bg",'#e94560')) ?>">
            <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:8px"><?= e($cat['name']) ?> <span style="font-size:11px;color:#9ca3af;font-weight:400">/ <?= e($slug) ?></span></div>
            <div class="tab-renk-grid">
              <?php foreach (['bg'=>'Arkaplan','yazi'=>'Yazı Rengi','hover'=>'Hover Rengi'] as $tip=>$lbl): ?>
              <div class="tab-renk-grup">
                <label><?= $lbl ?></label>
                <?php $kval = ts("tab_renk_{$slug}_{$tip}", ''); ?>
                <div class="color-row">
                  <input type="color" value="<?= e($kval ?: '#e94560') ?>"
                    oninput="document.getElementById('tr_<?= e($slug) ?>_<?= $tip ?>').value=this.value">
                  <input type="text" name="tab_renk_<?= e($slug) ?>_<?= $tip ?>"
                    id="tr_<?= e($slug) ?>_<?= $tip ?>" value="<?= e($kval) ?>" placeholder="#e94560"
                    oninput="if(/^#[0-9a-fA-F]{6}$/.test(this.value))this.previousElementSibling.value=this.value"
                    style="flex:1">
                </div>
              </div>
              <?php endforeach; ?>
            </div>
          </div>
          <?php endforeach; ?>
          <?php endif; ?>
        </div>
      </div>
    </div>

    <!-- ═══ FOOTER ═══ -->
    <div class="ta-section" data-section="footer">
      <div class="panel">
        <div class="ph">📄 Footer Ayarları</div>
        <div class="pb">
          <table class="form-table">
            <tr>
              <th>Footer Açıklama</th>
              <td>
                <textarea name="footer_aciklama" placeholder="Sitenizin kısa açıklaması..."><?= e(ts('footer_aciklama')) ?></textarea>
                <small>Footer sol kısımda görünen açıklama metni.</small>
              </td>
            </tr>
            <tr>
              <th>Telif Hakkı Metni</th>
              <td>
                <input type="text" name="footer_telif" value="<?= e(ts('footer_telif', '© 2025 ' . DB::setting('site_name','AhenkPress') . '. Tüm hakları saklıdır.')) ?>">
                <small>Footer alt satırında gösterilen telif hakkı metni.</small>
              </td>
            </tr>
          </table>
        </div>
      </div>
    </div>

    <!-- ═══ İLETİŞİM & SOSYAL MEDYA ═══ -->
    <div class="ta-section" data-section="sosyal">
      <div class="panel">
        <div class="ph">📍 İletişim Bilgileri</div>
        <div class="pb">
          <table class="form-table">
            <tr><th>Adres</th><td><input type="text" name="iletisim_adres" value="<?= e(ts('iletisim_adres')) ?>" placeholder="Örn: Kızılay Cad. No:1 Çankaya/Ankara"><small>Footer'da ve iletişim sayfasında görünür.</small></td></tr>
            <tr><th>Telefon</th><td><input type="tel" name="iletisim_telefon" value="<?= e(ts('iletisim_telefon')) ?>" placeholder="+90 312 000 00 00"></td></tr>
            <tr><th>E-posta</th><td><input type="email" name="iletisim_email" value="<?= e(ts('iletisim_email')) ?>" placeholder="info@siteadi.com"></td></tr>
            <tr><th>WhatsApp Numarası</th><td><input type="tel" name="sosyal_whatsapp" value="<?= e(ts('sosyal_whatsapp')) ?>" placeholder="+905001234567"><small>+90 ile başlayan format. wa.me/ linkleri için.</small></td></tr>
          </table>
        </div>
      </div>

      <div class="panel">
        <div class="ph">📱 Sosyal Medya Bağlantıları</div>
        <div class="pb">
          <table class="form-table">
            <?php $sosyaller = [
              'sosyal_facebook'  => ['Facebook',  'https://facebook.com/sayfaadi'],
              'sosyal_twitter'   => ['Twitter/X', 'https://x.com/kullaniciadi'],
              'sosyal_instagram' => ['Instagram', 'https://instagram.com/kullaniciadi'],
              'sosyal_youtube'   => ['YouTube',   'https://youtube.com/@kanaladi'],
              'sosyal_telegram'  => ['Telegram',  'https://t.me/kanaladi'],
            ]; foreach ($sosyaller as $k => [$label, $ph]): ?>
            <tr>
              <th><?= e($label) ?></th>
              <td><input type="url" name="<?= e($k) ?>" value="<?= e(ts($k)) ?>" placeholder="<?= e($ph) ?>"></td>
            </tr>
            <?php endforeach; ?>
          </table>
        </div>
      </div>
    </div>

    <!-- ═══ GÖRSELLER ═══ -->
    <div class="ta-section" data-section="gorsel">
      <div class="panel">
        <div class="ph">🖼 Görsel Ayarları</div>
        <div class="pb">
          <table class="form-table">
            <tr>
              <th>Varsayılan / Placeholder Görsel</th>
              <td>
                <input type="url" name="placeholder_resim" value="<?= e(ts('placeholder_resim')) ?>" placeholder="https://siteadi.com/placeholder.jpg" id="placeholderInput">
                <small>Resmi olmayan içeriklerde gösterilecek varsayılan görsel URL'si.</small>
                <?php if (ts('placeholder_resim')): ?>
                <img src="<?= e(ts('placeholder_resim')) ?>" class="gorsel-preview" id="placeholderPreview" alt="Önizleme">
                <?php else: ?>
                <img src="" class="gorsel-preview" id="placeholderPreview" alt="" style="display:none">
                <?php endif; ?>
              </td>
            </tr>
          </table>
        </div>
      </div>

      <div class="panel">
        <div class="ph">🎨 Dinamik CSS Çıktısı <span class="sticker">Otomatik</span></div>
        <div class="pb">
          <p style="font-size:13px;color:#6b7280">Kaydettiğiniz renkler aşağıdaki CSS değişkenleri olarak tüm sayfaya uygulanır. Bu alan bilgilendirme amaçlıdır.</p>
          <div class="css-preview-box">:root {
  --ap-ana: <?= e(ts('ana_renk','#CC0000')) ?>;
  --ap-ikincil: <?= e(ts('ikincil_renk','#1a1a2e')) ?>;
  --ap-navbar: <?= e(ts('navbar_renk','#1a1a2e')) ?>;
  --ap-navbar-yazi: <?= e(ts('navbar_yazi_renk','#ffffff')) ?>;
  --ap-ust-bar: <?= e(ts('ust_bar_renk','#e94560')) ?>;
  --ap-son-dakika: <?= e(ts('son_dakika_renk','#e94560')) ?>;
  --ap-finans: <?= e(ts('finans_renk','#1a3a2e')) ?>;
}</div>
        </div>
      </div>
    </div>

    <!-- KAYDET -->
    <div style="display:flex;align-items:center;gap:14px;margin-top:6px;padding:16px 0;border-top:1px solid #e5e7eb">
      <button type="submit" name="tema_ayar_kaydet" class="button button-primary ta-kaydet">💾 Tema Ayarlarını Kaydet</button>
      <span style="font-size:13px;color:#9ca3af">Değişiklikler anında siteye yansır.</span>
    </div>
  </form>
</div>

<script>
(function(){
  // Sekme geçişi
  document.querySelectorAll('.ta-tab').forEach(function(tab){
    tab.addEventListener('click', function(){
      document.querySelectorAll('.ta-tab').forEach(t=>t.classList.remove('active'));
      document.querySelectorAll('.ta-section').forEach(s=>s.classList.remove('active'));
      this.classList.add('active');
      var sec = this.dataset.tab;
      // aktif tab-renkler sectionu doğru id ile bul
      var el = document.querySelector('[data-section="'+sec+'"]');
      if(el) el.classList.add('active');
    });
  });

  // URL hash'e göre açık sekme
  var hash = location.hash.replace('#','');
  if(hash){
    var t = document.querySelector('.ta-tab[data-tab="'+hash+'"]');
    if(t) t.click();
  }

  // Slug ekle butonu
  document.querySelectorAll('.slug-ekle-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      var inp = document.querySelector('[name="navbar_kategori_sluglari"]');
      if(!inp) return;
      var cur = inp.value.trim();
      var slug = this.dataset.slug;
      if(cur.split(',').map(s=>s.trim()).includes(slug)) return;
      inp.value = cur ? cur + ',' + slug : slug;
      this.style.background='#dcfce7';this.style.color='#166534';
    });
  });

  // Placeholder önizleme
  var pInp = document.getElementById('placeholderInput');
  var pPrev = document.getElementById('placeholderPreview');
  if(pInp && pPrev){
    pInp.addEventListener('input', function(){
      if(this.value){pPrev.src=this.value;pPrev.style.display='block';}
      else pPrev.style.display='none';
    });
  }

  // CSS önizleme güncelle
  function updateCssPreview(){
    var map = {
      '--ap-ana':['ana_renk','#CC0000'],
      '--ap-ikincil':['ikincil_renk','#1a1a2e'],
      '--ap-navbar':['navbar_renk','#1a1a2e'],
      '--ap-navbar-yazi':['navbar_yazi_renk','#ffffff'],
      '--ap-ust-bar':['ust_bar_renk','#e94560'],
      '--ap-son-dakika':['son_dakika_renk','#e94560'],
      '--ap-finans':['finans_renk','#1a3a2e'],
    };
    var out=':root {\n';
    for(var varName in map){
      var fieldId=map[varName][0],def=map[varName][1];
      var el=document.getElementById(fieldId);
      var val=el?el.value:def;
      out+='  '+varName+': '+val+';\n';
    }
    out+='}';
    var box=document.getElementById('cssPreview');
    if(box) box.textContent=out;
  }
  document.querySelectorAll('[id^="ana_renk"],[id^="ikincil"],[id^="navbar_renk"],[id^="navbar_yazi"],[id^="ust_bar"],[id^="son_dakika"],[id^="finans"]').forEach(function(el){
    el.addEventListener('input',updateCssPreview);
  });
  updateCssPreview();
})();
</script>
<?php
});
