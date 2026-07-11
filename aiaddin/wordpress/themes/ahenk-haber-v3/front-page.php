<?php
/**
 * Ahenk Haber - Ana Sayfa
 */
get_header();

// Anasayfa kategori slugları (Özelleştir → Site Yönetici panelinden ayarlanır)
$ana_kat_sluglar = function_exists('ahenk_anasayfa_katlari_al')
    ? ahenk_anasayfa_katlari_al()
    : array(
        get_theme_mod('ahenk_anasayfa_kat_1', 'gundem'),
        get_theme_mod('ahenk_anasayfa_kat_2', 'ankara'),
        get_theme_mod('ahenk_anasayfa_kat_3', 'dunya'),
        get_theme_mod('ahenk_anasayfa_kat_4', 'spor'),
    );

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
                            $renk = $kat ? ahenk_kategori_rengi($kat->term_id) : '#CC0000';
                        ?>
                        <div class="swiper-slide manset-slide">
                            <a href="<?php the_permalink(); ?>" class="manset-link">
                                <div class="manset-resim-wrap" style="background-image:url('<?php echo esc_url(ahenk_thumb_url($pid, 'ahenk-manset')); ?>')">
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
            <!-- 3 Sürmanşet -->
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
                    $renk2 = $kat2 ? ahenk_kategori_rengi($kat2->term_id) : '#CC0000';
                ?>
                <article class="surmanset-item">
                    <a href="<?php the_permalink(); ?>" class="surmanset-link">
                        <div class="surmanset-resim"><img src="<?php echo esc_url(ahenk_thumb_url(null, 'ahenk-kucuk')); ?>" alt="<?php echo esc_attr(get_the_title()); ?>" loading="lazy"></div>
                        <div class="surmanset-icerik">
                            <?php if ($kat2) : ?><span class="surmanset-kat" style="color:<?php echo esc_attr($renk2); ?>"><?php echo esc_html($kat2->name); ?></span><?php endif; ?>
                            <h3 class="surmanset-baslik"><?php echo esc_html(ahenk_kirp(get_the_title(), 80)); ?></h3>
                            <span class="surmanset-tarih"><i class="fa fa-clock"></i> <?php echo ahenk_turkce_tarih(null, 'short'); ?></span>
                        </div>
                    </a>
                </article>
                <?php $sj++; endwhile; wp_reset_postdata(); ?>
            </div>
        </div>
    </div>
</section>
<?php endif; ?>

<!-- ════ İKON BANT ═════════════════════════════════ -->
<?php
$ikon_var = false;
for ($ii = 1; $ii <= 6; $ii++) {
    if (get_theme_mod("ahenk_ikon_{$ii}_baslik", '')) { $ikon_var = true; break; }
}
if ($ikon_var) :
$vd = array(
    1 => array('fa-check-circle', 'Responsive', ''),
    2 => array('fa-newspaper', 'İçerik', ''),
    3 => array('fa-search', 'SEO', ''),
    4 => array('fa-bullhorn', 'Manşet', ''),
    5 => array('fa-cogs', 'Servisler', ''),
    6 => array('fa-ad', 'Reklam', ''),
);
?>
<div class="ikon-bant">
    <div class="container">
        <div class="ikon-bant-grid">
            <?php for ($ii = 1; $ii <= 6; $ii++) :
                $ikon   = get_theme_mod("ahenk_ikon_{$ii}_icon",    $vd[$ii][0]);
                $baslik = get_theme_mod("ahenk_ikon_{$ii}_baslik",  $vd[$ii][1]);
                $acik   = get_theme_mod("ahenk_ikon_{$ii}_acik",    $vd[$ii][2]);
                $link   = get_theme_mod("ahenk_ikon_{$ii}_link",    '#');
                if (!$baslik) continue;
            ?>
            <a href="<?php echo esc_url($link ?: '#'); ?>" class="ikon-bant-item">
                <div class="ikon-bant-ikon"><i class="fa <?php echo esc_attr($ikon); ?>"></i></div>
                <div class="ikon-bant-metin"><strong><?php echo esc_html($baslik); ?></strong><span><?php echo esc_html($acik); ?></span></div>
            </a>
            <?php endfor; ?>
        </div>
    </div>
