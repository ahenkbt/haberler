<?php
/**
 * Ahenk Haber - Header v5 (Kararlı)
 */
?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo('charset'); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<?php wp_head(); ?>
<!-- Mobil Override CSS -->
<style id="ah-mobil-override">
/* Mobil Drawer */
.mobil-drawer{position:fixed!important;top:0!important;left:0!important;bottom:0!important;width:290px!important;max-width:85vw!important;background:#ffffff!important;color:#1a1a1a!important;z-index:100000!important;transform:translateX(-100%)!important;transition:transform .3s ease!important;overflow-y:auto!important;box-shadow:4px 0 24px rgba(0,0,0,.3)!important}
.mobil-drawer.aktif{transform:translateX(0)!important}
.mobil-drawer-header{background:#1a1a1a!important;padding:14px 16px!important;display:flex!important;align-items:center!important;justify-content:space-between!important}
.mobil-drawer-header .logo-ana{color:#ffffff!important;font-size:18px!important}
.mobil-drawer-header .logo-aksan{color:#ffffff!important;background:#D4AF37!important;font-size:18px!important}
#mobilDrawerKapat{background:rgba(255,255,255,.2)!important;color:#fff!important;border:none!important;padding:6px 12px!important;border-radius:4px!important;cursor:pointer!important;font-size:18px!important;line-height:1!important}
.mobil-drawer-liste{list-style:none!important;padding:0!important;margin:0!important;background:#fff!important}
.mobil-drawer-liste li{border-bottom:1px solid #f0f0f0!important}
.mobil-drawer-liste li a{display:flex!important;align-items:center!important;gap:10px!important;padding:13px 20px!important;color:#1a1a1a!important;font-size:14px!important;font-weight:600!important;text-decoration:none!important;background:#fff!important}
.mobil-drawer-liste li a:hover{background:#f5f5f5!important;color:#D4AF37!important;padding-left:26px!important}
.mobil-drawer-liste .sub-menu{background:#f8f8f8!important;padding:0!important;margin:0!important;list-style:none!important}
.mobil-drawer-liste .sub-menu li a{padding-left:32px!important;font-size:13px!important;font-weight:400!important;color:#555!important;background:#f8f8f8!important}
.mobil-drawer-footer-linkler{display:flex!important;flex-wrap:wrap!important;gap:8px!important;padding:14px 16px!important;background:#f8f8f8!important;border-top:1px solid #eee!important}
.mobil-drawer-footer-linkler a{display:flex!important;align-items:center!important;gap:5px!important;font-size:12px!important;color:#555!important;background:#fff!important;padding:6px 12px!important;border-radius:20px!important;border:1px solid #eee!important;text-decoration:none!important}
/* Overlay */
.overlay-perde{display:none!important;position:fixed!important;inset:0!important;background:rgba(0,0,0,.6)!important;z-index:99999!important;cursor:pointer!important}
.overlay-perde.aktif{display:block!important}
/* Navbar - overflow:hidden KULLANMA - dropdown menüleri keser! */
.ana-nav{max-width:100vw!important}
.nav-ic{max-width:100%!important}
.ana-menu{min-width:0!important;flex-shrink:1!important}
/* Mobil alt nav */
.mobil-alt-nav{display:none;position:fixed!important;bottom:0!important;left:0!important;right:0!important;width:100%!important;background:#fff!important;border-top:2px solid #e0e0e0!important;z-index:9000!important;box-shadow:0 -2px 8px rgba(0,0,0,.1)!important}
.mobil-alt-nav .mobil-nav-item{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;flex:1!important;padding:8px 4px!important;color:#777!important;font-size:10px!important;gap:3px!important;border:none!important;background:none!important;cursor:pointer!important;text-decoration:none!important;font-family:inherit!important}
.mobil-alt-nav .mobil-nav-item i{font-size:18px!important;color:#777!important}
.mobil-alt-nav .mobil-nav-item.aktif,.mobil-alt-nav .mobil-nav-item:hover{color:#D4AF37!important}
.mobil-alt-nav .mobil-nav-item.aktif i,.mobil-alt-nav .mobil-nav-item:hover i{color:#D4AF37!important}
/* Genel overflow koruması */
html,body{max-width:100%!important;overflow-x:hidden!important}
@media(max-width:767px){
  .mobil-alt-nav{display:flex!important}
  body{padding-bottom:62px!important}
  .ust-bar{display:none!important}
  .header-reklam{display:none!important}
  .surmanset-liste{display:none!important}
  .sidebar{display:none!important}
  .manset-ic{flex-direction:column!important}
  .manset-resim-wrap{height:220px!important}
  .manset-baslik{font-size:15px!important}
  .ikon-bant-grid{grid-template-columns:repeat(3,1fr)!important}
  .ikon-bant-metin span{display:none!important}
  .footer-grid{grid-template-columns:1fr!important}
  .yazarlar-grid{grid-template-columns:repeat(2,1fr)!important}
  .container{padding:0 12px!important;max-width:100%!important;box-sizing:border-box!important}
  .icerik-sidebar-sarici{grid-template-columns:1fr!important;display:block!important}
  .haber-detay-icerik{padding:14px!important}
  .single-icerik-alani{padding:0!important}
}
@media(max-width:480px){
  .ikon-bant-grid{grid-template-columns:repeat(2,1fr)!important}
  .manset-resim-wrap{height:190px!important}
  .manset-baslik{font-size:14px!important}
}
</style>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>

<!-- ÜST BAR -->
<div class="ust-bar">
  <div class="container"><div class="ust-bar-sol">
    <?php $p=get_page_by_path('kunye'); ?>
    <a href="<?php echo esc_url($p?get_permalink($p):'#'); ?>" class="ust-bar-link"><i class="fa fa-id-card"></i> Künye</a>
    <?php $p2=get_page_by_path('iletisim'); ?>
    <a href="<?php echo esc_url($p2?get_permalink($p2):'#'); ?>" class="ust-bar-link"><i class="fa fa-envelope"></i> İletişim</a>
  </div>
  <div class="ust-bar-sag ust-bar-sag--desktop">
    <a href="<?php echo esc_url(home_url('/yazarlar/')); ?>" class="ust-bar-link"><i class="fa fa-pen-nib"></i> Yazarlar</a>
    <a href="<?php echo esc_url(get_post_type_archive_link('seri-ilan')?:'#'); ?>" class="ust-bar-link"><i class="fa fa-tag"></i> Seri İlanlar</a>
    <a href="<?php echo esc_url(get_post_type_archive_link('resmi-ilan')?:'#'); ?>" class="ust-bar-link ust-bar-link--vurgulu"><i class="fa fa-bullhorn"></i> Resmi İlanlar</a>
  </div></div>
</div>

<!-- HEADER -->
<header class="site-header">
  <div class="container"><div class="header-ic">
    <div class="site-logo">
      <a href="<?php echo esc_url(home_url('/')); ?>">
        <?php if(has_custom_logo()):the_custom_logo();else:?>
        <div class="metin-logo"><span class="logo-ana"><?php echo esc_html(get_theme_mod('ahenk_logo_metin_1','ANKARA ŞEHİR')); ?></span><span class="logo-aksan"><?php echo esc_html(get_theme_mod('ahenk_logo_metin_2','GAZETESİ')); ?></span></div>
        <?php endif;?>
      </a>
    </div>
    <div class="header-reklam">
      <?php $hr=get_option('ahenk_reklam_header',''); if($hr):echo wp_kses_post($hr);else:?>
      <div class="reklam-placeholder" style="width:728px;height:90px;max-width:100%"><span>728 × 90</span></div>
      <?php endif;?>
    </div>
  </div></div>
</header>

<!-- NAVBAR -->
<?php
// Özel navbar linkleri sadece WordPress menüsü atanmadıysa yedek olarak gösterilir.
// WP Menü atandığında tüm linkler "Görünüm > Menüler" üzerinden yönetilir.
$_ozel_nav = array();
if ( ! has_nav_menu('ana-menu') ) {
    for ($_i = 1; $_i <= 4; $_i++) {
        $_ob = trim(get_theme_mod("ahenk_ozel_link_{$_i}_baslik", ''));
        $_ou = trim(get_theme_mod("ahenk_ozel_link_{$_i}_url",    ''));
        if ($_ob && $_ou) $_ozel_nav[] = array('baslik'=>$_ob,'url'=>$_ou);
    }
}
?>
<nav class="ana-nav" id="ana-nav">
  <div class="container"><div class="nav-ic">
    <?php if(has_nav_menu('ana-menu')):
      wp_nav_menu(array('theme_location'=>'ana-menu','menu_class'=>'ana-menu','container'=>false,'depth'=>2));
      // Özel linkleri wp_nav_menu sonrasına ekle (JavaScript ile)
    else:
      $sluglar = function_exists('ahenk_navbar_sluglari_al')?ahenk_navbar_sluglari_al():get_theme_mod('ahenk_navbar_sluglar','gundem,ankara,dunya,spor');
      $slug_arr = array_filter(array_map('trim',explode(',',$sluglar)));
    ?>
    <ul class="ana-menu">
      <li class="menu-item <?php echo is_front_page()?'current-menu-item':''; ?>"><a href="<?php echo esc_url(home_url('/')); ?>">ANA SAYFA</a></li>
      <?php foreach($slug_arr as $ns):
        $nk=get_term_by('slug',$ns,'haber-kategorisi');
        if(!$nk||is_wp_error($nk)) $nk=get_term_by('slug',$ns,'category');
        if(!$nk||is_wp_error($nk)) continue;
        $aktif=is_tax('haber-kategorisi',$nk->term_id)||is_category($nk->slug);
        $alts=get_terms(array('taxonomy'=>'haber-kategorisi','parent'=>$nk->term_id,'hide_empty'=>false,'number'=>8));
      ?>
      <li class="menu-item has-sub <?php echo $aktif?'current-menu-item':''; ?>">
        <a href="<?php echo esc_url(get_term_link($nk)); ?>"><?php echo esc_html($nk->name); ?></a>
        <?php if(!is_wp_error($alts)&&!empty($alts)):?><ul class="sub-menu"><?php foreach($alts as $ak):?><li><a href="<?php echo esc_url(get_term_link($ak)); ?>"><?php echo esc_html($ak->name); ?></a></li><?php endforeach;?></ul><?php endif;?>
      </li>
      <?php endforeach;?>
      <?php foreach($_ozel_nav as $_ol):?>
      <li class="menu-item"><a href="<?php echo esc_url($_ol['url']); ?>"><?php echo esc_html(strtoupper($_ol['baslik'])); ?></a></li>
      <?php endforeach;?>
    </ul>
    <?php endif;?>
    <div class="nav-aksiyonlar">
      <button class="nav-btn" id="aramaBtn"><i class="fa fa-search"></i></button>
      <button class="nav-btn hamburger-btn" id="hamburgerBtn"><i class="fa fa-bars"></i> <span class="hamburger-txt">Tümü</span></button>
    </div>
  </div></div>
</nav>

<!-- MOBİL DRAWER -->
<div class="mobil-drawer" id="mobilDrawer" aria-hidden="true">
  <div class="mobil-drawer-ic">
    <div class="mobil-drawer-header">
      <div class="metin-logo">
        <span class="logo-ana"><?php echo esc_html(get_theme_mod('ahenk_logo_metin_1','ANKARA')); ?></span>
        <span class="logo-aksan"><?php echo esc_html(get_theme_mod('ahenk_logo_metin_2','ŞEHİR')); ?></span>
      </div>
      <button id="mobilDrawerKapat">&#10005;</button>
    </div>
    <?php if(has_nav_menu('ana-menu')):
      wp_nav_menu(array('theme_location'=>'ana-menu','menu_class'=>'mobil-drawer-liste','container'=>false,'depth'=>2));
    else:
      $drawer_sluglar = function_exists('ahenk_navbar_sluglari_al')?ahenk_navbar_sluglari_al():get_theme_mod('ahenk_navbar_sluglar','gundem,ankara,dunya,spor');
      $drawer_slug_arr = array_filter(array_map('trim', explode(',', $drawer_sluglar)));
    ?>
    <ul class="mobil-drawer-liste">
      <li><a href="<?php echo esc_url(home_url('/')); ?>"><i class="fa fa-home"></i> Ana Sayfa</a></li>
      <?php foreach($drawer_slug_arr as $ds):
        $dk=get_term_by('slug',$ds,'haber-kategorisi');
        if(!$dk||is_wp_error($dk)) $dk=get_term_by('slug',$ds,'category');
        if(!$dk||is_wp_error($dk)) continue;
      ?>
      <li><a href="<?php echo esc_url(get_term_link($dk)); ?>"><i class="fa fa-folder"></i> <?php echo esc_html($dk->name); ?></a></li>
      <?php endforeach;?>
      <?php foreach($_ozel_nav as $_ol):?>
      <li><a href="<?php echo esc_url($_ol['url']); ?>"><i class="fa fa-link"></i> <?php echo esc_html($_ol['baslik']); ?></a></li>
      <?php endforeach;?>
    </ul>
    <?php endif;?>
    <div class="mobil-drawer-footer-linkler">
      <a href="<?php echo esc_url(get_page_link(get_page_by_path('kunye'))); ?>"><i class="fa fa-id-card"></i> Künye</a>
      <a href="<?php echo esc_url(get_page_link(get_page_by_path('iletisim'))); ?>"><i class="fa fa-envelope"></i> İletişim</a>
    </div>
  </div>
</div>
<div class="overlay-perde" id="overlayPerde"></div>

<!-- ARAMA -->
<div class="arama-overlay" id="aramaOverlay" aria-hidden="true">
  <div class="container">
    <form class="ahenk-search-form" method="get" action="<?php echo esc_url(home_url('/')); ?>">
      <input type="search" placeholder="Haber ara..." name="s" value="<?php echo get_search_query(); ?>" autocomplete="off">
      <button type="submit"><i class="fa fa-search"></i></button>
    </form>
    <button class="arama-kapat" id="aramaKapat">&#10005;</button>
  </div>
</div>

<!-- MOBİL ALT NAV -->
<nav class="mobil-alt-nav">
  <a href="<?php echo esc_url(home_url('/')); ?>" class="mobil-nav-item <?php echo is_front_page()?'aktif':''; ?>"><i class="fa fa-home"></i><span>Ana Sayfa</span></a>
  <?php
  $_alt_sluglar = function_exists('ahenk_navbar_sluglari_al')?ahenk_navbar_sluglari_al():get_theme_mod('ahenk_navbar_sluglar','gundem,ankara,dunya,spor');
  $_alt_slug_arr = array_filter(array_map('trim', explode(',', $_alt_sluglar)));
  // Kategori linkler (maks 2 adet)
  $_alt_kat_count = 0;
  foreach($_alt_slug_arr as $ms):
    if($_alt_kat_count >= 2) break;
    $mk=get_term_by('slug',$ms,'haber-kategorisi');
    if(!$mk||is_wp_error($mk)) $mk=get_term_by('slug',$ms,'category');
    if(!$mk||is_wp_error($mk)) continue;
    $_alt_kat_count++;
  ?>
  <a href="<?php echo esc_url(get_term_link($mk)); ?>" class="mobil-nav-item <?php echo (is_tax('haber-kategorisi',$mk->term_id)||is_category($mk->slug))?'aktif':''; ?>"><i class="fa fa-newspaper"></i><span><?php echo esc_html($mk->name); ?></span></a>
  <?php endforeach;?>
  <?php // Özel linkler (maks 1 adet, boşluk varsa)
  if(!empty($_ozel_nav) && $_alt_kat_count < 3):
    $_ol1 = $_ozel_nav[0];?>
  <a href="<?php echo esc_url($_ol1['url']); ?>" class="mobil-nav-item"><i class="fa fa-tv"></i><span><?php echo esc_html($_ol1['baslik']); ?></span></a>
  <?php endif;?>
  <button class="mobil-nav-item" id="mobilMenuBtn"><i class="fa fa-bars"></i><span>Menü</span></button>
</nav>

<!-- SON DAKİKA + SON EKLENENLER -->
<?php
// Önce son dakika işaretli haberler
$_sd_ids   = array();
$_sd_items = array();
$_sd_q = new WP_Query(array(
    'post_type'      => array('haber','post'),
    'posts_per_page' => 20,
    'no_found_rows'  => true,
    'orderby'        => 'date',
    'order'          => 'DESC',
    'meta_query'     => array(array('key'=>'_son_dakika','value'=>'1')),
));
while($_sd_q->have_posts()){$_sd_q->the_post();$_sd_ids[]=get_the_ID();$_sd_items[]=array('id'=>get_the_ID(),'url'=>get_permalink(),'baslik'=>get_the_title(),'sd'=>true);}
wp_reset_postdata();

// Son dakika sayısı 10'dan azsa, son eklenen haberlerle tamamla (toplam 20)
$_kalan = max(0, 20 - count($_sd_items));
if($_kalan > 0){
    $ex = empty($_sd_ids) ? array(0) : $_sd_ids;
    $_yeni_q = new WP_Query(array(
        'post_type'      => array('haber','post'),
        'posts_per_page' => $_kalan,
        'no_found_rows'  => true,
        'orderby'        => 'date',
        'order'          => 'DESC',
        'post__not_in'   => $ex,
        'post_status'    => 'publish',
    ));
    while($_yeni_q->have_posts()){$_yeni_q->the_post();$_sd_items[]=array('id'=>get_the_ID(),'url'=>get_permalink(),'baslik'=>get_the_title(),'sd'=>false);}
    wp_reset_postdata();
}

if(!empty($_sd_items)):?>
<div class="son-dakika-bar"><div class="container"><div class="son-dakika-ic">
  <span class="sd-etiket"><i class="fa fa-bolt"></i> SON DAKİKA</span>
  <div class="sd-sarici"><div class="sd-icerik" id="sdIcerik">
    <?php foreach($_sd_items as $_si):?>
    <a href="<?php echo esc_url($_si['url']); ?>" class="sd-item<?php echo $_si['sd']?' sd-isaretli':''; ?>"><?php echo esc_html($_si['baslik']); ?></a><span class="sd-ay">&#9679;</span>
    <?php endforeach;?>
  </div></div>
  <div class="sd-nav"><button class="sd-prev"><i class="fa fa-chevron-left"></i></button><button class="sd-next"><i class="fa fa-chevron-right"></i></button></div>
</div></div></div>
<?php endif;?>

<!-- FİNANS BANDI -->
<div class="finans-band"><div class="container"><div class="finans-ic">
  <div class="finans-item"><span class="finans-lbl">BIST 100</span><span class="finans-val" id="fbist">--</span></div>
  <span class="finans-ay">|</span>
  <div class="finans-item"><span class="finans-lbl">$ DOLAR</span><span class="finans-val" id="fusd">--</span></div>
  <span class="finans-ay">|</span>
  <div class="finans-item"><span class="finans-lbl">€ EURO</span><span class="finans-val" id="feur">--</span></div>
  <span class="finans-ay">|</span>
  <div class="finans-item"><span class="finans-lbl">ALTIN</span><span class="finans-val" id="faltin">--</span></div>
</div></div></div>
