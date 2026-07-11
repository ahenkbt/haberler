<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

class VTV_Admin {

    public static function init() {
        add_action('admin_menu',            array(__CLASS__, 'add_menu'));
        add_action('admin_enqueue_scripts', array(__CLASS__, 'enqueue'));
    }

    public static function add_menu() {
        // Ahenk Ai İçerik Robotu ana menüsü altına ekle (parent slug: ai-haber-botu)
        $parent = 'ai-haber-botu';
        add_submenu_page( $parent, '📺 Video TV — Kaynaklar',  '📺 VTV: Kaynaklar',  'manage_options', 'video-tv',              array( __CLASS__, 'page_kaynaklar' ) );
        add_submenu_page( $parent, '📺 Video TV — Videolar',   '📺 VTV: Videolar',   'manage_options', 'video-tv-videolar',     array( __CLASS__, 'page_videolar' ) );
        add_submenu_page( $parent, '📺 Video TV — Playlistler','📺 VTV: Playlistler','manage_options', 'video-tv-playlistler',  array( __CLASS__, 'page_playlistler' ) );
        add_submenu_page( $parent, '📺 Video TV — Kategoriler','📺 VTV: Kategoriler','manage_options', 'video-tv-kategoriler',  array( __CLASS__, 'page_kategoriler' ) );
        add_submenu_page( $parent, '📺 Video TV — Ayarlar',    '📺 VTV: Ayarlar',    'manage_options', 'video-tv-ayarlar',      array( __CLASS__, 'page_ayarlar' ) );
    }

    public static function enqueue( $hook ) {
        // Hook adı parent menünün hangi pluginden geldiğine göre değişebilir
        // (eski standalone "video-tv" plugin hâlâ aktifse "toplevel_page_video-tv" olur).
        // Bu yüzden $_GET['page'] slug'ına bakıyoruz — daha güvenli.
        $page_slug = isset( $_GET['page'] ) ? sanitize_text_field( $_GET['page'] ) : '';
        $vtv_pages = array( 'video-tv', 'video-tv-videolar', 'video-tv-playlistler', 'video-tv-kategoriler', 'video-tv-ayarlar' );
        $hook_pages = array(
            'ai-haber-botu_page_video-tv',
            'ai-haber-botu_page_video-tv-videolar',
            'ai-haber-botu_page_video-tv-playlistler',
            'ai-haber-botu_page_video-tv-kategoriler',
            'ai-haber-botu_page_video-tv-ayarlar',
            'toplevel_page_video-tv',
            'video-tv_page_video-tv-videolar',
            'video-tv_page_video-tv-playlistler',
            'video-tv_page_video-tv-kategoriler',
            'video-tv_page_video-tv-ayarlar',
        );
        $is_vtv = in_array( $page_slug, $vtv_pages, true ) || in_array( $hook, $hook_pages, true );
        if ( ! $is_vtv ) { return; }
        wp_enqueue_style(  'vtv-admin', VTV_URL . 'assets/css/admin.css',  array(), VTV_VER );
        wp_enqueue_script( 'vtv-admin', VTV_URL . 'assets/js/admin.js', array('jquery'), VTV_VER, true );
        wp_localize_script( 'vtv-admin', 'VTV_A', array(
            'ajax'  => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('vtv_nonce'),
        ));
    }