</div>
<?php endif; ?>

<!-- ════ MANŞET ALTI REKLAM ════════════════════════ -->
<?php $ah_rek = get_option('ahenk_reklam_after_hero', '');
if ($ah_rek) : ?>
<div class="manset-alti-reklam"><div class="container" style="text-align:center"><?php echo wp_kses_post($ah_rek); ?></div></div>
<?php endif; ?>

<!-- ════ ANA İÇERİK + SIDEBAR ══════════════════════ -->
<div style="padding:16px 0 40px">
<div class="container">
<div class="icerik-sidebar-sarici">
<div class="ana-icerik">

<?php
// Kategori blokları - daha geniş taxonomy araması
foreach ($ana_kat_sluglar as $kat_slug) :
    if (empty($kat_slug)) continue;

    // Önce haber-kategorisi taxonomy'sinde ara
    $kat_obj = get_term_by('slug', $kat_slug, 'haber-kategorisi');
    // Bulamazsa standart category'de ara
    if (!$kat_obj || is_wp_error($kat_obj)) {
        $kat_obj = get_term_by('slug', $kat_slug, 'category');
    }
    if (!$kat_obj || is_wp_error($kat_obj)) continue;

    $kat_renk = ahenk_kategori_rengi($kat_obj->term_id);

    // Haberleri çek - 5 haber (1 büyük + 4 liste)
    $blok_q = ahenk_kategori_haberleri($kat_slug, 5);
    if (!$blok_q || !$blok_q->have_posts()) continue;
?>

<section class="kategori-blok" style="margin-bottom:20px;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.07)">
    <div class="blok-header" style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:#fafafa;border-bottom:1px solid #f0f0f0">
        <h2 style="margin:0;font-size:16px;font-weight:900;color:<?php echo esc_attr($kat_renk); ?>;border-left:4px solid <?php echo esc_attr($kat_renk); ?>;padding-left:10px">
            <a href="<?php echo esc_url(get_term_link($kat_obj)); ?>" style="color:inherit"><?php echo esc_html($kat_obj->name); ?></a>
        </h2>
        <a href="<?php echo esc_url(get_term_link($kat_obj)); ?>" style="font-size:12px;font-weight:700;color:<?php echo esc_attr($kat_renk); ?>">Tümü →</a>
    </div>

    <!-- 1 BÜYÜK SOL + 4 LİSTE SAĞ -->
    <div style="display:grid;grid-template-columns:380px 1fr;min-height:260px">
        <?php
        $bi = 0;
        $buyuk = null;
        $liste = array();
        while ($blok_q->have_posts()) {
            $blok_q->the_post();
            if ($bi === 0) {
                $buyuk = array(
                    'link'   => get_permalink(),
                    'baslik' => get_the_title(),
                    'spot'   => get_post_meta(get_the_ID(), '_haber_spot', true) ?: get_the_excerpt(),
                    'thumb'  => ahenk_thumb_url(null, 'ahenk-manset'),
                    'tarih'  => ahenk_turkce_tarih(null, 'short'),
                    'sure'   => ahenk_okuma_suresi(),
                );
            } else {
                $liste[] = array(
                    'link'   => get_permalink(),
                    'baslik' => get_the_title(),
                    'thumb'  => ahenk_thumb_url(null, 'thumbnail'),
                    'tarih'  => ahenk_turkce_tarih(null, 'short'),
                );
            }
            $bi++;
        }
        wp_reset_postdata();
        ?>

        <!-- Büyük (Sol) -->
        <?php if ($buyuk) : ?>
        <div style="border-right:1px solid #f0f0f0">
            <a href="<?php echo esc_url($buyuk['link']); ?>" style="display:flex;flex-direction:column;height:100%;color:inherit;text-decoration:none">
                <div style="position:relative;overflow:hidden;height:220px;background:#f0f0f0;flex-shrink:0">
                    <img src="<?php echo esc_url($buyuk['thumb']); ?>" alt="<?php echo esc_attr($buyuk['baslik']); ?>" style="width:100%;height:100%;object-fit:cover;display:block" loading="eager">
                    <span style="position:absolute;bottom:8px;left:8px;background:<?php echo esc_attr($kat_renk); ?>;color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:3px;text-transform:uppercase"><?php echo esc_html($kat_obj->name); ?></span>
                </div>
                <div style="padding:12px 14px;flex:1">
                    <h3 style="font-size:15px;font-weight:800;color:#1a1a1a;line-height:1.45;margin:0 0 8px"><?php echo esc_html(ahenk_kirp($buyuk['baslik'], 100)); ?></h3>
                    <?php if ($buyuk['spot']) : ?><p style="font-size:13px;color:#666;line-height:1.55;margin:0 0 8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden"><?php echo esc_html(ahenk_kirp($buyuk['spot'], 120)); ?></p><?php endif; ?>
                    <div style="font-size:11px;color:#aaa;display:flex;gap:12px"><span><i class="fa fa-clock"></i> <?php echo esc_html($buyuk['tarih']); ?></span></div>
                </div>
            </a>
        </div>
        <?php endif; ?>

        <!-- Liste (Sağ) - 4 haber -->
        <div style="display:flex;flex-direction:column">
            <?php foreach ($liste as $li) : ?>
            <div style="border-bottom:1px solid #f5f5f5;flex:1">
                <a href="<?php echo esc_url($li['link']); ?>" style="display:flex;align-items:center;gap:10px;padding:11px 14px;text-decoration:none;color:inherit;height:100%">
                    <div style="width:80px;height:56px;flex-shrink:0;border-radius:5px;overflow:hidden;background:#f0f0f0">
                        <img src="<?php echo esc_url($li['thumb']); ?>" alt="<?php echo esc_attr($li['baslik']); ?>" style="width:100%;height:100%;object-fit:cover;display:block" loading="lazy">
                    </div>
                    <div style="flex:1;min-width:0">
                        <div style="font-size:13px;font-weight:700;color:#1a1a1a;line-height:1.4;margin-bottom:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden"><?php echo esc_html(ahenk_kirp($li['baslik'], 75)); ?></div>
                        <div style="font-size:11px;color:#aaa"><i class="fa fa-clock"></i> <?php echo esc_html($li['tarih']); ?></div>
                    </div>
                </a>
            </div>
            <?php endforeach; ?>
        </div>

    </div>
