<?php
/**
 * Template Name: İletişim
 * Template Post Type: page
 */
get_header();
if (function_exists('vkv_breadcrumb')) vkv_breadcrumb();
$ph = get_theme_mod('vkv_phone', get_theme_mod('tema_telefon', '+90 312 XXX XX XX'));
$em = get_theme_mod('vkv_email', get_theme_mod('tema_email', 'info@kurum.org.tr'));
$ad = get_theme_mod('tema_adres', 'Ankara, Türkiye');
/* Site tipine göre içerik */
$_ile_site = get_option('vkv_site_tipi', 'vakif');
$_ile_org  = get_theme_mod('vkv_logo_name', get_bloginfo('name'));
$_ile_tag  = get_theme_mod('vkv_logo_tag',  '');
$_ile_acik_map = array(
    'dernek' => 'Vatan Kahramanları Derneği ile iletişime geçmek, işbirliği yapmak veya bağış hakkında bilgi almak için aşağıdaki kanalları kullanabilirsiniz.',
    'vakif'  => 'Vatan Kahramanları Vakfı ile iletişime geçmek, işbirliği yapmak veya bağış hakkında bilgi almak için aşağıdaki kanalları kullanabilirsiniz.',
    'tukav'  => 'Türk Kültürünü Araştırma ve Tanıtma Vakfı ile iletişime geçmek, işbirliği yapmak veya bağış hakkında bilgi almak için aşağıdaki kanalları kullanabilirsiniz.',
    'dsv'    => 'Dünya Sağlık Vakfı ile iletişime geçmek, sağlık projelerimize ortak olmak veya bağış hakkında bilgi almak için aşağıdaki kanalları kullanabilirsiniz.',
);
$_ile_acik = isset($_ile_acik_map[$_ile_site]) ? $_ile_acik_map[$_ile_site] : $_ile_acik_map['vakif'];
?>
?>
<div style="font-family:'Open Sans',system-ui,sans-serif;color:var(--yz,#1e293b)">
<div class="tp-hero">
  <div class="tp-hero-w">
    <div>
      <div class="tp-eyebrow"><i class="fa fa-envelope" style="color:var(--altin2)"></i> <?php echo esc_html($_ile_org); ?></div>
      <h1 class="tp-h1">İletişim <em>Bizimle İletişime Geçin</em></h1>
      <p class="tp-hdesc"><?php echo esc_html($_ile_acik); ?></p>
    </div>
    <div class="tp-hero-stats">
      <div class="tp-stat"><div class="tp-stat-n">Pzt–Cum</div><div class="tp-stat-l">09:00–18:00</div></div>
      <div class="tp-stat"><div class="tp-stat-n">Ankara</div><div class="tp-stat-l">Türkiye Merkez</div></div>
    </div>
  </div>
