<?php
/**
 * Ahenk Haber v2 - Footer
 * Mobil: Üst bar linkleri footer'da gösterilir
 */
?>

<!-- FOOTER ÜST REKLAM -->
<?php $f_rek = get_option('ahenk_reklam_footer',''); if($f_rek): ?>
<div class="footer-reklam-band"><div class="container" style="text-align:center"><?php echo wp_kses_post($f_rek); ?></div></div>
<?php endif; ?>

<footer class="site-footer" role="contentinfo">
    <div class="footer-ust">
        <div class="container">
            <div class="footer-grid">

                <!-- Hakkında -->
                <div class="footer-kol footer-kol--hakkinda">
                    <div class="footer-logo">
                        <?php if ( has_custom_logo() ) : the_custom_logo();
                        else : ?>
                        <div class="metin-logo metin-logo--footer">
                            <span class="logo-ana"><?php echo esc_html(get_theme_mod('ahenk_logo_metin_1','AHENK')); ?></span>
                            <span class="logo-aksan"><?php echo esc_html(get_theme_mod('ahenk_logo_metin_2','HABER')); ?></span>
                        </div>
                        <?php endif; ?>
                    </div>
                    <p class="footer-aciklama">
                        <?php echo esc_html(get_theme_mod('ahenk_footer_aciklama', get_bloginfo('description'))); ?>
                    </p>
                    <!-- Sosyal Medya -->
                    <div class="footer-sosyal">
                        <?php
                        $s = array(
                            'facebook' =>array('fa-facebook-f', get_theme_mod('ahenk_facebook','')),
                            'twitter'  =>array('fa-x-twitter',  get_theme_mod('ahenk_twitter','')),
                            'instagram'=>array('fa-instagram',   get_theme_mod('ahenk_instagram','')),
                            'youtube'  =>array('fa-youtube',     get_theme_mod('ahenk_youtube','')),
                            'telegram' =>array('fa-telegram',    get_theme_mod('ahenk_telegram','')),
                        );
                        foreach($s as $p=>$d): if(!empty($d[1])): ?>
                        <a href="<?php echo esc_url($d[1]); ?>" class="sosyal-btn sosyal-btn--<?php echo esc_attr($p); ?>"
                           target="_blank" rel="noopener noreferrer" aria-label="<?php echo esc_attr($p); ?>">
                            <i class="fab <?php echo esc_attr($d[0]); ?>"></i>
                        </a>
                        <?php endif; endforeach; ?>
                    </div>

                    <!-- MOBİL: Üst bar linkleri burada gösterilir -->
                    <div class="footer-mobil-linkler">
                        <?php $kunye=get_page_by_path('kunye'); $iletisim=get_page_by_path('iletisim'); $rehber=get_page_by_path('rehber'); ?>
                        <a href="<?php echo esc_url($kunye?get_permalink($kunye):'#'); ?>"><i class="fa fa-id-card"></i> Künye</a>
                        <a href="<?php echo esc_url($iletisim?get_permalink($iletisim):'#'); ?>"><i class="fa fa-envelope"></i> İletişim</a>
                        <a href="<?php echo esc_url(get_post_type_archive_link('kose-yazisi')); ?>"><i class="fa fa-pen-nib"></i> Yazarlar</a>
                        <a href="<?php echo esc_url($rehber?get_permalink($rehber):'#'); ?>"><i class="fa fa-map-marker-alt"></i> Rehber</a>
                        <a href="<?php echo esc_url(get_post_type_archive_link('seri-ilan')); ?>"><i class="fa fa-tag"></i> Seri İlanlar</a>
                        <a href="<?php echo esc_url(get_post_type_archive_link('resmi-ilan')); ?>"><i class="fa fa-bullhorn"></i> Resmi İlanlar</a>
                    </div>
                </div>

                <!-- Kategoriler -->
                <div class="footer-kol">
                    <h3 class="footer-baslik">Kategoriler</h3>
                    <ul class="footer-liste">
                        <?php
                        $kats = get_terms(array('taxonomy'=>'haber-kategorisi','hide_empty'=>false,'number'=>10,'parent'=>0));
                        if(!is_wp_error($kats)) foreach($kats as $fk): ?>
                        <li><a href="<?php echo esc_url(get_term_link($fk)); ?>"><i class="fa fa-chevron-right"></i> <?php echo esc_html($fk->name); ?></a></li>
                        <?php endforeach; ?>
                    </ul>
                </div>

                <!-- Hızlı Linkler -->
                <div class="footer-kol">
                    <h3 class="footer-baslik">Hızlı Linkler</h3>
                    <ul class="footer-liste">
                        <li><a href="<?php echo esc_url(get_post_type_archive_link('kose-yazisi')); ?>"><i class="fa fa-chevron-right"></i> Köşe Yazıları</a></li>
                        <li><a href="<?php echo esc_url(get_post_type_archive_link('foto-galeri')); ?>"><i class="fa fa-chevron-right"></i> Foto Galeri</a></li>
                        <li><a href="<?php echo esc_url(get_post_type_archive_link('video-galeri')); ?>"><i class="fa fa-chevron-right"></i> Video Galeri</a></li>
                        <li><a href="<?php echo esc_url(get_post_type_archive_link('resmi-ilan')); ?>"><i class="fa fa-chevron-right"></i> Resmi İlanlar</a></li>
                        <li><a href="<?php echo esc_url(get_post_type_archive_link('seri-ilan')); ?>"><i class="fa fa-chevron-right"></i> Seri İlanlar</a></li>
                        <?php wp_nav_menu(array('theme_location'=>'footer-menu','container'=>false,'items_wrap'=>'%3$s','depth'=>1,'fallback_cb'=>false)); ?>
                    </ul>
                </div>

                <!-- İletişim -->
                <div class="footer-kol">
                    <h3 class="footer-baslik">İletişim</h3>
                    <ul class="footer-iletisim-liste">
                        <?php if($a=get_theme_mod('ahenk_adres','')): ?><li><i class="fa fa-map-marker-alt"></i> <?php echo esc_html($a); ?></li><?php endif; ?>
                        <?php if($t=get_theme_mod('ahenk_telefon','')): ?><li><i class="fa fa-phone"></i> <a href="tel:<?php echo esc_attr($t); ?>"><?php echo esc_html($t); ?></a></li><?php endif; ?>
                        <?php if($m=get_theme_mod('ahenk_email','')): ?><li><i class="fa fa-envelope"></i> <a href="mailto:<?php echo esc_attr($m); ?>"><?php echo esc_html($m); ?></a></li><?php endif; ?>
                        <?php if($wp=get_theme_mod('ahenk_whatsapp','')): ?>
                        <li><i class="fab fa-whatsapp"></i> <a href="https://wa.me/<?php echo esc_attr(preg_replace('/\D/','',$wp)); ?>" target="_blank" rel="noopener">WhatsApp İhbar Hattı</a></li>
                        <?php endif; ?>
                    </ul>
                </div>

            </div>
        </div>
    </div>

    <!-- Footer Alt -->
    <div class="footer-alt">
        <div class="container">
            <div class="footer-alt-ic">
                <p class="telif">&copy; <?php echo date('Y'); ?> <?php bloginfo('name'); ?> &mdash; <?php echo esc_html(get_theme_mod('ahenk_footer_metin','Tüm hakları saklıdır.')); ?></p>
                <p class="gelistirici"><a href="https://ahenk.net.tr" target="_blank" rel="noopener">Ahenk Bilgi Teknolojileri</a> tarafından geliştirildi</p>
            </div>
        </div>
    </div>
</footer>

<!-- MOBİL ALT REKLAM (320x50) -->
<?php $mob_rek=get_option('ahenk_reklam_mobil',''); if($mob_rek): ?>
<div class="mobil-alt-reklam" aria-label="Reklam"><?php echo wp_kses_post($mob_rek); ?></div>
<?php endif; ?>

<!-- WHATSAPP YÜZEN BUTON -->
<?php if($wp=get_theme_mod('ahenk_whatsapp','')): ?>
<a href="https://wa.me/<?php echo esc_attr(preg_replace('/\D/','',$wp)); ?>?text=<?php echo urlencode('Merhaba, haber ihbarında bulunmak istiyorum.'); ?>"
   class="wp-yuzen-btn" target="_blank" rel="noopener" aria-label="WhatsApp İhbar Hattı">
    <i class="fab fa-whatsapp"></i>
</a>
<?php endif; ?>

<!-- BAŞA DÖN -->
<button class="basa-don-btn" id="basaDonBtn" aria-label="Başa Dön"><i class="fa fa-chevron-up"></i></button>

<?php wp_footer(); ?>
</body>
</html>
