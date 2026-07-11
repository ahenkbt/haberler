<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }
$site_title = VTV_DB::get_ayar( 'site_basligi', 'Video TV' );
$uid        = 'vtv' . substr( md5(uniqid()), 0, 6 );
?>
<div class="vtv-app" id="<?php echo esc_attr($uid); ?>">

  <header class="vtv-topbar">
    <div class="vtv-topbar-left">
      <button class="vtv-menu-toggle" onclick="vtvToggleSidebar('<?php echo esc_js($uid); ?>')">
        <span></span><span></span><span></span>
      </button>
      <a href="#" class="vtv-logo" onclick="vtvGo('home','<?php echo esc_js($uid); ?>');return false;">
        <span class="vtv-logo-icon">&#9654;</span> <?php echo esc_html($site_title); ?>
      </a>
    </div>
    <div class="vtv-search-wrap">
      <form class="vtv-search-form" onsubmit="vtvSearch('<?php echo esc_js($uid); ?>');return false;">
        <span class="vtv-search-icon">&#128269;</span>
        <input type="text" class="vtv-search-input" id="<?php echo esc_attr($uid); ?>-search"
               placeholder="Video, kanal, içerik ara..." autocomplete="off">
        <button type="submit" class="vtv-search-btn">Ara</button>
      </form>
    </div>
    <div class="vtv-topbar-right">
      <button class="vtv-nav-btn" onclick="vtvGo('home','<?php echo esc_js($uid); ?>')">Ana Sayfa</button>
      <button class="vtv-nav-btn" onclick="vtvGo('kanallar','<?php echo esc_js($uid); ?>')">Kanallar</button>
      <button class="vtv-nav-btn" onclick="vtvGo('one-cikanlar','<?php echo esc_js($uid); ?>')">&#11088; Öne Çıkanlar</button>
    </div>
  </header>

  <div class="vtv-main-wrap" id="<?php echo esc_attr($uid); ?>-main">

    <aside class="vtv-sidebar" id="<?php echo esc_attr($uid); ?>-sidebar">
      <div class="vtv-sb-section">
        <div class="vtv-sb-head">Menü</div>
        <a href="#" class="vtv-sb-link vtv-sb-active" data-key="home" onclick="vtvGo('home','<?php echo esc_js($uid); ?>');return false;">
          <span>&#127968;</span> Ana Sayfa
        </a>
        <a href="#" class="vtv-sb-link" data-key="kanallar" onclick="vtvGo('kanallar','<?php echo esc_js($uid); ?>');return false;">
          <span>&#128250;</span> Kanallar
        </a>
        <a href="#" class="vtv-sb-link" data-key="one-cikanlar" onclick="vtvGo('one-cikanlar','<?php echo esc_js($uid); ?>');return false;">
          <span>&#11088;</span> Öne Çıkanlar
        </a>
      </div>
      <div class="vtv-sb-section" id="<?php echo esc_attr($uid); ?>-sb-populer">
        <div class="vtv-sb-head">Popüler</div>
        <div class="vtv-sb-loading">Yükleniyor...</div>
      </div>
      <div class="vtv-sb-section" id="<?php echo esc_attr($uid); ?>-sb-kategoriler">
        <div class="vtv-sb-head">Kategoriler</div>
        <div class="vtv-sb-loading">Yükleniyor...</div>
      </div>
      <div class="vtv-sb-section">
        <a href="#" class="vtv-sb-link vtv-sb-daha" onclick="vtvGo('kanallar','<?php echo esc_js($uid); ?>');return false;">
          + Tüm Kanallar
        </a>
      </div>
    </aside>

    <main class="vtv-content" id="<?php echo esc_attr($uid); ?>-content">
      <div class="vtv-spinner" id="<?php echo esc_attr($uid); ?>-spinner">
        <div class="vtv-spin"></div>
      </div>
    </main>

  </div>

</div>
<script>
window['<?php echo esc_js($uid); ?>'] = { uid: '<?php echo esc_js($uid); ?>', data: null };
</script>
