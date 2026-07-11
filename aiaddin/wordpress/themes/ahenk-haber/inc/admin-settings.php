<?php
if ( ! defined('ABSPATH') ) exit;

/* ============================================================
   ANA MENÜ + ALT MENÜLER
   ============================================================ */
add_action('admin_menu', function(){
    add_menu_page(
        'Ahenk Haber Ayarları', 'Ahenk Haber', 'manage_options',
        'ahenk-haber-ayarlar', 'ahp_admin_sayfa',
        'dashicons-admin-site-alt3', 3
    );
    add_submenu_page(
        'ahenk-haber-ayarlar', 'Anasayfa Modülleri', 'Anasayfa Modülleri',
        'manage_options', 'ahenk-moduller', 'ahp_moduller_sayfa'
    );
    add_submenu_page(
        'ahenk-haber-ayarlar', 'Manşet Ayarları', 'Manşet Ayarları',
        'manage_options', 'ahenk-manseta', 'ahp_manseta_sayfa'
    );
    add_submenu_page(
        'ahenk-haber-ayarlar', 'İkon Bant', 'İkon Bant',
        'manage_options', 'ahenk-ikon-bant', 'ahp_ikon_bant_sayfa'
    );
    add_submenu_page(
        'ahenk-haber-ayarlar', 'Yazarlar Sıralaması', 'Yazarlar Sıralaması',
        'manage_options', 'ahenk-yazarlar-sira', 'ahp_yazarlar_sira_sayfa'
    );
});

/* ============================================================
   YAZARLAR SIRALAMASI SAYFASI
   ============================================================ */
