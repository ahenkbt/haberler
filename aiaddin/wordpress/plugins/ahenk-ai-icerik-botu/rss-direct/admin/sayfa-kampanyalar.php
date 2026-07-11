<?php
if ( ! defined( 'ABSPATH' ) ) exit;

function ahbrss_sayfa_kampanyalar() {
    // Silme islemi
    if ( isset($_GET['ahb_sil']) && check_admin_referer('ahb_sil_' . $_GET['ahb_sil']) ) {
        AHBRSS_Veritabani::kampanya_sil(absint($_GET['ahb_sil']));
        echo '<div class="ahb-notice ahb-notice--basari">Kampanya silindi.</div>';
    }

    $kampanyalar = AHBRSS_Veritabani::kampanya_listesi();
    $kategoriler  = get_terms(array('taxonomy'=>'haber-kategorisi','hide_empty'=>false,'number'=>100));
    $kat_map = array();
    if (!is_wp_error($kategoriler)) {
        foreach ($kategoriler as $k) $kat_map[$k->term_id] = $k->name;
    }
    ?>
    <div class="wrap ahb-wrap">
        <div class="ahb-header">
            <div class="ahb-logo-txt"><span class="ahb-red">AHENK</span> HABER BOTU</div>
            <h1>Kampanya Yonetimi</h1>
            <p>Her kampanya bir veya birden fazla RSS/Atom beslemesini otomatik isler.</p>
        </div>

        <!-- Istatistik Ozeti -->
        <div class="ahb-stat-grid">
            <?php
            $toplam     = count($kampanyalar);
            $aktif = 0;
            foreach ($kampanyalar as $_k) { if ((int)$_k->durum === 1) $aktif++; }
            $toplam_ekl = array_sum(array_column($kampanyalar, 'toplam_eklenen'));
            $sonraki    = AHBRSS_Cron::sonraki_calistirma();
            ?>
            <div class="ahb-stat"><span class="ahb-stat-sayi"><?php echo $toplam; ?></span><span>Toplam Kampanya</span></div>
            <div class="ahb-stat ahb-stat--yesil"><span class="ahb-stat-sayi"><?php echo $aktif; ?></span><span>Aktif</span></div>
            <div class="ahb-stat ahb-stat--mavi"><span class="ahb-stat-sayi"><?php echo number_format($toplam_ekl); ?></span><span>Toplam Eklenen Haber</span></div>
            <div class="ahb-stat ahb-stat--turuncu"><span class="ahb-stat-sayi" style="font-size:13px;"><?php echo esc_html($sonraki); ?></span><span>Sonraki Cron</span></div>
        </div>

        <div class="ahb-toolbar">
            <a href="<?php echo admin_url('admin.php?page=ahbrss-kampanya-ekle'); ?>" class="button button-primary ahb-btn-ekle">
                + Yeni Kampanya Ekle
            </a>
            <a href="<?php echo admin_url('admin.php?page=ahbrss-loglar'); ?>" class="button">📋 Loglar</a>
            <a href="<?php echo admin_url('admin.php?page=ahbrss-ayarlar'); ?>" class="button">⚙ Ayarlar</a>
        </div>

        <?php if ( empty($kampanyalar) ) : ?>
            <div class="ahb-bos-kutu">
                <div style="font-size:48px;">🤖</div>
                <h2>Henuz kampanya yok</h2>
                <p>Ilk kampanyanizi olusturmak icin "Yeni Kampanya Ekle" tusuna basin.</p>
                <a href="<?php echo admin_url('admin.php?page=ahbrss-kampanya-ekle'); ?>" class="button button-primary">+ Yeni Kampanya Ekle</a>
            </div>
        <?php else : ?>
        <table class="wp-list-table widefat fixed striped ahb-tablo">
            <thead>
                <tr>
                    <th width="25">ID</th>
                    <th>Kampanya Adı</th>
                    <th width="90">Durum</th>
                    <th width="120">Kategori</th>
                    <th width="70">Her (dk)</th>
                    <th width="90">Eklenen</th>
                    <th width="150">Son Çalıştırma</th>
                    <th width="220">İşlemler</th>
                </tr>
            </thead>
            <tbody>
            <?php foreach ( $kampanyalar as $k ) :
                $aktif    = (int)$k->durum === 1;
                $kat_adi  = $kat_map[(int)$k->kategori_id] ?? '—';
                $son_calis = $k->son_calistirma > 0 ? date('d.m.Y H:i', $k->son_calistirma) : 'Hiç çalıştırılmadı';
                $sil_url   = wp_nonce_url(admin_url('admin.php?page=ahbrss-kampanyalar&ahb_sil='.$k->id), 'ahb_sil_'.$k->id);
                $duzenle_url = admin_url('admin.php?page=ahbrss-kampanya-duzenle&kid='.$k->id);
                $besleme_sayisi = count(array_filter(array_map('trim', explode("\n",$k->beslemeler))));
            ?>
                <tr class="<?php echo $aktif ? 'ahb-tr-aktif' : 'ahb-tr-pasif'; ?>">
                    <td><?php echo $k->id; ?></td>
                    <td>
                        <strong><a href="<?php echo esc_url($duzenle_url); ?>"><?php echo esc_html($k->ad); ?></a></strong>
                        <div style="font-size:11px; color:#888; margin-top:2px;">
                            <?php echo $besleme_sayisi; ?> besleme &bull;
                            <?php echo $k->kaynak_tipi; ?> &bull;
                            <?php echo $k->post_turu; ?>
                            <?php if ($k->cevirisi_yap) echo ' &bull; <span style="color:#1A4A8A;">🌐 Ceviri Aktif</span>'; ?>
                            <?php if ($k->resim_indir)  echo ' &bull; <span style="color:#2E7D32;">🖼 Resim Var</span>'; ?>
                        </div>
                    </td>
                    <td>
                        <button class="ahb-toggle-durum <?php echo $aktif?'ahb-aktif':'ahb-pasif'; ?>"
                                data-id="<?php echo $k->id; ?>"
                                data-durum="<?php echo $aktif?1:0; ?>"
                                title="<?php echo $aktif?'Pasife Al':'Aktif Et'; ?>">
                            <?php echo $aktif ? '✅ Aktif' : '⏸ Pasif'; ?>
                        </button>
                    </td>
                    <td><?php echo esc_html($kat_adi); ?></td>
                    <td><?php echo (int)$k->her_kac_dakika; ?> dk</td>
                    <td>
                        <span class="ahb-sayi-rozet"><?php echo number_format((int)$k->toplam_eklenen); ?></span>
                    </td>
                    <td style="font-size:12px; color:#888;"><?php echo esc_html($son_calis); ?></td>
                    <td>
                        <div class="ahb-islem-butonlari">
                            <button class="button button-primary ahb-isle-btn" data-id="<?php echo $k->id; ?>" title="Şimdi Çalıştır">
                                ▶ Çalıştır
                            </button>
                            <a href="<?php echo esc_url($duzenle_url); ?>" class="button" title="Düzenle">✏</a>
                            <button class="button ahb-sifirla-btn" data-id="<?php echo $k->id; ?>" title="İşlenen Linkleri Sıfırla" onclick="return confirm('İşlenen link geçmişi silinecek. Emin misiniz?');">↺</button>
                            <a href="<?php echo esc_url($sil_url); ?>" class="button ahb-sil-btn"
                               onclick="return confirm('<?php echo esc_js($k->ad); ?> silinecek. Emin misiniz?');" title="Sil">🗑</a>
                        </div>
                        <div class="ahb-isle-sonuc" id="sonuc-<?php echo $k->id; ?>" style="display:none;"></div>
                    </td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
        <?php endif; ?>
    </div>
    <?php
}
