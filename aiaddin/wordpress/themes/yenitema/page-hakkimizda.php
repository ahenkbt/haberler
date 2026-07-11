<?php
/**
 * Template Name: Hakkımızda
 * Template Post Type: page
 */
get_header();
if (function_exists('vkv_breadcrumb')) vkv_breadcrumb();

/* Site tipine göre içerik */
$_hk_site  = get_option('vkv_site_tipi', 'vakif');
$_hk_org   = get_theme_mod('vkv_logo_name', get_bloginfo('name'));
$_hk_acik  = get_option('vkv_org_aciklama', '');
$_hk_defaults = array(
    'vakif'  => array(
        'eyebrow'  => '🏛️ Vakıf',
        'baslik'   => 'Hakkımızda',
        'altyazi'  => 'Vatan Kahramanları Vakfı\'nı Tanıyın',
        'aciklama' => 'Şehitlerimizin hatırasını yüceltmek, gazilerimizin haklarını korumak ve vatan sevgisini gelecek nesillere aktarmak amacıyla kurulmuş milli sivil toplum kuruluşuyuz.',
        'stat1_n'  => '2005', 'stat1_l'  => 'Kuruluş Yılı',
        'stat2_n'  => '20+',  'stat2_l'  => 'Yıl Hizmet',
        'stat3_n'  => '81',   'stat3_l'  => 'İl Kapsamı',
        'stat4_n'  => 'Ankara','stat4_l' => 'Merkez',
    ),
    'dernek' => array(
        'eyebrow'  => '🛡️ Dernek',
        'baslik'   => 'Hakkımızda',
        'altyazi'  => 'Vatan Kahramanları Derneği\'ni Tanıyın',
        'aciklama' => 'Şehit ve gazi ailelerine yönelik sosyal, hukuki ve insani hizmetler sunan ulusal sivil toplum kuruluşuyuz.',
        'stat1_n'  => '2010', 'stat1_l'  => 'Kuruluş Yılı',
        'stat2_n'  => '15+',  'stat2_l'  => 'Yıl Hizmet',
        'stat3_n'  => '81',   'stat3_l'  => 'İl Kapsamı',
        'stat4_n'  => 'Ankara','stat4_l' => 'Merkez',
    ),
    'tukav'  => array(
        'eyebrow'  => '📚 Vakıf · 1998 · Ankara',
        'baslik'   => 'Hakkımızda',
        'altyazi'  => 'TÜKAV\'ı Tanıyın',
        'aciklama' => '1998 yılında Ankara\'da kurulan Türk Kültürünü Araştırma ve Tanıtma Vakfı, medeniyetimizin zengin ve köklü mirasını korumak, araştırmak ve gelecek nesillere aktarmak amacıyla kurulmuştur.',
        'stat1_n'  => '1998', 'stat1_l'  => 'Kuruluş Yılı',
        'stat2_n'  => '27+',  'stat2_l'  => 'Yıl Hizmet',
        'stat3_n'  => '100+', 'stat3_l'  => 'Yayın',
        'stat4_n'  => 'Ankara','stat4_l' => 'Merkez',
    ),
    'dsv'    => array(
        'eyebrow'  => '🏥 Sağlık Vakfı',
        'baslik'   => 'Hakkımızda',
        'altyazi'  => 'Dünya Sağlık Vakfı\'nı Tanıyın',
        'aciklama' => 'Dünya Sağlık Vakfı olarak herkese erişilebilir sağlık hizmetleri sunmak, sağlık araştırmaları yapmak ve toplumun sağlık bilincini artırmak amacıyla faaliyet gösteriyoruz.',
        'stat1_n'  => '2015', 'stat1_l'  => 'Kuruluş Yılı',
        'stat2_n'  => '10+',  'stat2_l'  => 'Yıl Hizmet',
        'stat3_n'  => '50+',  'stat3_l'  => 'Proje',
        'stat4_n'  => 'Ankara','stat4_l' => 'Merkez',
    ),
);
$_hk_d = isset($_hk_defaults[$_hk_site]) ? $_hk_defaults[$_hk_site] : $_hk_defaults['vakif'];
if (!$_hk_acik) $_hk_acik = $_hk_d['aciklama'];

