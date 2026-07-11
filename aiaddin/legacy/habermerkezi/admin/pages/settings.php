<?php defined('ROOT') or die(); Auth::require('admin');

if ($_SERVER['REQUEST_METHOD'] === 'POST' && Security::verifyCsrf()) {
    $fields = [
        'site_name','site_desc','site_url','site_email','site_type',
        'active_theme','timezone','per_page','breaking_count',
        'footer_text','ga_code','head_code','footer_code',
        'social_facebook','social_twitter','social_instagram','social_youtube','social_telegram','social_whatsapp',
        'rss_enabled','rss_items',
        'smtp_host','smtp_port','smtp_user','smtp_from','smtp_name',
        'maintenance_mode','maintenance_msg',
        'logo_text1','logo_text2','logo_img',
    ];
    foreach ($fields as $f) {
        if (isset($_POST[$f])) DB::setSetting($f, Security::str($_POST[$f]));
    }
    if (!empty($_FILES['logo_file']['name'])) {
        $r = ap_upload_file($_FILES['logo_file'], 'logos');
        if (empty($r['error'])) DB::setSetting('logo_img', $r['path']);
    }
    ap_flash('Ayarlar kaydedildi.', 'success');
    ap_redirect('/admin?page=settings');
}

$s = function(string $k, string $def = ''): string { return (string)DB::setting($k, $def); };

