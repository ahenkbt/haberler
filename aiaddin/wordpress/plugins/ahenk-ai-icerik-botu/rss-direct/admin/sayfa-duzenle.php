<?php
if ( ! defined( 'ABSPATH' ) ) exit;

function ahbrss_sayfa_kampanya_duzenle() {
    $kid     = absint($_GET['kid'] ?? 0);
    $kampanya = $kid ? AHBRSS_Veritabani::kampanya_getir($kid) : null;
    $mesaj   = '';

    // Kaydet
    if ( isset($_POST['ahb_kaydet']) && check_admin_referer('ahb_kampanya_kaydet') ) {
        $data = array(
            'ad'                => sanitize_text_field($_POST['ahb_ad'] ?? ''),
            'durum'             => absint($_POST['ahb_durum'] ?? 1),
            'kaynak_tipi'       => sanitize_key($_POST['ahb_kaynak_tipi'] ?? 'rss'),
            'beslemeler'        => sanitize_textarea_field($_POST['ahb_beslemeler'] ?? ''),
            'post_turu'         => sanitize_key($_POST['ahb_post_turu'] ?? 'haber'),
            'kategori_id'       => absint($_POST['ahb_kategori_id'] ?? 0),
            'etiketler'         => sanitize_text_field($_POST['ahb_etiketler'] ?? ''),
            'haber_basi'        => absint($_POST['ahb_haber_basi'] ?? 0),
            'son_dakika_kelime' => sanitize_text_field($_POST['ahb_son_dakika_kelime'] ?? 'son dakika,acil,flas'),
            'cevirisi_yap'      => absint($_POST['ahb_cevirisi_yap'] ?? 0),
            'ceviri_dil_kaynak' => sanitize_text_field($_POST['ahb_ceviri_dil_kaynak'] ?? 'en'),
            'ceviri_dil_hedef'  => sanitize_text_field($_POST['ahb_ceviri_dil_hedef'] ?? 'tr'),
            'ceviri_motor'      => sanitize_key($_POST['ahb_ceviri_motor'] ?? 'google'),
            'resim_indir'       => absint($_POST['ahb_resim_indir'] ?? 1),
            'min_kelime'        => absint($_POST['ahb_min_kelime'] ?? 20),
            'max_haber_gun'     => absint($_POST['ahb_max_haber_gun'] ?? 0),
            'her_kac_dakika'    => absint($_POST['ahb_her_kac_dakika'] ?? 30),
            'max_post_gun'      => absint($_POST['ahb_max_post_gun'] ?? 5),
        );

        if ( empty($data['ad']) ) {
            $mesaj = '<div class="ahb-notice ahb-notice--hata">Kampanya adi zorunludur.</div>';
        } elseif ( empty($data['beslemeler']) ) {
            $mesaj = '<div class="ahb-notice ahb-notice--hata">En az bir besleme URL girilmelidir.</div>';
        } else {
            $sonuc = AHBRSS_Veritabani::kampanya_kaydet($data, $kid);
            if ( $sonuc !== false ) {
                $yeni_id = $kid ?: (int)$sonuc;
                $mesaj = '<div class="ahb-notice ahb-notice--basari">Kampanya kaydedildi! <a href="' . admin_url('admin.php?page=ahbrss-kampanyalar') . '">Listeye don</a></div>';
                if ( ! $kid ) {
                    wp_redirect(admin_url('admin.php?page=ahbrss-kampanya-duzenle&kid='.$yeni_id.'&kaydedildi=1'));
                    exit;
                }
                $kampanya = AHBRSS_Veritabani::kampanya_getir($kid);
            } else {
                $mesaj = '<div class="ahb-notice ahb-notice--hata">Kayit sirasinda bir hata olustu.</div>';
            }
        }
    }

    // Form degerleri (varsayilan veya mevcut)
    $v = $kampanya ? (array)$kampanya : array(
        'ad'=>'','durum'=>1,'kaynak_tipi'=>'rss','beslemeler'=>'',
        'post_turu'=>'haber','kategori_id'=>0,'etiketler'=>'',
        'haber_basi'=>0,'son_dakika_kelime'=>'son dakika,acil,flas,breaking',
        'cevirisi_yap'=>0,'ceviri_dil_kaynak'=>'en','ceviri_dil_hedef'=>'tr',
        'ceviri_motor'=>'google','resim_indir'=>1,'min_kelime'=>20,
        'max_haber_gun'=>7,'her_kac_dakika'=>30,'max_post_gun'=>5,
    );

    $kategoriler = get_terms(array('taxonomy'=>'haber-kategorisi','hide_empty'=>false,'number'=>200));
    ?>
    <div class="wrap ahb-wrap">
        <div class="ahb-header">
            <div class="ahb-logo-txt"><span class="ahb-red">AHENK</span> HABER BOTU</div>
            <h1><?php echo $kid ? 'Kampanya Duzenle: <em>' . esc_html($v['ad']) . '</em>' : 'Yeni Kampanya Ekle'; ?></h1>
        </div>

        <a href="<?php echo admin_url('admin.php?page=ahbrss-kampanyalar'); ?>" class="button" style="margin-bottom:16px;">← Listeye Don</a>

        <?php echo $mesaj; ?>
        <?php if (isset($_GET['kaydedildi'])) echo '<div class="ahb-notice ahb-notice--basari">Kampanya basariyla kaydedildi!</div>'; ?>

        <form method="POST" class="ahb-form">
            <?php wp_nonce_field('ahb_kampanya_kaydet'); ?>

            <div class="ahb-form-grid">
                <!-- SOL SUTUN -->
                <div class="ahb-form-sol">

                    <!-- TEMEL BILGILER -->
                    <div class="ahb-panel">
                        <div class="ahb-panel-baslik">📋 Temel Bilgiler</div>
                        <div class="ahb-panel-icerik">
                            <div class="ahb-alan">
                                <label>Kampanya Adi <span class="ahb-zorunlu">*</span></label>
                                <input type="text" name="ahb_ad" value="<?php echo esc_attr($v['ad']); ?>" class="regular-text" placeholder="NTV Gundem Haberleri" required>
                            </div>
                            <div class="ahb-alan ahb-alan--yatay">
                                <label>Durum</label>
                                <div class="ahb-toggle-wrap">
                                    <label class="ahb-toggle">
                                        <input type="checkbox" name="ahb_durum" value="1" <?php checked($v['durum'],1); ?>>
                                        <span class="ahb-toggle-slider"></span>
                                    </label>
                                    <span>Aktif</span>
                                </div>
                            </div>
                            <div class="ahb-alan">
                                <label>Post Turu</label>
                                <select name="ahb_post_turu">
                                    <?php
                                    $turler = array('haber'=>'Haber','kose-yazisi'=>'Kose Yazisi','post'=>'WordPress Post');
                                    $cpt_list = get_post_types(array('public'=>true,'_builtin'=>false),'names');
                                    foreach ($cpt_list as $t) $turler[$t] = $t;
                                    foreach ($turler as $t_val => $t_label) : ?>
                                        <option value="<?php echo esc_attr($t_val); ?>" <?php selected($v['post_turu'],$t_val); ?>><?php echo esc_html($t_label); ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div class="ahb-alan">
                                <label>Otomatik Atanacak Kategori</label>
                                <select name="ahb_kategori_id">
                                    <option value="0">-- Kategori Secme --</option>
                                    <?php if (!is_wp_error($kategoriler)) foreach ($kategoriler as $kat) : ?>
                                        <option value="<?php echo $kat->term_id; ?>" <?php selected((int)$v['kategori_id'],$kat->term_id); ?>>
                                            <?php echo esc_html($kat->name); ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                                <small>Haberlere otomatik atanacak kategori. Bos birakabilirsiniz.</small>
                            </div>
                            <div class="ahb-alan">
                                <label>Sabit Etiketler <small>(virgille ayirin)</small></label>
                                <input type="text" name="ahb_etiketler" value="<?php echo esc_attr($v['etiketler']); ?>" class="regular-text" placeholder="haber, gundem, turkiye">
                                <small>RSS'deki etiketler de otomatik eklenir.</small>
                            </div>
                        </div>
                    </div>

                    <!-- BESLEME KAYNAKLARI -->
                    <div class="ahb-panel">
                        <div class="ahb-panel-baslik">📡 Besleme Kaynaklari <span class="ahb-zorunlu">*</span></div>
                        <div class="ahb-panel-icerik">
                            <div class="ahb-alan">
                                <label>Besleme URL'leri</label>
                                <textarea name="ahb_beslemeler" rows="8" class="large-text" placeholder="https://www.ntv.com.tr/gundem/rss&#10;https://www.youtube.com/@kanaladi&#10;https://www.youtube.com/playlist?list=PLxxxxxx&#10;https://www.youtube.com/watch?v=XXXXXXXXXXX&#10;Her satira bir URL yazin" required><?php echo esc_textarea($v['beslemeler']); ?></textarea>
                                <small>RSS/Atom URL'si veya YouTube kanal/playlist/video URL'si yazabilirsiniz. URL tipi otomatik anlasilir.</small>
                            </div>
                            <div class="ahb-alan">
                                <label>Kaynak Tipi</label>
                                <select name="ahb_kaynak_tipi">
                                    <option value="rss" <?php selected($v['kaynak_tipi'],'rss'); ?>>RSS / Atom (otomatik)</option>
                                    <option value="atom" <?php selected($v['kaynak_tipi'],'atom'); ?>>Atom</option>
                                    <option value="kazima" <?php selected($v['kaynak_tipi'],'kazima'); ?>>🌐 HTML Kazıma (RSS YOK, sayfa listesinden)</option>
                                    <option value="youtube_kanal"    <?php selected($v['kaynak_tipi'],'youtube_kanal'); ?>>YouTube Kanal</option>
                                    <option value="youtube_playlist" <?php selected($v['kaynak_tipi'],'youtube_playlist'); ?>>YouTube Playlist</option>
                                    <option value="youtube_video"    <?php selected($v['kaynak_tipi'],'youtube_video'); ?>>YouTube Tek Video</option>
                                </select>
                                <small>RSS sectiyseniz YouTube URL'leri de otomatik tanimir.</small>
                            </div>

                            <!-- Hazir Kaynak Havuzu -->
                            <div class="ahb-kaynak-havuzu">
                                <strong>📚 Hazir Turk Haber Kaynaklari:</strong>
                                <div class="ahb-kaynak-grid">
                                    <?php
                                    $hazir_kaynaklar = array(
                                        array('NTV Gundem',     'https://www.ntv.com.tr/gundem/rss'),
                                        array('NTV Ekonomi',    'https://www.ntv.com.tr/ekonomi/rss'),
                                        array('NTV Spor',       'https://www.ntv.com.tr/spor/rss'),
                                        array('Sabah Anasayfa', 'https://www.sabah.com.tr/rss/anabasliklar.xml'),
                                        array('Sabah Ekonomi',  'https://www.sabah.com.tr/rss/ekonomi.xml'),
                                        array('Sabah Spor',     'https://www.sabah.com.tr/rss/spor.xml'),
                                        array('Hurriyet',       'https://www.hurriyet.com.tr/rss/anasayfa'),
                                        array('Hurriyet Eko',   'https://www.hurriyet.com.tr/rss/ekonomi'),
                                        array('Sozcu',          'https://www.sozcu.com.tr/feed/'),
                                        array('TRT Son Dakika', 'https://www.trthaber.com/sondakika.rss'),
                                        array('TRT Gundem',     'https://www.trthaber.com/gundem.rss'),
                                        array('Haberler.com',   'https://www.haberler.com/rss/'),
                                        array('Milliyet',       'https://www.milliyet.com.tr/rss/rssNew/gundemRss.xml'),
                                        array('Cumhuriyet',     'https://www.cumhuriyet.com.tr/rss/son_dakika.xml'),
                                        array('CNN Turk',       'https://www.cnnturk.com/feed/rss/turkiye'),
                                        array('BBC Turkce',     'https://feeds.bbci.co.uk/turkce/rss.xml'),
                                        array('DW Turkce',      'https://rss.dw.com/rdf/rss-tur-all'),
                                        array('Haberturk',      'https://www.haberturk.com/rss'),
                                        array('Posta',          'https://www.posta.com.tr/rss'),
                                        array('Star Gazetesi',  'https://www.star.com.tr/rss'),
                                        array('Yeni Safak',     'https://www.yenisafak.com/Rss'),
                                        array('A Haber',        'https://www.ahaber.com.tr/rss/gundem.xml'),
                                        array('Diken',          'https://www.diken.com.tr/feed/'),
                                        array('Bianet',         'https://bianet.org/bianet/rss'),
                                        array('Gazete Duvar',   'https://www.gazeteduvar.com.tr/feed'),
                                        array('Turk.eco Ekoloji','https://turk.eco/tr/rss/category/ekoloji'),
                                    );
                                    foreach ($hazir_kaynaklar as $k) : ?>
                                        <button type="button" class="ahb-kaynak-btn"
                                                data-url="<?php echo esc_attr($k[1]); ?>"
                                                title="<?php echo esc_attr($k[1]); ?>">
                                            + <?php echo esc_html($k[0]); ?>
                                        </button>
                                    <?php endforeach; ?>
                                </div>
                                <small>Butona tiklayin, besleme alana otomatik eklenir.</small>
                            </div>
                        </div>
                    </div>

                    <!-- CEVIRI AYARLARI -->
                    <div class="ahb-panel">
                        <div class="ahb-panel-baslik">🌐 Ceviri Ayarlari</div>
                        <div class="ahb-panel-icerik">
                            <div class="ahb-alan ahb-alan--yatay">
                                <label>Ceviri Yap</label>
                                <div class="ahb-toggle-wrap">
                                    <label class="ahb-toggle">
                                        <input type="checkbox" name="ahb_cevirisi_yap" value="1" id="ahbCeviriAc" <?php checked($v['cevirisi_yap'],1); ?>>
                                        <span class="ahb-toggle-slider"></span>
                                    </label>
                                    <span>Aktif</span>
                                </div>
                            </div>
                            <div class="ahb-ceviri-alanlari" <?php echo $v['cevirisi_yap'] ? '' : 'style="opacity:.5"'; ?>>
                                <div class="ahb-alan-yatay-3">
                                    <div class="ahb-alan">
                                        <label>Kaynak Dil</label>
                                        <select name="ahb_ceviri_dil_kaynak">
                                            <?php $diller=array('en'=>'Ingilizce','de'=>'Almanca','fr'=>'Fransizca','ar'=>'Arapca','ru'=>'Rusca','es'=>'Ispanyolca','it'=>'Italyanca','auto'=>'Otomatik Tespit');
                                            foreach ($diller as $k=>$v2) echo "<option value='$k' ".selected($v['ceviri_dil_kaynak'],$k,false).">$v2</option>"; ?>
                                        </select>
                                    </div>
                                    <div class="ahb-alan">
                                        <label>Hedef Dil</label>
                                        <select name="ahb_ceviri_dil_hedef">
                                            <option value="tr" <?php selected($v['ceviri_dil_hedef'],'tr'); ?>>Turkce</option>
                                            <option value="en" <?php selected($v['ceviri_dil_hedef'],'en'); ?>>Ingilizce</option>
                                        </select>
                                    </div>
                                    <div class="ahb-alan">
                                        <label>Ceviri Motoru</label>
                                        <select name="ahb_ceviri_motor">
                                            <option value="google"   <?php selected($v['ceviri_motor'],'google'); ?>>Google (Ucretsiz)</option>
                                            <option value="mymemory" <?php selected($v['ceviri_motor'],'mymemory'); ?>>MyMemory (5K/gun)</option>
                                            <option value="deepl"    <?php selected($v['ceviri_motor'],'deepl'); ?>>DeepL (API Key gerekli)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div><!-- .ahb-form-sol -->

                <!-- SAG SUTUN -->
                <div class="ahb-form-sag">

                    <!-- ZAMANLAMA -->
                    <div class="ahb-panel">
                        <div class="ahb-panel-baslik">⏱ Zamanlama</div>
                        <div class="ahb-panel-icerik">
                            <div class="ahb-alan">
                                <label>Her Kac Dakikada Calistir</label>
                                <input type="number" name="ahb_her_kac_dakika" value="<?php echo (int)$v['her_kac_dakika']; ?>" min="5" max="1440" style="width:100px;">
                                <small>Min: 5 dk. Cok sik tarama sunucuyu yorabilir.</small>
                            </div>
                            <div class="ahb-alan">
                                <label>Kac Gunluk Haber Alinsin</label>
                                <input type="number" name="ahb_max_haber_gun" value="<?php echo (int)$v['max_haber_gun']; ?>" min="0" max="365" style="width:100px;">
                                <small>0 = Tum haberler. 7 = Son 7 gun.</small>
                            </div>
                            <div class="ahb-alan">
                                <label>Gunde Max Kac Post Eklensin</label>
                                <input type="number" name="ahb_max_post_gun" value="<?php echo (int)$v['max_post_gun']; ?>" min="0" max="500" style="width:100px;">
                                <small>0 = Sinirsiz.</small>
                            </div>
                        </div>
                    </div>

                    <!-- HABER AYARLARI -->
                    <div class="ahb-panel">
                        <div class="ahb-panel-baslik">📰 Haber Ayarlari</div>
                        <div class="ahb-panel-icerik">
                            <div class="ahb-alan ahb-alan--yatay">
                                <label>Resim Indir</label>
                                <div class="ahb-toggle-wrap">
                                    <label class="ahb-toggle">
                                        <input type="checkbox" name="ahb_resim_indir" value="1" <?php checked($v['resim_indir'],1); ?>>
                                        <span class="ahb-toggle-slider"></span>
                                    </label>
                                    <span>Acik: sunucuya indir &nbsp;|&nbsp; Kapali: sadece harici link kullan (sunucu yer kazanir)</span>
                                </div>
                            </div>
                            <div class="ahb-alan ahb-alan--yatay">
                                <label>Haber Basi (Manset)</label>
                                <div class="ahb-toggle-wrap">
                                    <label class="ahb-toggle">
                                        <input type="checkbox" name="ahb_haber_basi" value="1" <?php checked($v['haber_basi'],1); ?>>
                                        <span class="ahb-toggle-slider"></span>
                                    </label>
                                    <span>Haberleri manset olarak isaretle</span>
                                </div>
                            </div>
                            <div class="ahb-alan">
                                <label>Son Dakika Anahtar Kelimeleri</label>
                                <input type="text" name="ahb_son_dakika_kelime" value="<?php echo esc_attr($v['son_dakika_kelime']); ?>" class="regular-text">
                                <small>Baslikta bu kelimeler varsa son dakika isareti eklenir. Virgille ayirin.</small>
                            </div>
                            <div class="ahb-alan">
                                <label>Min. Kelime Sayisi (Icerik)</label>
                                <input type="number" name="ahb_min_kelime" value="<?php echo (int)$v['min_kelime']; ?>" min="0" max="500" style="width:100px;">
                                <small>Bu kadar kelimeden az icerik atlanir. 0 = kontrol etme.</small>
                            </div>
                        </div>
                    </div>

                    <!-- KAYDET BUTONU -->
                    <div class="ahb-panel">
                        <div class="ahb-panel-icerik">
                            <button type="submit" name="ahb_kaydet" class="button button-primary ahb-btn-kaydet">
                                💾 Kampanyayi Kaydet
                            </button>
                            <?php if ($kid) : ?>
                            <button type="button" class="button ahb-isle-btn" data-id="<?php echo $kid; ?>" style="margin-top:8px; width:100%;">
                                ▶ Simdi Calistir (Test)
                            </button>
                            <div class="ahb-isle-sonuc" id="sonuc-<?php echo $kid; ?>"></div>
                            <?php endif; ?>
                        </div>
                    </div>

                    <?php if ($kid) : ?>
                    <!-- ISTATISTIKLER -->
                    <div class="ahb-panel">
                        <div class="ahb-panel-baslik">📊 Istatistikler</div>
                        <div class="ahb-panel-icerik">
                            <?php $kampanya = AHBRSS_Veritabani::kampanya_getir($kid); ?>
                            <table style="width:100%; font-size:13px;">
                                <tr><th style="text-align:left; padding:4px 0; color:#888;">Toplam Eklenen</th><td><?php echo number_format((int)$kampanya->toplam_eklenen); ?></td></tr>
                                <tr><th style="text-align:left; padding:4px 0; color:#888;">Son Calistirma</th><td><?php echo $kampanya->son_calistirma > 0 ? date('d.m.Y H:i',$kampanya->son_calistirma) : 'Hic'; ?></td></tr>
                                <tr><th style="text-align:left; padding:4px 0; color:#888;">Islenen Link</th><td><?php global $wpdb; echo (int)$wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$wpdb->prefix}ahb_islenen_linkler WHERE kampanya_id=%d",$kid)); ?></td></tr>
                            </table>
                            <button type="button" class="button ahb-sifirla-btn" data-id="<?php echo $kid; ?>" style="margin-top:8px;" onclick="return confirm('Islenen link gecmisi silinecek, tekrar tarama yapilacak. Emin misiniz?');">
                                ↺ Islenen Linkleri Sifirla
                            </button>
                        </div>
                    </div>
                    <?php endif; ?>

                </div><!-- .ahb-form-sag -->
            </div><!-- .ahb-form-grid -->
        </form>
    </div>
    <?php
}
