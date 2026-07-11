<?php
/**
 * Ahenk Haber v2 - Sidebar
 * Servisler eklentisi varsa otomatik widgetlar yüklenir
 */
if ( ! defined('ABSPATH') ) exit;

if ( is_active_sidebar('sidebar-main') ) {
    dynamic_sidebar('sidebar-main');
} else {
    // Servisler eklentisi aktif mi?
    $servisler_aktif = function_exists('ahs_tcmb_verileri_al');
    $hava_api = get_option('ahs_openweather_api','');
    $football_api = get_option('ahs_football_api_key','');
?>

<!-- ── HAVA DURUMU ──────────────────────────────── -->
<?php if ($servisler_aktif) : ?>
<div class="widget widget-hava" id="havaWidget">
    <h3 class="widget-title"><i class="fa fa-cloud-sun"></i> Hava Durumu</h3>
    <?php echo ahs_hava_shortcode(array('sehir'=>get_option('ahs_varsayilan_sehir','Ankara'),'tahmin'=>'1')); ?>
</div>

<!-- ── FİNANS / DÖVİZ ──────────────────────────── -->
<div class="widget">
    <h3 class="widget-title"><i class="fa fa-chart-line"></i> Döviz Kurları</h3>
    <?php echo ahs_finans_shortcode(array()); ?>
</div>

<!-- ── NAMAZ VAKİTLERİ ─────────────────────────── -->
<div class="widget">
    <h3 class="widget-title"><i class="fa fa-mosque"></i> Namaz Vakitleri</h3>
    <?php echo ahs_namaz_shortcode(array('sehir'=>get_option('ahs_varsayilan_sehir','Ankara'))); ?>
</div>

<?php else : ?>
<!-- Servisler eklentisi olmadan varsayılan -->
<div class="widget widget-hava" id="havaWidget">
    <h3 class="widget-title"><i class="fa fa-cloud-sun"></i> Hava Durumu</h3>
    <div class="ahs-hava-widget">
        <div class="ahs-hava-ana">
            <img src="https://openweathermap.org/img/wn/01d@2x.png" alt="" id="hwIkon" style="width:64px;height:64px" loading="lazy">
            <div class="ahs-hava-bilgi">
                <span class="ahs-sicaklik" id="hwSicaklik">--°C</span>
                <span class="ahs-durum" id="hwDurum">Yükleniyor...</span>
                <span class="ahs-sehir"><i class="fa fa-map-marker-alt"></i> <span id="hwSehir">--</span></span>
            </div>
        </div>
        <div class="ahs-hava-detay">
            <span><i class="fa fa-tint"></i> <span id="hwNem">--</span>%</span>
            <span><i class="fa fa-thermometer-half"></i> Hissedilen: <span id="hwHissedilen">--</span>°C</span>
        </div>
    </div>
    <?php if (empty(get_option('ahs_openweather_api',''))) : ?>
    <p style="font-size:11px;color:#888;padding:4px 0">
        <a href="<?php echo admin_url('admin.php?page=ahs-ayarlar&sekme=api'); ?>">⚙ API Key ekleyin</a> (ücretsiz)
    </p>
    <?php endif; ?>
</div>
<?php endif; ?>

<!-- ── SIDEBAR REKLAM ──────────────────────────── -->
<?php $s_rek = get_option('ahenk_reklam_sidebar_top',''); ?>
<?php if ($s_rek) : ?>
<div class="widget widget-reklam"><?php echo wp_kses_post($s_rek); ?></div>
<?php else : ?>
<div class="widget"><div class="reklam-placeholder" style="height:250px"><span>300 × 250 Reklam</span></div></div>
<?php endif; ?>

<!-- ── SON HABERLER ────────────────────────────── -->
<div class="widget">
    <h3 class="widget-title"><i class="fa fa-clock"></i> Son Haberler</h3>
    <ul class="sidebar-haber-listesi">
        <?php
        $son = new WP_Query(array('post_type'=>array('haber','post'),'posts_per_page'=>8,'orderby'=>'date','order'=>'DESC','no_found_rows'=>true));
        while($son->have_posts()): $son->the_post(); ?>
        <li class="sidebar-haber-item">
            <a href="<?php the_permalink(); ?>" class="sidebar-haber-link">
                <div class="shaber-resim"><img src="<?php echo esc_url(ahenk_thumb_url(null,'ahenk-kucuk')); ?>" alt="<?php echo esc_attr(get_the_title()); ?>" loading="lazy"></div>
                <div class="shaber-icerik">
                    <span class="shaber-baslik"><?php echo esc_html(ahenk_kirp(get_the_title(),60)); ?></span>
                    <span class="shaber-tarih"><i class="fa fa-clock"></i> <?php echo ahenk_turkce_tarih(null,'short'); ?></span>
                </div>
            </a>
        </li>
        <?php endwhile; wp_reset_postdata(); ?>
    </ul>
</div>

<!-- ── EN ÇOK OKUNANLAR ───────────────────────── -->
<div class="widget">
    <h3 class="widget-title"><i class="fa fa-fire"></i> En Çok Okunanlar</h3>
    <ol class="sidebar-haber-listesi sidebar-numarali">
        <?php
        $pop = new WP_Query(array('post_type'=>array('haber','post'),'posts_per_page'=>6,'orderby'=>'comment_count','order'=>'DESC','no_found_rows'=>true));
        $n=1; while($pop->have_posts()): $pop->the_post(); ?>
        <li class="sidebar-haber-item">
            <span class="s-numara"><?php echo $n++; ?></span>
            <a href="<?php the_permalink(); ?>" class="sidebar-haber-link">
                <div class="shaber-icerik">
                    <span class="shaber-baslik"><?php echo esc_html(ahenk_kirp(get_the_title(),65)); ?></span>
                    <span class="shaber-tarih"><i class="fa fa-clock"></i> <?php echo ahenk_turkce_tarih(null,'short'); ?></span>
                </div>
            </a>
        </li>
        <?php endwhile; wp_reset_postdata(); ?>
    </ol>
</div>

<!-- ── BURÇ YORUMLARI ─────────────────────────── -->
<?php if ($servisler_aktif) : ?>
<div class="widget">
    <h3 class="widget-title"><i class="fa fa-star"></i> Burç Yorumları</h3>
    <div class="ahs-burc-widget">
        <select id="ahsBurcSecim" class="ahs-burc-select">
            <?php
            $burclar = array('koc'=>'♈ Koç','boga'=>'♉ Boğa','ikizler'=>'♊ İkizler','yengec'=>'♋ Yengeç','aslan'=>'♌ Aslan','basak'=>'♍ Başak','terazi'=>'♎ Terazi','akrep'=>'♏ Akrep','yay'=>'♐ Yay','oglak'=>'♑ Oğlak','kova'=>'♒ Kova','balik'=>'♓ Balık');
            foreach($burclar as $k=>$v) echo '<option value="'.esc_attr($k).'">'.esc_html($v).'</option>';
            ?>
        </select>
        <div id="ahsBurcYorum" class="ahs-burc-yorum-alan">Burç seçin...</div>
    </div>
</div>
<?php endif; ?>

<!-- ── NAMAZ VAKİTLERİ (servisler yoksa) ──────── -->
<?php if (!$servisler_aktif) : ?>
<div class="widget widget-namaz" id="namazWidget">
    <h3 class="widget-title"><i class="fa fa-mosque"></i> Namaz Vakitleri</h3>
    <div id="namazIcerik"><p style="font-size:12px;color:#888;text-align:center;padding:10px">Yükleniyor...</p></div>
</div>
<?php endif; ?>

<?php } // end if active_sidebar ?>
