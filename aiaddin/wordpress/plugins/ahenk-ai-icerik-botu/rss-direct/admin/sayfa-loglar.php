<?php
if ( ! defined( 'ABSPATH' ) ) exit;

function ahbrss_sayfa_loglar() {
    $kid  = absint($_GET['kid'] ?? 0);
    $loglar = AHBRSS_Veritabani::log_listesi($kid, 300);
    $kampanyalar = AHBRSS_Veritabani::kampanya_listesi();
    ?>
    <div class="wrap ahb-wrap">
        <div class="ahb-header">
            <div class="ahb-logo-txt"><span class="ahb-red">AHENK</span> HABER BOTU</div>
            <h1>Islem Loglari</h1>
        </div>

        <div class="ahb-toolbar">
            <form method="GET" style="display:flex; gap:8px; align-items:center;">
                <input type="hidden" name="page" value="ahbrss-loglar">
                <select name="kid" onchange="this.form.submit()">
                    <option value="0">-- Tum Kampanyalar --</option>
                    <?php foreach ($kampanyalar as $k) : ?>
                        <option value="<?php echo $k->id; ?>" <?php selected($kid,$k->id); ?>><?php echo esc_html($k->ad); ?></option>
                    <?php endforeach; ?>
                </select>
            </form>
            <button class="button ahb-log-temizle-btn" data-id="<?php echo $kid; ?>"
                    onclick="return confirm('Loglar silinecek. Emin misiniz?');">
                🗑 Loglari Temizle
            </button>
            <a href="<?php echo admin_url('admin.php?page=ahbrss-kampanyalar'); ?>" class="button">← Kampanyalara Don</a>
        </div>

        <div id="ahb-log-temizle-sonuc"></div>

        <?php if (empty($loglar)) : ?>
            <div class="ahb-bos-kutu"><p>Log kaydi bulunamadi.</p></div>
        <?php else : ?>
        <table class="wp-list-table widefat fixed striped ahb-log-tablo">
            <thead>
                <tr>
                    <th width="40">ID</th>
                    <th width="150">Kampanya</th>
                    <th width="80">Seviye</th>
                    <th width="130">Eylem</th>
                    <th>Mesaj</th>
                    <th width="130">Tarih</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($loglar as $log) :
                    $seviye_cls = array(
                        'basari' => 'ahb-log-basari',
                        'hata'   => 'ahb-log-hata',
                        'uyari'  => 'ahb-log-uyari',
                        'bilgi'  => 'ahb-log-bilgi',
                    )[$log->seviye] ?? '';
                ?>
                <tr class="<?php echo $seviye_cls; ?>">
                    <td><?php echo $log->id; ?></td>
                    <td><small><?php echo esc_html($log->kampanya_adi ?: 'Sistem'); ?></small></td>
                    <td>
                        <span class="ahb-log-rozet ahb-log-rozet--<?php echo esc_attr($log->seviye); ?>">
                            <?php echo esc_html(ucfirst($log->seviye)); ?>
                        </span>
                    </td>
                    <td><small><?php echo esc_html($log->eylem); ?></small></td>
                    <td><?php echo esc_html(mb_substr($log->mesaj, 0, 200)); ?></td>
                    <td><small><?php echo date('d.m.Y H:i:s', strtotime($log->tarih)); ?></small></td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
        <?php endif; ?>
    </div>
    <?php
}
