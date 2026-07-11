<?php
/**
 * AhenkPress Admin — Tema Hızlı Kurulum Sihirbazı
 * Tek tıkla demo içerik oluşturma, menü kurulumu, temel ayarlar
 */
defined('ROOT') or die();

$activeTheme = ap_active_theme();
$themeName   = $activeTheme['name'] ?? 'Bilinmiyor';
$step        = (int)($_GET['step'] ?? 1);

// ─── Adım işlemleri
$stepResult = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    Security::verifyCsrf();

    // Adım 1: Temel ayarlar
    if (isset($_POST['step1'])) {
        $fields = ['site_name','site_desc','logo_text1','logo_text2','theme_renk_ana','ga_code'];
        foreach ($fields as $f) {
            if (isset($_POST[$f])) {
                $v = trim($_POST[$f]);
                DB::query("INSERT INTO `{p}settings` (`key`,`val`) VALUES (?,?) ON DUPLICATE KEY UPDATE `val`=?", [$f,$v,$v]);
            }
        }
        $stepResult = 'success';
        header('Location: /admin?page=tema-kur&step=2&ok=1'); exit;
    }

    // Adım 2: Demo kategoriler oluştur
    if (isset($_POST['step2'])) {
        $demoCats = [
            ['Gündem','gundem','#CC0000'],['Ekonomi','ekonomi','#F59E0B'],['Dünya','dunya','#3B82F6'],
            ['Spor','spor','#10B981'],['Magazin','magazin','#8B5CF6'],['Teknoloji','teknoloji','#06B6D4'],
            ['Sağlık','saglik','#EC4899'],['Eğitim','egitim','#F97316'],
        ];
        $added = 0;
        foreach ($demoCats as $i => [$name, $slug, $color]) {
            try {
                DB::query("INSERT IGNORE INTO `{p}categories` (name,slug,color,active,sort_order,created_at) VALUES (?,?,?,1,?,NOW())",
                    [$name,$slug,$color,$i+1]);
                $added++;
            } catch (\Throwable) {}
        }
        $cats = implode(',', array_column($demoCats, 1));
        DB::query("INSERT INTO `{p}settings` (`key`,`val`) VALUES (?,?) ON DUPLICATE KEY UPDATE `val`=?",
            ['theme_ana_kategoriler', $cats, $cats]);
        header('Location: /admin?page=tema-kur&step=3&ok='.$added); exit;
    }

    // Adım 3: Ana menü oluştur
    if (isset($_POST['step3'])) {
        $cats = DB::query("SELECT * FROM `{p}categories` WHERE active=1 ORDER BY sort_order LIMIT 8");
        $menuItems = [['label'=>'Ana Sayfa','url'=>'/','type'=>'url']];
        foreach ($cats as $c) {
            $menuItems[] = ['label'=>$c['name'],'url'=>'/'.$c['slug'],'type'=>'category'];
        }
        $menuItems[] = ['label'=>'Yazarlar','url'=>'/yazarlar','type'=>'url'];
        try {
            $menuJson = json_encode($menuItems, JSON_UNESCAPED_UNICODE);
            DB::query("INSERT INTO `{p}menus` (title,slug,location,items,created_at) VALUES ('Ana Menü','ana-menu','main-nav',?,NOW())
                       ON DUPLICATE KEY UPDATE items=?", [$menuJson,$menuJson]);
        } catch (\Throwable) {}
        header('Location: /admin?page=tema-kur&step=4&ok=1'); exit;
    }

    // Adım 4: Demo haber ekle
    if (isset($_POST['step4'])) {
        $demoHaberler = [
            ['title'=>'AhenkPress v5 ile Güçlü Haber Sitesi Kurun','slug'=>'ahenkpress-v5-haber-sitesi','cat'=>'teknoloji','excerpt'=>'AhenkPress v5 yeni temalar, AI içerik robotu ve gelişmiş yönetim paneli ile kapsamlı bir haber CMS deneyimi sunuyor.'],
            ['title'=>'Ekonomik Beklentiler ve Piyasa Görünümü','slug'=>'ekonomik-beklentiler-piyasa','cat'=>'ekonomi','excerpt'=>'Uzmanlar 2025 yılının ikinci çeyreği için önemli öngörülerde bulunuyor.'],
            ['title'=>'Spor Dünyasından Son Haberler','slug'=>'spor-dunyasindan-son-haberler','cat'=>'spor','excerpt'=>'Bu haftaki en önemli spor gelişmeleri ve sonuçları sizlerle.'],
        ];
        $added = 0;
        $now = date('Y-m-d H:i:s');
        foreach ($demoHaberler as $h) {
            try {
                $catId = 0;
                $c = DB::queryRow("SELECT id FROM `{p}categories` WHERE slug=?", [$h['cat']]);
                if ($c) $catId = (int)$c['id'];
                DB::query("INSERT IGNORE INTO `{p}posts` (post_type,title,slug,content,excerpt,category_id,status,created_at,updated_at,published_at) VALUES ('news',?,?,?,?,?,'published',?,?,?)",
                    [$h['title'],$h['slug'],'<p>'.$h['excerpt'].'</p><p>Bu bir demo haberdir. Admin panelinden düzenleyebilir veya silebilirsiniz.</p>',$h['excerpt'],$catId,$now,$now,$now]);
                $added++;
            } catch (\Throwable) {}
        }
        header('Location: /admin?page=tema-kur&step=5&ok='.$added); exit;
    }
}

