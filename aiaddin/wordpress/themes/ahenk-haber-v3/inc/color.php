<?php
/**
 * Ahenk Haber v3 — Dinamik Renk CSS (Birportal uyumlu gradient sistemi)
 * header.php içinden get_template_part('inc/color') ile çağrılır
 */
if ( ! defined('ABSPATH') ) exit;

$sol  = get_theme_mod('ahenk_renk_header_sol',  '#CC0000');
$sag  = get_theme_mod('ahenk_renk_header_sag',  '#8B0000');
$bs   = get_theme_mod('ahenk_renk_bilesen_sol',  '#1A4A8A');
$bsg  = get_theme_mod('ahenk_renk_bilesen_sag',  '#0d2d5a');
$ts   = get_theme_mod('ahenk_renk_tab3_sol',     '#7B1FA2');
$tsg  = get_theme_mod('ahenk_renk_tab3_sag',     '#4A148C');
$fbg  = get_theme_mod('ahenk_renk_footer_bg',    '#1a1a1a');
$fth  = get_theme_mod('ahenk_renk_footer_hover', '#CC0000');
$genel= get_theme_mod('ahenk_renk_genel_link',   '#CC0000');
?>
<style id="ahenk-dinamik-renkler">
/* ── Gradient Tanımları (Birportal uyumlu) ─────────── */
:root {
  --renk-ana:        <?php echo esc_attr(get_theme_mod('ahenk_renk_ana','#CC0000')); ?>;
  --renk-ikincil:    <?php echo esc_attr(get_theme_mod('ahenk_renk_ikincil','#1A4A8A')); ?>;
  --renk-navbar:     <?php echo esc_attr(get_theme_mod('ahenk_renk_navbar','#1a1a1a')); ?>;
  --renk-navbar-yazi:<?php echo esc_attr(get_theme_mod('ahenk_renk_navbar_yazi','#ffffff')); ?>;
  --renk-sd:         <?php echo esc_attr(get_theme_mod('ahenk_renk_sd','#CC0000')); ?>;
  --renk-finans:     <?php echo esc_attr(get_theme_mod('ahenk_renk_finans','#1a1a1a')); ?>;
  --grad-header:     linear-gradient(to left, <?php echo esc_attr($sol); ?>, <?php echo esc_attr($sag); ?>);
  --grad-bilesen:    linear-gradient(to left, <?php echo esc_attr($bs); ?>, <?php echo esc_attr($bsg); ?>);
  --grad-tab3:       linear-gradient(to right, <?php echo esc_attr($ts); ?>, <?php echo esc_attr($tsg); ?>);
  --footer-bg:       <?php echo esc_attr($fbg); ?>;
  --footer-hover:    <?php echo esc_attr($fth); ?>;
  --genel-link:      <?php echo esc_attr($genel); ?>;
}

/* ── Header / Navbar Gradient ─────────────────────── */
.site-header,.ana-nav,.headBar,.bg,.sd-etiket,
.ust-bar,.mobil-drawer-header {
  background-image: var(--grad-header) !important;
}

/* ── Bileşen Bar (Tab başlıkları, bölüm başları) ──── */
.blok-header-grad,.bg2,.tab-menu-ust,.hikaye-bant {
  background-image: var(--grad-bilesen) !important;
}

/* ── Tab Menu 3 (üçüncü tab grubu) ───────────────── */
.bg3,.tab-grup-3 .tab-baslik {
  background-image: var(--grad-tab3) !important;
}

/* ── Footer ────────────────────────────────────────── */
.site-footer,.footer,.fSocial,.footer-ust { background: var(--footer-bg) !important; }
.footer-alt,.footerMenu { background: <?php echo esc_attr(adjust_color($fbg, -15)); ?> !important; }
.footer-baslik,.footer-liste a:hover,.footerMenu ul li a:hover { color: var(--footer-hover) !important; }

/* ── Genel Hover / Link ────────────────────────────── */
a:hover,.pTitle:hover,.shTitle:hover,.kat-badge {
  color: var(--genel-link) !important;
}
.blok-header h2 a,.kategori-blok .blok-header h2 { color: var(--genel-link) !important; }

/* ── Son Dakika Bandı ──────────────────────────────── */
.son-dakika-bar,.sd-etiket { background: var(--renk-sd) !important; }

/* ── Finans Bandı ──────────────────────────────────── */
.finans-band { background: var(--renk-finans) !important; }

/* ── Ana Nav ───────────────────────────────────────── */
.ana-nav { background-image: var(--grad-header) !important; }
.ana-menu > li.current-menu-item > a,
.ana-menu > li:hover > a { border-bottom-color: #fff !important; }

/* ── Slider/Manşet butonlar ────────────────────────── */
.swiper-button-next,.swiper-button-prev,
.owl-nav .owl-next:hover,.owl-nav .owl-prev:hover {
  background-image: var(--grad-header) !important;
}
.swiper-pagination-bullet-active { background: <?php echo esc_attr($sol); ?> !important; }

/* ── İkon Bant ─────────────────────────────────────── */
.ikon-bant { background-image: var(--grad-bilesen) !important; }
.ikon-bant-item:hover .ikon-bant-ikon { background: <?php echo esc_attr($sol); ?> !important; }

/* ── Trend sayaç çubuğu ────────────────────────────── */
.trend-progress-bar { background-image: var(--grad-header) !important; }

/* ── Video bölümü başlık ───────────────────────────── */
.video-bolum-baslik,.tab-menu li.aktif,.tab-menu li:hover {
  border-bottom-color: <?php echo esc_attr($sol); ?> !important;
  color: <?php echo esc_attr($sol); ?> !important;
}

/* ── WhatsApp yüzen buton ──────────────────────────── */
.wp-yuzen-btn { background-image: var(--grad-header) !important; }

/* ── Mega menü dropdown ────────────────────────────── */
.mega-menu-panel,.sub-mega-menu {
  border-top: 3px solid <?php echo esc_attr($sol); ?>;
}

/* ── Kategori rozetleri ────────────────────────────── */
.manset-kat-badge,.surmanset-kat,.kategori-renk-badge {
  background-image: var(--grad-header) !important;
}

/* ── Hikaye/Story daire kenarlığı ──────────────────── */
.hikaye-halka {
  background-image: var(--grad-header) !important;
}
</style>
<?php
/**
 * Rengi koyulaştır/açar (basit hex manipülasyon)
 */
if ( ! function_exists('adjust_color') ) {
    function adjust_color( $hex, $amount ) {
        $hex = ltrim($hex, '#');
        if ( strlen($hex) === 3 ) {
            $hex = $hex[0].$hex[0].$hex[1].$hex[1].$hex[2].$hex[2];
        }
        $r = max(0, min(255, hexdec(substr($hex,0,2)) + $amount));
        $g = max(0, min(255, hexdec(substr($hex,2,2)) + $amount));
        $b = max(0, min(255, hexdec(substr($hex,4,2)) + $amount));
        return sprintf('#%02x%02x%02x', $r, $g, $b);
    }
}