    /* =========================================================
     * KAYNAKLAR
     * ======================================================= */
    public static function page_kaynaklar() {
        global $wpdb;
        // DÜZELTME: aktif filtresi yok = hepsi gelir
        $rows = VTV_DB::get_kaynaklar( array() );
        $cats = VTV_DB::get_kategoriler( false );
        $tips = array( 'kanal' => 'Kanal', 'playlist' => 'Playlist', 'video' => 'Tekil Video', 'canli' => 'Canlı TV' );

        echo '<div class="wrap vtv-wrap">';
        echo '<div class="vtv-hdr"><h1>Video TV &mdash; Kaynaklar</h1>';
        echo '<p>YouTube ve Dailymotion kanallar&#305;n&#305; buradan ekleyin ve y&#246;netin.</p></div>';

        /* ---- Ekleme formu ---- */
        echo '<div class="vtv-card">';
        echo '<h2 class="vtv-ch">Yeni Kaynak Ekle</h2>';
        echo '<div class="vtv-form-grid">';

        echo '<div class="vtv-fg"><label>Platform</label>';
        echo '<select id="vt-platform"><option value="youtube">YouTube</option><option value="dailymotion">Dailymotion</option></select></div>';

        echo '<div class="vtv-fg"><label>T&#252;r</label>';
        echo '<select id="vt-tip"><option value="kanal">Kanal</option><option value="playlist">Playlist</option><option value="video">Tekil Video</option><option value="canli">Canlı TV</option></select></div>';

        echo '<div class="vtv-fg"><label>G&#246;r&#252;nen &#304;sim *</label>';
        echo '<input type="text" id="vt-isim" placeholder="Kanal / kaynak ad&#305;"></div>';

        echo '<div class="vtv-fg vtv-fg-wide"><label id="vt-deger-lbl">Kanal URL / @handle *</label>';
        echo '<input type="text" id="vt-deger" placeholder="@KanalAdi veya https://...">';
        echo '<small id="vt-hint" style="color:#9CA3AF;display:block;margin-top:3px">YouTube: @handle, UCxxxxxx veya URL | DM: kullan&#305;c&#305;ad&#305; veya URL</small></div>';

        echo '<div class="vtv-fg"><label>Kategori</label>';
        echo '<select id="vt-kat"><option value="0">Kategori Se&#231;in</option>';
        foreach ( $cats as $cat ) { echo '<option value="' . $cat->id . '">' . esc_html( $cat->isim ) . '</option>'; }
        echo '</select></div>';

        echo '<div class="vtv-fg"><label>A&#231;&#305;klama</label>';
        echo '<input type="text" id="vt-aciklama" placeholder="Opsiyonel a&#231;&#305;klama"></div>';

        echo '<div class="vtv-fg vtv-fg-check"><label class="vtv-check-label">';
        echo '<input type="checkbox" id="vt-populer"> Pop&#252;ler kanallar listesinde g&#246;ster</label></div>';

        echo '<div class="vtv-fg" style="align-self:flex-end">';
        echo '<button class="button button-primary" id="vt-add-btn" style="height:38px;padding:0 20px">Ekle &amp; &#199;ek</button></div>';
        echo '</div>';
        echo '<div id="vt-add-msg" style="display:none;margin-top:12px;padding:10px 14px;border-radius:6px;font-size:13px;font-weight:600"></div>';
        echo '</div>'; /* .vtv-card form */

        /* ---- Kaynak listesi ---- */
        echo '<div class="vtv-card">';
        echo '<h2 class="vtv-ch">Kaynaklar <span class="vtv-bdg">' . count( $rows ) . '</span></h2>';

        if ( empty( $rows ) ) {
            echo '<p style="color:#9CA3AF;padding:16px 0">Hen&#252;z kaynak eklenmedi. Yukar&#305;daki formu kullan&#305;n.</p>';
        } else {
            echo '<div style="overflow-x:auto">';
            echo '<table class="vtv-tbl" style="min-width:760px">';
            echo '<thead><tr>';
            echo '<th style="min-width:180px">&#304;sim</th>';
            echo '<th style="width:70px">Platform</th>';
            echo '<th style="width:80px">T&#252;r</th>';
            echo '<th style="width:120px">Kategori</th>';
            echo '<th style="width:60px">Video</th>';
            echo '<th style="width:60px">Pop&#252;ler</th>';
            echo '<th style="width:70px">Durum</th>';
            echo '<th style="min-width:220px">&#304;&#351;lemler</th>';
            echo '</tr></thead><tbody>';

            foreach ( $rows as $r ) {
                $cnt       = VTV_DB::get_video_count( $r->id );
                $cat       = $r->kategori_id ? VTV_DB::get_kategori( $r->kategori_id ) : null;
                $tip_lbl   = isset( $tips[ $r->tip ] ) ? $tips[ $r->tip ] : $r->tip;
                $aktif_cls = $r->aktif ? 'vtv-aktif' : 'vtv-pasif';
                $aktif_txt = $r->aktif ? 'Aktif'     : 'Pasif';
                $ref       = $r->kanal_url ?: ( $r->playlist_id ?: $r->video_id );
                $vid_url   = esc_url( admin_url( 'admin.php?page=video-tv-videolar&kid=' . $r->id ) );
                $upd       = $r->son_guncelle ? date( 'd.m.Y H:i', strtotime( $r->son_guncelle ) ) : '';

                $plat_html = ( $r->platform === 'youtube' )
                    ? '<span style="background:#FF0000;color:#fff;font-size:10px;font-weight:800;padding:2px 6px;border-radius:3px">YT</span>'
                    : '<span style="background:#003CB4;color:#fff;font-size:10px;font-weight:800;padding:2px 6px;border-radius:3px">DM</span>';

                $pop_html = $r->populer
                    ? '<span style="color:#F59E0B;font-weight:700;font-size:16px" title="Pop&#252;ler">&#9733;</span>'
                    : '<span style="color:#D1D5DB;font-size:16px">&#9734;</span>';

                $edit_json = wp_json_encode( array(
                    'id'          => (int) $r->id,
                    'isim'        => $r->isim,
                    'tip'         => $r->tip,
                    'platform'    => $r->platform,
                    'deger'       => $ref,
                    'kategori_id' => (int) $r->kategori_id,
                    'populer'     => (int) $r->populer,
                    'aktif'       => (int) $r->aktif,
                    'aciklama'    => $r->aciklama,
                ));

                echo '<tr id="vtv-row-' . (int)$r->id . '">';

                echo '<td><strong>' . esc_html( $r->isim ) . '</strong>';
                if ( $ref ) { echo '<br><small style="color:#9CA3AF;font-size:11px;word-break:break-all">' . esc_html( mb_substr( $ref, 0, 40 ) ) . '</small>'; }
                if ( $upd ) { echo '<br><small style="color:#A78BFA;font-size:10px">Son: ' . $upd . '</small>'; }
                echo '</td>';

                echo '<td>' . $plat_html . '</td>';
                echo '<td style="font-size:12px">' . esc_html( $tip_lbl ) . '</td>';

                if ( $cat ) {
                    echo '<td><span style="background:' . esc_attr($cat->renk) . ';color:#fff;padding:2px 7px;border-radius:10px;font-size:11px;white-space:nowrap">' . esc_html($cat->isim) . '</span></td>';
                } else {
                    echo '<td style="color:#9CA3AF;font-size:12px">-</td>';
                }

                echo '<td style="text-align:center"><span class="vtv-bdg" id="vtcnt-' . (int)$r->id . '">' . (int)$cnt . '</span></td>';
                echo '<td style="text-align:center">' . $pop_html . '</td>';
                echo '<td><button class="vtv-toggle ' . $aktif_cls . '" data-id="' . (int)$r->id . '">' . $aktif_txt . '</button></td>';

                echo '<td>';
                echo '<div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center">';
                echo '<button class="button vtv-refresh" data-id="' . (int)$r->id . '" title="Videoları yenile" style="padding:4px 8px;font-size:11px">&#8635;</button>';
                echo '<a class="button" href="' . $vid_url . '" style="padding:4px 8px;font-size:11px">Videolar</a>';
                echo '<button class="button vtv-edit-btn" data-info="' . esc_attr($edit_json) . '" style="padding:4px 8px;font-size:11px;background:#EFF6FF;color:#1D4ED8;border-color:#BFDBFE">D&#252;zenle</button>';
                echo '<button class="button vtv-del-k" data-id="' . (int)$r->id . '" data-isim="' . esc_attr($r->isim) . '" style="padding:4px 8px;font-size:11px;color:#dc2626;border-color:#fca5a5">Sil</button>';
                echo '</div></td>';

                echo '</tr>';
            }
            echo '</tbody></table></div>';
        }
        echo '</div>'; /* .vtv-card list */

        /* ---- Düzenle Modal ---- */
        echo '<div id="vtv-edit-modal" style="display:none;position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.65);align-items:center;justify-content:center">';
        echo '<div style="background:#fff;border-radius:10px;padding:28px 32px;max-width:560px;width:92%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.35);position:relative">';
        echo '<button onclick="document.getElementById(\'vtv-edit-modal\').style.display=\'none\'" style="position:absolute;top:10px;right:14px;background:none;border:none;font-size:24px;cursor:pointer;color:#9CA3AF;line-height:1">&times;</button>';
        echo '<h2 style="margin:0 0 22px;font-size:17px;font-weight:700;color:#0A1628">Kayna&#287;&#305; D&#252;zenle</h2>';
        echo '<input type="hidden" id="vtv-edit-id">';
        echo '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">';

        echo '<div class="vtv-fg"><label>G&#246;r&#252;nen &#304;sim *</label>';
        echo '<input type="text" id="vtv-edit-isim" style="padding:8px 11px;border:1px solid #D1D5DB;border-radius:6px;font-size:13px;width:100%"></div>';

        echo '<div class="vtv-fg"><label>URL / @Handle / ID</label>';
        echo '<input type="text" id="vtv-edit-deger" style="padding:8px 11px;border:1px solid #D1D5DB;border-radius:6px;font-size:13px;width:100%"></div>';

        echo '<div class="vtv-fg"><label>Kategori</label>';
        echo '<select id="vtv-edit-kat" style="padding:8px 11px;border:1px solid #D1D5DB;border-radius:6px;font-size:13px;width:100%">';
        echo '<option value="0">Kategori Se&#231;in</option>';
        foreach ( $cats as $cat ) { echo '<option value="' . $cat->id . '">' . esc_html($cat->isim) . '</option>'; }
        echo '</select></div>';

        echo '<div class="vtv-fg"><label>Durum</label>';
        echo '<select id="vtv-edit-aktif" style="padding:8px 11px;border:1px solid #D1D5DB;border-radius:6px;font-size:13px;width:100%">';
        echo '<option value="1">Aktif</option><option value="0">Pasif</option></select></div>';

        echo '<div class="vtv-fg" style="grid-column:1/-1"><label>A&#231;&#305;klama</label>';
        echo '<input type="text" id="vtv-edit-aciklama" style="padding:8px 11px;border:1px solid #D1D5DB;border-radius:6px;font-size:13px;width:100%"></div>';

        echo '<div class="vtv-fg" style="grid-column:1/-1">';
        echo '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:500;color:#374151">';
        echo '<input type="checkbox" id="vtv-edit-populer" style="width:16px;height:16px"> Pop&#252;ler kanallar listesinde g&#246;ster</label></div>';
        echo '</div>'; /* grid */

        echo '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:22px">';
        echo '<button onclick="document.getElementById(\'vtv-edit-modal\').style.display=\'none\'" class="button">&#304;ptal</button>';
        echo '<button id="vtv-edit-save" class="button button-primary" style="padding:0 24px">Kaydet</button>';
        echo '</div>';
        echo '<div id="vtv-edit-msg" style="display:none;margin-top:12px;padding:9px 14px;border-radius:6px;font-size:13px;font-weight:600"></div>';
        echo '</div></div>'; /* modal inner + modal */

        echo '</div>'; /* .wrap */
    }