function ahp_yazarlar_sira_sayfa() {
    // Kayıt
    if ( isset($_POST['ahenk_yazar_sira_submit']) && check_admin_referer('ahenk_yazar_sira_nonce','ahenk_yazar_sira_nonce_field') ) {
        $sira_in   = isset($_POST['yazar_sira'])    && is_array($_POST['yazar_sira'])    ? $_POST['yazar_sira']    : array();
        $gizli_in  = isset($_POST['yazar_gizli'])   && is_array($_POST['yazar_gizli'])   ? $_POST['yazar_gizli']   : array();

        $sira_temiz  = array();
        foreach ( $sira_in as $uid => $val ) {
            $uid = (int) $uid;
            if ( $uid > 0 ) $sira_temiz[$uid] = (int) $val;
        }
        $gizli_temiz = array_values(array_unique(array_map('intval', array_keys($gizli_in))));

        update_option('ahenk_yazar_sirasi',   $sira_temiz);
        update_option('ahenk_yazar_gizliler', $gizli_temiz);

        echo '<div class="notice notice-success is-dismissible"><p>✅ Yazar sıralaması kaydedildi.</p></div>';
    }

    $yazarlar = function_exists('ky_yazarlar_al') ? ky_yazarlar_al(true) : array();

    $sira_kayit  = (array) get_option('ahenk_yazar_sirasi',   array());
    $gizli_kayit = (array) get_option('ahenk_yazar_gizliler', array());

    // Sıralı önizleme: kartları admin panelinde de sıralı göster
    $yazarlar_siralı = $yazarlar;
    if ( is_array($yazarlar_siralı) ) {
        usort($yazarlar_siralı, function($a, $b) use ($sira_kayit){
            $aid = (int) ( isset($a->id) ? $a->id : 0 );
            $bid = (int) ( isset($b->id) ? $b->id : 0 );
            $sa = isset($sira_kayit[$aid]) && (int) $sira_kayit[$aid] > 0 ? (int) $sira_kayit[$aid] : PHP_INT_MAX;
            $sb = isset($sira_kayit[$bid]) && (int) $sira_kayit[$bid] > 0 ? (int) $sira_kayit[$bid] : PHP_INT_MAX;
            if ( $sa === $sb ) return strcmp(isset($a->ad)?$a->ad:'', isset($b->ad)?$b->ad:'');
            return $sa - $sb;
        });
    }

    $toplam_sayi = is_array($yazarlar) ? count($yazarlar) : 0;
    $gizli_sayi  = 0;
    if ( is_array($yazarlar) ) {
        foreach ( $yazarlar as $_y ) {
            if ( ! empty($_y->id) && in_array((int)$_y->id, $gizli_kayit, true) ) $gizli_sayi++;
        }
    }
    $aktif_sayi    = max(0, $toplam_sayi - $gizli_sayi);
    $sirali_sayi   = 0;
    foreach ( $sira_kayit as $_v ) { if ( (int) $_v > 0 ) $sirali_sayi++; }
    ?>
    <style>
        .ahyz-wrap{max-width:1240px;margin:18px 0 60px}
        .ahyz-hero{position:relative;background:linear-gradient(135deg,#6b5410 0%,#D4AF37 50%,#f0d36b 100%);color:#fff;padding:28px 32px;border-radius:18px;box-shadow:0 18px 40px -18px rgba(212,175,55,.55);overflow:hidden}
        .ahyz-hero::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 90% 0%,rgba(255,255,255,.18),transparent 55%),radial-gradient(circle at 0% 100%,rgba(0,0,0,.25),transparent 55%);pointer-events:none}
        .ahyz-hero h1{color:#fff;font-size:26px;font-weight:800;margin:0 0 6px;display:flex;align-items:center;gap:12px;position:relative}
        .ahyz-hero p{color:rgba(255,255,255,.9);margin:0;max-width:760px;font-size:13.5px;line-height:1.55;position:relative}
        .ahyz-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.18);backdrop-filter:blur(4px);padding:4px 12px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;border:1px solid rgba(255,255,255,.25)}
        .ahyz-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin:18px 0 22px}
        .ahyz-stat{background:#fff;border:1px solid #ececec;border-radius:14px;padding:16px 18px;display:flex;align-items:center;gap:14px;box-shadow:0 2px 8px rgba(0,0,0,.04);transition:transform .2s, box-shadow .2s}
        .ahyz-stat:hover{transform:translateY(-2px);box-shadow:0 12px 24px -10px rgba(0,0,0,.12)}
        .ahyz-stat-ico{width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:19px;color:#fff;flex-shrink:0}
        .ahyz-stat-ico.r{background:linear-gradient(135deg,#D4AF37,#e9c75a)}
        .ahyz-stat-ico.g{background:linear-gradient(135deg,#16a34a,#4ade80)}
        .ahyz-stat-ico.b{background:linear-gradient(135deg,#2563eb,#60a5fa)}
        .ahyz-stat-ico.o{background:linear-gradient(135deg,#ea580c,#fb923c)}
        .ahyz-stat-num{font-size:22px;font-weight:800;color:#1a1a1a;line-height:1}
        .ahyz-stat-lbl{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.6px;margin-top:4px;font-weight:600}
        .ahyz-toolbar{display:flex;align-items:center;justify-content:space-between;gap:14px;background:#fff;border:1px solid #ececec;border-radius:14px;padding:12px 16px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,.03);flex-wrap:wrap}
        .ahyz-search{flex:1;min-width:220px;position:relative}
        .ahyz-search input{width:100%;padding:9px 14px 9px 36px;border:1px solid #e2e2e2;border-radius:10px;font-size:13px;background:#fafafa}
        .ahyz-search input:focus{background:#fff;border-color:#D4AF37;outline:none;box-shadow:0 0 0 3px rgba(212,175,55,.12)}
        .ahyz-search::before{content:"\f002";font-family:dashicons;position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#bbb;font-size:16px}
        .ahyz-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:16px}
        .ahyz-card{position:relative;background:#fff;border:1px solid #ececec;border-radius:16px;padding:18px;box-shadow:0 2px 8px rgba(0,0,0,.04);transition:transform .2s, box-shadow .2s, border-color .2s;display:flex;flex-direction:column;gap:14px}
        .ahyz-card:hover{transform:translateY(-3px);box-shadow:0 18px 32px -14px rgba(0,0,0,.18);border-color:#e8cf7a}
        .ahyz-card.gizli{opacity:.55;background:#fafafa}
        .ahyz-card.gizli::after{content:"GİZLİ";position:absolute;top:14px;right:14px;background:#888;color:#fff;font-size:9.5px;font-weight:800;padding:3px 8px;border-radius:999px;letter-spacing:.5px}
        .ahyz-card-head{display:flex;align-items:center;gap:14px}
        .ahyz-foto{width:64px;height:64px;border-radius:50%;object-fit:cover;border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.12);flex-shrink:0;background:#f3f3f3}
        .ahyz-harf{width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#D4AF37,#e9c75a);color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.12);flex-shrink:0}
        .ahyz-info{flex:1;min-width:0}
        .ahyz-ad{font-size:15px;font-weight:800;color:#1a1a1a;margin:0 0 3px;line-height:1.25}
        .ahyz-slug{font-size:11px;color:#999;font-family:Menlo,Consolas,monospace}
        .ahyz-rozet{display:inline-block;background:#fff8e1;color:#D4AF37;font-size:9.5px;font-weight:800;padding:2px 8px;border-radius:999px;text-transform:uppercase;letter-spacing:.5px;margin-top:5px;border:1px solid #e8cf7a}
        .ahyz-controls{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding-top:12px;border-top:1px dashed #efefef}
        .ahyz-field label{display:block;font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.6px;margin-bottom:5px}
        .ahyz-field input[type=number]{width:100%;padding:8px 10px;border:1px solid #e2e2e2;border-radius:8px;font-size:14px;font-weight:700;text-align:center;background:#fafafa;transition:all .2s}
        .ahyz-field input[type=number]:focus{background:#fff;border-color:#D4AF37;outline:none;box-shadow:0 0 0 3px rgba(212,175,55,.12)}
        .ahyz-toggle{display:flex;align-items:center;gap:8px;cursor:pointer;background:#fafafa;padding:8px 10px;border-radius:8px;border:1px solid #e2e2e2;justify-content:center;font-size:12px;font-weight:700;color:#666;transition:all .2s}
        .ahyz-toggle input{margin:0}
        .ahyz-toggle:hover{background:#fff;border-color:#D4AF37;color:#D4AF37}
        .ahyz-toggle.aktif{background:#fff8e1;border-color:#D4AF37;color:#D4AF37}
        .ahyz-sira-rozet{position:absolute;top:-8px;left:-8px;width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#1a1a1a,#3a3a3a);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;box-shadow:0 4px 10px rgba(0,0,0,.25);border:2px solid #fff}
        .ahyz-sira-rozet.bos{background:#e0e0e0;color:#999}
        .ahyz-sticky{position:sticky;bottom:0;background:linear-gradient(180deg,rgba(255,255,255,0),#fff 30%);padding:18px 0 4px;margin-top:22px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
        .ahyz-sticky .ahyz-tip{font-size:12px;color:#777;display:flex;align-items:center;gap:6px}
        .ahyz-btn{background:linear-gradient(135deg,#D4AF37,#f0d36b)!important;color:#fff!important;border:0!important;padding:12px 28px!important;border-radius:10px!important;font-size:14px!important;font-weight:700!important;cursor:pointer;box-shadow:0 8px 18px -6px rgba(212,175,55,.55);transition:transform .15s,box-shadow .15s;display:inline-flex;align-items:center;gap:8px;height:auto!important;line-height:1!important}
        .ahyz-btn:hover{transform:translateY(-2px);box-shadow:0 14px 24px -8px rgba(212,175,55,.6)}
        .ahyz-empty{background:#fff;border:2px dashed #e2e2e2;border-radius:18px;padding:60px 24px;text-align:center;color:#888}
        .ahyz-empty .dashicons{font-size:54px;width:54px;height:54px;color:#ccc;margin-bottom:10px}
        .ahyz-empty h2{margin:0 0 6px;color:#444;font-size:18px}
        @media (max-width:600px){.ahyz-hero{padding:22px 18px}.ahyz-hero h1{font-size:20px}}
    </style>

    <div class="wrap ahyz-wrap">
        <div class="ahyz-hero">
            <span class="ahyz-badge">⚡ AHENK PRO</span>
            <h1><span class="dashicons dashicons-edit-large" style="font-size:30px;width:30px;height:30px"></span> Yazarlar Sıralaması</h1>
            <p>Anasayfadaki <strong>Köşe Yazarları</strong> bölümünde gösterilecek yazarların sırasını ve görünürlüğünü buradan yönetin. Düşük sayı önce gelir, sıra <strong>0</strong> olanlar listenin sonuna düşer. <em>Gizle</em> kutusu işaretli yazarlar anasayfada görünmez.</p>
        </div>

        <?php if ( ! function_exists('ky_yazarlar_al') ) : ?>
            <div class="notice notice-error" style="margin-top:20px;border-left-color:#D4AF37"><p><strong>Köşe Yazarları eklentisi (ky_yazarlar) bulunamadı.</strong> Yazarları yönetmek için lütfen eklentiyi etkinleştirin.</p></div>
        <?php elseif ( empty($yazarlar) ) : ?>
            <div class="ahyz-empty" style="margin-top:20px">
                <span class="dashicons dashicons-groups"></span>
                <h2>Henüz panelden yazar eklenmemiş</h2>
                <p>Sol menüdeki <strong>✍ Yazarlar</strong> sayfasından ilk yazarınızı ekleyin.</p>
            </div>
        <?php else : ?>

        <div class="ahyz-stats">
            <div class="ahyz-stat"><div class="ahyz-stat-ico r"><span class="dashicons dashicons-groups"></span></div><div><div class="ahyz-stat-num"><?php echo (int)$toplam_sayi; ?></div><div class="ahyz-stat-lbl">Toplam Yazar</div></div></div>
            <div class="ahyz-stat"><div class="ahyz-stat-ico g"><span class="dashicons dashicons-visibility"></span></div><div><div class="ahyz-stat-num"><?php echo (int)$aktif_sayi; ?></div><div class="ahyz-stat-lbl">Anasayfada Aktif</div></div></div>
            <div class="ahyz-stat"><div class="ahyz-stat-ico o"><span class="dashicons dashicons-sort"></span></div><div><div class="ahyz-stat-num"><?php echo (int)$sirali_sayi; ?></div><div class="ahyz-stat-lbl">Sıralı Yazar</div></div></div>
            <div class="ahyz-stat"><div class="ahyz-stat-ico b"><span class="dashicons dashicons-hidden"></span></div><div><div class="ahyz-stat-num"><?php echo (int)$gizli_sayi; ?></div><div class="ahyz-stat-lbl">Gizli</div></div></div>
        </div>

        <form method="POST" id="ahyz-form">
            <?php wp_nonce_field('ahenk_yazar_sira_nonce','ahenk_yazar_sira_nonce_field'); ?>

            <div class="ahyz-toolbar">
                <div class="ahyz-search">
                    <input type="text" id="ahyz-arama" placeholder="Yazar ara… (isim veya köşe)">
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap">
                    <button type="button" class="button" id="ahyz-otomatik">🔢 Otomatik Sırala (1,2,3…)</button>
                    <button type="button" class="button" id="ahyz-sifirla">↺ Sıraları Sıfırla</button>
                </div>
            </div>

            <div class="ahyz-grid">
                <?php foreach ( $yazarlar_siralı as $yz ) :
                    $yid   = (int) ( isset($yz->id) ? $yz->id : 0 );
                    if ( $yid <= 0 ) continue;
                    $sira  = isset($sira_kayit[$yid]) ? (int) $sira_kayit[$yid] : 0;
                    $gizli = in_array($yid, $gizli_kayit, true);
                    $arama_txt = strtolower( ($yz->ad ?? '') . ' ' . ($yz->slug ?? '') . ' ' . ($yz->kose_adi ?? '') );
                ?>
                <div class="ahyz-card<?php echo $gizli ? ' gizli' : ''; ?>" data-arama="<?php echo esc_attr($arama_txt); ?>">
                    <div class="ahyz-sira-rozet<?php echo $sira > 0 ? '' : ' bos'; ?>" data-rozet="<?php echo $yid; ?>"><?php echo $sira > 0 ? (int)$sira : '–'; ?></div>
                    <div class="ahyz-card-head">
                        <?php if ( ! empty($yz->foto) ) : ?>
                            <img src="<?php echo esc_url($yz->foto); ?>" alt="" class="ahyz-foto">
                        <?php else : ?>
                            <div class="ahyz-harf"><?php echo esc_html( mb_strtoupper( mb_substr($yz->ad ?? '?', 0, 1) ) ); ?></div>
                        <?php endif; ?>
                        <div class="ahyz-info">
                            <h3 class="ahyz-ad"><?php echo esc_html($yz->ad ?? ''); ?></h3>
                            <div class="ahyz-slug"><?php echo esc_html($yz->slug ?? ''); ?></div>
                            <?php if ( ! empty($yz->kose_adi) ) : ?>
                                <span class="ahyz-rozet"><?php echo esc_html($yz->kose_adi); ?></span>
                            <?php endif; ?>
                        </div>
                    </div>
                    <div class="ahyz-controls">
                        <div class="ahyz-field">
                            <label>Sıra No</label>
                            <input type="number" name="yazar_sira[<?php echo $yid; ?>]" value="<?php echo esc_attr($sira); ?>" min="0" max="999" data-yid="<?php echo $yid; ?>" class="ahyz-sira-input">
                        </div>
                        <div class="ahyz-field">
                            <label>Görünürlük</label>
                            <label class="ahyz-toggle<?php echo $gizli ? ' aktif' : ''; ?>">
                                <input type="checkbox" name="yazar_gizli[<?php echo $yid; ?>]" value="1" <?php checked($gizli); ?> class="ahyz-gizle-cb">
                                <span><?php echo $gizli ? '🙈 Gizli' : '👁 Görünür'; ?></span>
                            </label>
                        </div>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>

            <div class="ahyz-sticky">
                <div class="ahyz-tip">💡 İpucu: Sıra numarası küçük olan yazar anasayfada önce gösterilir. <strong>0</strong> bırakılan yazarlar isim sırasıyla en sona eklenir.</div>
                <button type="submit" name="ahenk_yazar_sira_submit" class="button button-primary ahyz-btn">💾 Sıralamayı Kaydet</button>
            </div>
        </form>

        <script>
        (function(){
            // Arama
            var arama = document.getElementById('ahyz-arama');
            var kartlar = document.querySelectorAll('.ahyz-card');
            if (arama) {
                arama.addEventListener('input', function(){
                    var q = this.value.toLowerCase().trim();
                    kartlar.forEach(function(k){
                        k.style.display = (!q || k.dataset.arama.indexOf(q) !== -1) ? '' : 'none';
                    });
                });
            }
            // Otomatik sırala (görünür kartlar)
            var btnOto = document.getElementById('ahyz-otomatik');
            if (btnOto) btnOto.addEventListener('click', function(){
                var i = 1;
                document.querySelectorAll('.ahyz-card').forEach(function(k){
                    if (k.style.display === 'none') return;
                    var inp = k.querySelector('.ahyz-sira-input');
                    if (inp) { inp.value = i++; inp.dispatchEvent(new Event('input')); }
                });
            });
            // Sıfırla
            var btnSifir = document.getElementById('ahyz-sifirla');
            if (btnSifir) btnSifir.addEventListener('click', function(){
                if (!confirm('Tüm sıra numaraları sıfırlanacak. Devam edilsin mi?')) return;
                document.querySelectorAll('.ahyz-sira-input').forEach(function(inp){
                    inp.value = 0; inp.dispatchEvent(new Event('input'));
                });
            });
            // Rozet & sıra senkron
            document.querySelectorAll('.ahyz-sira-input').forEach(function(inp){
                inp.addEventListener('input', function(){
                    var yid = this.dataset.yid;
                    var rozet = document.querySelector('[data-rozet="'+yid+'"]');
                    if (!rozet) return;
                    var v = parseInt(this.value, 10);
                    if (v > 0) { rozet.textContent = v; rozet.classList.remove('bos'); }
                    else       { rozet.textContent = '–'; rozet.classList.add('bos'); }
                });
            });
            // Gizle toggle görsel
            document.querySelectorAll('.ahyz-gizle-cb').forEach(function(cb){
                cb.addEventListener('change', function(){
                    var card = this.closest('.ahyz-card');
                    var lbl  = this.closest('.ahyz-toggle');
                    var span = lbl.querySelector('span');
                    if (this.checked) { card.classList.add('gizli'); lbl.classList.add('aktif'); span.textContent = '🙈 Gizli'; }
                    else              { card.classList.remove('gizli'); lbl.classList.remove('aktif'); span.textContent = '👁 Görünür'; }
                });
            });
        })();
        </script>
        <?php endif; ?>
    </div>
    <?php
}

/* ============================================================
   YAZARLARI SIRAYA GÖRE DÖNDÜREN YARDIMCI
   ============================================================ */
if ( ! function_exists('ahenk_yazarlar_sirali') ) {
function ahenk_yazarlar_sirali( $limit = 0 ) {
    if ( ! function_exists('ky_yazarlar_al') ) return array();
    $yazarlar = ky_yazarlar_al(true);
    if ( ! is_array($yazarlar) ) return array();

    $sira  = (array) get_option('ahenk_yazar_sirasi',   array());
    $gizli = (array) get_option('ahenk_yazar_gizliler', array());

    $yazarlar = array_filter($yazarlar, function($yz) use ($gizli){
        $yid = (int) ( isset($yz->id) ? $yz->id : 0 );
        return $yid > 0 && ! in_array($yid, $gizli, true);
    });

    usort($yazarlar, function($a, $b) use ($sira){
        $aid = (int) $a->id; $bid = (int) $b->id;
        $sa = isset($sira[$aid]) && (int) $sira[$aid] > 0 ? (int) $sira[$aid] : PHP_INT_MAX;
        $sb = isset($sira[$bid]) && (int) $sira[$bid] > 0 ? (int) $sira[$bid] : PHP_INT_MAX;
        if ( $sa === $sb ) return strcmp($a->ad, $b->ad);
        return $sa - $sb;
    });

    if ( $limit > 0 ) $yazarlar = array_slice($yazarlar, 0, $limit);
    return array_values($yazarlar);
}
}

/* Panel yazarının son yazısını döndürür (ky-makale post type, _ky_yazar_id meta) */
if ( ! function_exists('ahenk_yazar_son_yazi') ) {
function ahenk_yazar_son_yazi( $yazar_id ) {
    $q = new WP_Query(array(
        'post_type'      => 'ky-makale',
        'post_status'    => 'publish',
        'posts_per_page' => 1,
        'orderby'        => 'date',
        'order'          => 'DESC',
        'no_found_rows'  => true,
        'meta_query'     => array(
            array('key' => '_ky_yazar_id', 'value' => (int) $yazar_id),
        ),
    ));
    if ( ! $q->have_posts() ) return null;
    $p = $q->posts[0];
    return (object) array(
        'baslik' => get_the_title($p->ID),
        'link'   => get_permalink($p->ID),
    );
}
}

/* ============================================================
   ANASAYFA MODÜLLERİ SAYFASI
   ============================================================ */
function ahp_moduller_sayfa() {
    if ( isset($_POST['ahenk_moduller_submit']) && check_admin_referer('ahenk_moduller_nonce','ahenk_moduller_nonce_field') ) {
        $moduller = array('yazarlar', 'ikon_bant', 'son_haberler');
        foreach ( $moduller as $m ) {
            update_option( 'ahenk_modul_' . $m, isset($_POST['modul_' . $m]) ? 1 : 0 );
        }
        echo '<div class="notice notice-success is-dismissible"><p>✅ Modüller güncellendi.</p></div>';
    }
    $moduller = array(
        'yazarlar'     => array('🖊', 'Köşe Yazarları',    'Yazarlar bölümünü anasayfada göster'),
        'ikon_bant'    => array('🏷', 'İkon Bant',         'Manşet altı 6 konulu hızlı bant'),
        'son_haberler' => array('📰', 'Son Haberler Bandı','Kaydırmalı son haberler satırı'),
    );
    ?>
    <div class="wrap">
        <h1 style="display:flex;align-items:center;gap:8px">
            <span style="background:#D4AF37;color:#fff;padding:2px 10px;border-radius:4px">AHENK</span> Anasayfa Modülleri
        </h1>
        <p>Anasayfada gösterilecek modülleri aşağıdan aktif/pasif yapabilirsiniz.</p>
        <form method="POST">
            <?php wp_nonce_field('ahenk_moduller_nonce','ahenk_moduller_nonce_field'); ?>
            <table class="wp-list-table widefat fixed" style="max-width:640px;border-radius:6px;overflow:hidden">
                <thead style="background:#f0f0f0">
                    <tr>
                        <th style="width:40px"></th>
                        <th>Modül</th>
                        <th>Açıklama</th>
                        <th style="width:110px;text-align:center">Durum</th>
                    </tr>
                </thead>
                <tbody>
                <?php foreach ( $moduller as $key => $info ) :
                    $aktif = (bool) get_option('ahenk_modul_' . $key, 1);
                ?>
                <tr>
                    <td style="font-size:20px;text-align:center"><?php echo $info[0]; ?></td>
                    <td><strong><?php echo esc_html($info[1]); ?></strong></td>
                    <td style="color:#666"><?php echo esc_html($info[2]); ?></td>
                    <td style="text-align:center">
                        <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer">
                            <input type="checkbox" name="modul_<?php echo esc_attr($key); ?>" value="1" <?php checked($aktif); ?>>
                            <span style="font-size:12px;font-weight:700;color:<?php echo $aktif ? '#2e7d32' : '#c00'; ?>">
                                <?php echo $aktif ? '✅ Aktif' : '❌ Pasif'; ?>
                            </span>
                        </label>
                    </td>
                </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
            <p class="submit">
                <button type="submit" name="ahenk_moduller_submit" class="button button-primary button-large">💾 Kaydet</button>
            </p>
        </form>
    </div>
    <?php
}

/* ============================================================
   MANŞET YÖNETİMİ SAYFASI
   ============================================================ */
function ahp_manseta_sayfa() {
    // Manşetten kaldır
    if ( isset($_GET['mansetten_kaldir'], $_GET['_wpnonce']) ) {
        $pid = intval($_GET['mansetten_kaldir']);
        if ( wp_verify_nonce($_GET['_wpnonce'], 'mansetten_kaldir_' . $pid) && current_user_can('edit_post', $pid) ) {
            update_post_meta($pid, '_manset_haberi', '0');
            echo '<div class="notice notice-success is-dismissible"><p>✅ Haber manşetten kaldırıldı.</p></div>';
        }
    }

    // Manşete ekle (checkbox)
    if ( isset($_POST['mansete_ekle_submit'], $_POST['mansete_post_id']) && check_admin_referer('ahenk_mansete_ekle','ahenk_mansete_nonce') ) {
        $pid = intval($_POST['mansete_post_id']);
        if ( $pid && current_user_can('edit_post', $pid) ) {
            update_post_meta($pid, '_manset_haberi', '1');
            echo '<div class="notice notice-success is-dismissible"><p>✅ Haber manşete eklendi.</p></div>';
        }
    }

    $manset_q = new WP_Query(array(
        'post_type'      => array('haber', 'post'),
        'post_status'    => 'publish',
        'posts_per_page' => 30,
        'meta_query'     => array(array('key' => '_manset_haberi', 'value' => '1')),
        'orderby'        => 'date',
        'order'          => 'DESC',
    ));
    ?>
    <div class="wrap">
        <h1 style="display:flex;align-items:center;gap:8px">
            <span style="background:#D4AF37;color:#fff;padding:2px 10px;border-radius:4px">AHENK</span> Manşet Haberleri
        </h1>
        <p>Manşette görünen haberleri buradan yönetebilirsiniz. Haber düzenleme ekranında da "🗞 Manşet Haberi" kutusunu işaretleyebilirsiniz.</p>

        <?php if ( $manset_q->have_posts() ) : ?>
        <table class="wp-list-table widefat fixed striped" style="border-radius:6px;overflow:hidden">
            <thead style="background:#f0f0f0">
                <tr>
                    <th style="width:56px">Görsel</th>
                    <th>Başlık</th>
                    <th style="width:130px">Kategori</th>
                    <th style="width:100px">Tarih</th>
                    <th style="width:210px">İşlem</th>
                </tr>
            </thead>
            <tbody>
            <?php while ( $manset_q->have_posts() ) : $manset_q->the_post();
                $pid         = get_the_ID();
                $kats        = get_the_terms($pid, 'haber-kategorisi');
                if (!$kats || is_wp_error($kats)) $kats = get_the_category();
                $kat_adi     = !empty($kats) ? $kats[0]->name : '—';
                $nonce       = wp_create_nonce('mansetten_kaldir_' . $pid);
                $kaldir_url  = admin_url('admin.php?page=ahenk-manseta&mansetten_kaldir=' . $pid . '&_wpnonce=' . $nonce);
                $duzenle_url = get_edit_post_link($pid);
            ?>
            <tr>
                <td>
                    <?php if ( has_post_thumbnail() ) : ?>
                    <img src="<?php echo esc_url(get_the_post_thumbnail_url($pid, 'thumbnail')); ?>"
                         style="width:56px;height:42px;object-fit:cover;border-radius:4px;display:block">
                    <?php else : ?>
                    <div style="width:56px;height:42px;background:#f0f0f0;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:18px">📷</div>
                    <?php endif; ?>
                </td>
                <td><strong><?php the_title(); ?></strong></td>
                <td><?php echo esc_html($kat_adi); ?></td>
                <td><?php echo get_the_date('d.m.Y'); ?></td>
                <td>
                    <a href="<?php echo esc_url($duzenle_url); ?>" class="button button-small">✏ Düzenle</a>
                    &nbsp;
                    <a href="<?php echo esc_url($kaldir_url); ?>"
                       class="button button-small"
                       style="color:#c00;border-color:#c00;background:#fff8f8"
                       onclick="return confirm('Bu haberi manşetten kaldırmak istediğinizden emin misiniz?')">
                        🗑 Kaldır
                    </a>
                </td>
            </tr>
            <?php endwhile; wp_reset_postdata(); ?>
            </tbody>
        </table>
        <?php else : ?>
        <div style="padding:24px;background:#fff;border:1px solid #ddd;border-radius:6px;color:#666">
            Henüz manşete eklenmiş haber yok. Haber düzenleme ekranında <strong>"🗞 Manşet Haberi"</strong> kutusunu işaretleyin.
        </div>
        <?php endif; ?>
    </div>
    <?php
}

/* ============================================================
   İKON BANT YÖNETİMİ SAYFASI
   ============================================================ */
function ahp_ikon_bant_sayfa() {
    if ( isset($_POST['ahenk_ikon_submit']) && check_admin_referer('ahenk_ikon_nonce','ahenk_ikon_nonce_field') ) {
        for ( $i = 1; $i <= 6; $i++ ) {
            update_option("ahenk_ikon_{$i}_icon",   sanitize_text_field($_POST["ikon_{$i}_icon"]   ?? ''));
            update_option("ahenk_ikon_{$i}_baslik", sanitize_text_field($_POST["ikon_{$i}_baslik"] ?? ''));
            update_option("ahenk_ikon_{$i}_acik",   sanitize_text_field($_POST["ikon_{$i}_acik"]   ?? ''));
            update_option("ahenk_ikon_{$i}_link",   esc_url_raw(       $_POST["ikon_{$i}_link"]    ?? ''));
        }
        echo '<div class="notice notice-success is-dismissible"><p>✅ İkon Bant kaydedildi.</p></div>';
    }

    $defaults = array(
        1 => array('fa-map-marker-alt', 'Gezilecek Yerler', 'Müze & tarihi yapılar', ''),
        2 => array('fa-camera',         'Foto Galeri',       'Fotoğraf & hikaye',    ''),
        3 => array('fa-utensils',       'Yerel Haberler',    'Bölgesel gelişmeler',  ''),
        4 => array('fa-bullhorn',       'Resmi İlanlar',     'Tüm resmi ilanlar',    ''),
        5 => array('fa-tag',            'Seri İlanlar',      'Bölgesel ilanlar',     ''),
        6 => array('fa-newspaper',      'Spor',              'Güncel maçlar',        ''),
    );
    ?>
    <div class="wrap">
        <h1 style="display:flex;align-items:center;gap:8px">
            <span style="background:#D4AF37;color:#fff;padding:2px 10px;border-radius:4px">AHENK</span> İkon Bant Yönetimi
        </h1>
        <p>Anasayfada manşetin altında görünen 6 ikonlu bandı buradan düzenleyin. Boş bırakılan satırlar gösterilmez.</p>
        <form method="POST">
            <?php wp_nonce_field('ahenk_ikon_nonce','ahenk_ikon_nonce_field'); ?>
            <table class="wp-list-table widefat fixed striped" style="border-radius:6px;overflow:hidden">
                <thead style="background:#f0f0f0">
                    <tr>
                        <th style="width:30px">#</th>
                        <th style="width:160px">İkon (fa-...)</th>
                        <th style="width:180px">Başlık</th>
                        <th style="width:200px">Açıklama</th>
                        <th>Link URL</th>
                    </tr>
                </thead>
                <tbody>
                <?php for ( $i = 1; $i <= 6; $i++ ) :
                    $opt_icon   = get_option("ahenk_ikon_{$i}_icon");
                    $opt_baslik = get_option("ahenk_ikon_{$i}_baslik");
                    $opt_acik   = get_option("ahenk_ikon_{$i}_acik");
                    $opt_link   = get_option("ahenk_ikon_{$i}_link");
                    $icon   = ($opt_icon   !== false && $opt_icon   !== '') ? $opt_icon   : (get_theme_mod("ahenk_ikon_{$i}_icon",   '') ?: $defaults[$i][0]);
                    $baslik = ($opt_baslik !== false && $opt_baslik !== '') ? $opt_baslik : (get_theme_mod("ahenk_ikon_{$i}_baslik", '') ?: $defaults[$i][1]);
                    $acik   = ($opt_acik   !== false && $opt_acik   !== '') ? $opt_acik   : (get_theme_mod("ahenk_ikon_{$i}_acik",   '') ?: $defaults[$i][2]);
                    $link   = ($opt_link   !== false && $opt_link   !== '') ? $opt_link   : (get_theme_mod("ahenk_ikon_{$i}_link",   '') ?: $defaults[$i][3]);
                ?>
                <tr>
                    <td style="text-align:center;font-weight:700"><?php echo $i; ?></td>
                    <td><input type="text" name="ikon_<?php echo $i; ?>_icon"   value="<?php echo esc_attr($icon);   ?>" class="widefat" placeholder="fa-newspaper"></td>
                    <td><input type="text" name="ikon_<?php echo $i; ?>_baslik" value="<?php echo esc_attr($baslik); ?>" class="widefat"></td>
                    <td><input type="text" name="ikon_<?php echo $i; ?>_acik"   value="<?php echo esc_attr($acik);   ?>" class="widefat"></td>
                    <td><input type="url"  name="ikon_<?php echo $i; ?>_link"   value="<?php echo esc_attr($link);   ?>" class="widefat" placeholder="https://..."></td>
                </tr>
                <?php endfor; ?>
                </tbody>
            </table>
            <p class="submit">
                <button type="submit" name="ahenk_ikon_submit" class="button button-primary button-large">💾 Kaydet</button>
            </p>
        </form>
        <p style="color:#888;font-size:12px">💡 <strong>İkon adları:</strong> fa-newspaper, fa-camera, fa-map-marker-alt, fa-bullhorn, fa-tag, fa-utensils, fa-football-ball, fa-mosque, vb. (<a href="https://fontawesome.com/v5/search?s=solid&m=free" target="_blank">Tüm ikonlar →</a>)</p>
    </div>
    <?php
}

/* ============================================================
   ANA AYARLAR SAYFASI
   ============================================================ */
add_action('admin_init', function(){
    if ( isset($_POST['ahenk_ayar_submit']) && check_admin_referer('ahenk_ayarlar_nonce','ahenk_nonce_field') ) {
        $alanlar = array(
            'ahenk_reklam_header','ahenk_reklam_after_hero','ahenk_reklam_sidebar_top',
            'ahenk_reklam_icerik_1','ahenk_reklam_footer','ahenk_reklam_mobil',
            'ahenk_openweather_api','ahenk_hava_sehir',
        );
        foreach ( $alanlar as $alan ) {
            if ( isset($_POST[$alan]) ) {
                update_option($alan, wp_kses_post(stripslashes($_POST[$alan])));
            }
        }
        add_settings_error('ahenk','ok','Ayarlar kaydedildi.','updated');
    }
});

add_action('haber-kategorisi_edit_form_fields', function($term){
    $renk = get_term_meta($term->term_id,'kategori_rengi',true) ?: '#D4AF37';
    echo '<tr><th>Kategori Rengi</th><td>';
    wp_nonce_field('ahenk_kat_renk','ahenk_kat_nonce');
    echo '<input type="color" name="kategori_rengi" value="'.esc_attr($renk).'"></td></tr>';
});
add_action('edited_haber-kategorisi', function($term_id){
    if ( wp_verify_nonce($_POST['ahenk_kat_nonce']??'','ahenk_kat_renk') && isset($_POST['kategori_rengi']) ) {
        update_term_meta($term_id,'kategori_rengi',sanitize_hex_color($_POST['kategori_rengi']));
    }
});

function ahp_admin_sayfa(){
    settings_errors('ahenk');
    $sekme = sanitize_key($_GET['sekme'] ?? 'reklam');
    ?>
    <div class="wrap">
        <h1 style="display:flex;align-items:center;gap:8px">
            <span style="background:#D4AF37;color:#fff;padding:2px 10px;border-radius:4px">AHENK</span> HABER Ayarları
        </h1>
        <nav class="nav-tab-wrapper">
            <a href="?page=ahenk-haber-ayarlar&sekme=reklam"   class="nav-tab <?php echo $sekme==='reklam'   ?'nav-tab-active':''; ?>">Reklam</a>
            <a href="?page=ahenk-haber-ayarlar&sekme=hava"     class="nav-tab <?php echo $sekme==='hava'     ?'nav-tab-active':''; ?>">Hava/Spor</a>
            <a href="?page=ahenk-haber-ayarlar&sekme=guvenlik" class="nav-tab <?php echo $sekme==='guvenlik' ?'nav-tab-active':''; ?>">Güvenlik</a>
        </nav>
        <form method="POST" style="margin-top:20px">
            <?php wp_nonce_field('ahenk_ayarlar_nonce','ahenk_nonce_field'); ?>
            <?php if ( $sekme === 'reklam' ) : ?>
                <h2>Reklam Alanları</h2>
                <table class="form-table">
                    <?php foreach(array(
                        'ahenk_reklam_header'     => 'Header Reklam (728x90)',
                        'ahenk_reklam_after_hero' => 'Manşet Altı Reklam (970x90)',
                        'ahenk_reklam_sidebar_top'=> 'Sidebar Reklam (300x250)',
                        'ahenk_reklam_icerik_1'   => 'Haber İçi Reklam',
                        'ahenk_reklam_footer'     => 'Footer Reklam',
                        'ahenk_reklam_mobil'      => 'Mobil Alt Reklam (320x50)',
                    ) as $k => $v) : ?>
                    <tr>
                        <th><?php echo esc_html($v); ?></th>
                        <td><textarea name="<?php echo esc_attr($k); ?>" rows="3" class="large-text" style="font-family:monospace;font-size:12px"><?php echo esc_textarea(get_option($k,'')); ?></textarea></td>
                    </tr>
                    <?php endforeach; ?>
                </table>
            <?php elseif ( $sekme === 'hava' ) : ?>
                <h2>Hava Durumu API</h2>
                <table class="form-table">
                    <tr>
                        <th>OpenWeatherMap API Key</th>
                        <td>
                            <input type="text" name="ahenk_openweather_api" value="<?php echo esc_attr(get_option('ahenk_openweather_api','')); ?>" class="regular-text">
                            <br><small><a href="https://openweathermap.org/api" target="_blank">Ücretsiz API key al</a></small>
                        </td>
                    </tr>
                    <tr>
                        <th>Hava Durumu Şehri</th>
                        <td>
                            <input type="text" name="ahenk_hava_sehir" value="<?php echo esc_attr(get_option('ahenk_hava_sehir','Ankara')); ?>" class="regular-text">
                            <br><small>Türkçe şehir adı: Ankara, Istanbul, Izmir...</small>
                        </td>
                    </tr>
                </table>
            <?php elseif ( $sekme === 'guvenlik' ) : ?>
                <div style="background:#e8f5e9;border-left:4px solid #2E7D32;padding:16px;border-radius:6px">
                    <h3 style="color:#1b5e20;margin-top:0">✅ Aktif Güvenlik Önlemleri</h3>
                    <ul style="color:#1b5e20;line-height:2;margin:0;padding-left:20px">
                        <li>XML-RPC devre dışı</li>
                        <li>WordPress sürümü gizli</li>
                        <li>Giriş deneme limiti (5 hata → 30dk blok)</li>
                        <li>Güvenlik HTTP başlıkları</li>
                        <li>REST API kullanıcı listesi gizli</li>
                        <li>Uploads klasörü PHP engeli</li>
                    </ul>
                </div>
            <?php endif; ?>
            <p class="submit">
                <button type="submit" name="ahenk_ayar_submit" class="button button-primary button-large">💾 Kaydet</button>
            </p>
        </form>
    </div>
    <?php
}

/* ============================================================
   ADMIN PANEL — KÖŞE YAZARLARI / KÖŞE YAZILARI EKLENTİ STİL DÜZELTMELERİ
   Eklentinin yönetim sayfalarındaki orantısız resimleri/sayfa düzenini
   düzeltir, premium kart görünümü uygular.
   ============================================================ */
add_action('admin_head', function(){
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if ( ! $screen ) return;
    $sid = (string) $screen->id;
    $base = (string) $screen->base;
    $ptype = isset($screen->post_type) ? (string) $screen->post_type : '';

    $hedef = ( stripos($sid,'ky-') !== false )
        || ( stripos($sid,'kose-yaz') !== false )
        || ( stripos($sid,'yazar') !== false )
        || ( stripos($ptype,'ky-') !== false )
        || ( stripos($ptype,'kose-yaz') !== false )
        || ( in_array($ptype, array('ky-makale','ky-yazar','kose-yazisi'), true) );

    if ( ! $hedef ) return;
    ?>
    <style id="ahenk-admin-fix">
        /* Genel sayfa içi kapsayıcı */
        .ahenk-admin-fix-wrap, .wrap{ max-width:1280px; }

        /* Eklentinin liste sayfalarındaki devasa resimleri sınırla */
        .wrap .wp-list-table img,
        .wrap table img,
        .wrap .ky-yazar-foto,
        .wrap .ky-foto,
        .wrap img.attachment-thumbnail,
        .wrap .column-thumbnail img,
        .wrap .yazar-avatar,
        .wrap .yazar-foto{
            max-width:64px !important;
            max-height:64px !important;
            width:64px !important;
            height:64px !important;
            object-fit:cover !important;
            border-radius:50% !important;
            border:2px solid #fff !important;
            box-shadow:0 2px 8px rgba(0,0,0,.15) !important;
            display:inline-block !important;
            vertical-align:middle !important;
        }

        /* Edit/listeleme tablosu hücresi */
        .wrap .wp-list-table td{ vertical-align:middle !important; padding:12px 10px !important; }
        .wrap .wp-list-table th{ background:linear-gradient(180deg,#fff,#f7f7f9) !important; }
        .wrap .wp-list-table{ border:1px solid #e5e5e5 !important; border-radius:12px !important; overflow:hidden !important; box-shadow:0 2px 8px rgba(0,0,0,.04) !important; }

        /* Eklenti meta kutularındaki tek büyük resim önizlemesi (post.php) */
        .post-type-ky-makale #postimagediv .inside img,
        .post-type-ky-yazar #postimagediv .inside img,
        .post-type-kose-yazisi #postimagediv .inside img,
        .post-type-ky-makale .ky-foto-onizleme img,
        .post-type-ky-yazar .ky-foto-onizleme img,
        .ahenk-admin-foto-onizleme img{
            max-width:240px !important;
            max-height:240px !important;
            width:auto !important;
            height:auto !important;
            object-fit:cover !important;
            border-radius:12px !important;
            border:3px solid #fff !important;
            box-shadow:0 8px 20px rgba(0,0,0,.15) !important;
            display:block !important;
            margin:0 auto 10px !important;
        }

        /* Yöneticinin kendi (eski) "Köşe Yazarları" liste sayfasında full-bleed
           çıkan her img'i konteyner içinde sınırla */
        .wrap > img,
        .wrap form > img,
        .wrap .ky-yazarlar-liste img,
        .wrap .kose-yazarlari-liste img{
            max-width:120px !important;
            max-height:120px !important;
            width:120px !important;
            height:120px !important;
            object-fit:cover !important;
            border-radius:50% !important;
            border:3px solid #fff !important;
            box-shadow:0 6px 18px rgba(0,0,0,.18) !important;
        }

        /* Eklentinin kart/satır görünümü için premium dokunuş */
        .wrap .ky-yazar-kart,
        .wrap .kose-yazar-kart,
        .wrap .yazar-row{
            background:#fff !important;
            border:1px solid #ececec !important;
            border-radius:14px !important;
            padding:14px 16px !important;
            margin-bottom:10px !important;
            box-shadow:0 2px 8px rgba(0,0,0,.04) !important;
            display:flex !important;
            align-items:center !important;
            gap:14px !important;
            transition:transform .18s, box-shadow .18s !important;
        }
        .wrap .ky-yazar-kart:hover,
        .wrap .kose-yazar-kart:hover,
        .wrap .yazar-row:hover{
            transform:translateY(-2px) !important;
            box-shadow:0 12px 24px -10px rgba(0,0,0,.15) !important;
        }

        /* Postbox başlıklarına kırmızı vurgu */
        .post-type-ky-makale .postbox > .postbox-header,
        .post-type-ky-yazar .postbox > .postbox-header,
        .post-type-kose-yazisi .postbox > .postbox-header{
            border-top:3px solid #D4AF37 !important;
        }
    </style>
    <?php
});
