<?php
/**
 * Ahenk Haber - Ana Sayfa
 */
get_header();

// ── Modül görünürlüğü: Önce admin sayfasından kaydedilen option, sonra customizer ──
function ahenk_modul_aktif( $key ) {
    $opt = get_option( 'ahenk_modul_' . $key );
    if ( $opt !== false ) return (bool) $opt;
    $tm_map = array(
        'yazarlar'     => 'ahenk_mod_yazarlar',
        'ikon_bant'    => 'ahenk_mod_ikonbant',
        'son_haberler' => 'ahenk_mod_son_haberler',
    );
    $tm_key = $tm_map[$key] ?? '';
    return $tm_key ? (bool) get_theme_mod($tm_key, 1) : true;
}

// ── İkon bant değeri: admin sayfası → customizer → sabit varsayılan ──
function ahenk_ikon_deger( $i, $alan, $default = '' ) {
    $opt = get_option("ahenk_ikon_{$i}_{$alan}");
    if ( $opt !== false && $opt !== '' ) return $opt;
    $mod = get_theme_mod("ahenk_ikon_{$i}_{$alan}", '');
    if ( $mod !== '' ) return $mod;
    return $default;
}

// Anasayfa kategori slugları
if ( function_exists('ahenk_anasayfa_katlari_al') ) {
    $_blok_sluglar = ahenk_anasayfa_katlari_al();
} else {
    $_blok_varsayilan = array(1=>'gundem',2=>'ankara',3=>'dunya',4=>'spor',5=>'',6=>'',7=>'',8=>'');
    $_blok_sluglar = array();
    for ( $_bi = 1; $_bi <= 8; $_bi++ ) {
        $slug = get_option("ahenk_anasayfa_kat_{$_bi}", '')
             ?: get_option("ahenk_blok_kat_{$_bi}", '')
             ?: get_theme_mod("ahenk_anasayfa_kat_{$_bi}", $_blok_varsayilan[$_bi] ?? '');
        $_blok_sluglar[] = trim((string)$slug);
    }
}
$ana_kat_sluglar = array_values(array_filter($_blok_sluglar));

$manset_q = ahenk_manset_haberleri(9);
?>
<main id="main-content" class="site-main">

<!-- ════ MANŞET ════════════════════════════════════ -->
<?php if ($manset_q && $manset_q->have_posts()) : ?>
<section class="manset-alani">
    <div class="container">
        <div class="manset-ic">
            <div class="manset-slider-wrap">
                <div class="swiper manset-swiper" id="mansetSwiper">
                    <div class="swiper-wrapper">
                        <?php $si = 0;
                        $manset_q->rewind_posts();
                        while ($manset_q->have_posts() && $si < 5) :
                            $manset_q->the_post();
                            $pid  = get_the_ID();
                            $kats = get_the_terms($pid, 'haber-kategorisi');
                            if (!$kats || is_wp_error($kats)) $kats = get_the_category();
                            $kat  = !empty($kats) ? $kats[0] : null;
                            $renk = $kat ? ahenk_kategori_rengi($kat->term_id) : '#D4AF37';
                        ?>
                        <div class="swiper-slide manset-slide">
                            <a href="<?php the_permalink(); ?>" class="manset-link">
                                <div class="manset-resim-wrap" style="background-image:url('<?php echo esc_url(ahenk_thumb_url($pid,'ahenk-manset')); ?>')">
                                    <div class="manset-overlay"></div>
                                </div>
                                <div class="manset-icerik">
                                    <?php if ($kat) : ?>
                                    <span class="manset-kat-badge" style="background:<?php echo esc_attr($renk); ?>"><?php echo esc_html($kat->name); ?></span>
                                    <?php endif; ?>
                                    <h2 class="manset-baslik"><?php the_title(); ?></h2>
                                    <div class="manset-meta"><span><i class="fa fa-clock"></i> <?php echo ahenk_turkce_tarih(); ?></span></div>
                                </div>
                            </a>
                        </div>
                        <?php $si++; endwhile; wp_reset_postdata(); ?>
                    </div>
                    <div class="swiper-pagination manset-pagination"></div>
                    <div class="swiper-button-prev manset-prev"></div>
                    <div class="swiper-button-next manset-next"></div>
                </div>
            </div>
            <!-- 4 Sürmanşet -->
            <div class="surmanset-liste">
                <?php $sj = 0;
                $manset_q->rewind_posts();
                while ($manset_q->have_posts()) :
                    $manset_q->the_post();
                    if ($sj < 5) { $sj++; continue; }
                    if ($sj >= 9) break;
                    $kats2 = get_the_terms(get_the_ID(), 'haber-kategorisi');
                    if (!$kats2 || is_wp_error($kats2)) $kats2 = get_the_category();
                    $kat2  = !empty($kats2) ? $kats2[0] : null;
                    $renk2 = $kat2 ? ahenk_kategori_rengi($kat2->term_id) : '#D4AF37';
                ?>
                <article class="surmanset-item">
                    <a href="<?php the_permalink(); ?>" class="surmanset-link">
                        <div class="surmanset-resim"><img src="<?php echo esc_url(ahenk_thumb_url(null,'ahenk-kucuk')); ?>" alt="<?php echo esc_attr(get_the_title()); ?>" loading="lazy"></div>
                        <div class="surmanset-icerik">
                            <?php if ($kat2) : ?><span class="surmanset-kat" style="color:<?php echo esc_attr($renk2); ?>"><?php echo esc_html($kat2->name); ?></span><?php endif; ?>
                            <h3 class="surmanset-baslik"><?php echo esc_html(ahenk_kirp(get_the_title(),80)); ?></h3>
                            <span class="surmanset-tarih"><i class="fa fa-clock"></i> <?php echo ahenk_turkce_tarih(null,'short'); ?></span>
                        </div>
                    </a>
                </article>
                <?php $sj++; endwhile; wp_reset_postdata(); ?>
            </div>
        </div>
    </div>
