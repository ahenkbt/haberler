<?php
/**
 * Template Name: DSV Projeler
 * Template Post Type: page
 * Dünya Sağlık Vakfı — Projeler sayfası
 */
get_header();
vkv_breadcrumb();
$vkv_slug    = 'dsv-projeler';
$vkv_custom  = function_exists('vkv_get_custom_page_content') ? vkv_get_custom_page_content($vkv_slug) : '';
$vkv_content = get_the_content();
$vkv_has_wp  = !empty(trim(strip_tags($vkv_content)));
if ($vkv_custom) {
    echo '<div style="max-width:100%;width:100%;padding:0;margin:0">' . apply_filters('the_content', $vkv_custom) . '</div>';
} elseif ($vkv_has_wp) {
    echo '<article class="vkv-page-icerik">' . apply_filters('the_content', $vkv_content) . '</article>';
} else { ?>
<!-- ════ DSV PROJELER ════ -->
<section style="background:linear-gradient(135deg,#065f46,#059669);color:#fff;padding:70px 20px;text-align:center">
  <div style="max-width:860px;margin:0 auto">
    <div style="font-size:3.5rem;margin-bottom:12px">🌍</div>
    <h1 style="font-size:2.4rem;font-weight:900;margin:0 0 14px">Projelerimiz</h1>
    <p style="font-size:1.1rem;opacity:.88;max-width:640px;margin:0 auto">
      Toplumun her kesimine ulaşmak için hayata geçirdiğimiz kapsamlı sağlık projeleri.
    </p>
  </div>
</section>
<section style="max-width:1100px;margin:60px auto;padding:0 20px">
  <?php
  $projeler = array(
    array(
      'no'    => '01',
      'renk'  => '#059669',
      'icon'  => '🏘️',
      'baslik'=> 'Köy Sağlık Projeleri',
      'slug'  => 'koy-saglik',
      'ozet'  => 'Kırsal kesimlere sağlık ulaştırmak amacıyla seyyar klinikler, gezici muayene araçları ve köy sağlık elçileri programı.',
      'detaylar' => array('50+ köyde aktif', 'Gezici klinik', 'Köy sağlık elçisi'),
    ),
    array(
      'no'    => '02',
      'renk'  => '#0369a1',
      'icon'  => '🌐',
      'baslik'=> 'Uluslararası Projeler',
      'slug'  => 'uluslararasi',
      'ozet'  => 'Dünya genelinde sağlık krizlerine müdahale, acil tıbbi yardım ve uzun vadeli sağlık altyapısı kurma projeleri.',
      'detaylar' => array('15+ ülkede', 'Acil müdahale', 'Altyapı kurma'),
    ),
    array(
      'no'    => '03',
      'renk'  => '#7c3aed',
      'icon'  => '♻️',
      'baslik'=> 'Sürdürülebilir Sağlık',
      'slug'  => 'surdurulebilir',
      'ozet'  => 'Uzun vadeli toplum sağlığını desteklemek için önleyici sağlık hizmetleri, beslenme eğitimi ve hijyen programları.',
      'detaylar' => array('Önleyici sağlık', 'Beslenme eğitimi', 'Hijyen programı'),
    ),
  );
  foreach ($projeler as $prj):
    $url = get_permalink(get_page_by_path($prj['slug']));
  ?>
  <div style="display:flex;gap:28px;align-items:flex-start;margin-bottom:36px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:28px;box-shadow:0 2px 8px rgba(0,0,0,.04)">
    <div style="flex-shrink:0;width:72px;height:72px;border-radius:50%;background:<?php echo esc_attr($prj['renk']); ?>;display:flex;align-items:center;justify-content:center;font-size:2rem">
      <?php echo $prj['icon']; ?>
    </div>
    <div style="flex:1">
      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:<?php echo esc_attr($prj['renk']); ?>;margin-bottom:4px">Proje <?php echo $prj['no']; ?></div>
      <h3 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 10px"><?php echo esc_html($prj['baslik']); ?></h3>
      <p style="color:#4b5563;font-size:14px;line-height:1.7;margin:0 0 14px"><?php echo esc_html($prj['ozet']); ?></p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
        <?php foreach ($prj['detaylar'] as $d): ?>
        <span style="background:<?php echo esc_attr($prj['renk']); ?>1a;color:<?php echo esc_attr($prj['renk']); ?>;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px"><?php echo esc_html($d); ?></span>
        <?php endforeach; ?>
      </div>
      <?php if ($url): ?><a href="<?php echo esc_url($url); ?>" style="display:inline-block;padding:8px 20px;background:<?php echo esc_attr($prj['renk']); ?>;color:#fff;border-radius:6px;font-size:12.5px;font-weight:700;text-decoration:none">Proje Detayları →</a><?php endif; ?>
    </div>
  </div>
  <?php endforeach; ?>
</section>
<section style="background:#f0fdf4;padding:50px 20px;text-align:center">
  <div style="max-width:700px;margin:0 auto">
    <h2 style="font-size:1.7rem;font-weight:800;color:#059669;margin:0 0 12px">Bir Projeye Destek Olun</h2>
    <p style="color:#374151;font-size:14px;margin:0 0 20px;line-height:1.7">Bağışlarınız doğrudan proje bütçelerine aktarılır. Her katkı hayat kurtarır.</p>
    <a href="<?php echo esc_url(get_permalink(get_page_by_path('dsv-bagis'))); ?>"
       style="display:inline-block;padding:13px 34px;background:#059669;color:#fff;border-radius:8px;font-size:14px;font-weight:800;text-decoration:none">
      ❤️ Projeye Destek Ol
    </a>
  </div>
</section>
<?php } get_footer(); ?>