    /* =========================================================
     * VIDEOLAR
     * ======================================================= */
    public static function page_videolar() {
        $kid       = intval( isset($_GET['kid']) ? $_GET['kid'] : 0 );
        $kaynaklar = VTV_DB::get_kaynaklar( array() );
        $secili    = $kid ? VTV_DB::get_kaynak($kid) : null;
        $videolar  = VTV_DB::get_videolar( array('kaynak_id'=>$kid,'limit'=>500) );

        echo '<div class="wrap vtv-wrap">';
        echo '<div class="vtv-hdr"><h1>Videolar';
        if ( $secili ) { echo ' &mdash; ' . esc_html($secili->isim); } else { echo ' (T&#252;m&#252;)'; }
        echo '</h1></div>';

        echo '<div class="vtv-card" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 20px">';
        echo '<select onchange="location.href=\'' . esc_url(admin_url('admin.php?page=video-tv-videolar&kid=')) . '\'+this.value" style="padding:7px 10px;border:1px solid #D1D5DB;border-radius:6px;font-size:13px">';
        echo '<option value="">T&#252;m Kaynaklar</option>';
        foreach ( $kaynaklar as $k ) {
            echo '<option value="' . $k->id . '" ' . selected($kid,$k->id,false) . '>' . esc_html($k->isim) . '</option>';
        }
        echo '</select>';
        if ( $secili ) {
            echo '<button class="button button-primary vtv-refresh" data-id="' . $secili->id . '">&#8635; Yenile</button>';
            echo '<button class="button" id="vtv-sv-toggle" style="color:#15803D;border-color:#86EFAC">+ Tekil Video Ekle</button>';
        }
        echo '</div>';

        if ( $secili ) {
            echo '<div class="vtv-card" id="vtv-sv-form" style="display:none">';
            echo '<strong style="display:block;margin-bottom:10px">Tekil Video Ekle</strong>';
            echo '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">';
            echo '<div><label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px">Platform</label>';
            echo '<select id="vtv-sv-plat" style="padding:8px 10px;border:1px solid #D1D5DB;border-radius:6px;font-size:13px">';
            echo '<option value="youtube">YouTube</option><option value="dailymotion">Dailymotion</option></select></div>';
            echo '<div style="flex:1"><label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px">URL veya ID</label>';
            echo '<input type="text" id="vtv-sv-url" style="width:100%;padding:8px 12px;border:1px solid #D1D5DB;border-radius:6px;font-size:13px" placeholder="Video URL veya ID"></div>';
            echo '<button class="button button-primary" id="vtv-sv-add" data-kid="' . $secili->id . '">Ekle</button>';
            echo '</div>';
            echo '<div id="vtv-sv-msg" style="display:none;margin-top:8px;font-size:13px;font-weight:600"></div>';
            echo '</div>';
        }

        echo '<div class="vtv-card">';
        if ( empty($videolar) ) {
            echo '<p style="color:#9CA3AF;padding:16px 0">Video bulunamad&#305;. Kayna&#287;&#305; yenileyin.</p>';
        } else {
            echo '<div class="vtv-vgrid">';
            foreach ( $videolar as $v ) {
                $one_cls  = $v->one_cikan ? 'vtv-star on' : 'vtv-star';
                $one_icon = $v->one_cikan ? '&#9733;' : '&#9734;';
                $is_man   = isset($v->manset) ? (int) $v->manset : 0;
                $is_hik   = isset($v->hikaye) ? (int) $v->hikaye : 0;
                $man_cls  = $is_man ? 'vtv-flag vtv-flag-man on' : 'vtv-flag vtv-flag-man';
                $hik_cls  = $is_hik ? 'vtv-flag vtv-flag-hik on' : 'vtv-flag vtv-flag-hik';
                $plat_col = ($v->platform === 'youtube') ? '#FF0000' : '#003CB4';
                $plat_txt = strtoupper(substr($v->platform,0,2));
                echo '<div class="vtv-vc" data-id="' . $v->id . '">';
                echo '<div class="vtv-vt"><img src="' . esc_url($v->thumbnail) . '" alt="" loading="lazy">';
                if ($v->sure) { echo '<span class="vtv-dur">' . esc_html($v->sure) . '</span>'; }
                echo '<span class="vtv-plat" style="background:' . $plat_col . '">' . $plat_txt . '</span>';
                echo '</div>';
                echo '<div class="vtv-vi">';
                echo '<div class="vtv-vtl">' . esc_html($v->baslik) . '</div>';
                echo '<div class="vtv-vm">' . esc_html($v->kanal_ismi);
                if ($v->yayin_tarihi) { echo ' &middot; ' . esc_html($v->yayin_tarihi); }
                echo '</div>';
                echo '<div style="display:flex;gap:6px;margin-top:6px;align-items:center;flex-wrap:wrap">';
                echo '<button class="' . $one_cls . '" data-id="' . $v->id . '" data-val="' . ($v->one_cikan?0:1) . '">' . $one_icon . ' &#214;ne &#199;&#305;kar</button>';
                echo '<button class="' . $man_cls . '" data-id="' . $v->id . '" data-val="' . ($is_man?0:1) . '" title="Anasayfa man&#351;et slider&#39;&#305;na ekle">&#128240; Man&#351;et</button>';
                echo '<button class="' . $hik_cls . '" data-id="' . $v->id . '" data-val="' . ($is_hik?0:1) . '" title="Hikaye baloncuklar&#305;na ekle">&#9899; Hikaye</button>';
                echo '<button class="vtv-del-v" data-id="' . $v->id . '">Sil</button>';
                echo '</div></div></div>';
            }
            echo '</div>';
        }
        echo '</div></div>';
    }

