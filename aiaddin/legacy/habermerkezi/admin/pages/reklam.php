<?php
/**
 * AhenkPress — Reklam Alanları Yönetimi (10 slot, orijinal ad-manager.php birebir)
 */
defined('ROOT') or die();

/* ── 10 Reklam Slotu Tanımı ─────────────────────── */
$slots = [
    'reklam_skyscraper_sol'   => ['Skyscraper Sol',      '160×600 piksel, anasayfa sol kenar dikey banner'],
    'reklam_skyscraper_sag'   => ['Skyscraper Sağ',      '160×600 piksel, anasayfa sağ kenar dikey banner'],
    'reklam_baslik_alti'      => ['Başlık Altı Yatay',   '728×90 piksel, üst menü altı geniş yatay banner (leaderboard)'],
    'reklam_manset_alti'      => ['Manşet Altı',          'Manşet bloğu hemen altı, tam genişlik reklam alanı'],
    'reklam_bolumler_arasi'   => ['Bölümler Arası',       'Anasayfa bölümleri arasında gösterilen yatay reklam'],
    'reklam_sidebar_ust'      => ['Sidebar Üst',          '300×250 piksel, sağ sidebar üst kısmı (medium rectangle)'],
    'reklam_sidebar_alt'      => ['Sidebar Alt',          '300×250 piksel, sağ sidebar alt kısmı (medium rectangle)'],
    'reklam_footer_ustu'      => ['Footer Üstü',          'Sayfa sonu, footer öncesi tam genişlik reklam alanı'],
    'reklam_haber_ici_ust'    => ['Haber İçi Üst',        'Haber detay başlık altı, içerik öncesi reklam alanı'],
    'reklam_haber_ici_alt'    => ['Haber İçi Alt',        'Haber detay içerik sonu reklam alanı'],
];

/* ── Kaydet ─────────────────────────────────────── */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['reklam_kaydet'])) {
    Security::verifyCsrf();
    foreach (array_keys($slots) as $key) {
        $val = trim($_POST[$key] ?? '');
        DB::execute(
            "INSERT INTO `{p}settings`(`key`,`val`) VALUES(?,?) ON DUPLICATE KEY UPDATE `val`=?",
            [$key, $val, $val]
        );
    }
    ap_flash('Reklam kodları kaydedildi.', 'success');
    ap_redirect('/admin/?page=reklam');
}

ap_admin_layout('Reklam Alanları', function() use ($slots) {
?>
<style>
.rek-wrap{max-width:960px}
.rek-hd{background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;padding:22px 26px;border-radius:12px;margin-bottom:20px}
.rek-hd h1{margin:0;font-size:20px;font-weight:700}
.rek-hd p{margin:6px 0 0;font-size:13px;color:#9ca3af}
.rek-grid{display:grid;gap:14px}
.rek-slot{background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden}
.rek-slot-hd{display:flex;align-items:center;gap:12px;padding:14px 18px;background:#f9fafb;border-bottom:1px solid #e5e7eb}
.rek-slot-no{width:28px;height:28px;background:#e94560;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;flex-shrink:0}
.rek-slot-isim{font-size:15px;font-weight:700;color:#1a1a2e}
.rek-slot-acik{font-size:12px;color:#9ca3af;margin-top:1px}
.rek-slot-durum{margin-left:auto}
.rek-durum-aktif{background:#dcfce7;color:#166534;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700}
.rek-durum-bos{background:#f3f4f6;color:#9ca3af;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700}
.rek-slot-body{padding:16px 18px}
.rek-slot-body label{display:block;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px}
.rek-slot-body textarea{width:100%;height:110px;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-family:Consolas,Monaco,monospace;font-size:12px;resize:vertical;color:#374151;line-height:1.5;background:#fafafa}
.rek-slot-body textarea:focus{border-color:#e94560;outline:none;box-shadow:0 0 0 2px rgba(233,69,96,.08)}
.rek-slot-hint{display:flex;align-items:center;gap:6px;margin-top:6px;font-size:11px;color:#9ca3af}
.rek-bilgi{background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin-bottom:18px;font-size:13px;color:#854d0e}
.rek-bilgi strong{display:block;margin-bottom:3px}
.rek-kaydet{background:#e94560;border-color:#e94560;color:#fff;font-weight:700;font-size:15px;padding:12px 32px}
.rek-kaydet:hover{background:#c73652;border-color:#c73652;color:#fff}
.rek-footer{display:flex;align-items:center;gap:14px;margin-top:4px}
</style>

<div class="rek-wrap">
  <div class="rek-hd">
    <h1>📢 Reklam Alanları</h1>
    <p>Aşağıdaki alanlara HTML, JavaScript veya AdSense kodunuzu yapıştırın. Boş bırakılan alanlar sitede gösterilmez.</p>
  </div>

  <div class="rek-bilgi">
    <strong>💡 Nasıl Kullanılır?</strong>
    Google AdSense kodu, kendi reklam HTML/JS kodunuz veya banner resim kodunuzu ilgili alana yapıştırın.
    <code>&lt;ins class="adsbygoogle"...&gt;</code> gibi AdSense kodları doğrudan yapıştırılabilir.
    Boş bırakılan alanlar sitede hiç görünmez, sayfa görünümünü bozmaz.
  </div>

  <form method="POST">
    <?= Security::csrfField() ?>
    <div class="rek-grid">
    <?php $i = 1; foreach ($slots as $key => [$isim, $aciklama]):
      $mevcut = DB::setting($key, '');
      $aktif  = trim($mevcut) !== '';
    ?>
      <div class="rek-slot">
        <div class="rek-slot-hd">
          <div class="rek-slot-no"><?= $i ?></div>
          <div>
            <div class="rek-slot-isim"><?= e($isim) ?></div>
            <div class="rek-slot-acik"><?= e($aciklama) ?></div>
          </div>
          <div class="rek-slot-durum">
            <?php if ($aktif): ?>
              <span class="rek-durum-aktif">✅ Aktif</span>
            <?php else: ?>
              <span class="rek-durum-bos">○ Boş</span>
            <?php endif; ?>
          </div>
        </div>
        <div class="rek-slot-body">
          <label>Reklam Kodu <span style="font-weight:400;text-transform:none">(HTML/JS/AdSense)</span></label>
          <textarea name="<?= e($key) ?>" id="<?= e($key) ?>" placeholder="<!-- Reklam kodunuzu buraya yapıştırın -->"><?= e($mevcut) ?></textarea>
          <div class="rek-slot-hint">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Boş bırakılırsa bu alan sitede gösterilmez.
          </div>
        </div>
      </div>
    <?php $i++; endforeach; ?>
    </div>

    <div class="rek-footer">
      <button type="submit" name="reklam_kaydet" class="button button-primary rek-kaydet">💾 Reklam Kodlarını Kaydet</button>
      <span style="font-size:13px;color:#9ca3af">Tüm değişiklikler anında siteye yansır.</span>
    </div>
  </form>
</div>

<script>
// Textarea değişince durum rozeti güncelle
document.querySelectorAll('.rek-slot-body textarea').forEach(function(ta){
  ta.addEventListener('input', function(){
    var slot = this.closest('.rek-slot');
    var durum = slot.querySelector('.rek-slot-durum');
    var dolu = this.value.trim() !== '';
    durum.innerHTML = dolu
      ? '<span class="rek-durum-aktif">✅ Aktif</span>'
      : '<span class="rek-durum-bos">○ Boş</span>';
  });
});
</script>
<?php
});
