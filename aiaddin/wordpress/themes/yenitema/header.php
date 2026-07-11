<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo('charset'); ?>">
<meta name="viewport" content="width=device-width,initial-scale=1">
<?php wp_head(); ?>
<style>
/* ── DERVAK TEMA — Dinamik CSS Değişkenleri ── */
<?php
/* sanitize_hex_color() WP 6.1 öncesinde front-end'de tanımlı olmayabilir — fallback */
if (!function_exists('sanitize_hex_color')) {
    function sanitize_hex_color($color) {
        if ('' === $color) return '';
        if (preg_match('/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/', $color)) return $color;
        return '';
    }
}
if (!function_exists('_dervak_renk')) {
    function _dervak_renk($tm_key, $opt_key, $default, $opt) {
        $tm = get_theme_mod($tm_key);
        if ($tm && $tm !== $default) return sanitize_hex_color($tm) ?: $default;
        if (!empty($opt[$opt_key])) return sanitize_hex_color($opt[$opt_key]) ?: $default;
        return $default;
    }
}
$_r     = get_option('vkvsy_renkler', array());
$_cr    = _dervak_renk('vkv_cr',    'birincil', '#8B1A1A', $_r);
$_cr2   = _dervak_renk('vkv_cr2',   'ikincil',  '#6B1010', $_r);
$_cr3   = _dervak_renk('vkv_cr3',   'ucuncul',  '#C53030', $_r);
$_altin = _dervak_renk('vkv_altin', 'altin',    '#B45309', $_r);
$_alt2  = _dervak_renk('vkv_altin2','altin2',   '#D97706', $_r);
$_dk    = _dervak_renk('vkv_dk',    'koyu',     '#0D0B0B', $_r);
$_dk2   = !empty($_r['koyu2'])  ? sanitize_hex_color($_r['koyu2'])  : '#1A1210';
$_bg    = !empty($_r['arka'])   ? sanitize_hex_color($_r['arka'])   : '#FFF8F5';
$_sin   = !empty($_r['sinir'])  ? sanitize_hex_color($_r['sinir'])  : '#FECACA';
$_yz    = !empty($_r['yazi'])   ? sanitize_hex_color($_r['yazi'])   : '#1C1010';
$_yz2   = !empty($_r['yazi2'])  ? sanitize_hex_color($_r['yazi2'])  : '#4B3030';
echo ":root{--cr:{$_cr};--cr2:{$_cr2};--cr3:{$_cr3};--altin:{$_altin};--altin2:{$_alt2};--dk:{$_dk};--dk2:{$_dk2};--bg:{$_bg};--sin:{$_sin};--yz:{$_yz};--yz2:{$_yz2};--yz3:#9A7070;--fh:'Oswald',sans-serif;--fm:'Open Sans',system-ui,sans-serif}\n";
?>
/* ═══════════════════════════════════════
   TEMEL RESET & TAŞMA DÜZELTMESİ
═══════════════════════════════════════ */
html{overflow-x:hidden;scroll-behavior:smooth}
body{margin:0;padding:0;overflow-x:hidden;max-width:100vw;background:var(--bg);color:var(--yz);font-family:var(--fm)}
*,*::before,*::after{box-sizing:border-box}
img,video,iframe,embed,object{max-width:100%}
/* ═══════════════════════════════════════
   TOPBAR
═══════════════════════════════════════ */
#topbar{background:var(--dk2);border-bottom:1px solid rgba(197,48,48,.15);padding:6px 0;font-size:11.5px}
#topbar .w{max-width:1440px;margin:0 auto;padding:0 20px;display:flex;justify-content:space-between;align-items:center}
.tb-left{display:flex;align-items:center;gap:16px}
.tb-left a{color:rgba(255,255,255,.45);display:flex;align-items:center;gap:5px;text-decoration:none;transition:color .2s;white-space:nowrap}
.tb-left a:hover{color:rgba(255,255,255,.85)}
.tb-left a i{color:var(--altin2);font-size:10px}
.tb-right{display:flex;align-items:center;gap:6px}
.tb-soc{width:26px;height:26px;border:1px solid rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.3);font-size:10px;text-decoration:none;transition:all .2s}
.tb-soc:hover{border-color:var(--cr3);color:var(--cr3)}
.tb-ext{margin-left:12px;padding-left:12px;border-left:1px solid rgba(255,255,255,.1);font-size:10.5px;font-weight:700;color:rgba(255,255,255,.4);text-decoration:none;display:flex;align-items:center;gap:5px;transition:color .2s}
.tb-ext:hover{color:var(--cr3)}
/* ═══════════════════════════════════════
   HEADER
═══════════════════════════════════════ */
#header{background:var(--dk);position:sticky;top:0;z-index:500;box-shadow:0 2px 20px rgba(0,0,0,.5)}
#header::before{content:'';display:block;height:3px;background:linear-gradient(90deg,var(--cr2),var(--cr),var(--cr3),var(--altin));position:absolute;top:0;left:0;right:0}
#header .w{max-width:1440px;margin:0 auto;padding:0 20px;height:64px;display:flex;align-items:center;justify-content:space-between;gap:16px}
/* Logo */
.hdr-logo{display:flex;align-items:center;gap:12px;text-decoration:none;flex-shrink:0;min-width:0}
.hdr-logo-emblem{width:44px;height:44px;background:var(--cr);display:grid;place-items:center;flex-shrink:0;clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)}
.hdr-logo-emblem svg{width:22px;height:22px;fill:#fff}
.hdr-logo-text{min-width:0}
.hdr-logo-text .name{font-family:var(--fh);font-size:14px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.6px;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hdr-logo-text .tag{font-size:8px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.3);margin-top:1px;white-space:nowrap}
/* Desktop Nav */
.hdr-nav{display:flex;align-items:stretch;height:64px;flex:1;justify-content:center}
.hdr-nav-item{position:relative;display:flex;align-items:stretch}
.hdr-nav-item>a{display:flex;align-items:center;gap:4px;font-family:var(--fh);font-size:12.5px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:rgba(255,255,255,.7);padding:0 12px;text-decoration:none;border-bottom:3px solid transparent;transition:all .2s;white-space:nowrap}
.hdr-nav-item>a:hover,.hdr-nav-item.active>a{color:#fff;border-bottom-color:var(--cr3)}
.hdr-nav-item>a .arr{font-size:8px;opacity:.5}
.hdr-nav-item:hover .hdr-drop{display:block}
.hdr-drop{display:none;position:absolute;top:100%;left:0;min-width:220px;background:var(--dk2);border-top:2px solid var(--cr);box-shadow:0 10px 32px rgba(0,0,0,.5);z-index:999}
.hdr-drop a{display:flex;align-items:center;gap:8px;padding:10px 16px;font-size:12.5px;color:rgba(255,255,255,.55);border-bottom:1px solid rgba(255,255,255,.05);text-decoration:none;font-family:var(--fm);transition:all .2s}
.hdr-drop a:last-child{border-bottom:none}
.hdr-drop a:hover{color:#fff;background:rgba(139,26,26,.2);padding-left:22px}
.hdr-drop a i{color:var(--altin2);font-size:10px;width:12px}
/* Sağ Aksiyon Butonları */
.hdr-actions{display:flex;align-items:center;gap:8px;flex-shrink:0}
.hdr-search-btn{width:36px;height:36px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.55);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;border-radius:2px}
.hdr-search-btn:hover{border-color:var(--cr3);color:var(--cr3)}
.hdr-bagis{background:var(--cr);color:#fff;font-family:var(--fh);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;padding:9px 18px;text-decoration:none;transition:all .2s;white-space:nowrap;border-radius:2px}
.hdr-bagis:hover{background:var(--cr2)}
/* Hamburger Butonu */
.hdr-mobile-btn{display:none;flex-direction:column;gap:5px;width:36px;height:36px;justify-content:center;align-items:center;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);cursor:pointer;border-radius:2px;padding:0}
.hdr-mobile-btn span{display:block;width:18px;height:2px;background:rgba(255,255,255,.8);transition:all .3s;border-radius:1px}
.hdr-mobile-btn.is-open span:nth-child(1){transform:translateY(7px) rotate(45deg)}
.hdr-mobile-btn.is-open span:nth-child(2){opacity:0;transform:scaleX(0)}
.hdr-mobile-btn.is-open span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}
/* ═══════════════════════════════════════
   MOBİL MENÜ — Sağdan kayan panel
═══════════════════════════════════════ */
#mm-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:8000;opacity:0;transition:opacity .3s}
#mm-overlay.open{display:block;opacity:1}
#mobile-menu{position:fixed;top:0;right:-100%;width:min(320px,85vw);height:100%;background:var(--dk);z-index:8001;overflow-y:auto;transition:right .3s cubic-bezier(.25,.46,.45,.94);display:flex;flex-direction:column;-webkit-overflow-scrolling:touch}
#mobile-menu.open{right:0}
.mm-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0}
.mm-header-logo{font-family:var(--fh);font-size:13px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.5px}
.mm-close{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.7);width:34px;height:34px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:2px;flex-shrink:0}
.mm-close:hover{background:var(--cr);border-color:var(--cr);color:#fff}
.mm-body{flex:1;padding:8px 0;overflow-y:auto}
.mm-item{border-bottom:1px solid rgba(255,255,255,.06)}
.mm-item>a{display:flex;justify-content:space-between;align-items:center;padding:14px 20px;color:rgba(255,255,255,.8);text-decoration:none;font-family:var(--fh);font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:.3px;transition:all .2s}
.mm-item>a:hover{color:#fff;background:rgba(255,255,255,.04)}
.mm-item>a .mm-arr{font-size:10px;opacity:.4;transition:transform .2s}
/* Yeni: ana link + ayrı toggle butonu yan yana */
.mm-item.has-sub{display:flex;flex-direction:row;flex-wrap:wrap;align-items:stretch}
.mm-item.has-sub .mm-item-link{flex:1;display:flex;align-items:center;padding:14px 12px 14px 20px;color:rgba(255,255,255,.8);text-decoration:none;font-family:var(--fh);font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:.3px;transition:all .2s}
.mm-item.has-sub .mm-item-link:hover{color:#fff}
.mm-sub-toggle{background:rgba(255,255,255,.06);border:none;border-left:1px solid rgba(255,255,255,.06);color:rgba(255,255,255,.5);width:46px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0}
.mm-sub-toggle:hover{background:rgba(255,255,255,.1);color:#fff}
.mm-sub-toggle .mm-arr{font-size:11px;transition:transform .2s}
.mm-sub{display:none;background:rgba(0,0,0,.25);width:100%;flex-basis:100%}
.mm-sub.open{display:block}
.mm-sub a{display:block;padding:10px 20px 10px 32px;font-size:12.5px;color:rgba(255,255,255,.45);text-decoration:none;transition:all .2s;border-bottom:1px solid rgba(255,255,255,.04)}
.mm-sub a:last-child{border-bottom:none}
.mm-sub a:hover{color:var(--cr3);padding-left:36px}
.mm-footer{padding:20px;border-top:1px solid rgba(255,255,255,.08);flex-shrink:0}
.mm-bagis{display:flex;align-items:center;justify-content:center;gap:8px;background:var(--cr);color:#fff;padding:14px 20px;font-family:var(--fh);font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;text-decoration:none;border-radius:2px;transition:all .2s}
.mm-bagis:hover{background:var(--cr2)}
/* ═══════════════════════════════════════
   ARAMA KUTUSU
═══════════════════════════════════════ */
#vkv-srch{display:none;position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:9999;align-items:center;justify-content:center}
#vkv-srch.open{display:flex}
.srch-box{background:#fff;width:90%;max-width:540px;padding:28px;border-radius:3px}
.srch-close-btn{margin-top:10px;background:none;border:none;color:#718096;cursor:pointer;font-size:13px}
/* ═══════════════════════════════════════
   RESPONSIVE BREAKPOINTS
═══════════════════════════════════════ */
@media(max-width:900px){
  .hdr-nav{display:none}
  .hdr-mobile-btn{display:flex}
  .hdr-bagis{display:none}   /* Hamburger menüde gösterilecek */
  #topbar .tb-left a:not(:first-child){display:none}
  #topbar .tb-ext{display:none}
  #topbar .tb-right .tb-soc{display:none}
}
@media(max-width:480px){
  #topbar{display:none}  /* Küçük ekranlarda topbar gizle */
  #header .w{padding:0 12px}
  .hdr-logo-text .name{font-size:12px}
  .hdr-logo-text .tag{display:none}
  .hdr-logo-emblem{width:38px;height:38px}
}
</style>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<!-- TOPBAR -->
<div id="topbar">
  <div class="w">
    <div class="tb-left">
      <?php
      $ph = get_theme_mod('vkv_phone', get_theme_mod('tema_telefon', '+90 312 XXX XX XX'));
      $em = get_theme_mod('vkv_email', get_theme_mod('tema_email',   'info@kurum.org.tr'));
      if ($ph): ?><a href="tel:<?php echo esc_attr(preg_replace('/\s/','',$ph)); ?>"><i class="fa fa-phone"></i><?php echo esc_html($ph); ?></a><?php endif; ?>
      <?php if ($em): ?><a href="mailto:<?php echo esc_attr($em); ?>"><i class="fa fa-envelope"></i><?php echo esc_html($em); ?></a><?php endif; ?>
    </div>
    <div class="tb-right">
      <?php foreach (['twitter'=>'fa-brands fa-x-twitter','instagram'=>'fa-brands fa-instagram','facebook'=>'fa-brands fa-facebook-f','youtube'=>'fa-brands fa-youtube'] as $k=>$ic): ?>
        <?php $u = get_theme_mod("vkv_$k"); if ($u): ?><a href="<?php echo esc_url($u); ?>" class="tb-soc" target="_blank" rel="noopener"><i class="<?php echo esc_attr($ic); ?>"></i></a><?php endif; ?>
      <?php endforeach; ?>
      <?php
      /* Dış site linki: site tipine göre otomatik belirle veya customizer'dan oku */
      $_hdr_site_tipi = get_option('vkv_site_tipi', 'vakif');
      $_hdr_dis_site_defaults = array(
          'dernek' => array('url' => 'https://sehitgazi.org.tr/',      'etiket' => 'sehitgazi.org.tr'),
          'vakif'  => array('url' => 'https://vatankahramanlari.org/',  'etiket' => 'vatankahramanlari.org'),
          'tukav'  => array('url' => 'https://turkatav.org/',           'etiket' => 'turkatav.org'),
          'dsv'    => array('url' => 'https://dunyasaglik.org/',        'etiket' => 'dunyasaglik.org'),
      );
      $_hdr_dis_def = isset($_hdr_dis_site_defaults[$_hdr_site_tipi]) ? $_hdr_dis_site_defaults[$_hdr_site_tipi] : array('url'=>'','etiket'=>'');
      $_hdr_dis_url    = get_theme_mod('vkv_ana_site_url', $_hdr_dis_def['url']);
      $_hdr_dis_etiket = get_theme_mod('vkv_ana_site_etiket', $_hdr_dis_def['etiket']);
      if ($_hdr_dis_url): ?>
      <a href="<?php echo esc_url($_hdr_dis_url); ?>" target="_blank" class="tb-ext"><i class="fa fa-globe"></i> <?php echo esc_html($_hdr_dis_etiket); ?></a>
      <?php endif; ?>
    </div>
  </div>
</div>
<!-- HEADER -->
<header id="header">
  <div class="w">
    <!-- Logo -->
    <a href="<?php echo esc_url(home_url('/')); ?>" class="hdr-logo">
      <?php if (has_custom_logo()): the_custom_logo();
      else: ?>
      <div class="hdr-logo-emblem">
        <svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4.18L19 8.3V11c0 4.52-3.1 8.77-7 10.14C8.1 19.77 5 15.52 5 11V8.3l7-3.12z"/></svg>
      </div>
      <div class="hdr-logo-text">
        <div class="name"><?php echo esc_html(get_theme_mod('vkv_logo_name','Vatan Kahramanları Vakfı')); ?></div>
        <div class="tag"><?php echo esc_html(get_theme_mod('vkv_logo_tag','VATANI İÇİN ÖDEYEN KAHRAMANLAR')); ?></div>
      </div>
      <?php endif; ?>
    </a>
    <!-- Desktop Nav -->
    <nav class="hdr-nav">
      <?php
      wp_nav_menu(array(
          'theme_location' => 'primary',
          'container'      => false,
          'items_wrap'     => '%3$s',
          'walker'         => new VKV_Nav_Walker(),
          'fallback_cb'    => 'vkv_header_nav_fallback',
          'depth'          => 2,
      ));
      ?>
    </nav>
    <!-- Sağ Butonlar -->
    <div class="hdr-actions">
      <button class="hdr-search-btn" id="srch-open" aria-label="Ara">
        <i class="fa fa-search"></i>
      </button>
      <?php
      $_hdr_site  = get_option('vkv_site_tipi', 'vakif');
      $_hdr_bagis_url = get_theme_mod('vkv_bagis_url', 'https://donate.stripe.com/14A6oHgabdwQghN8xAb3q07');
      $_hdr_bagis_txt = get_theme_mod('vkv_bagis_text',
          $_hdr_site === 'dsv' ? '💙 Bağış Yapın' : '🛡️ Destek Ol'
      );
      /* DSV'de bağış sayfası iç link olarak açılabilir */
      $_hdr_bagis_href = ($_hdr_site === 'dsv')
          ? esc_url(home_url('/dsv-bagis'))
          : esc_url($_hdr_bagis_url);
      $_hdr_bagis_target = ($_hdr_site === 'dsv') ? '' : 'target="_blank" rel="noopener"';
      ?>
      <a href="<?php echo $_hdr_bagis_href; ?>" class="hdr-bagis" <?php echo $_hdr_bagis_target; ?>><?php echo esc_html($_hdr_bagis_txt); ?></a>
      <button class="hdr-mobile-btn" id="mm-open" aria-label="Menü">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>
</header>
<!-- KARARTMA KATEGORİSİ -->
<div id="mm-overlay"></div>
<!-- MOBİL MENÜ (Sağdan Kayan Panel) -->
<div id="mobile-menu" role="dialog" aria-label="Navigasyon Menüsü">
  <div class="mm-header">
    <span class="mm-header-logo"><?php echo esc_html(get_theme_mod('vkv_logo_name','VKV')); ?></span>
    <button class="mm-close" id="mm-close" aria-label="Kapat">
      <i class="fa fa-times"></i>
    </button>
  </div>
  <div class="mm-body">
    <?php
    $mob_items = get_option('vkv_mobil_nav_items', array());
    if (!empty($mob_items)):
        $mob_tree = array();
        foreach ($mob_items as $item) {
            if (empty($item['label'])) continue;
            if (empty($item['parent'])) {
                $mob_tree[] = array('item'=>$item,'children'=>array());
            } else {
                foreach ($mob_tree as &$branch) {
                    if ($branch['item']['label'] === $item['parent']) {
                        $branch['children'][] = $item;
                        break;
                    }
                }
                unset($branch);
            }
        }
        foreach ($mob_tree as $branch): ?>
    <div class="mm-item">
      <a href="<?php echo esc_url(home_url($branch['item']['url'])); ?>">
        <?php echo esc_html($branch['item']['label']); ?>
        <?php if (!empty($branch['children'])): ?><span class="mm-arr">&#9660;</span><?php endif; ?>
      </a>
      <?php if (!empty($branch['children'])): ?>
      <div class="mm-sub">
        <?php foreach ($branch['children'] as $ch): ?>
        <a href="<?php echo esc_url(home_url($ch['url'])); ?>"><?php echo esc_html($ch['label']); ?></a>
        <?php endforeach; ?>
      </div>
      <?php endif; ?>
    </div>
    <?php endforeach;
    else:
        wp_nav_menu(array(
            'theme_location' => 'primary',
            'container'      => false,
            'items_wrap'     => '%3$s',
            'walker'         => new VKV_Mobile_Walker(),
            'fallback_cb'    => false,
        ));
    endif; ?>
  </div>
  <div class="mm-footer">
    <?php
    $_mm_site   = get_option('vkv_site_tipi', 'vakif');
    $_mm_b_url  = get_theme_mod('vkv_bagis_url', 'https://donate.stripe.com/14A6oHgabdwQghN8xAb3q07');
    $_mm_b_txt  = get_theme_mod('vkv_bagis_text', $_mm_site === 'dsv' ? '💙 Bağış Yapın' : '🛡️ Destek Ol — Bağış Yap');
    $_mm_b_href = ($_mm_site === 'dsv') ? esc_url(home_url('/dsv-bagis')) : esc_url($_mm_b_url);
    $_mm_target = ($_mm_site === 'dsv') ? '' : 'target="_blank" rel="noopener"';
    ?>
    <a href="<?php echo $_mm_b_href; ?>" class="mm-bagis" <?php echo $_mm_target; ?>>
      <?php echo esc_html($_mm_b_txt); ?>
    </a>
  </div>
</div>
<!-- ARAMA -->
<div id="vkv-srch">
  <div class="srch-box">
    <?php get_search_form(); ?>
    <button class="srch-close-btn" id="srch-close">&#10005; Kapat</button>
  </div>
</div>
<script>
(function(){
  var mmOpen    = document.getElementById('mm-open');
  var mmClose   = document.getElementById('mm-close');
  var mmOverlay = document.getElementById('mm-overlay');
  var mm        = document.getElementById('mobile-menu');
  var srchOpen  = document.getElementById('srch-open');
  var srchClose = document.getElementById('srch-close');
  var srch      = document.getElementById('vkv-srch');
  function openMM() {
    mm.classList.add('open');
    mmOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (mmOpen) mmOpen.classList.add('is-open');
  }
  function closeMM() {
    mm.classList.remove('open');
    mmOverlay.classList.remove('open');
    document.body.style.overflow = '';
    if (mmOpen) mmOpen.classList.remove('is-open');
  }
  if (mmOpen)    mmOpen.addEventListener('click', openMM);
  if (mmClose)   mmClose.addEventListener('click', closeMM);
  if (mmOverlay) mmOverlay.addEventListener('click', closeMM);
  /* Escape ile kapat */
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') { closeMM(); if(srch) srch.classList.remove('open'); } });
  /* Alt menü toggle — sadece mm-sub-toggle butonuna bağlı */
  document.querySelectorAll('.mm-sub-toggle').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var item = this.closest('.mm-item');
      var sub  = item ? item.querySelector('.mm-sub') : null;
      if (!sub) return;
      /* Diğer açık alt menüleri kapat */
      document.querySelectorAll('.mm-sub.open').forEach(function(s) {
        if (s !== sub) {
          s.classList.remove('open');
          var prevToggle = s.closest('.mm-item') && s.closest('.mm-item').querySelector('.mm-sub-toggle .mm-arr');
          if (prevToggle) prevToggle.style.transform = '';
        }
      });
      sub.classList.toggle('open');
      var arr = this.querySelector('.mm-arr');
      if (arr) arr.style.transform = sub.classList.contains('open') ? 'rotate(180deg)' : '';
    });
  });
  /* Eski walker yapısından gelen .mm-item > a (alt menüsü varsa) — geri uyumluluk */
  document.querySelectorAll('.mm-item:not(.has-sub) > a').forEach(function(a) {
    /* alt menüsü olmayan öğeler — hiçbir şey yapma, normal link */
  });
  /* Arama */
  if (srchOpen)  srchOpen.addEventListener('click',  function(){ srch.classList.add('open'); });
  if (srchClose) srchClose.addEventListener('click', function(){ srch.classList.remove('open'); });
  if (srch) srch.addEventListener('click', function(e){ if(e.target === srch) srch.classList.remove('open'); });
})();
</script>