</section>
<?php endif; ?>

<!-- ════ SON HABERLER BANDI ═════════════════════════ -->
<?php if ( ahenk_modul_aktif('son_haberler') ) :
$son_haber_q = new WP_Query(array('post_type'=>array('haber','post'),'posts_per_page'=>12,'no_found_rows'=>true,'ignore_sticky_posts'=>true,'orderby'=>'date','order'=>'DESC'));
if ($son_haber_q->have_posts()) : ?>
<section class="son-haberler-bant">
  <div class="container">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0 6px;margin-bottom:10px;border-bottom:2px solid var(--renk-ana,#D4AF37)">
      <h2 style="margin:0;font-size:17px;font-weight:900;color:var(--renk-ana,#D4AF37);display:flex;align-items:center;gap:8px"><i class="fa fa-fire"></i> Son Haberler</h2>
      <a href="<?php echo esc_url(home_url('/')); ?>" style="font-size:12px;font-weight:700;color:var(--renk-ana,#D4AF37);text-decoration:none">Tümü →</a>
    </div>
    <div class="son-haber-scroll" style="display:flex;gap:14px;overflow-x:auto;padding-bottom:10px;-webkit-overflow-scrolling:touch;scrollbar-width:thin">
      <?php while ($son_haber_q->have_posts()) : $son_haber_q->the_post();
        $shid   = get_the_ID();
        $shkats = get_the_terms($shid,'haber-kategorisi');
        if (!$shkats||is_wp_error($shkats)) $shkats = get_the_category();
        $shkat  = !empty($shkats) ? $shkats[0] : null;
        $shrenk = $shkat ? ahenk_kategori_rengi($shkat->term_id) : '#D4AF37';
      ?>
      <div class="son-haber-kart" style="flex-shrink:0;width:220px;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.07)">
        <a href="<?php the_permalink(); ?>" style="display:block;text-decoration:none;color:inherit">
          <div style="height:130px;overflow:hidden;background:#f0f0f0">
            <img src="<?php echo esc_url(ahenk_thumb_url($shid,'ahenk-kart')); ?>" alt="<?php echo esc_attr(get_the_title()); ?>" style="width:100%;height:100%;object-fit:cover;display:block" loading="lazy">
          </div>
          <div style="padding:10px 12px">
            <?php if ($shkat) : ?><span style="font-size:10px;font-weight:800;color:<?php echo esc_attr($shrenk);?>;text-transform:uppercase;margin-bottom:4px;display:block"><?php echo esc_html($shkat->name); ?></span><?php endif; ?>
            <div style="font-size:13px;font-weight:700;line-height:1.4;color:#1a1a1a;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden"><?php the_title(); ?></div>
            <div style="font-size:11px;color:#aaa;margin-top:6px"><i class="fa fa-clock"></i> <?php echo ahenk_turkce_tarih(null,'short'); ?></div>
          </div>
        </a>
      </div>
      <?php endwhile; wp_reset_postdata(); ?>
    </div>
  </div>
</section>
<?php endif; endif; ?>

<!-- ════ İKON BANT ═════════════════════════════════ -->
<?php
// İkon bant: admin sayfası, customizer ve sabit varsayılanları kontrol et
$_ikon_defaults = array(
    1 => array('fa-map-marker-alt', 'Gezilecek Yerler', 'Müze & tarihi yapılar', ''),
    2 => array('fa-camera',         'Foto Galeri',       'Fotoğraf & hikaye',    ''),
    3 => array('fa-utensils',       'Yerel Haberler',    'Bölgesel gelişmeler',  ''),
    4 => array('fa-bullhorn',       'Resmi İlanlar',     'Tüm resmi ilanlar',    ''),
    5 => array('fa-tag',            'Seri İlanlar',      'Bölgesel ilanlar',     ''),
    6 => array('fa-newspaper',      'Spor',              'Güncel maçlar',        ''),
);
// Modül aktif mi? Aktifse ve en az bir başlık varsa göster
$ikon_bant_aktif = ahenk_modul_aktif('ikon_bant');
if ( $ikon_bant_aktif ) : ?>
<div class="ikon-bant">
    <div class="container">
        <div class="ikon-bant-grid">
            <?php for ( $ii = 1; $ii <= 6; $ii++ ) :
                $ikon   = ahenk_ikon_deger($ii, 'icon',   $_ikon_defaults[$ii][0]);
                $baslik = ahenk_ikon_deger($ii, 'baslik', $_ikon_defaults[$ii][1]);
                $acik   = ahenk_ikon_deger($ii, 'acik',   $_ikon_defaults[$ii][2]);
                $link   = ahenk_ikon_deger($ii, 'link',   $_ikon_defaults[$ii][3]);
                if ( ! $baslik ) continue;
            ?>
            <a href="<?php echo esc_url($link ?: '#'); ?>" class="ikon-bant-item">
                <div class="ikon-bant-ikon"><i class="fa <?php echo esc_attr($ikon); ?>"></i></div>
                <div class="ikon-bant-metin">
                    <strong><?php echo esc_html($baslik); ?></strong>
                    <span><?php echo esc_html($acik); ?></span>
                </div>
            </a>
            <?php endfor; ?>
        </div>
    </div>
</div>
<?php endif; ?>

<!-- ════ MANŞET ALTI REKLAM ════════════════════════ -->
<?php $ah_rek = get_option('ahenk_reklam_after_hero','');
if ($ah_rek) : ?>
<div class="manset-alti-reklam"><div class="container" style="text-align:center"><?php echo wp_kses_post($ah_rek); ?></div></div>
<?php endif; ?>

<!-- ════ KÖŞE YAZARLARI (sağ sidebar yazar widget stili) ════════════════ -->
<?php if ( ahenk_modul_aktif('yazarlar') ) :
// Yazar listesi — eklentiden (panelden eklenen) yazarlar, tema panelindeki sıralamaya göre.
$_panel_yazarlar = function_exists('ahenk_yazarlar_sirali')
    ? ahenk_yazarlar_sirali(0)
    : ( function_exists('ky_yazarlar_al') ? ky_yazarlar_al(true) : array() );

$_ky_yazarlar = array();
foreach ( (array) $_panel_yazarlar as $_yz ) {
    if ( empty($_yz) || empty($_yz->id) ) continue;
    $_son = function_exists('ahenk_yazar_son_yazi') ? ahenk_yazar_son_yazi($_yz->id) : null;
    $_ky_yazarlar[] = (object) array(
        'ad'         => isset($_yz->ad)       ? $_yz->ad       : '',
        'slug'       => isset($_yz->slug)     ? $_yz->slug     : '',
        'foto'       => isset($_yz->foto)     ? $_yz->foto     : '',
        'kose_adi'   => isset($_yz->kose_adi) ? $_yz->kose_adi : '',
        'son_baslik' => $_son ? $_son->baslik : '',
        'son_link'   => $_son ? $_son->link   : '',
    );
}
if ( ! empty($_ky_yazarlar) ) : ?>
<section class="anasayfa-yazarlar-bolum" style="padding:20px 0 4px;background:#fff;border-top:2px solid #f0f0f0">
  <div class="container">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;border-bottom:2px solid var(--renk-ana,#D4AF37);padding-bottom:8px">
      <h2 style="margin:0;font-size:17px;font-weight:900;color:var(--renk-ana,#D4AF37);display:flex;align-items:center;gap:8px">
        <i class="fa fa-pen-nib"></i> Köşe Yazarları
      </h2>
      <a href="<?php echo esc_url(home_url('/yazarlar')); ?>" style="font-size:12px;font-weight:700;color:var(--renk-ana,#D4AF37);text-decoration:none">Tümü →</a>
    </div>

    <!-- Sağ sidebar'daki yazar widget'ı ile birebir aynı görünüm (sutun=1 kart stili),
         birden fazla yazarı yatayda göstermek için grid ile çoklu kolon -->
    <div class="ky-grid ky-cols-1 anasayfa-yazar-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;margin:0">
      <?php foreach ($_ky_yazarlar as $_ky_yazar) :
        $_ky_link = esc_url( home_url('/yazar/' . $_ky_yazar->slug . '/') );
        if ( $_ky_yazar->foto ) {
            $_ky_foto_html = '<img src="' . esc_url($_ky_yazar->foto) . '" alt="' . esc_attr($_ky_yazar->ad) . '" class="ky-kart-foto">';
        } else {
            $_ky_harf = esc_html( mb_strtoupper( mb_substr($_ky_yazar->ad, 0, 1) ) );
            $_ky_foto_html = '<div class="ky-kart-harf">' . $_ky_harf . '</div>';
        }
      ?>
      <div class="ky-kart">
        <a href="<?php echo $_ky_link; ?>" class="ky-kart-link">
          <div class="ky-kart-foto-wrap"><?php echo $_ky_foto_html; ?></div>
          <div class="ky-kart-bilgi">
            <?php if ( ! empty($_ky_yazar->kose_adi) ) : ?>
              <span class="ky-kose-rozet"><?php echo esc_html($_ky_yazar->kose_adi); ?></span>
            <?php endif; ?>
            <strong class="ky-kart-ad"><?php echo esc_html($_ky_yazar->ad); ?></strong>
            <?php if ( ! empty($_ky_yazar->son_baslik) ) : ?>
              <span class="ky-kart-son-yazi" style="display:block;font-size:12.5px;font-weight:600;color:#555;line-height:1.4;margin-top:4px">
                <i class="fa fa-feather-alt" style="color:var(--renk-ana,#D4AF37);margin-right:4px"></i>
                <?php echo esc_html( ahenk_kirp($_ky_yazar->son_baslik, 70) ); ?>
              </span>
            <?php endif; ?>
          </div>
        </a>
      </div>
      <?php endforeach; ?>
    </div>
  </div>
</section>
<?php endif; endif; ?>

<!-- ════ ANA İÇERİK + SIDEBAR ══════════════════════ -->
<div style="padding:16px 0 40px">
<div class="container">
<div class="icerik-sidebar-sarici">
<div class="ana-icerik">

<?php foreach ($ana_kat_sluglar as $kat_slug) :
    if (empty($kat_slug)) continue;
    $kat_obj = get_term_by('slug', $kat_slug, 'haber-kategorisi');
    if (!$kat_obj || is_wp_error($kat_obj)) $kat_obj = get_term_by('slug', $kat_slug, 'category');
    if (!$kat_obj || is_wp_error($kat_obj)) continue;
    $kat_renk = ahenk_kategori_rengi($kat_obj->term_id);
    $blok_q   = ahenk_kategori_haberleri($kat_slug, 5);
    if (!$blok_q || !$blok_q->have_posts()) continue;
?>

<section class="kategori-blok" style="margin-bottom:20px;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.07)">
    <div class="blok-header" style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:#fafafa;border-bottom:1px solid #f0f0f0">
        <h2 style="margin:0;font-size:16px;font-weight:900;color:<?php echo esc_attr($kat_renk); ?>;border-left:4px solid <?php echo esc_attr($kat_renk); ?>;padding-left:10px">
            <a href="<?php echo esc_url(get_term_link($kat_obj)); ?>" style="color:inherit"><?php echo esc_html($kat_obj->name); ?></a>
        </h2>
        <a href="<?php echo esc_url(get_term_link($kat_obj)); ?>" style="font-size:12px;font-weight:700;color:<?php echo esc_attr($kat_renk); ?>">Tümü →</a>
    </div>
    <div style="display:grid;grid-template-columns:380px 1fr;min-height:260px">
        <?php
        $bi = 0; $buyuk = null; $liste = array();
        while ($blok_q->have_posts()) {
            $blok_q->the_post();
            if ($bi === 0) {
                $buyuk = array(
                    'link'   => get_permalink(),
                    'baslik' => get_the_title(),
                    'spot'   => get_post_meta(get_the_ID(),'_haber_spot',true) ?: get_the_excerpt(),
                    'thumb'  => ahenk_thumb_url(null,'ahenk-manset'),
                    'tarih'  => ahenk_turkce_tarih(null,'short'),
                );
            } else {
                $liste[] = array(
                    'link'   => get_permalink(),
                    'baslik' => get_the_title(),
                    'thumb'  => ahenk_thumb_url(null,'thumbnail'),
                    'tarih'  => ahenk_turkce_tarih(null,'short'),
                );
            }
            $bi++;
        }
        wp_reset_postdata();
        ?>
        <?php if ($buyuk) : ?>
        <div style="border-right:1px solid #f0f0f0">
            <a href="<?php echo esc_url($buyuk['link']); ?>" style="display:flex;flex-direction:column;height:100%;color:inherit;text-decoration:none">
                <div style="position:relative;overflow:hidden;height:220px;background:#f0f0f0;flex-shrink:0">
                    <img src="<?php echo esc_url($buyuk['thumb']); ?>" alt="<?php echo esc_attr($buyuk['baslik']); ?>" style="width:100%;height:100%;object-fit:cover;display:block" loading="eager">
                    <span style="position:absolute;bottom:8px;left:8px;background:<?php echo esc_attr($kat_renk); ?>;color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:3px;text-transform:uppercase"><?php echo esc_html($kat_obj->name); ?></span>
                </div>
                <div style="padding:12px 14px;flex:1">
                    <h3 style="font-size:15px;font-weight:800;color:#1a1a1a;line-height:1.45;margin:0 0 8px"><?php echo esc_html(ahenk_kirp($buyuk['baslik'],100)); ?></h3>
                    <?php if ($buyuk['spot']) : ?><p style="font-size:13px;color:#666;line-height:1.55;margin:0 0 8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden"><?php echo esc_html(ahenk_kirp($buyuk['spot'],120)); ?></p><?php endif; ?>
                    <div style="font-size:11px;color:#aaa"><span><i class="fa fa-clock"></i> <?php echo esc_html($buyuk['tarih']); ?></span></div>
                </div>
            </a>
        </div>
        <?php endif; ?>
        <div style="display:flex;flex-direction:column">
            <?php foreach ($liste as $li) : ?>
            <div style="border-bottom:1px solid #f5f5f5;flex:1">
                <a href="<?php echo esc_url($li['link']); ?>" style="display:flex;align-items:center;gap:10px;padding:11px 14px;text-decoration:none;color:inherit;height:100%">
                    <div style="width:80px;height:56px;flex-shrink:0;border-radius:5px;overflow:hidden;background:#f0f0f0">
                        <img src="<?php echo esc_url($li['thumb']); ?>" alt="<?php echo esc_attr($li['baslik']); ?>" style="width:100%;height:100%;object-fit:cover;display:block" loading="lazy">
                    </div>
                    <div style="flex:1;min-width:0">
                        <div style="font-size:13px;font-weight:700;color:#1a1a1a;line-height:1.4;margin-bottom:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden"><?php echo esc_html(ahenk_kirp($li['baslik'],75)); ?></div>
                        <div style="font-size:11px;color:#aaa"><i class="fa fa-clock"></i> <?php echo esc_html($li['tarih']); ?></div>
                    </div>
                </a>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<?php endforeach; ?>

<!-- ════ TÜM HABERLER (Sonsuz Kaydırma) ═════════════ -->
<?php
$ahenk_inf_per_page = 9;
$ahenk_inf_first    = new WP_Query(array(
    'post_type'      => array('haber','post'),
    'post_status'    => 'publish',
    'posts_per_page' => $ahenk_inf_per_page,
    'paged'          => 1,
    'orderby'        => 'date',
    'order'          => 'DESC',
    'ignore_sticky_posts' => true,
));
$ahenk_inf_max_pages = (int) $ahenk_inf_first->max_num_pages;
?>
<section class="anasayfa-tum-haberler" style="margin-top:6px;background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.07);padding:14px 16px 18px">
    <div class="blok-header" style="display:flex;align-items:center;justify-content:space-between;padding:0 0 10px;margin-bottom:14px;border-bottom:2px solid var(--renk-ana,#D4AF37)">
        <h2 style="margin:0;font-size:17px;font-weight:900;color:var(--renk-ana,#D4AF37);display:flex;align-items:center;gap:8px">
            <i class="fa fa-newspaper"></i> Tüm Haberler
        </h2>
    </div>

    <div id="ahenkInfList"
         class="ahenk-inf-grid"
         data-page="1"
         data-max="<?php echo esc_attr($ahenk_inf_max_pages); ?>"
         data-per="<?php echo esc_attr($ahenk_inf_per_page); ?>"
         data-nonce="<?php echo esc_attr(wp_create_nonce('ahenk_inf_nonce')); ?>"
         style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px">
        <?php
        if ($ahenk_inf_first->have_posts()) :
            while ($ahenk_inf_first->have_posts()) : $ahenk_inf_first->the_post();
                $ihid   = get_the_ID();
                $ihkats = get_the_terms($ihid, 'haber-kategorisi');
                if (!$ihkats || is_wp_error($ihkats)) $ihkats = get_the_category();
                $ihkat  = !empty($ihkats) ? $ihkats[0] : null;
                $ihrenk = $ihkat ? ahenk_kategori_rengi($ihkat->term_id) : '#D4AF37';
        ?>
        <article class="ahenk-inf-kart" style="background:#fff;border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;display:flex;flex-direction:column">
            <a href="<?php the_permalink(); ?>" style="display:block;text-decoration:none;color:inherit">
                <div style="height:150px;background:#f0f0f0;overflow:hidden">
                    <img src="<?php echo esc_url(ahenk_thumb_url($ihid,'ahenk-kart')); ?>" alt="<?php echo esc_attr(get_the_title()); ?>" style="width:100%;height:100%;object-fit:cover;display:block" loading="lazy">
                </div>
                <div style="padding:10px 12px 12px">
                    <?php if ($ihkat) : ?>
                        <span style="display:block;font-size:10px;font-weight:800;color:<?php echo esc_attr($ihrenk); ?>;text-transform:uppercase;margin-bottom:4px"><?php echo esc_html($ihkat->name); ?></span>
                    <?php endif; ?>
                    <h3 style="font-size:14px;font-weight:700;line-height:1.4;color:#1a1a1a;margin:0 0 6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden"><?php the_title(); ?></h3>
                    <div style="font-size:11px;color:#999"><i class="fa fa-clock"></i> <?php echo ahenk_turkce_tarih(null,'short'); ?></div>
                </div>
            </a>
        </article>
        <?php
            endwhile;
            wp_reset_postdata();
        else :
            echo '<p style="grid-column:1/-1;color:#888;text-align:center;padding:20px">Henüz haber yok.</p>';
        endif;
        ?>
    </div>

    <div id="ahenkInfStatus" style="text-align:center;padding:16px 0;font-size:13px;color:#888;display:<?php echo $ahenk_inf_max_pages > 1 ? 'block' : 'none'; ?>">
        <span class="ahenk-inf-loader" style="display:none">
            <i class="fa fa-spinner fa-spin" style="color:var(--renk-ana,#D4AF37)"></i> Yükleniyor...
        </span>
        <span class="ahenk-inf-end" style="display:none">Tüm haberler yüklendi.</span>
    </div>
    <div id="ahenkInfButonSar" style="text-align:center;padding:10px 0 6px;display:<?php echo $ahenk_inf_max_pages > 1 ? 'block' : 'none'; ?>">
        <button type="button" id="ahenkInfButon"
                style="display:inline-block;background:var(--renk-ana,#D4AF37);color:#fff;border:none;padding:12px 28px;border-radius:30px;font-size:14px;font-weight:800;cursor:pointer;box-shadow:0 4px 14px rgba(212,175,55,.25);min-width:220px">
            ↓ Daha Fazla Haber Yükle
        </button>
    </div>
</section>

<script>
(function(){
    var list     = document.getElementById('ahenkInfList');
    var status   = document.getElementById('ahenkInfStatus');
    var buton    = document.getElementById('ahenkInfButon');
    var butonSar = document.getElementById('ahenkInfButonSar');
    if (!list || !buton) return;
    var loader   = status ? status.querySelector('.ahenk-inf-loader') : null;
    var endMsg   = status ? status.querySelector('.ahenk-inf-end')    : null;

    var maxPages = parseInt(list.getAttribute('data-max'), 10) || 1;
    var perPage  = parseInt(list.getAttribute('data-per'), 10) || 9;
    var nonce    = list.getAttribute('data-nonce') || '';
    var loading  = false;
    var done     = maxPages <= 1;

    function showLoader(s){ if (loader) loader.style.display = s ? 'inline-block' : 'none'; }
    function showEnd(){
        if (endMsg) endMsg.style.display = 'inline-block';
        if (loader) loader.style.display = 'none';
        if (butonSar) butonSar.style.display = 'none';
    }

    function loadMore(){
        if (loading || done) return;
        var nextPage = (parseInt(list.getAttribute('data-page'),10) || 1) + 1;
        if (nextPage > maxPages) { done = true; showEnd(); return; }
        loading = true;
        showLoader(true);
        buton.disabled = true;

        var ajaxurl = (window.ahenkAjax && window.ahenkAjax.ajaxurl) ? window.ahenkAjax.ajaxurl : '/wp-admin/admin-ajax.php';
        var fd = new FormData();
        fd.append('action', 'ahenk_inf_haberler');
        fd.append('nonce', nonce);
        fd.append('page', nextPage);
        fd.append('per_page', perPage);

        fetch(ajaxurl, { method: 'POST', body: fd, credentials: 'same-origin' })
            .then(function(r){ return r.json(); })
            .then(function(res){
                if (res && res.success && res.data && res.data.html) {
                    list.insertAdjacentHTML('beforeend', res.data.html);
                    list.setAttribute('data-page', String(nextPage));
                    if (nextPage >= maxPages || res.data.done) { done = true; showEnd(); }
                } else {
                    done = true;
                    showEnd();
                }
            })
            .catch(function(){ done = true; showEnd(); })
            .finally(function(){
                loading = false;
                showLoader(false);
                buton.disabled = false;
            });
    }

    // Sadece manuel buton — otomatik sonsuz kaydırma kapatıldı (footer görünür kalsın).
    buton.addEventListener('click', loadMore);
})();
</script>

</div><!-- .ana-icerik -->
<aside class="sidebar" role="complementary"><?php get_sidebar(); ?></aside>
</div>
</div>
</div>

</main>
<?php get_footer(); ?>