</section>

<?php endforeach; ?>

</div><!-- .ana-icerik -->
<aside class="sidebar" role="complementary"><?php get_sidebar(); ?></aside>
</div>
</div>
</div>

</main>

<?php
/* ════ TAB MENÜ ═══════════════════════════════════════ */
if (get_theme_mod('ahenk_mod_ozel_tab', 1)) :
  $tab_sluglar = array(
    get_theme_mod('ahenk_tab_slug_1','gundem'),
    get_theme_mod('ahenk_tab_slug_2','spor'),
    get_theme_mod('ahenk_tab_slug_3','ekonomi'),
    get_theme_mod('ahenk_tab_slug_4','teknoloji'),
  );
?>
<div class="tab-bolum" style="padding:0 0 32px">
  <div class="container">
    <div class="tab-menu-ust">
      <ul class="tab-menu" id="ahenkTabMenu">
        <?php foreach ($tab_sluglar as $ti => $ts) :
          if (empty($ts)) continue;
          $tt = get_term_by('slug',$ts,'haber-kategorisi');
          if (!$tt || is_wp_error($tt)) $tt = get_term_by('slug',$ts,'category');
          if (!$tt || is_wp_error($tt)) continue;
        ?>
        <li class="tab-btn <?php echo $ti===0?'aktif':''; ?>" data-tab="tab-<?php echo esc_attr($ts); ?>">
          <?php echo esc_html($tt->name); ?>
        </li>
        <?php endforeach; ?>
      </ul>
    </div>
    <?php foreach ($tab_sluglar as $ti => $ts) :
      if (empty($ts)) continue;
      $tt = get_term_by('slug',$ts,'haber-kategorisi');
      if (!$tt || is_wp_error($tt)) $tt = get_term_by('slug',$ts,'category');
      if (!$tt || is_wp_error($tt)) continue;
      $tab_q = ahenk_kategori_haberleri($ts, 6);
      $tab_renk = ahenk_kategori_rengi($tt->term_id);
    ?>
    <div class="tab-panel <?php echo $ti===0?'aktif':''; ?>" id="tab-<?php echo esc_attr($ts); ?>">
      <div class="tab-grid">
        <?php if ($tab_q && $tab_q->have_posts()) :
          $tbi = 0;
          while ($tab_q->have_posts()) : $tab_q->the_post(); ?>
          <article class="tab-kart <?php echo $tbi===0?'tab-kart--buyuk':''; ?>">
            <a href="<?php the_permalink(); ?>" class="tab-kart-link">
              <div class="tab-kart-resim">
                <img src="<?php echo esc_url(ahenk_thumb_url(null, $tbi===0?'ahenk-manset':'ahenk-kart')); ?>"
                     alt="<?php echo esc_attr(get_the_title()); ?>" loading="lazy">
                <span class="tab-kart-badge" style="background:<?php echo esc_attr($tab_renk); ?>"><?php echo esc_html($tt->name); ?></span>
              </div>
              <div class="tab-kart-metin">
                <h3><?php echo esc_html(ahenk_kirp(get_the_title(), $tbi===0?120:70)); ?></h3>
                <span class="tab-kart-tarih"><i class="fa fa-clock"></i> <?php echo ahenk_turkce_tarih(null,'short'); ?></span>
              </div>
            </a>
          </article>
          <?php $tbi++; endwhile; wp_reset_postdata();
        endif; ?>
      </div>
      <div style="text-align:right;margin-top:8px">
        <a href="<?php echo esc_url(get_term_link($tt)); ?>" class="tum-haberleri-btn">Tümünü Gör →</a>
      </div>
    </div>
    <?php endforeach; ?>
  </div>