    /* =========================================================
     * PLAYLİSTLER & DİZİLER
     * ======================================================= */
    public static function page_playlistler() {
        $kaynaklar = VTV_DB::get_kaynaklar( array() );
        $kid       = intval( isset($_GET['kid']) ? $_GET['kid'] : 0 );
        $secili    = $kid ? VTV_DB::get_kaynak($kid) : null;
        $listeler  = $kid ? VTV_DB::get_playlistler($kid) : array();
        $tip_opts  = array('playlist'=>'Playlist','dizi'=>'Dizi (Sezonlu)');

        echo '<div class="wrap vtv-wrap">';
        echo '<div class="vtv-hdr"><h1>Playlistler &amp; Diziler</h1>';
        echo '<p>Kanallara ait playlistleri ve dizileri buradan y&#246;netin.</p></div>';

        echo '<div class="vtv-card" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 20px">';
        echo '<label style="font-size:13px;font-weight:600;color:#374151">Kanal:</label>';
        echo '<select onchange="location.href=\'' . esc_url(admin_url('admin.php?page=video-tv-playlistler&kid=')) . '\'+this.value" style="padding:7px 10px;border:1px solid #D1D5DB;border-radius:6px;font-size:13px">';
        echo '<option value="">Kanal Se&#231;in</option>';
        foreach ($kaynaklar as $k) {
            echo '<option value="' . $k->id . '" ' . selected($kid,$k->id,false) . '>' . esc_html($k->isim) . '</option>';
        }
        echo '</select></div>';

        if ($secili) {
            echo '<div class="vtv-card">';
            echo '<h2 class="vtv-ch">Yeni Playlist / Dizi Ekle &mdash; ' . esc_html($secili->isim) . '</h2>';
            echo '<div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:12px;align-items:flex-end">';

            echo '<div class="vtv-fg" style="grid-column:1/-1"><label>Playlist URL veya ID *</label>';
            echo '<input type="text" id="vtv-pl-url" style="padding:8px 11px;border:1px solid #D1D5DB;border-radius:6px;font-size:13px;width:100%" placeholder="https://youtube.com/playlist?list=PL... veya PLxxxxxx"></div>';

            echo '<div class="vtv-fg"><label>&#304;sim (bo&#351; = otomatik)</label>';
            echo '<input type="text" id="vtv-pl-isim" style="padding:8px 11px;border:1px solid #D1D5DB;border-radius:6px;font-size:13px;width:100%" placeholder="Opsiyonel isim"></div>';

            echo '<div class="vtv-fg"><label>T&#252;r</label>';
            echo '<select id="vtv-pl-tip" style="padding:8px 11px;border:1px solid #D1D5DB;border-radius:6px;font-size:13px;width:100%">';
            foreach ($tip_opts as $v => $l) { echo '<option value="' . $v . '">' . $l . '</option>'; }
            echo '</select></div>';

            echo '<div class="vtv-fg" id="vtv-pl-sezon-wrap"><label>Sezon No (Dizi)</label>';
            echo '<input type="number" id="vtv-pl-sezon" min="1" max="50" value="1" style="padding:8px 11px;border:1px solid #D1D5DB;border-radius:6px;font-size:13px;width:100%"></div>';

            echo '<div class="vtv-fg" style="align-self:flex-end">';
            echo '<button class="button button-primary" id="vtv-pl-add" data-kid="' . $secili->id . '" style="height:38px;padding:0 20px">Ekle &amp; &#199;ek</button></div>';
            echo '</div>';
            echo '<div id="vtv-pl-msg" style="display:none;margin-top:10px;padding:9px 14px;border-radius:6px;font-size:13px;font-weight:600"></div>';
            echo '</div>';

            echo '<div class="vtv-card">';
            echo '<h2 class="vtv-ch">Playlistler <span class="vtv-bdg">' . count($listeler) . '</span></h2>';
            if (empty($listeler)) {
                echo '<p style="color:#9CA3AF;padding:12px 0">Hen&#252;z playlist eklenmemi&#351;. Yukar&#305;dan ekleyin.</p>';
            } else {
                echo '<table class="vtv-tbl"><thead><tr>';
                echo '<th style="width:80px">Kapak</th><th>&#304;sim</th><th style="width:70px">T&#252;r</th>';
                echo '<th style="width:60px">Sezon</th><th style="width:70px">Video</th><th style="width:130px">Son G&#252;ncelleme</th><th>&#304;&#351;lem</th>';
                echo '</tr></thead><tbody>';
                foreach ($listeler as $pl) {
                    $tip_lbl = isset($tip_opts[$pl->tip]) ? $tip_opts[$pl->tip] : $pl->tip;
                    $upd     = $pl->son_guncelle ? date('d.m.Y H:i', strtotime($pl->son_guncelle)) : '-';
                    $renk    = ($pl->tip === 'dizi') ? '#8B5CF6' : '#3B82F6';
                    echo '<tr>';
                    echo '<td>';
                    if ($pl->thumbnail) {
                        echo '<img src="' . esc_url($pl->thumbnail) . '" style="width:80px;height:45px;object-fit:cover;border-radius:4px" alt="">';
                    } else { echo '<span style="color:#9CA3AF;font-size:20px">&#128210;</span>'; }
                    echo '</td>';
                    echo '<td><strong>' . esc_html($pl->isim) . '</strong><br><small style="color:#9CA3AF;font-size:11px">' . esc_html($pl->playlist_id) . '</small></td>';
                    echo '<td><span style="background:' . $renk . ';color:#fff;padding:2px 8px;border-radius:10px;font-size:11px">' . esc_html($tip_lbl) . '</span></td>';
                    echo '<td style="text-align:center">' . ($pl->sezon ? $pl->sezon . '. Sezon' : '-') . '</td>';
                    echo '<td style="text-align:center"><span class="vtv-bdg">' . (int)$pl->video_sayisi . '</span></td>';
                    echo '<td style="font-size:11px;color:#6B7280">' . $upd . '</td>';
                    echo '<td><div style="display:flex;gap:5px">';
                    echo '<button class="button vtv-pl-refresh" data-id="' . $pl->id . '" style="padding:4px 8px;font-size:11px;background:#EFF6FF;color:#1D4ED8;border-color:#BFDBFE">&#8635;</button>';
                    echo '<button class="button vtv-pl-del" data-id="' . $pl->id . '" data-isim="' . esc_attr($pl->isim) . '" style="padding:4px 8px;font-size:11px;color:#dc2626;border-color:#fca5a5">Sil</button>';
                    echo '</div></td></tr>';
                }
                echo '</tbody></table>';
            }
            echo '</div>';
        }
        echo '</div>';
    }

