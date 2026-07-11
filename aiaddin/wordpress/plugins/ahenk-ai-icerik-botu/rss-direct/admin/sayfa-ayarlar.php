<?php
if ( ! defined( 'ABSPATH' ) ) exit;

function ahbrss_sayfa_ayarlar() {
    if ( isset($_POST['ahb_ayar_kaydet']) && check_admin_referer('ahb_ayarlar_nonce') ) {
        $alanlar = array(
            'ahb_deepl_api_key',
            'ahb_mymemory_email',
            'ahb_varsayilan_post_turu',
            'ahb_resim_kalitesi',
            'ahb_user_agent',
            'ahb_varsayilan_resim_url',
            'ahb_hedef_haber_sayisi',
        );
        foreach ($alanlar as $alan) {
            if (isset($_POST[$alan])) {
                $deg = sanitize_text_field($_POST[$alan]);
                if ($alan === 'ahb_hedef_haber_sayisi') {
                    $deg = max(10, min(2000, (int)$deg));
                }
                update_option($alan, $deg);
            }
        }
        echo '<div class="ahb-notice ahb-notice--basari">Ayarlar kaydedildi.</div>';
    }
    ?>
    <div class="wrap ahb-wrap">
        <div class="ahb-header">
            <div class="ahb-logo-txt"><span class="ahb-red">AHENK</span> HABER BOTU</div>
            <h1>Bot Ayarlari</h1>
        </div>
        <form method="POST">
            <?php wp_nonce_field('ahb_ayarlar_nonce'); ?>

            <div class="ahb-panel" style="max-width:760px;">
                <div class="ahb-panel-baslik">🖼 Resim Ayarlari</div>
                <div class="ahb-panel-icerik">
                    <table class="form-table">
                        <tr><th>Varsayilan Resim URL</th>
                            <td>
                                <input type="url" name="ahb_varsayilan_resim_url" value="<?php echo esc_attr(get_option('ahb_varsayilan_resim_url','')); ?>" class="regular-text" placeholder="https://siteadi.com/wp-content/uploads/varsayilan.jpg">
                                <br><small>Resmi olmayan haberlerde gosterilecek varsayilan gorsel. Bos birakilirsa eklenti icindeki yedek resim kullanilir. <strong>Resimler sunucuya indirilmez</strong>; karsi sunucudan link olarak gosterilir.</small>
                            </td>
                        </tr>
                        <tr><th>Bot User-Agent</th>
                            <td>
                                <input type="text" name="ahb_user_agent" value="<?php echo esc_attr(get_option('ahb_user_agent','')); ?>" class="regular-text" placeholder="Mozilla/5.0 ...">
                                <br><small>Bos birakilirsa modern bir tarayici User-Agent kullanilir. Bazi siteler (orn. turk.eco) varsayilan UA'lari engelleyebilir.</small>
                            </td>
                        </tr>
                        <tr><th>Hedef Haber Sayisi (her besleme)</th>
                            <td>
                                <input type="number" name="ahb_hedef_haber_sayisi" value="<?php echo (int)get_option('ahb_hedef_haber_sayisi', 500); ?>" min="10" max="2000" step="10" style="width:120px;">
                                <br><small>Her bir besleme URL'si icin maksimum cekilecek haber sayisi. Eklenti, RSS sayfalama destegi olan sitelerde (?paged=2,3...) otomatik olarak eski sayfalara da gider. <strong>Not:</strong> Cogu RSS feed'i sadece son 10-50 haberi yayinlar; sayfalama destegi olmayan sitelerde 500'e ulasilamaz - bu durumda kampanyaya birden fazla feed URL'si ekleyin.</small>
                            </td>
                        </tr>
                    </table>
                </div>
            </div>

            <div class="ahb-panel" style="max-width:760px; margin-top:16px;">
                <div class="ahb-panel-baslik">🌐 Ceviri API Ayarlari</div>
                <div class="ahb-panel-icerik">
                    <table class="form-table">
                        <tr><th>DeepL API Key</th>
                            <td><input type="password" name="ahb_deepl_api_key" value="<?php echo esc_attr(get_option('ahb_deepl_api_key','')); ?>" class="regular-text" placeholder="...xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:fx">
                            <br><small>DeepL Free: <code>:fx</code> ile biter. <a href="https://www.deepl.com/tr/pro-api" target="_blank">API Key Al</a></small></td></tr>
                        <tr><th>MyMemory E-posta</th>
                            <td><input type="email" name="ahb_mymemory_email" value="<?php echo esc_attr(get_option('ahb_mymemory_email','')); ?>" class="regular-text" placeholder="info@siteadi.com">
                            <br><small>E-posta ekleyince gunluk limit 5.000 → 50.000 kelimeye cikar.</small></td></tr>
                    </table>
                </div>
            </div>

            <div class="ahb-panel" style="max-width:760px; margin-top:16px;">
                <div class="ahb-panel-baslik">⚙ Genel Ayarlar</div>
                <div class="ahb-panel-icerik">
                    <table class="form-table">
                        <tr><th>Varsayilan Post Turu</th>
                            <td><select name="ahb_varsayilan_post_turu">
                                <option value="haber" <?php selected(get_option('ahb_varsayilan_post_turu','haber'),'haber'); ?>>haber</option>
                                <option value="post"  <?php selected(get_option('ahb_varsayilan_post_turu','haber'),'post'); ?>>post</option>
                            </select></td></tr>
                        <tr><th>Cron Durumu</th>
                            <td>
                                <strong>Sonraki Calistirma:</strong> <?php echo AHBRSS_Cron::sonraki_calistirma(); ?>
                                <br><small>Cron her 5 dakikada calisir ve zamani gelen kampanyalari isler.</small>
                            </td></tr>
                    </table>
                </div>
            </div>

            <p class="submit">
                <button type="submit" name="ahb_ayar_kaydet" class="button button-primary">💾 Ayarlari Kaydet</button>
            </p>
        </form>

        <div class="ahb-panel" style="max-width:760px; margin-top:24px;">
            <div class="ahb-panel-baslik">🧹 Duplicate Temizleme</div>
            <div class="ahb-panel-icerik">
                <p>Veritabaninda ayni baslik veya cok benzer icerige sahip <strong>mukerrer haberler</strong>i tarar ve eskiyi koruyup digerlerini siler.</p>
                <button type="button" id="ahb-duplicate-temizle" class="button button-secondary"
                    onclick="return confirm('Mukerrer haberler kalici olarak silinecek. Devam edilsin mi?');">
                    🧹 Mukerrer Haberleri Temizle
                </button>
                <div id="ahb-duplicate-sonuc" style="margin-top:12px;"></div>
            </div>
        </div>

        <script>
        (function($){
            $('#ahb-duplicate-temizle').on('click', function(){
                var btn = $(this), out = $('#ahb-duplicate-sonuc');
                btn.prop('disabled', true).text('Taraniyor...');
                out.html('<em>Lutfen bekleyin, bu islem biraz surebilir...</em>');
                $.post(ahbrssData.ajaxurl, {
                    action: 'ahbrss_duplicate_temizle',
                    nonce:  ahbrssData.nonce
                }, function(resp){
                    btn.prop('disabled', false).text('🧹 Mukerrer Haberleri Temizle');
                    if (resp && resp.success) {
                        out.html('<div class="ahb-notice ahb-notice--basari">'+ resp.data.mesaj +'</div>');
                    } else {
                        out.html('<div class="ahb-notice ahb-notice--hata">Hata: '+ (resp && resp.data ? resp.data : 'Bilinmiyor') +'</div>');
                    }
                }).fail(function(){
                    btn.prop('disabled', false).text('🧹 Mukerrer Haberleri Temizle');
                    out.html('<div class="ahb-notice ahb-notice--hata">Sunucu hatasi.</div>');
                });
            });
        })(jQuery);
        </script>
    </div>
    <?php
}