</div>
<?php endif; ?>

<?php
/* ════ TREND HABERLER ═══════════════════════════════ */
if (get_theme_mod('ahenk_mod_trend', 1)) :
  $trend_sayi = (int)get_theme_mod('ahenk_trend_sayi', 5);
  $trend_baslik = get_theme_mod('ahenk_trend_baslik','Gündem');
  $trend_q = new WP_Query(array(
    'post_type'      => array('haber','post'),
    'posts_per_page' => $trend_sayi,
    'orderby'        => 'comment_count',
    'order'          => 'DESC',
    'no_found_rows'  => true,
  ));
?>
<div class="trend-bolum" style="padding:0 0 32px">
  <div class="container">
    <div class="trend-ic">
      <div class="trend-baslik-alan">
        <h2 class="blok-baslik-sol" style="border-left:4px solid var(--renk-ana);padding-left:12px;font-size:18px;font-weight:900">
          <i class="fa fa-fire" style="color:var(--renk-ana)"></i> <?php echo esc_html($trend_baslik); ?>
        </h2>
      </div>
      <div class="trend-liste">
        <?php $ti=1; while ($trend_q->have_posts()) : $trend_q->the_post();
          $tr_kats = get_the_terms(get_the_ID(),'haber-kategorisi');
          if (!$tr_kats||is_wp_error($tr_kats)) $tr_kats = get_the_category();
          $tr_kat = !empty($tr_kats)?$tr_kats[0]:null;
          $tr_renk = $tr_kat ? ahenk_kategori_rengi($tr_kat->term_id) : '#CC0000';
          $pct = max(20, 100 - ($ti-1)*15);
        ?>
        <div class="trend-item">
          <span class="trend-sayi" style="color:var(--renk-ana)"><?php echo $ti; ?></span>
          <div class="trend-icerik">
            <div class="trend-progress"><div class="trend-progress-bar" style="width:<?php echo $pct; ?>%"></div></div>
            <?php if($tr_kat):?><span class="trend-kat" style="color:<?php echo esc_attr($tr_renk);?>"><?php echo esc_html($tr_kat->name);?></span><?php endif;?>
            <a href="<?php the_permalink(); ?>" class="trend-baslik-link"><?php echo esc_html(ahenk_kirp(get_the_title(),80)); ?></a>
            <span class="trend-tarih"><i class="fa fa-clock"></i> <?php echo ahenk_turkce_tarih(null,'short'); ?></span>
          </div>
          <div class="trend-resim">
            <img src="<?php echo esc_url(ahenk_thumb_url(null,'ahenk-kucuk')); ?>" alt="<?php echo esc_attr(get_the_title()); ?>" loading="lazy">
          </div>
        </div>
        <?php $ti++; endwhile; wp_reset_postdata(); ?>
      </div>
    </div>
  </div>