/* Son faaliyetler */
$_hk_posts = get_posts(array('post_type'=>'post','posts_per_page'=>3,'post_status'=>'publish','orderby'=>'date','order'=>'DESC','category_name'=>'faaliyetler'));
if (empty($_hk_posts)) {
    $_hk_posts = get_posts(array('post_type'=>'post','posts_per_page'=>3,'post_status'=>'publish','orderby'=>'date','order'=>'DESC'));
}
?>
<div style="font-family:var(--fm,'Open Sans',system-ui,sans-serif);color:var(--yz,#1e293b)">
<div class="tp-hero">
  <div class="tp-hero-w">
    <div>
      <div class="tp-eyebrow"><i class="fa fa-building-columns" style="color:var(--altin2)"></i> <?php echo esc_html($_hk_d['eyebrow']); ?></div>
      <h1 class="tp-h1"><?php echo esc_html($_hk_d['baslik']); ?> <em><?php echo esc_html($_hk_d['altyazi']); ?></em></h1>
      <p class="tp-hdesc"><?php echo esc_html($_hk_acik); ?></p>
    </div>
    <div class="tp-hero-stats">
      <div class="tp-stat"><div class="tp-stat-n"><?php echo esc_html($_hk_d['stat1_n']); ?></div><div class="tp-stat-l"><?php echo esc_html($_hk_d['stat1_l']); ?></div></div>
      <div class="tp-stat"><div class="tp-stat-n"><?php echo esc_html($_hk_d['stat2_n']); ?></div><div class="tp-stat-l"><?php echo esc_html($_hk_d['stat2_l']); ?></div></div>
      <div class="tp-stat"><div class="tp-stat-n"><?php echo esc_html($_hk_d['stat3_n']); ?></div><div class="tp-stat-l"><?php echo esc_html($_hk_d['stat3_l']); ?></div></div>
      <div class="tp-stat"><div class="tp-stat-n"><?php echo esc_html($_hk_d['stat4_n']); ?></div><div class="tp-stat-l"><?php echo esc_html($_hk_d['stat4_l']); ?></div></div>
    </div>
  </div>
</div>
<div class="tp-bc"><div class="tp-bc-w">
  <a href="<?php echo esc_url(home_url('/')); ?>">Ana Sayfa</a><span class="sep">›</span><span>Hakkımızda</span>
</div></div>
<div class="tp-subnav"><div class="tp-subnav-w">
  <a href="<?php echo esc_url(home_url('/hakkimizda')); ?>" class="aktif"><i class="fa fa-info-circle"></i> Hakkımızda</a>
  <a href="<?php echo esc_url(home_url('/faaliyetler')); ?>"><i class="fa fa-calendar"></i> Faaliyetler</a>
  <a href="<?php echo esc_url(home_url('/eserlerimiz')); ?>"><i class="fa fa-book"></i> Eserlerimiz</a>
  <a href="<?php echo esc_url(home_url('/genel-baskan')); ?>"><i class="fa fa-user-tie"></i> Genel Başkan</a>
  <a href="<?php echo esc_url(home_url('/ar-ge')); ?>"><i class="fa fa-microscope"></i> Ar-Ge</a>
  <a href="<?php echo esc_url(home_url('/bagis')); ?>"><i class="fa fa-heart"></i> Bağış</a>
</div></div>
<!-- MİSYON VİZYON -->
<div class="tp-sec">
  <div class="tp-sec-w">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:start">
      <div>
        <div class="tp-badge tq" style="margin-bottom:12px">🏛️ <?php echo esc_html($_hk_org); ?></div>
        <h2 class="tp-sec-title"><?php echo esc_html($_hk_org); ?></h2>
        <div style="font-size:13.5px;color:var(--yz2);line-height:1.9;margin-top:14px">
          <p style="margin-bottom:14px"><?php echo esc_html($_hk_acik); ?></p>
          <p>Tüm faaliyetlerimizi şeffaf ve hesap verebilir biçimde kamuoyuyla paylaşıyor, ulusal ve uluslararası platformlarda temsil gücümüzü artırıyoruz.</p>
        </div>
        <div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap">
          <a href="<?php echo esc_url(home_url('/faaliyetler')); ?>" class="tp-btn tq"><i class="fa fa-calendar"></i> Faaliyetlerimiz</a>
          <a href="<?php echo esc_url(home_url('/bagis')); ?>" class="tp-btn" style="background:var(--cr);color:#fff;border:none"><i class="fa fa-heart"></i> Bağış Yapın</a>
        </div>
      </div>
      <div>
        <div style="background:linear-gradient(135deg,var(--dk),var(--dk2));padding:28px;border-left:3px solid var(--altin)">
          <div style="font-family:'Georgia',serif;font-size:1.1rem;font-style:italic;color:#fff;line-height:1.6;margin-bottom:14px">"<?php echo esc_html(get_theme_mod('vkv_logo_tag', 'Vatanı için yaşıyoruz.')); ?>"</div>
          <div style="font-family:var(--fh);font-size:9.5px;letter-spacing:2px;text-transform:uppercase;color:var(--altin2)">— <?php echo esc_html($_hk_org); ?> Kuruluş İlkesi</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px;margin-top:2px">
          <div style="background:var(--bg2,#f8f5f5);border:1px solid var(--sin);padding:16px;text-align:center">
            <div style="font-family:var(--fh);font-size:1.6rem;font-weight:700;color:var(--cr);line-height:1"><?php echo esc_html($_hk_d['stat1_n']); ?></div>
            <div style="font-size:9.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--yz3,#9A7070);margin-top:3px"><?php echo esc_html($_hk_d['stat1_l']); ?></div>
          </div>
          <div style="background:var(--bg2,#f8f5f5);border:1px solid var(--sin);padding:16px;text-align:center">
            <div style="font-family:var(--fh);font-size:1.6rem;font-weight:700;color:var(--cr);line-height:1"><?php echo esc_html($_hk_d['stat2_n']); ?></div>
            <div style="font-size:9.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--yz3,#9A7070);margin-top:3px"><?php echo esc_html($_hk_d['stat2_l']); ?></div>
          </div>
          <div style="background:var(--bg2,#f8f5f5);border:1px solid var(--sin);padding:16px;text-align:center">
            <div style="font-family:var(--fh);font-size:1.6rem;font-weight:700;color:var(--cr);line-height:1"><?php echo esc_html($_hk_d['stat3_n']); ?></div>
            <div style="font-size:9.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--yz3,#9A7070);margin-top:3px"><?php echo esc_html($_hk_d['stat3_l']); ?></div>
          </div>
          <div style="background:var(--bg2,#f8f5f5);border:1px solid var(--sin);padding:16px;text-align:center">
            <div style="font-family:var(--fh);font-size:1.6rem;font-weight:700;color:var(--cr);line-height:1"><?php echo esc_html($_hk_d['stat4_n']); ?></div>
            <div style="font-size:9.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--yz3,#9A7070);margin-top:3px"><?php echo esc_html($_hk_d['stat4_l']); ?></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
