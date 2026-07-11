<?php
/**
 * Template Name: DSV Hizmetler
 * Template Post Type: page
 * Dünya Sağlık Vakfı — Sağlık Hizmetleri sayfası
 */
get_header();
vkv_breadcrumb();
$vkv_slug    = 'saglik-hizmetleri';
$vkv_custom  = function_exists('vkv_get_custom_page_content') ? vkv_get_custom_page_content($vkv_slug) : '';
$vkv_content = get_the_content();
$vkv_has_up  = !empty(trim($vkv_content));
$vkv_has_wp  = !empty(trim(strip_tags($vkv_content)));
if ($vkv_custom) {
    echo '<div style="max-width:100%;width:100%;padding:0;margin:0">';
    echo apply_filters('the_content', $vkv_custom);
    echo '</div>';
} elseif ($vkv_has_wp) {
    echo '<article class="vkv-page-icerik">' . apply_filters('the_content', $vkv_content) . '</article>';
} else { ?>
<!-- ════ DSV SAĞLIK HİZMETLERİ ════ -->
<section class="dsv-hero dsv-saglik-hero" style="background:linear-gradient(135deg,#0369a1,#0ea5e9);color:#fff;padding:70px 20px;text-align:center">
  <div style="max-width:860px;margin:0 auto">
    <div style="font-size:3.5rem;margin-bottom:12px">🏥</div>
    <h1 style="font-size:2.4rem;font-weight:900;margin:0 0 14px;letter-spacing:-1px">Sağlık Hizmetlerimiz</h1>
    <p style="font-size:1.1rem;opacity:.88;max-width:640px;margin:0 auto">
      Dünya Sağlık Vakfı olarak tüm vatandaşlarımıza ücretsiz ve nitelikli sağlık hizmetleri sunuyoruz.
    </p>
  </div>
</section>
<section style="max-width:1100px;margin:60px auto;padding:0 20px">
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px">
    <?php
    $hizmetler = array(
      array('icon'=>'🩺','baslik'=>'Ücretsiz Muayene','aciklama'=>'Her vatandaşa kapsamlı muayene imkânı sunuyoruz. Randevu şartı aranmaz, hizmetimiz tamamen ücretsizdir.','slug'=>'ucretsiz-muayene','renk'=>'#0369a1'),
      array('icon'=>'🔬','baslik'=>'Sağlık Taramaları','aciklama'=>'Kanser, şeker, tansiyon ve diğer kronik hastalıklar için düzenli tarama kampanyaları düzenliyoruz.','slug'=>'saglik-taramalari','renk'=>'#0891b2'),
      array('icon'=>'🧠','baslik'=>'Psikolojik Destek','aciklama'=>'Uzman psikolog ve psikiyatristlerle ücretsiz ruh sağlığı desteği ve danışmanlık hizmetleri.','slug'=>'psikolojik-destek','renk'=>'#7c3aed'),
      array('icon'=>'🏠','baslik'=>'Evde Sağlık','aciklama'=>'Yatağa bağımlı ve hareket güçlüğü çeken hastalara evde kapsamlı sağlık hizmetleri sunuyoruz.','slug'=>'evde-saglik','renk'=>'#059669'),
      array('icon'=>'🦷','baslik'=>'Diş Sağlığı','aciklama'=>'Diş muayenesi ve tedavi hizmetleriyle ağız sağlığı konusunda vatandaşlarımıza destek oluyoruz.','slug'=>'dis-sagligi','renk'=>'#d97706'),
      array('icon'=>'👁','baslik'=>'Göz Taraması','aciklama'=>'Görme bozuklukları ve göz hastalıklarının erken teşhisi için periyodik göz tarama kampanyaları.','slug'=>'goz-taramasi','renk'=>'#0369a1'),
    );
    foreach ($hizmetler as $h):
      $url = get_permalink(get_page_by_path($h['slug']));
    ?>
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:28px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.04);transition:transform .2s,box-shadow .2s" onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,.1)'" onmouseout="this.style.transform='';this.style.boxShadow='0 2px 8px rgba(0,0,0,.04)'">
      <div style="font-size:2.6rem;margin-bottom:12px"><?php echo $h['icon']; ?></div>
      <h3 style="font-size:16px;font-weight:800;color:<?php echo esc_attr($h['renk']); ?>;margin:0 0 10px"><?php echo esc_html($h['baslik']); ?></h3>
      <p style="font-size:13.5px;color:#4b5563;margin:0 0 16px;line-height:1.6"><?php echo esc_html($h['aciklama']); ?></p>
      <?php if ($url): ?><a href="<?php echo esc_url($url); ?>" style="display:inline-block;padding:7px 18px;background:<?php echo esc_attr($h['renk']); ?>;color:#fff;border-radius:6px;font-size:12px;font-weight:700;text-decoration:none">Devamını Oku →</a><?php endif; ?>
    </div>
    <?php endforeach; ?>
  </div>
</section>
<section style="background:#f0f9ff;padding:60px 20px;text-align:center">
  <div style="max-width:700px;margin:0 auto">
    <h2 style="font-size:1.8rem;font-weight:800;color:#0369a1;margin:0 0 16px">Destek Olmak İster misiniz?</h2>
    <p style="color:#374151;font-size:15px;margin:0 0 24px;line-height:1.7">
      Bağışlarınızla daha fazla insana ulaşıyor, daha iyi sağlık hizmetleri sunabiliyoruz.
    </p>
    <a href="<?php echo esc_url(get_permalink(get_page_by_path('dsv-bagis'))); ?>"
       style="display:inline-block;padding:14px 36px;background:#0369a1;color:#fff;border-radius:8px;font-size:15px;font-weight:800;text-decoration:none">
      ❤️ Bağış Yap
    </a>
  </div>
</section>
<?php } get_footer(); ?>