</div>
<?php endif; ?>

<?php
/* ════ VİDEO BÖLÜMİ ═════════════════════════════════ */
if (get_theme_mod('ahenk_mod_video', 1)) :
  $vid_kat  = get_theme_mod('ahenk_video_kat','video');
  $vid_sayi = (int)get_theme_mod('ahenk_video_sayi', 4);
  $vid_q = ahenk_kategori_haberleri($vid_kat, $vid_sayi);
  if ($vid_q && $vid_q->have_posts()) :
?>
<div class="video-bolum" style="padding:0 0 32px">
  <div class="container">
    <div class="video-bolum-baslik" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <h2 style="border-left:4px solid var(--renk-ana);padding-left:12px;font-size:18px;font-weight:900">
        <i class="fa fa-play-circle" style="color:var(--renk-ana)"></i> Video Galeri
      </h2>
      <?php $vid_kat_obj = get_term_by('slug',$vid_kat,'haber-kategorisi')?:get_term_by('slug',$vid_kat,'category');
      if ($vid_kat_obj && !is_wp_error($vid_kat_obj)):?>
      <a href="<?php echo esc_url(get_term_link($vid_kat_obj)); ?>" style="font-size:12px;font-weight:700;color:var(--renk-ana)">Tüm Videolar →</a>
      <?php endif;?>
    </div>
    <div class="video-grid">
      <?php while ($vid_q->have_posts()) : $vid_q->the_post();
        $vid_url = get_post_meta(get_the_ID(),'_video_url',true); ?>
      <div class="video-kart">
        <a href="<?php the_permalink(); ?>" class="video-kart-link">
          <div class="video-kart-resim">
            <img src="<?php echo esc_url(ahenk_thumb_url(null,'ahenk-kart')); ?>" alt="<?php echo esc_attr(get_the_title()); ?>" loading="lazy">
            <div class="video-play-btn"><i class="fa fa-play"></i></div>
            <?php if($vid_url):?><span class="video-tip-rozet"><i class="fa fa-video"></i></span><?php endif;?>
          </div>
          <div class="video-kart-metin">
            <h3><?php echo esc_html(ahenk_kirp(get_the_title(), 65)); ?></h3>
            <span class="video-tarih"><i class="fa fa-clock"></i> <?php echo ahenk_turkce_tarih(null,'short'); ?></span>
          </div>
        </a>
      </div>
      <?php endwhile; wp_reset_postdata(); ?>
    </div>
  </div>
</div>
<?php endif; endif; ?>

<?php
/* ════ İSTATİSTİK SAYACI ════════════════════════════ */
if (get_theme_mod('ahenk_mod_sayac', 0)) :
  $sayaclar = array();
  for ($si=1;$si<=4;$si++){
    $sv = get_theme_mod("ahenk_sayac_{$si}_sayi",'');
    $se = get_theme_mod("ahenk_sayac_{$si}_etiket",'');
    if ($sv || $se) $sayaclar[] = array($sv,$se);
  }
  if (!empty($sayaclar)) :
?>
<div class="sayac-bolum" style="background:var(--grad-bilesen);padding:32px 0;margin-bottom:32px">
  <div class="container">
    <div class="sayac-grid">
      <?php foreach ($sayaclar as $sc) : ?>
      <div class="sayac-item">
        <div class="sayac-deger" data-target="<?php echo esc_attr($sc[0]); ?>"><?php echo esc_html($sc[0]); ?></div>
        <div class="sayac-etiket"><?php echo esc_html($sc[1]); ?></div>
      </div>
      <?php endforeach; ?>
    </div>
  </div>
</div>
<?php endif; endif; ?>

<?php get_footer(); ?>