<!-- DEĞERLER -->
<div class="tp-sec">
  <div class="tp-sec-w">
    <div class="tp-sec-hd"><div class="tp-badge altin">⭐ Temel Değerler</div><h2 class="tp-sec-title">Bizi Biz Yapan İlkeler</h2></div>
    <div class="tp-deger-grid">
      <div class="tp-deger"><div class="tp-deger-em">🔍</div><div class="tp-deger-title">Araştırma</div><div class="tp-deger-desc">Bilimsel metodlarla kültür ve tarihimizi araştırır, belgelenmiş bilgi üretiriz.</div></div>
      <div class="tp-deger"><div class="tp-deger-em">📢</div><div class="tp-deger-title">Tanıtım</div><div class="tp-deger-desc">Faaliyetlerimizi ulusal ve uluslararası platformlarda aktif biçimde tanıtırız.</div></div>
      <div class="tp-deger"><div class="tp-deger-em">🔒</div><div class="tp-deger-title">Şeffaflık</div><div class="tp-deger-desc">Tüm faaliyetlerimizi şeffaf biçimde kamuoyuyla paylaşırız.</div></div>
      <div class="tp-deger"><div class="tp-deger-em">🌱</div><div class="tp-deger-title">Süreklilik</div><div class="tp-deger-desc">Değerlerimizi gelecek nesillere eksiksiz aktarmayı sürekli görev biliriz.</div></div>
      <div class="tp-deger"><div class="tp-deger-em">🤝</div><div class="tp-deger-title">İşbirliği</div><div class="tp-deger-desc">Kurumlar ve STK'larla güçlü işbirlikleri kurarak etki alanımızı genişletiriz.</div></div>
      <div class="tp-deger"><div class="tp-deger-em">🎓</div><div class="tp-deger-title">Eğitim</div><div class="tp-deger-desc">Bilinç için eğitim çalışmalarına ve genç kuşaklara yatırım yaparız.</div></div>
    </div>
  </div>
</div>
<?php if (!empty($_hk_posts)): ?>
<div class="tp-blog-sec"><div class="tp-blog-sec-w">
  <div class="tp-blog-hd"><div class="tp-blog-hd-bar"></div><h3>Son Faaliyetler</h3></div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:16px">
    <?php foreach ($_hk_posts as $hp): ?>
    <a href="<?php echo esc_url(get_permalink($hp)); ?>" style="display:block;text-decoration:none;background:#fff;border:1px solid var(--sin);border-top:3px solid var(--cr);padding:20px;transition:box-shadow .2s" onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,.1)'" onmouseout="this.style.boxShadow=''">
      <?php if (has_post_thumbnail($hp->ID)): ?>
      <div style="height:140px;background:url('<?php echo esc_url(get_the_post_thumbnail_url($hp->ID,'medium')); ?>') center/cover no-repeat;margin:-20px -20px 14px;border-radius:0"></div>
      <?php endif; ?>
      <div style="font-size:10px;font-weight:700;color:var(--cr);letter-spacing:1px;text-transform:uppercase;margin-bottom:6px"><?php echo esc_html(get_the_date('d M Y',$hp)); ?></div>
      <div style="font-family:var(--fh);font-size:14px;font-weight:600;color:var(--yz);line-height:1.4"><?php echo esc_html($hp->post_title); ?></div>
    </a>
    <?php endforeach; ?>
  </div>
</div></div>
<?php endif; ?>
<div class="tp-cta"><div class="tp-cta-w">
  <div class="tp-cta-txt"><h3>Destek Olun</h3><p><?php echo esc_html($_hk_org); ?>'ın çalışmalarına katkıda bulunun.</p></div>
  <div class="tp-cta-btns">
    <a href="<?php echo esc_url(home_url('/bagis')); ?>" class="tp-btn beyaz">💝 Bağış Yapın</a>
    <a href="<?php echo esc_url(home_url('/iletisim')); ?>" class="tp-btn saydam">📩 İletişim</a>
  </div>
</div></div>
</div>
<?php get_footer(); ?>