    /* =========================================================
     * KATEGORILER
     * ======================================================= */
    public static function page_kategoriler() {
        global $wpdb;
        $cats = VTV_DB::get_kategoriler(false);
        echo '<div class="wrap vtv-wrap">';
        echo '<div class="vtv-hdr"><h1>Kategoriler</h1></div>';
        echo '<div class="vtv-card">';
        echo '<h2 class="vtv-ch">Yeni Kategori Ekle</h2>';
        echo '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">';
        echo '<div class="vtv-fg"><label>Kategori Ad&#305; *</label><input type="text" id="vtv-kat-isim" style="padding:8px 12px;border:1px solid #D1D5DB;border-radius:6px;width:200px" placeholder="Kategori ad&#305;"></div>';
        echo '<div class="vtv-fg"><label>&#304;kon (emoji)</label><input type="text" id="vtv-kat-ikon" style="padding:8px 12px;border:1px solid #D1D5DB;border-radius:6px;width:70px"></div>';
        echo '<div class="vtv-fg"><label>Renk</label><input type="color" id="vtv-kat-renk" value="#3B82F6" style="padding:4px;border:1px solid #D1D5DB;border-radius:6px;height:38px;width:60px"></div>';
        echo '<button class="button button-primary" id="vtv-kat-add" style="height:38px;padding:0 16px">Ekle</button>';
        echo '</div>';
        echo '<div id="vtv-kat-msg" style="display:none;margin-top:10px;padding:8px 14px;border-radius:6px;font-size:13px;font-weight:600"></div>';
        echo '</div>';
        echo '<div class="vtv-card"><h2 class="vtv-ch">Kategoriler <span class="vtv-bdg">' . count($cats) . '</span></h2>';
        if ( empty($cats) ) {
            echo '<p style="color:#9CA3AF">Kategori eklenmemi&#351;.</p>';
        } else {
            echo '<table class="vtv-tbl"><thead><tr><th>&#304;kon</th><th>&#304;sim</th><th>Renk</th><th>Kanal</th><th>&#304;&#351;lem</th></tr></thead><tbody>';
            foreach ( $cats as $cat ) {
                $ks = (int)$wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$wpdb->prefix}vtv_kaynaklar WHERE kategori_id=%d AND aktif=1",$cat->id));
                echo '<tr>';
                echo '<td style="font-size:20px">' . esc_html($cat->ikon) . '</td>';
                echo '<td><strong>' . esc_html($cat->isim) . '</strong></td>';
                echo '<td><span style="display:inline-block;width:22px;height:22px;border-radius:4px;background:' . esc_attr($cat->renk) . ';vertical-align:middle"></span> ' . esc_html($cat->renk) . '</td>';
                echo '<td><span class="vtv-bdg">' . $ks . '</span></td>';
                echo '<td><button class="button vtv-del-cat" data-id="' . $cat->id . '" data-isim="' . esc_attr($cat->isim) . '" style="color:#dc2626;border-color:#fca5a5">Sil</button></td>';
                echo '</tr>';
            }
            echo '</tbody></table>';
        }
        echo '</div></div>';
    }

    /* =========================================================
     * AYARLAR
     * ======================================================= */
    public static function page_ayarlar() {
        $p_limit  = VTV_DB::get_ayar('populer_limit','8');
        $k_limit  = VTV_DB::get_ayar('kategori_limit','6');
        $oc_limit = VTV_DB::get_ayar('one_cikan_limit','5');
        $title    = VTV_DB::get_ayar('site_basligi','Video TV');
        $ban_vid  = VTV_DB::get_ayar('banner_video_id','');
        $ban_plat = VTV_DB::get_ayar('banner_platform','youtube');

        echo '<div class="wrap vtv-wrap">';
        echo '<div class="vtv-hdr"><h1>Ayarlar</h1></div>';
        echo '<div class="vtv-card"><h2 class="vtv-ch">Genel Ayarlar</h2>';
        echo '<table class="form-table">';
        echo '<tr><th>Site Ba&#351;l&#305;&#287;&#305;</th><td><input type="text" id="vta-baslik" value="' . esc_attr($title) . '" style="width:300px;padding:8px;border:1px solid #D1D5DB;border-radius:6px"></td></tr>';
        echo '<tr><th>Pop&#252;ler Kanal Limiti</th><td><input type="number" id="vta-pop" value="' . esc_attr($p_limit) . '" min="1" max="20" style="width:70px;padding:8px;border:1px solid #D1D5DB;border-radius:6px"> <small style="color:#6B7280">Ana sayfada g&#246;sterilecek pop&#252;ler kanal say&#305;s&#305;</small></td></tr>';
        echo '<tr><th>Kategori Limiti</th><td><input type="number" id="vta-kat" value="' . esc_attr($k_limit) . '" min="1" max="20" style="width:70px;padding:8px;border:1px solid #D1D5DB;border-radius:6px"> <small style="color:#6B7280">Solda g&#246;sterilecek kategori say&#305;s&#305;</small></td></tr>';
        echo '<tr><th>&#214;ne &#199;&#305;kan Limiti</th><td><input type="number" id="vta-oc" value="' . esc_attr($oc_limit) . '" min="1" max="10" style="width:70px;padding:8px;border:1px solid #D1D5DB;border-radius:6px"> <small style="color:#6B7280">Hero slider video say&#305;s&#305;</small></td></tr>';
        echo '<tr><th>Banner Video</th><td>';
        echo '<select id="vta-ban-plat" style="padding:8px;border:1px solid #D1D5DB;border-radius:6px;margin-right:8px"><option value="youtube" ' . selected($ban_plat,'youtube',false) . '>YouTube</option><option value="dailymotion" ' . selected($ban_plat,'dailymotion',false) . '>Dailymotion</option></select>';
        echo '<input type="text" id="vta-ban-vid" value="' . esc_attr($ban_vid) . '" style="width:180px;padding:8px;border:1px solid #D1D5DB;border-radius:6px" placeholder="Video ID (opsiyonel)">';
        echo '</td></tr>';
        echo '</table>';
        echo '<p style="margin-top:20px"><button class="button button-primary" id="vta-save">Ayarlar&#305; Kaydet</button></p>';
        echo '<div id="vta-msg" style="display:none;margin-top:10px;padding:10px 14px;border-radius:6px;font-size:13px;font-weight:600"></div>';
        echo '</div>';
        echo '<div class="vtv-card"><h2 class="vtv-ch">Shortcode</h2>';
        echo '<div style="background:#1E293B;color:#93C5FD;padding:12px 18px;border-radius:7px;font-family:monospace;font-size:15px">[video_tv]</div>';
        echo '<p style="color:#6B7280;font-size:13px;margin-top:8px">Bu shortcode\'u herhangi bir sayfaya ekleyin.</p>';
        echo '</div>';

        /* ---- Hazır Kanal İçe Aktarma ---- */
        echo '<div class="vtv-card">';
        echo '<h2 class="vtv-ch">&#127909; Otomatik Kanal Ekleme</h2>';
        echo '<p style="color:#6B7280;font-size:13px;margin-bottom:16px">Önceden tanımlı popüler Türkçe kanalları otomatik olarak ekleyin. Her kategoriden <strong>10 kanal</strong> eklenir.</p>';

        echo '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:16px">';
        echo '<div class="vtv-fg"><label>Kategori Seç</label>';
        echo '<select id="vtv-preset-kat" style="padding:8px 12px;border:1px solid #D1D5DB;border-radius:6px;font-size:13px">';
        echo '<option value="">Tüm Kategoriler (60 kanal)</option>';
        echo '<option value="Haberler">📰 Haberler (10 kanal)</option>';
        echo '<option value="Tarih">🏛️ Tarih (10 kanal)</option>';
        echo '<option value="Bilim">🔬 Bilim (10 kanal)</option>';
        echo '<option value="Saglik">💚 Sağlık (10 kanal)</option>';
        echo '<option value="Eglence">🎭 Eğlence (10 kanal)</option>';
        echo '<option value="Spor">⚽ Spor (10 kanal)</option>';
        echo '</select></div>';

        echo '<div class="vtv-fg"><label class="vtv-check-label" style="font-size:13px;text-transform:none;letter-spacing:0">';
        echo '<input type="checkbox" id="vtv-preset-fetch"> Videoları da hemen çek (yavaş – birkaç dk sürer)</label></div>';

        echo '<button class="button button-primary" id="vtv-preset-btn" style="height:38px;padding:0 20px">&#9654; Kanalları Ekle</button>';
        echo '</div>';

        echo '<div style="background:#FEF3C7;border:1px solid #FCD34D;border-radius:7px;padding:10px 14px;font-size:12px;color:#92400E;margin-bottom:12px">';
        echo '<strong>Not:</strong> YouTube her kanalın videolarını çekmek biraz zaman alır. "Videoları da hemen çek" seçeneği işaretli değilse kanallar eklenir, videolar Kaynaklar sayfasından Yenile butonu ile çekilebilir.';
        echo '</div>';

        echo '<div id="vtv-preset-log" style="display:none;background:#F8FAFC;border:1px solid #E5E7EB;border-radius:7px;padding:14px;max-height:300px;overflow-y:auto;font-size:12px;line-height:1.8;font-family:monospace"></div>';
        echo '</div>';

        echo '</div>'; /* .wrap */
    }
}