ap_admin_layout('Site Ayarları', function() use ($s) { ?>
<div class="ap-page-header"><h1 class="ap-page-title">Site Ayarları</h1></div>
<form method="POST" enctype="multipart/form-data">
<?= Security::csrfField() ?>
<div class="ap-tabs-container">
  <div class="ap-tabs">
    <button type="button" class="ap-tab" data-tab="genel">Genel</button>
    <button type="button" class="ap-tab" data-tab="gorsel">Görsel</button>
    <button type="button" class="ap-tab" data-tab="sosyal">Sosyal Medya</button>
    <button type="button" class="ap-tab" data-tab="kod">Kod Ekleme</button>
    <button type="button" class="ap-tab" data-tab="smtp">E-posta</button>
  </div>

  <!-- GENEL -->
  <div class="ap-tab-content ap-card" data-tab="genel" style="padding:20px">
    <div class="ap-form-row">
      <div class="ap-form-group">
        <label class="ap-label">Site Adı</label>
        <input class="ap-input" type="text" name="site_name" value="<?= e($s('site_name','AhenkPress')) ?>">
      </div>
      <div class="ap-form-group">
        <label class="ap-label">Site Tipi</label>
        <select class="ap-select" name="site_type">
          <?php foreach (['news'=>'Haber Sitesi','blog'=>'Blog','ecommerce'=>'E-Ticaret','corporate'=>'Kurumsal'] as $v=>$l): ?>
          <option value="<?= $v ?>" <?= $s('site_type','news')===$v?'selected':'' ?>><?= $l ?></option>
          <?php endforeach; ?>
        </select>
      </div>
    </div>
    <div class="ap-form-group">
      <label class="ap-label">Site Açıklaması</label>
      <textarea class="ap-textarea" name="site_desc" rows="2"><?= e($s('site_desc')) ?></textarea>
    </div>
    <div class="ap-form-row">
      <div class="ap-form-group">
        <label class="ap-label">Site URL</label>
        <input class="ap-input" type="url" name="site_url" value="<?= e($s('site_url')) ?>" placeholder="https://site.com">
      </div>
      <div class="ap-form-group">
        <label class="ap-label">Admin E-posta</label>
        <input class="ap-input" type="email" name="site_email" value="<?= e($s('site_email')) ?>">
      </div>
    </div>
    <div class="ap-form-row">
      <div class="ap-form-group">
        <label class="ap-label">Saat Dilimi</label>
        <select class="ap-select" name="timezone">
          <option value="Europe/Istanbul" <?= $s('timezone','Europe/Istanbul')==='Europe/Istanbul'?'selected':'' ?>>Europe/Istanbul (UTC+3)</option>
          <option value="UTC" <?= $s('timezone')==='UTC'?'selected':'' ?>>UTC</option>
          <option value="Europe/London" <?= $s('timezone')==='Europe/London'?'selected':'' ?>>Europe/London</option>
        </select>
      </div>
      <div class="ap-form-group">
        <label class="ap-label">Sayfa başı içerik</label>
        <input class="ap-input" type="number" name="per_page" value="<?= e($s('per_page','15')) ?>" min="5" max="100">
      </div>
    </div>
    <div class="ap-form-group">
      <label class="ap-label">Footer Yazısı</label>
      <input class="ap-input" type="text" name="footer_text" value="<?= e($s('footer_text','© 2025 AhenkPress')) ?>">
    </div>
    <div class="ap-form-group">
      <label class="ap-toggle">
        <input type="hidden" name="maintenance_mode" value="0">
        <input type="checkbox" name="maintenance_mode" value="1" <?= $s('maintenance_mode')==='1'?'checked':'' ?>>
        <div class="ap-toggle-slider"></div>
        <span class="ap-toggle-label">Bakım Modu</span>
      </label>
    </div>
    <div class="ap-form-group">
      <label class="ap-label">Bakım Mesajı</label>
      <textarea class="ap-textarea" name="maintenance_msg" rows="2"><?= e($s('maintenance_msg','Sitemiz bakımdadır, kısa süre içinde geri döneceğiz.')) ?></textarea>
    </div>
  </div>

  <!-- GÖRSEL -->
  <div class="ap-tab-content ap-card" data-tab="gorsel" style="padding:20px">
    <div class="ap-form-row">
      <div class="ap-form-group">
        <label class="ap-label">Logo Metin 1</label>
        <input class="ap-input" type="text" name="logo_text1" value="<?= e($s('logo_text1','AHENK')) ?>">
      </div>
      <div class="ap-form-group">
        <label class="ap-label">Logo Metin 2 (kırmızı kısım)</label>
        <input class="ap-input" type="text" name="logo_text2" value="<?= e($s('logo_text2','HABER')) ?>">
      </div>
    </div>
    <div class="ap-form-group">
      <label class="ap-label">Logo Görseli Yükle</label>
      <input class="ap-input" type="file" name="logo_file" accept="image/*">
      <?php if ($s('logo_img')): ?><img src="<?= e(ap_thumb_url($s('logo_img'))) ?>" style="max-height:60px;margin-top:8px"><?php endif; ?>
    </div>
    <div class="ap-form-group">
      <label class="ap-label">Aktif Tema</label>
      <select class="ap-select" name="active_theme">
        <?php foreach (Theme::available() as $t): ?>
        <option value="<?= e($t['slug']) ?>" <?= $s('active_theme','ahenk-haber-premium')===$t['slug']?'selected':'' ?>><?= e($t['name'] ?? $t['slug']) ?></option>
        <?php endforeach; ?>
      </select>
    </div>
  </div>

  <!-- SOSYAL MEDYA -->
  <div class="ap-tab-content ap-card" data-tab="sosyal" style="padding:20px">
    <?php foreach (['social_facebook'=>'Facebook','social_twitter'=>'Twitter/X','social_instagram'=>'Instagram','social_youtube'=>'YouTube','social_telegram'=>'Telegram','social_whatsapp'=>'WhatsApp'] as $k=>$l): ?>
    <div class="ap-form-group">
      <label class="ap-label"><?= $l ?></label>
      <input class="ap-input" type="url" name="<?= $k ?>" value="<?= e($s($k)) ?>" placeholder="https://...">
    </div>
    <?php endforeach; ?>
  </div>

  <!-- KOD EKLEME -->
  <div class="ap-tab-content ap-card" data-tab="kod" style="padding:20px">
    <div class="ap-form-group">
      <label class="ap-label">Google Analytics Kodu (sadece GA-XXXXXXX-X ID)</label>
      <input class="ap-input" type="text" name="ga_code" value="<?= e($s('ga_code')) ?>" placeholder="G-XXXXXXXXXX">
    </div>
    <div class="ap-form-group">
      <label class="ap-label">Head'e eklenecek kod &lt;/head&gt; öncesi</label>
      <textarea class="ap-textarea" name="head_code" rows="4" style="font-family:monospace"><?= e($s('head_code')) ?></textarea>
    </div>
    <div class="ap-form-group">
      <label class="ap-label">Footer'a eklenecek kod &lt;/body&gt; öncesi</label>
      <textarea class="ap-textarea" name="footer_code" rows="4" style="font-family:monospace"><?= e($s('footer_code')) ?></textarea>
    </div>
  </div>

  <!-- SMTP -->
  <div class="ap-tab-content ap-card" data-tab="smtp" style="padding:20px">
    <div class="ap-form-row">
      <div class="ap-form-group">
        <label class="ap-label">SMTP Host</label>
        <input class="ap-input" type="text" name="smtp_host" value="<?= e($s('smtp_host')) ?>" placeholder="smtp.gmail.com">
      </div>
      <div class="ap-form-group">
        <label class="ap-label">SMTP Port</label>
        <input class="ap-input" type="number" name="smtp_port" value="<?= e($s('smtp_port','587')) ?>">
      </div>
    </div>
    <div class="ap-form-row">
      <div class="ap-form-group">
        <label class="ap-label">SMTP Kullanıcı</label>
        <input class="ap-input" type="text" name="smtp_user" value="<?= e($s('smtp_user')) ?>">
      </div>
      <div class="ap-form-group">
        <label class="ap-label">Gönderen E-posta</label>
        <input class="ap-input" type="email" name="smtp_from" value="<?= e($s('smtp_from')) ?>">
      </div>
    </div>
    <div class="ap-form-group">
      <label class="ap-label">Gönderen Adı</label>
      <input class="ap-input" type="text" name="smtp_name" value="<?= e($s('smtp_name','AhenkPress')) ?>">
    </div>
  </div>
</div>

<div style="margin-top:16px;display:flex;justify-content:flex-end">
  <button type="submit" class="ap-btn ap-btn-primary ap-btn-lg">Ayarları Kaydet</button>
</div>
</form>
<?php });
