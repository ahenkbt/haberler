<?php
/**
 * Template Name: DSV Burs
 * Template Post Type: page
 * Dünya Sağlık Vakfı — Burs & Eğitim sayfası
 */
get_header();
vkv_breadcrumb();
$vkv_slug    = 'dsv-burs';
$vkv_custom  = function_exists('vkv_get_custom_page_content') ? vkv_get_custom_page_content($vkv_slug) : '';
$vkv_content = get_the_content();
$vkv_has_wp  = !empty(trim(strip_tags($vkv_content)));
if ($vkv_custom) {
    echo '<div style="max-width:100%;width:100%;padding:0;margin:0">' . apply_filters('the_content', $vkv_custom) . '</div>';
} elseif ($vkv_has_wp) {
    echo '<article class="vkv-page-icerik">' . apply_filters('the_content', $vkv_content) . '</article>';
} else { ?>
<!-- ════ DSV BURS & EĞİTİM ════ -->
<section style="background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;padding:70px 20px;text-align:center">
  <div style="max-width:860px;margin:0 auto">
    <div style="font-size:3.5rem;margin-bottom:12px">🎓</div>
    <h1 style="font-size:2.4rem;font-weight:900;margin:0 0 14px">Burs & Eğitim Programları</h1>
    <p style="font-size:1.1rem;opacity:.88;max-width:640px;margin:0 auto">
      Geleceğin sağlık profesyonellerini yetiştirmek için burs ve eğitim desteği sağlıyoruz.
    </p>
  </div>
</section>
<section style="max-width:1100px;margin:60px auto;padding:0 20px">
  <!-- İstatistikler -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-bottom:50px">
    <?php $stats = array(array('n'=>'500+','l'=>'Burslu Öğrenci'),array('n'=>'12','l'=>'Yıl Deneyim'),array('n'=>'%95','l'=>'İstihdam Oranı'),array('n'=>'28','l'=>'Üniversite Partneri')); ?>
    <?php foreach ($stats as $st): ?>
    <div style="background:#f5f3ff;border:1px solid #e9d5ff;border-radius:10px;padding:20px;text-align:center">
      <div style="font-size:2rem;font-weight:900;color:#7c3aed"><?php echo esc_html($st['n']); ?></div>
      <div style="font-size:11.5px;color:#6d28d9;font-weight:700;text-transform:uppercase;letter-spacing:.5px"><?php echo esc_html($st['l']); ?></div>
    </div>
    <?php endforeach; ?>
  </div>
  <!-- Programlar -->
  <h2 style="font-size:1.6rem;font-weight:800;color:#0f172a;margin:0 0 24px;text-align:center">Eğitim Programları</h2>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px">
    <?php
    $programs = array(
      array('icon'=>'🩺','baslik'=>'Tıp Bursları','slug'=>'tip-burslari','renk'=>'#7c3aed',
            'aciklama'=>'Tıp fakültesi öğrencilerine yönelik kapsamlı burs programı. Eğitim, barınma ve yaşam desteği sağlanır.'),
      array('icon'=>'🏫','baslik'=>'Sağlık Akademisi','slug'=>'saglik-akademisi','renk'=>'#0369a1',
            'aciklama'=>'Sağlık alanında teorik ve pratik eğitim sunan akademimizde sertifika programları düzenlenmektedir.'),
      array('icon'=>'👩‍⚕️','baslik'=>'Hemşire & Ebe Eğitimi','slug'=>'hemsire-ebe','renk'=>'#059669',
            'aciklama'=>'Hemşirelik ve ebelik alanlarında ileri düzey mesleki gelişim programları ve burs imkânları.'),
    );
    foreach ($programs as $prg):
      $url = get_permalink(get_page_by_path($prg['slug']));
    ?>
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:26px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.04)">
      <div style="font-size:2.8rem;margin-bottom:12px"><?php echo $prg['icon']; ?></div>
      <h3 style="font-size:16px;font-weight:800;color:<?php echo esc_attr($prg['renk']); ?>;margin:0 0 10px"><?php echo esc_html($prg['baslik']); ?></h3>
      <p style="font-size:13px;color:#4b5563;margin:0 0 16px;line-height:1.6"><?php echo esc_html($prg['aciklama']); ?></p>
      <?php if ($url): ?><a href="<?php echo esc_url($url); ?>" style="display:inline-block;padding:7px 18px;background:<?php echo esc_attr($prg['renk']); ?>;color:#fff;border-radius:6px;font-size:12px;font-weight:700;text-decoration:none">Başvur →</a><?php endif; ?>
    </div>
    <?php endforeach; ?>
  </div>
</section>
<!-- Başvuru -->
<section style="background:#f5f3ff;padding:60px 20px;text-align:center">
  <div style="max-width:700px;margin:0 auto">
    <h2 style="font-size:1.7rem;font-weight:800;color:#7c3aed;margin:0 0 12px">Burs Başvurusu</h2>
    <p style="color:#374151;font-size:14px;margin:0 0 8px;line-height:1.7">
      Başvurular her yıl Eylül–Ekim ayları arasında alınmaktadır. Detaylı bilgi ve başvuru formu için iletişime geçin.
    </p>
    <p style="color:#6d28d9;font-size:13px;margin:0 0 22px">Gerekli belgeler: Transkript · Gelir belgesi · Motivasyon mektubu · Referans mektubu</p>
    <a href="<?php echo esc_url(get_permalink(get_page_by_path('dsv-iletisim'))); ?>"
       style="display:inline-block;padding:13px 34px;background:#7c3aed;color:#fff;border-radius:8px;font-size:14px;font-weight:800;text-decoration:none">
      📋 Başvuru Bilgileri
    </a>
  </div>
</section>
<?php } get_footer(); ?>