// Tema durumu kontrolü
$cats  = [];
$posts = 0;
$menus = 0;
try {
    $cats  = DB::query("SELECT * FROM `{p}categories` WHERE active=1 ORDER BY sort_order");
    $posts = (int)DB::queryValue("SELECT COUNT(*) FROM `{p}posts` WHERE status='published'");
    $menus = (int)DB::queryValue("SELECT COUNT(*) FROM `{p}menus`");
} catch (\Throwable) {}

ap_admin_layout('Hızlı Kurulum Sihirbazı', function() use ($step, $activeTheme, $themeName, $cats, $posts, $menus) { ?>

<div style="max-width:800px;margin:0 auto">

  <!-- Adım göstergesi -->
  <div style="display:flex;align-items:center;gap:0;margin-bottom:28px">
    <?php for ($i=1; $i<=5; $i++): ?>
    <div style="display:flex;align-items:center;flex:1">
      <div style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;flex-shrink:0;
           background:<?= $step >= $i ? '#CC0000' : 'var(--ap-surface-2)' ?>;
           color:<?= $step >= $i ? '#fff' : 'var(--ap-text-2)' ?>"><?= $i ?></div>
      <?php if ($i < 5): ?>
      <div style="flex:1;height:2px;background:<?= $step > $i ? '#CC0000' : 'var(--ap-border)' ?>"></div>
      <?php endif; ?>
    </div>
    <?php endfor; ?>
  </div>

  <?php if (!empty($_GET['ok'])): ?>
  <div style="background:#22c55e15;border:1px solid #22c55e40;color:#22c55e;padding:12px 16px;border-radius:8px;margin-bottom:16px;font-weight:600">
    ✅ Adım tamamlandı!
  </div>
  <?php endif; ?>

  <!-- ADIM 1: Temel Ayarlar -->
  <?php if ($step === 1): ?>
  <div class="ap-card">
    <div class="ap-card-header"><h2 class="ap-card-title">⚙ Adım 1: Site Bilgileri</h2></div>
    <form method="POST">
      <input type="hidden" name="_csrf" value="<?= e(Security::csrf()) ?>">
      <input type="hidden" name="step1" value="1">
      <div class="ap-form-row">
        <div class="ap-form-group" style="flex:1">
          <label class="ap-label">Site Adı</label>
          <input type="text" name="site_name" class="ap-input" required placeholder="Ankara Haber"
                 value="<?= e(DB::setting('site_name','')) ?>">
        </div>
        <div class="ap-form-group" style="flex:1">
          <label class="ap-label">Slogan / Açıklama</label>
          <input type="text" name="site_desc" class="ap-input" placeholder="Güvenilir Haber Kaynağı"
                 value="<?= e(DB::setting('site_desc','')) ?>">
        </div>
      </div>
      <div class="ap-form-row">
        <div class="ap-form-group" style="flex:1">
          <label class="ap-label">Logo Metin 1</label>
          <input type="text" name="logo_text1" class="ap-input" value="<?= e(DB::setting('logo_text1','ANKARA')) ?>">
        </div>
        <div class="ap-form-group" style="flex:1">
          <label class="ap-label">Logo Metin 2 (kırmızı)</label>
          <input type="text" name="logo_text2" class="ap-input" value="<?= e(DB::setting('logo_text2','HABER')) ?>">
        </div>
        <div class="ap-form-group" style="flex:1">
          <label class="ap-label">Ana Renk</label>
          <input type="color" name="theme_renk_ana" value="<?= e(DB::setting('theme_renk_ana','#CC0000')) ?>"
                 style="width:100%;height:40px;border:none;cursor:pointer;border-radius:8px;padding:2px">
        </div>
      </div>
      <div class="ap-form-group">
        <label class="ap-label">Google Analytics Kodu (opsiyonel)</label>
        <input type="text" name="ga_code" class="ap-input" placeholder="G-XXXXXXXXXX"
               value="<?= e(DB::setting('ga_code','')) ?>">
      </div>
      <button type="submit" class="ap-btn ap-btn-primary">Devam →</button>
    </form>
  </div>

  <!-- ADIM 2: Kategoriler -->
  <?php elseif ($step === 2): ?>
  <div class="ap-card">
    <div class="ap-card-header"><h2 class="ap-card-title">🏷 Adım 2: Kategoriler</h2></div>
    <?php if (!empty($cats)): ?>
    <div style="margin-bottom:14px;padding:12px;background:#22c55e10;border:1px solid #22c55e30;border-radius:8px;font-size:13px;color:#22c55e">
      ✅ <?= count($cats) ?> kategori zaten mevcut: <?= implode(', ', array_column($cats,'name')) ?>
    </div>
    <?php endif; ?>
    <p style="color:var(--ap-text-2);font-size:13px;margin-bottom:16px">8 temel haber kategorisi otomatik oluşturulacak: Gündem, Ekonomi, Dünya, Spor, Magazin, Teknoloji, Sağlık, Eğitim.</p>
    <form method="POST">
      <input type="hidden" name="_csrf" value="<?= e(Security::csrf()) ?>">
      <input type="hidden" name="step2" value="1">
      <button type="submit" class="ap-btn ap-btn-primary">Kategorileri Oluştur →</button>
      <a href="/admin?page=tema-kur&step=3" class="ap-btn" style="margin-left:8px">Atla →</a>
    </form>
  </div>

  <!-- ADIM 3: Menü -->
  <?php elseif ($step === 3): ?>
  <div class="ap-card">
    <div class="ap-card-header"><h2 class="ap-card-title">🧭 Adım 3: Ana Navigasyon Menüsü</h2></div>
    <?php if ($menus > 0): ?>
    <div style="margin-bottom:14px;padding:12px;background:#22c55e10;border:1px solid #22c55e30;border-radius:8px;font-size:13px;color:#22c55e">
      ✅ <?= $menus ?> menü zaten mevcut.
    </div>
    <?php endif; ?>
    <p style="color:var(--ap-text-2);font-size:13px;margin-bottom:16px">Kategorilere göre ana navigasyon menüsü otomatik oluşturulur.</p>
    <form method="POST">
      <input type="hidden" name="_csrf" value="<?= e(Security::csrf()) ?>">
      <input type="hidden" name="step3" value="1">
      <button type="submit" class="ap-btn ap-btn-primary">Menüyü Oluştur →</button>
      <a href="/admin?page=tema-kur&step=4" class="ap-btn" style="margin-left:8px">Atla →</a>
    </form>
  </div>

  <!-- ADIM 4: Demo İçerik -->
  <?php elseif ($step === 4): ?>
  <div class="ap-card">
    <div class="ap-card-header"><h2 class="ap-card-title">📰 Adım 4: Demo Haberler</h2></div>
    <?php if ($posts > 0): ?>
    <div style="margin-bottom:14px;padding:12px;background:#22c55e10;border:1px solid #22c55e30;border-radius:8px;font-size:13px;color:#22c55e">
      ✅ <?= $posts ?> yayınlanan içerik zaten mevcut.
    </div>
    <?php endif; ?>
    <p style="color:var(--ap-text-2);font-size:13px;margin-bottom:16px">3 adet demo haber oluşturulur. İstediğiniz zaman silebilirsiniz.</p>
    <form method="POST">
      <input type="hidden" name="_csrf" value="<?= e(Security::csrf()) ?>">
      <input type="hidden" name="step4" value="1">
      <button type="submit" class="ap-btn ap-btn-primary">Demo Haber Ekle →</button>
      <a href="/admin?page=tema-kur&step=5" class="ap-btn" style="margin-left:8px">Atla →</a>
    </form>
  </div>

  <!-- ADIM 5: Tamamlandı -->
  <?php elseif ($step === 5): ?>
  <div class="ap-card" style="text-align:center;padding:40px">
    <div style="font-size:64px;margin-bottom:16px">🎉</div>
    <h2 style="font-size:24px;font-weight:900;color:var(--ap-text);margin-bottom:8px">Kurulum Tamamlandı!</h2>
    <p style="color:var(--ap-text-2);font-size:14px;margin-bottom:24px"><?= e($themeName) ?> teması başarıyla yapılandırıldı.</p>
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
      <a href="/" target="_blank" class="ap-btn ap-btn-primary">🌐 Siteyi Gör →</a>
      <a href="/admin?page=news" class="ap-btn">📰 Haberleri Yönet</a>
      <a href="/admin?page=tema-ayarlar" class="ap-btn">🎨 Tema Ayarları</a>
      <a href="/admin?page=ai-icerik" class="ap-btn">🤖 AI Robot</a>
    </div>
    <div style="margin-top:24px;padding:16px;background:var(--ap-surface-2);border-radius:8px;font-size:12px;color:var(--ap-text-2);text-align:left">
      <strong>Sonraki Adımlar:</strong><br>
      1. <a href="/admin?page=tema-ayarlar">Tema Ayarları</a>'ndan logo, renk ve reklam kodlarını girin.<br>
      2. <a href="/admin?page=ai-icerik">AI Robot</a>'a OpenAI API anahtarı ekleyin.<br>
      3. <a href="/admin?page=ai-kampanyalar">RSS Kampanyaları</a> ile otomatik haber çekin.<br>
      4. <a href="/admin?page=columnists">Köşe Yazarları</a> ekleyin.<br>
      5. cPanel → Cron Jobs'ta otomatik çalışmayı ayarlayın.
    </div>
  </div>
  <?php endif; ?>

</div>
<?php });
