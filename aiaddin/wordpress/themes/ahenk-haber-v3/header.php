<?php
/**
 * Ahenk Haber v3 - Header (Birportal özellikleri dahil)
 * - inc/color.php ile dinamik gradient renk çıktısı
 * - Hikaye/Story sistemi
 * - Sabit (sticky) navbar
 * - Mega menü desteği
 */
?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo('charset'); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<?php wp_head(); ?>
<?php get_template_part('inc/color'); ?>
<!-- Birportal Uyumlu Ek Stiller -->
<style id="ah-mobil-override">
.mobil-drawer{position:fixed!important;top:0!important;left:0!important;bottom:0!important;width:290px!important;max-width:85vw!important;background:#ffffff!important;color:#1a1a1a!important;z-index:100000!important;transform:translateX(-100%)!important;transition:transform .3s ease!important;overflow-y:auto!important;box-shadow:4px 0 24px rgba(0,0,0,.3)!important}
.mobil-drawer.aktif{transform:translateX(0)!important}
.mobil-drawer *{color:#1a1a1a!important;background:transparent!important}
.mobil-drawer-header{background:var(--renk-navbar,#1a1a1a)!important;padding:14px 16px!important;display:flex!important;align-items:center!important;justify-content:space-between!important}
.mobil-drawer-header *,.mobil-drawer-header .logo-ana,.mobil-drawer-header .logo-aksan{color:#ffffff!important}
#mobilDrawerKapat{background:rgba(255,255,255,.2)!important;color:#fff!important;border:none!important;padding:6px 12px!important;border-radius:4px!important;cursor:pointer!important;font-size:18px!important;line-height:1!important}
.mobil-drawer-liste{list-style:none!important;padding:0!important;margin:0!important;background:#fff!important}
.mobil-drawer-liste li{border-bottom:1px solid #f0f0f0!important}
.mobil-drawer-liste li a{display:flex!important;align-items:center!important;gap:10px!important;padding:13px 20px!important;color:#1a1a1a!important;font-size:14px!important;font-weight:600!important;text-decoration:none!important;background:#fff!important}
.mobil-drawer-liste li a:hover{background:#f5f5f5!important;color:var(--renk-ana,#CC0000)!important;padding-left:26px!important}
.mobil-drawer-liste .sub-menu{background:#f8f8f8!important;padding:0!important;margin:0!important;list-style:none!important}
.mobil-drawer-liste .sub-menu li a{padding-left:32px!important;font-size:13px!important;font-weight:400!important;color:#555!important}
.overlay-perde{display:none!important;position:fixed!important;inset:0!important;background:rgba(0,0,0,.6)!important;z-index:99999!important;cursor:pointer!important}
.overlay-perde.aktif{display:block!important}
.mobil-alt-nav{display:none;position:fixed!important;bottom:0!important;left:0!important;right:0!important;background:#fff!important;border-top:2px solid #e0e0e0!important;z-index:9000!important;box-shadow:0 -2px 8px rgba(0,0,0,.1)!important}
.mobil-alt-nav .mobil-nav-item{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;flex:1!important;padding:8px 4px!important;color:#777!important;font-size:10px!important;gap:3px!important;border:none!important;background:none!important;cursor:pointer!important;text-decoration:none!important;font-family:inherit!important}
.mobil-alt-nav .mobil-nav-item i{font-size:18px!important;color:#777!important}
.mobil-alt-nav .mobil-nav-item.aktif,.mobil-alt-nav .mobil-nav-item:hover,.mobil-alt-nav .mobil-nav-item.aktif i,.mobil-alt-nav .mobil-nav-item:hover i{color:var(--renk-ana,#CC0000)!important}
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
  .container{padding:0 12px!important}
}
@media(max-width:480px){
  .ikon-bant-grid{grid-template-columns:repeat(2,1fr)!important}
  .manset-resim-wrap{height:190px!important}
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
    <a href="<?php echo esc_url(admin_url('admin.php?page=ky-yazarlar')); ?>" class="ust-bar-link"><i class="fa fa-pen-nib"></i> Yazarlar</a>
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
<nav class="ana-nav" id="ana-nav">
  <div class="container"><div class="nav-ic">
    <?php if(has_nav_menu('ana-menu')):
      wp_nav_menu(array('theme_location'=>'ana-menu','menu_class'=>'ana-menu','container'=>false,'depth'=>2));
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
    else:?>
    <ul class="mobil-drawer-liste">
      <li><a href="<?php echo esc_url(home_url('/')); ?>"><i class="fa fa-home"></i> Ana Sayfa</a></li>
      <?php $tk=get_terms(array('taxonomy'=>'haber-kategorisi','hide_empty'=>false,'parent'=>0,'number'=>20));
      if(!is_wp_error($tk)) foreach($tk as $dk):?>
      <li><a href="<?php echo esc_url(get_term_link($dk)); ?>"><i class="fa fa-folder"></i> <?php echo esc_html($dk->name); ?></a></li>
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
  $mob_arr = array_slice(array_filter(array_map('trim',explode(',', function_exists('ahenk_navbar_sluglari_al')?ahenk_navbar_sluglari_al():'gundem,ankara,dunya,spor'))),0,3);
  foreach($mob_arr as $ms):
    $mk=get_term_by('slug',$ms,'haber-kategorisi');
    if(!$mk||is_wp_error($mk)) $mk=get_term_by('slug',$ms,'category');
    if(!$mk||is_wp_error($mk)) continue;
  ?>
  <a href="<?php echo esc_url(get_term_link($mk)); ?>" class="mobil-nav-item <?php echo (is_tax('haber-kategorisi',$mk->term_id)||is_category($mk->slug))?'aktif':''; ?>"><i class="fa fa-newspaper"></i><span><?php echo esc_html($mk->name); ?></span></a>
  <?php endforeach;?>
  <button class="mobil-nav-item" id="mobilMenuBtn"><i class="fa fa-bars"></i><span>Menü</span></button>
</nav>

<!-- SON DAKİKA -->
<?php $sd=new WP_Query(array('post_type'=>array('haber','post'),'posts_per_page'=>20,'meta_query'=>array(array('key'=>'_son_dakika','value'=>'1')),'no_found_rows'=>true,'orderby'=>'date','order'=>'DESC'));
if($sd->have_posts()):?>
<div class="son-dakika-bar"><div class="container"><div class="son-dakika-ic">
  <span class="sd-etiket"><i class="fa fa-bolt"></i> SON DAKİKA</span>
  <div class="sd-sarici"><div class="sd-icerik" id="sdIcerik">
    <?php while($sd->have_posts()):$sd->the_post();?>
    <a href="<?php the_permalink(); ?>" class="sd-item"><?php the_title(); ?></a><span class="sd-ay">&#9679;</span>
    <?php endwhile;wp_reset_postdata();?>
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

<?php if ( get_theme_mod('ahenk_mod_hikaye', 1) ) :
$hk_sluglar = explode(',', get_theme_mod('ahenk_hikaye_kat_sluglar', 'gundem,spor,dunya,teknoloji'));
$hk_sluglar = array_filter(array_map('trim', $hk_sluglar));
?>
<!-- HİKAYE / STORY BANDI -->
<div class="hikaye-bant">
  <div class="container">
    <div class="hikaye-sarici" id="hikayeSarici">
      <?php foreach ($hk_sluglar as $hks) :
        $hkt = get_term_by('slug', $hks, 'haber-kategorisi');
        if (!$hkt || is_wp_error($hkt)) $hkt = get_term_by('slug', $hks, 'category');
        if (!$hkt || is_wp_error($hkt)) continue;
        $hk_q = new WP_Query(array('post_type'=>array('haber','post'),'posts_per_page'=>1,'tax_query'=>array(array('taxonomy'=>(taxonomy_exists('haber-kategorisi')?'haber-kategorisi':'category'),'field'=>'slug','terms'=>$hks)),'no_found_rows'=>true));
        $hk_img = '';
        if ($hk_q->have_posts()) { $hk_q->the_post(); $hk_img = ahenk_thumb_url(null,'ahenk-kucuk'); wp_reset_postdata(); }
      ?>
      <a href="<?php echo esc_url(get_term_link($hkt)); ?>" class="hikaye-item" title="<?php echo esc_attr($hkt->name); ?>">
        <div class="hikaye-halka">
          <div class="hikaye-foto" style="background-image:url('<?php echo esc_url($hk_img ?: get_template_directory_uri().'/assets/images/placeholder.jpg'); ?>')"></div>
        </div>
        <span class="hikaye-etiket"><?php echo esc_html($hkt->name); ?></span>
      </a>
      <?php endforeach; ?>
    </div>
  </div>
</div>
<?php endif; ?>

<?php if ( get_theme_mod('ahenk_mod_fixednav', 1) ) : ?>
<script>
(function(){
  var nav = document.getElementById('ana-nav');
  if(!nav) return;
  var navTop = nav.offsetTop;
  window.addEventListener('scroll', function(){
    if(window.scrollY > navTop){ nav.classList.add('sticky-nav'); }
    else { nav.classList.remove('sticky-nav'); }
  }, {passive:true});
})();
</script>
<?php endif; ?>