</div>
<div class="tp-bc"><div class="tp-bc-w"><a href="<?php echo esc_url(home_url('/')); ?>">Ana Sayfa</a><span class="sep">›</span><span>İletişim</span></div></div>
<div class="tp-sec">
  <div class="tp-sec-w">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px">
      <!-- İletişim Bilgileri -->
      <div>
        <div class="tp-sec-hd"><div class="tp-badge tq">📞 İletişim</div><h2 class="tp-sec-title">Bize Ulaşın</h2></div>
        <div style="display:flex;flex-direction:column;gap:14px">
          <?php if($ph): ?>
          <div style="display:flex;gap:14px;align-items:center;background:#fff;border:1px solid var(--sin2);padding:16px 18px">
            <div style="width:44px;height:44px;background:var(--bg2);border-radius:2px;display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="fa fa-phone" style="color:var(--tq)"></i></div>
            <div><div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--yz3);margin-bottom:3px">Telefon</div><a href="tel:<?php echo esc_attr(preg_replace('/\s/','',$ph)); ?>" style="font-size:15px;font-weight:700;color:var(--tq);text-decoration:none"><?php echo esc_html($ph); ?></a></div>
          </div>
          <?php endif; ?>
          <?php if($em): ?>
          <div style="display:flex;gap:14px;align-items:center;background:#fff;border:1px solid var(--sin2);padding:16px 18px">
            <div style="width:44px;height:44px;background:var(--bg2);border-radius:2px;display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="fa fa-envelope" style="color:var(--tq)"></i></div>
            <div><div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--yz3);margin-bottom:3px">E-Posta</div><a href="mailto:<?php echo esc_attr($em); ?>" style="font-size:15px;font-weight:700;color:var(--tq);text-decoration:none"><?php echo esc_html($em); ?></a></div>
          </div>
          <?php endif; ?>
          <div style="display:flex;gap:14px;align-items:center;background:#fff;border:1px solid var(--sin2);padding:16px 18px">
            <div style="width:44px;height:44px;background:var(--bg2);border-radius:2px;display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="fa fa-map-marker-alt" style="color:var(--tq)"></i></div>
            <div><div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--yz3);margin-bottom:3px">Adres</div><span style="font-size:14px;font-weight:600;color:var(--dk)"><?php echo esc_html($ad); ?></span></div>
          </div>
          <div style="display:flex;gap:14px;align-items:center;background:#fff;border:1px solid var(--sin2);padding:16px 18px">
            <div style="width:44px;height:44px;background:var(--bg2);border-radius:2px;display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="fa fa-globe" style="color:var(--tq)"></i></div>
            <div><div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--yz3);margin-bottom:3px">Web Sitesi</div><a href="https://tukav.org/tr/" target="_blank" style="font-size:14px;font-weight:700;color:var(--tq);text-decoration:none">tukav.org/tr</a></div>
          </div>
          <div style="display:flex;gap:14px;align-items:center;background:#fff;border:1px solid var(--sin2);padding:16px 18px">
            <div style="width:44px;height:44px;background:var(--bg2);border-radius:2px;display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="fa fa-clock" style="color:var(--tq)"></i></div>
            <div><div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--yz3);margin-bottom:3px">Çalışma Saatleri</div><span style="font-size:14px;font-weight:600;color:var(--dk)">Pazartesi – Cuma: 09:00 – 18:00</span></div>
          </div>
        </div>
        <!-- Sosyal Medya -->
        <div style="margin-top:20px;padding:18px;background:#fff;border:1px solid var(--sin2)">
          <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--yz3);margin-bottom:12px">Sosyal Medya</div>
          <div style="display:flex;gap:8px">
            <?php foreach(['twitter'=>array('fa-brands fa-x-twitter','Twitter/X'),'instagram'=>array('fa-brands fa-instagram','Instagram'),'facebook'=>array('fa-brands fa-facebook-f','Facebook'),'youtube'=>array('fa-brands fa-youtube','YouTube')] as $k=>$data):
              $u=get_theme_mod("vkv_$k"); if($u): ?>
            <a href="<?php echo esc_url($u); ?>" target="_blank" rel="noopener" style="width:40px;height:40px;background:var(--tq);color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;text-decoration:none;transition:background .2s" onmouseover="this.style.background='var(--tq2)'" onmouseout="this.style.background='var(--tq)'" title="<?php echo esc_attr($data[1]); ?>">
              <i class="<?php echo esc_attr($data[0]); ?>"></i>
            </a>
            <?php endif; endforeach; ?>
          </div>
        </div>
      </div>
      <!-- İletişim Formu -->
      <div>
        <div class="tp-sec-hd"><div class="tp-badge altin">✉️ Mesaj</div><h2 class="tp-sec-title">Mesaj Gönderin</h2></div>
        <?php if(function_exists('wpcf7_contact_form')): ?>
          <?php echo do_shortcode('[contact-form-7 id="iletisim" title="İletişim Formu"]'); ?>
        <?php else: ?>
        <div style="background:#fff;border:1px solid var(--sin2);padding:24px">
          <p style="font-size:13px;color:var(--yz2);margin-bottom:16px">Bize ulaşmak için aşağıdaki e-posta adresini kullanabilirsiniz:</p>
          <a href="mailto:<?php echo esc_attr(get_theme_mod('vkv_email', get_theme_mod('tema_email', 'info@kurum.org.tr'))); ?>" style="display:inline-flex;align-items:center;gap:8px;background:var(--cr,#8B1A1A);color:#fff;font-family:var(--fh);font-size:13px;font-weight:600;padding:12px 24px;text-decoration:none;text-transform:uppercase;letter-spacing:.8px">
            <i class="fa fa-envelope"></i> E-Posta Gönder
          </a>
          <div style="margin-top:20px;padding:16px;background:var(--bg);border:1px solid var(--sin2)">
            <p style="font-size:12px;color:var(--yz3)">Kısa sürede size geri dönüş yapacağız. İşbirliği ve bağış için ayrıca arayabilirsiniz.</p>
          </div>
        </div>
        <?php endif; ?>
      </div>
    </div>
  </div>
</div>
<div class="tp-cta"><div class="tp-cta-w">
  <div class="tp-cta-txt"><h3>Kültürel Mirasa Destek Olun</h3><p>Bağış yapmak, işbirliği kurmak veya gönüllü olmak için bizimle iletişime geçin.</p></div>
  <div class="tp-cta-btns"><a href="<?php echo esc_url(home_url('/bagis')); ?>" class="tp-btn beyaz">💝 Bağış Yapın</a><a href="<?php echo esc_url(home_url('/faaliyetler')); ?>" class="tp-btn saydam">Faaliyetler</a></div>
</div></div>
</div>
<?php get_footer(); ?>
