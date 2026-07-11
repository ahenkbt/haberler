<?php get_header(); ?>
<?php
/**
 * Referanslar Sayfası
 * Vakıfla çalışmış kurumlar, destekçiler ve iş ortakları.
 */
$referanslar = get_posts(array(
    'post_type'      => 'referans',
    'post_status'    => 'publish',
    'numberposts'    => -1,
    'orderby'        => 'menu_order',
    'order'          => 'ASC',
));
?>
<style>
.vkv-ref-wrap{max-width:1440px;margin:0 auto;padding:32px 20px}
.vkv-ref-hero{text-align:center;padding:48px 20px 32px;border-bottom:1px solid var(--sin);margin-bottom:32px}
.vkv-ref-hero h1{font-family:var(--fh);font-size:2rem;font-weight:800;color:var(--dk);margin-bottom:10px}
.vkv-ref-hero p{font-size:14px;color:var(--yz2);max-width:600px;margin:0 auto}
.vkv-ref-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}
@media(max-width:900px){.vkv-ref-grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:600px){.vkv-ref-grid{grid-template-columns:repeat(2,1fr)}}
.vkv-ref-kart{background:#fff;border:1px solid var(--sin);border-radius:6px;padding:24px 16px;text-align:center;transition:all .2s;display:flex;flex-direction:column;align-items:center}
.vkv-ref-kart:hover{box-shadow:0 6px 20px rgba(0,0,0,.08);border-color:var(--cr3);transform:translateY(-2px)}
.vkv-ref-kart-logo{width:96px;height:64px;object-fit:contain;margin-bottom:12px;filter:grayscale(30%);transition:filter .2s}
.vkv-ref-kart:hover .vkv-ref-kart-logo{filter:grayscale(0%)}
.vkv-ref-kart-logo-placeholder{width:96px;height:64px;display:flex;align-items:center;justify-content:center;background:var(--bg);border-radius:4px;margin-bottom:12px;font-size:2rem}
.vkv-ref-kart-ad{font-family:var(--fh);font-size:13px;font-weight:700;color:var(--dk);margin-bottom:4px}
.vkv-ref-kart-acik{font-size:11px;color:var(--yz3);line-height:1.5}
/* Sayaçlar */
.vkv-ref-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border:1px solid var(--sin);border-radius:6px;overflow:hidden;margin-bottom:32px}
.vkv-ref-stat{text-align:center;padding:24px;border-right:1px solid var(--sin)}
.vkv-ref-stat:last-child{border-right:none}
.vkv-ref-stat .n{font-family:var(--fh);font-size:2.2rem;font-weight:800;color:var(--cr)}
.vkv-ref-stat .l{font-size:11px;color:var(--yz3);text-transform:uppercase;letter-spacing:1px;margin-top:4px}
@media(max-width:700px){.vkv-ref-stats{grid-template-columns:repeat(2,1fr)}.vkv-ref-stat:nth-child(2){border-right:none}.vkv-ref-stat:nth-child(3){border-top:1px solid var(--sin)}}
</style>
<div class="vkv-ref-wrap">
  <!-- HERO -->
  <div class="vkv-ref-hero">
    <h1>🏆 Referanslarımız</h1>
    <p>Birlikte çalıştığımız kurumlar, iş ortakları ve destekçilerimiz</p>
  </div>
  <!-- İSTATİSTİKLER -->
  <div class="vkv-ref-stats">
    <div class="vkv-ref-stat"><div class="n"><?php echo count($referanslar); ?>+</div><div class="l">Referans</div></div>
    <div class="vkv-ref-stat"><div class="n"><?php echo get_option('vkv_ref_yil','25'); ?>+</div><div class="l">Yıllık Deneyim</div></div>
    <div class="vkv-ref-stat"><div class="n"><?php echo get_option('vkv_ref_proje','300'); ?>+</div><div class="l">Proje</div></div>
    <div class="vkv-ref-stat"><div class="n"><?php echo get_option('vkv_ref_sehir','81'); ?></div><div class="l">İlde Faaliyet</div></div>
  </div>
  <!-- REFERANS IZGARASI -->
  <?php if (!empty($referanslar)): ?>
  <div class="vkv-ref-grid">
    <?php foreach ($referanslar as $p):
      $web = get_post_meta($p->ID, 'referans_website', true);
    ?>
    <div class="vkv-ref-kart">
      <?php if (has_post_thumbnail($p->ID)): ?>
        <img src="<?php echo esc_url(get_the_post_thumbnail_url($p->ID,'medium')); ?>"
             alt="<?php echo esc_attr($p->post_title); ?>" class="vkv-ref-kart-logo">
      <?php else: ?>
        <div class="vkv-ref-kart-logo-placeholder">🏛️</div>
      <?php endif; ?>
      <div class="vkv-ref-kart-ad"><?php echo esc_html($p->post_title); ?></div>
      <?php if ($p->post_excerpt): ?>
      <div class="vkv-ref-kart-acik"><?php echo esc_html(wp_trim_words($p->post_excerpt, 10, '...')); ?></div>
      <?php endif; ?>
      <?php if ($web): ?>
      <div style="margin-top:10px"><a href="<?php echo esc_url($web); ?>" target="_blank" rel="noopener"
           style="font-size:11px;color:var(--cr);text-decoration:none;font-weight:700">🌐 Web Sitesi</a></div>
      <?php endif; ?>
    </div>
    <?php endforeach; ?>
  </div>
  <?php else: ?>
  <div style="text-align:center;padding:60px;color:var(--yz3)">
    <div style="font-size:3rem;margin-bottom:12px">🏆</div>
    <p>Henüz referans eklenmemiş. Yönetim panelinden ekleyebilirsiniz.</p>
  </div>
  <?php endif; ?>
</div>
<?php get_footer(); ?>
