<?php
/**
 * Ahenk Site Builder — AI ile tek tıkla ultra premium web sitesi üretir.
 *
 * Akış:
 *  - Kullanıcı işletme adı + kısa brief + sayfa seti + renk + ton girer.
 *  - OpenAI Chat Completion ile her sayfa için SEO uyumlu, inline-CSS ile
 *    premium görünümlü HTML üretir.
 *  - WordPress'te `page` tipi sayfalar oluşturur; tam sayfa şablonunu
 *    (`ahenk-tamsayfa`) otomatik atar — aktif tema KORUNUR.
 *  - Birincil menü oluşturup sayfaları ekler ve tema primary konumuna bağlar.
 *  - İstenirse anasayfayı WordPress ön sayfası olarak ayarlar.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

class Ahenk_Site_Builder {

    const MENU_SLUG = 'ahenk-site-kurucu';
    const AJAX_NONCE = 'ahenk_sb';

    public static function init() {
        $self = new self();
        add_action( 'admin_menu', array( $self, 'menu' ), 30 );
        add_action( 'wp_ajax_ahenk_sb_build',       array( $self, 'ajax_build' ) );
        add_action( 'wp_ajax_ahenk_sb_build_one',   array( $self, 'ajax_build_one' ) );
    }

    public function menu() {
        add_submenu_page(
            'ai-haber-botu',
            'AI Site Kurucu',
            '🏗 AI Site Kurucu',
            'manage_options',
            self::MENU_SLUG,
            array( $this, 'render' )
        );
    }

    public function render() {
        if ( ! current_user_can( 'manage_options' ) ) {
            echo '<div class="wrap"><div class="notice notice-error"><p>⛔ Bu sayfa yalnızca yöneticiler içindir.</p></div></div>';
            return;
        }

        $nonce = wp_create_nonce( self::AJAX_NONCE );
        $api   = get_option( 'ahb_openai_api_key', '' );
        $api_missing = empty( $api );
        ?>
        <div class="wrap">
            <h1>🏗 AI Site Kurucu</h1>
            <p style="max-width:900px;font-size:14px;color:#3c434a;">
                Bir <strong>işletme adı</strong> ve <strong>kısa tanım</strong> yazın; AI birkaç dakika içinde
                Anasayfa, Hakkımızda, Hizmetlerimiz, Referanslar, İletişim gibi sayfalardan oluşan
                <strong>ultra premium bir web sitesi</strong> üretir. Aktif temanız <strong>korunur</strong>;
                yeni sayfalar eklentinin tam sayfa şablonunda AI tasarımı ile yayınlanır ve birincil menüye otomatik eklenir.
            </p>

            <?php if ( $api_missing ) : ?>
            <div class="notice notice-error"><p>⚠ Önce <strong>Ahenk AI → Ayarlar</strong> bölümünden OpenAI API anahtarını girin.</p></div>
            <?php endif; ?>

            <div style="max-width:900px;background:#fff;padding:28px 32px;border-radius:10px;box-shadow:0 2px 12px rgba(0,0,0,.06);margin-top:20px;">
                <h2 style="margin-top:0;">1️⃣ Site Bilgileri</h2>
                <table class="form-table">
                    <tr>
                        <th><label for="sb-name">İşletme Adı *</label></th>
                        <td><input type="text" id="sb-name" class="regular-text" placeholder="Örn. Ankara Parke" style="width:100%;max-width:500px;"></td>
                    </tr>
                    <tr>
                        <th><label for="sb-brief">Kısa Tanım / Brief *</label></th>
                        <td>
                            <textarea id="sb-brief" rows="4" style="width:100%;max-width:700px;" placeholder="Örn. Ankara'da 20 yıllık tecrübemizle laminat, masif ve bambu parke satışı ile profesyonel döşeme hizmeti sunuyoruz. 10.000+ tamamlanmış proje, ücretsiz keşif, 5 yıl garanti."></textarea>
                            <p class="description">AI, bu tanımdan sitenin tüm yazılarını, başlıklarını ve çağrılarını üretir.</p>
                        </td>
                    </tr>
                    <tr>
                        <th>Sayfa Seti</th>
                        <td>
                            <label><input type="checkbox" class="sb-page" value="anasayfa" checked> 🏠 Anasayfa</label><br>
                            <label><input type="checkbox" class="sb-page" value="hakkimizda" checked> 📖 Hakkımızda</label><br>
                            <label><input type="checkbox" class="sb-page" value="hizmetler" checked> 🛠 Hizmetlerimiz</label><br>
                            <label><input type="checkbox" class="sb-page" value="referanslar" checked> ⭐ Referanslar</label><br>
                            <label><input type="checkbox" class="sb-page" value="iletisim" checked> 📞 İletişim</label><br>
                            <label><input type="checkbox" class="sb-page" value="sss"> ❓ Sıkça Sorulan Sorular</label><br>
                            <label><input type="checkbox" class="sb-page" value="galeri"> 🖼 Galeri</label><br>
                            <label><input type="checkbox" class="sb-page" value="fiyatlar"> 💰 Fiyatlar</label>
                        </td>
                    </tr>
                    <tr>
                        <th><label for="sb-color">Ana Renk</label></th>
                        <td>
                            <input type="color" id="sb-color" value="#0a66c2" style="vertical-align:middle;">
                            <span style="color:#646970;margin-left:10px;">AI bu rengi tüm sayfa başlıklarında, butonlarda ve vurgularda kullanır.</span>
                        </td>
                    </tr>
                    <tr>
                        <th><label for="sb-tone">Ton</label></th>
                        <td>
                            <select id="sb-tone" class="regular-text">
                                <option value="profesyonel">Profesyonel / Kurumsal</option>
                                <option value="modern">Modern / Teknoloji</option>
                                <option value="sicak">Sıcak / Samimi</option>
                                <option value="luks">Lüks / Premium</option>
                                <option value="enerjik">Enerjik / Genç</option>
                                <option value="guvenilir">Güvenilir / Tecrübeli</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th><label for="sb-phone">Telefon</label></th>
                        <td><input type="text" id="sb-phone" class="regular-text" placeholder="+90 312 000 00 00"></td>
                    </tr>
                    <tr>
                        <th><label for="sb-addr">Adres</label></th>
                        <td><input type="text" id="sb-addr" class="regular-text" placeholder="Çankaya / Ankara" style="width:100%;max-width:500px;"></td>
                    </tr>
                    <tr>
                        <th><label for="sb-email">E-posta</label></th>
                        <td><input type="email" id="sb-email" class="regular-text" placeholder="info@ornek.com"></td>
                    </tr>
                </table>

                <h2>2️⃣ Yayın Seçenekleri</h2>
                <table class="form-table">
                    <tr>
                        <th>Birincil Menü</th>
                        <td><label><input type="checkbox" id="sb-menu" checked> Yeni sayfaları aktif temanın birincil menüsüne otomatik ekle</label></td>
                    </tr>
                    <tr>
                        <th>Anasayfa</th>
                        <td><label><input type="checkbox" id="sb-front"> Üretilen Anasayfa'yı WordPress ön sayfası olarak ayarla <strong>(dikkat: mevcut ana sayfa değişir)</strong></label></td>
                    </tr>
                </table>

                <hr style="margin:24px 0;">
                <p>
                    <button class="button button-primary button-hero" id="sb-go" style="width:100%;font-size:16px;padding:10px;" <?php disabled( $api_missing ); ?>>
                        🚀 Siteyi AI ile Sıfırdan Kur
                    </button>
                </p>
                <p style="color:#646970;font-size:12px;text-align:center;">
                    Süre: her sayfa için ~20-40 saniye · Toplam: 2-5 dakika · AI yanıt vermeyen sayfalar için kısa bir yedek içerik yerleştirilir.
                </p>

                <div id="sb-progress" style="display:none;margin-top:20px;padding:16px;background:#f0f7fc;border-left:4px solid #2271b1;border-radius:6px;"></div>
                <div id="sb-result" style="display:none;margin-top:20px;"></div>
            </div>
        </div>

        <script>
        (function(){
            const NONCE='<?php echo esc_js( $nonce ); ?>';
            const AJAX='<?php echo esc_url( admin_url( 'admin-ajax.php' ) ); ?>';
            const $=id=>document.getElementById(id);
            const LABELS={anasayfa:'🏠 Anasayfa',hakkimizda:'📖 Hakkımızda',hizmetler:'🛠 Hizmetlerimiz',referanslar:'⭐ Referanslar',iletisim:'📞 İletişim',sss:'❓ SSS',galeri:'🖼 Galeri',fiyatlar:'💰 Fiyatlar'};

            async function buildOne(data){
                const fd=new FormData();
                fd.append('action','ahenk_sb_build_one');
                fd.append('_ajax_nonce',NONCE);
                Object.keys(data).forEach(k=>fd.append(k,data[k]));
                const r=await fetch(AJAX,{method:'POST',body:fd,credentials:'same-origin'});
                return r.json();
            }

            async function finalize(data){
                const fd=new FormData();
                fd.append('action','ahenk_sb_build');
                fd.append('_ajax_nonce',NONCE);
                fd.append('mode','finalize');
                Object.keys(data).forEach(k=>fd.append(k,data[k]));
                const r=await fetch(AJAX,{method:'POST',body:fd,credentials:'same-origin'});
                return r.json();
            }

            $('sb-go').addEventListener('click', async ()=>{
                const name=$('sb-name').value.trim();
                const brief=$('sb-brief').value.trim();
                if(!name||!brief){ alert('İşletme adı ve tanım zorunlu.'); return; }
                const pages=[...document.querySelectorAll('.sb-page:checked')].map(c=>c.value);
                if(!pages.length){ alert('En az bir sayfa seçin.'); return; }

                $('sb-go').disabled=true;
                $('sb-go').textContent='⏳ AI çalışıyor...';
                $('sb-result').style.display='none';
                $('sb-result').innerHTML='';
                $('sb-progress').style.display='';
                $('sb-progress').innerHTML='<strong>🤖 Başlatılıyor...</strong><br><div id="sb-log" style="margin-top:8px;font-family:ui-monospace,monospace;font-size:12px;white-space:pre-wrap;"></div>';
                const log=(msg)=>{ const l=$('sb-log'); if(l) l.textContent += msg + "\n"; };

                const common={
                    name, brief,
                    color: $('sb-color').value,
                    tone:  $('sb-tone').value,
                    phone: $('sb-phone').value,
                    addr:  $('sb-addr').value,
                    email: $('sb-email').value,
                };

                const created=[];
                for(let i=0;i<pages.length;i++){
                    const pg=pages[i];
                    log('['+(i+1)+'/'+pages.length+'] '+(LABELS[pg]||pg)+' üretiliyor...');
                    try{
                        const j=await buildOne(Object.assign({}, common, { page: pg }));
                        if(j.success){
                            created.push(j.data);
                            log('  ✓ '+j.data.title+' (ID '+j.data.id+')');
                        } else {
                            log('  ✗ Hata: '+(j.data&&j.data.msg||'bilinmiyor'));
                        }
                    }catch(e){ log('  ✗ Network hatası: '+e.message); }
                }

                log('');
                log('🎯 Menü ve yayın ayarları yapılıyor...');
                try{
                    const fin=await finalize({
                        post_ids: created.map(c=>c.id).join(','),
                        add_to_menu: $('sb-menu').checked?'1':'0',
                        set_front:   $('sb-front').checked?'1':'0',
                        name,
                    });
                    if(fin.success){
                        log('✓ Tamamlandı.');
                    } else {
                        log('⚠ Finalize hatası: '+(fin.data&&fin.data.msg||''));
                    }
                }catch(e){ log('⚠ Finalize network hatası: '+e.message); }

                $('sb-go').disabled=false;
                $('sb-go').textContent='🚀 Siteyi AI ile Sıfırdan Kur';

                if(!created.length){
                    $('sb-progress').innerHTML='<strong style="color:#d63638;">❌ Hiç sayfa üretilemedi. OpenAI yanıt vermemiş olabilir.</strong>';
                    return;
                }
                $('sb-progress').style.display='none';
                $('sb-result').style.display='';
                let html='<div style="padding:20px 24px;background:#d4edda;border-left:4px solid #00a32a;border-radius:6px;"><h2 style="margin:0 0 12px;color:#00501e;">✅ Siteniz hazır!</h2><p style="margin:0 0 12px;">'+created.length+' sayfa başarıyla oluşturuldu:</p><ul style="margin:0;padding-left:24px;">';
                created.forEach(p=>{
                    html+='<li style="margin-bottom:6px;"><a href="'+p.url+'" target="_blank" style="font-weight:600;">'+p.title+'</a> · <a href="'+p.edit+'">düzenle</a></li>';
                });
                html+='</ul></div>';
                $('sb-result').innerHTML=html;
            });
        })();
        </script>
        <?php
    }

    /* =========================================================================
     * AJAX: Tek sayfa üretimi (JS stream için)
     * ========================================================================= */
    public function ajax_build_one() {
        check_ajax_referer( self::AJAX_NONCE );
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( array( 'msg' => 'yetki yok' ) );

        @set_time_limit( 120 );
        @ini_set( 'memory_limit', '512M' );

        $name  = sanitize_text_field( wp_unslash( $_POST['name']  ?? '' ) );
        $brief = sanitize_textarea_field( wp_unslash( $_POST['brief'] ?? '' ) );
        $page  = sanitize_key( $_POST['page'] ?? '' );
        $color = $this->sanitize_color( $_POST['color'] ?? '#0a66c2' );
        $tone  = sanitize_key( $_POST['tone'] ?? 'profesyonel' );
        $phone = sanitize_text_field( $_POST['phone'] ?? '' );
        $addr  = sanitize_text_field( $_POST['addr']  ?? '' );
        $email = sanitize_email( $_POST['email']  ?? '' );

        if ( ! $name || ! $brief || ! $page ) wp_send_json_error( array( 'msg' => 'Eksik parametre.' ) );

        $api_key = get_option( 'ahb_openai_api_key', '' );
        if ( ! $api_key ) wp_send_json_error( array( 'msg' => 'OpenAI API anahtarı yok.' ) );

        $labels = $this->page_labels();
        if ( ! isset( $labels[ $page ] ) ) wp_send_json_error( array( 'msg' => 'Geçersiz sayfa türü.' ) );
        $title = $labels[ $page ];

        $html = $this->ai_generate_page_html( $api_key, array(
            'name' => $name, 'brief' => $brief, 'color' => $color, 'tone' => $tone,
            'phone' => $phone, 'addr' => $addr, 'email' => $email, 'page' => $page, 'title' => $title,
        ) );

        if ( ! $html ) {
            // Fallback: basit ama düzgün bir şablon
            $html = $this->fallback_html( $title, $name, $brief, $color, $phone, $addr, $email );
        }

        // Menü adına özel slug
        $slug = sanitize_title( $name . '-' . $page );

        // Aynı slug varsa kullan (tekrar çalıştırmada duplicate önle)
        $existing = get_page_by_path( $slug, OBJECT, 'page' );
        if ( $existing ) {
            wp_update_post( array(
                'ID'           => $existing->ID,
                'post_title'   => $title,
                'post_content' => $html,
                'post_status'  => 'publish',
            ) );
            $post_id = (int) $existing->ID;
        } else {
            $post_id = wp_insert_post( array(
                'post_title'   => $title,
                'post_name'    => $slug,
                'post_content' => $html,
                'post_status'  => 'publish',
                'post_type'    => 'page',
                'post_author'  => get_current_user_id() ?: 1,
            ), true );
            if ( is_wp_error( $post_id ) || ! $post_id ) {
                wp_send_json_error( array( 'msg' => 'WordPress sayfa oluşturulamadı: ' . ( is_wp_error( $post_id ) ? $post_id->get_error_message() : 'bilinmiyor' ) ) );
            }
        }

        update_post_meta( $post_id, '_wp_page_template', 'ahenk-tamsayfa' );
        update_post_meta( $post_id, '_ahenk_sb_built', 1 );
        update_post_meta( $post_id, '_ahenk_sb_brand', $color );
        update_post_meta( $post_id, '_ahenk_sb_page_key', $page );

        wp_send_json_success( array(
            'id'    => $post_id,
            'title' => $title,
            'slug'  => $slug,
            'page'  => $page,
            'url'   => get_permalink( $post_id ),
            'edit'  => get_edit_post_link( $post_id, '' ),
        ) );
    }

    /* =========================================================================
     * AJAX: Finalize — menü ve anasayfa ayarları
     * ========================================================================= */
    public function ajax_build() {
        check_ajax_referer( self::AJAX_NONCE );
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( array( 'msg' => 'yetki yok' ) );

        $mode = sanitize_key( $_POST['mode'] ?? '' );
        if ( $mode !== 'finalize' ) wp_send_json_error( array( 'msg' => 'bilinmeyen mod' ) );

        $post_ids = array_filter( array_map( 'intval', explode( ',', $_POST['post_ids'] ?? '' ) ) );
        $add_menu = ! empty( $_POST['add_to_menu'] );
        $set_front = ! empty( $_POST['set_front'] );
        $name     = sanitize_text_field( wp_unslash( $_POST['name'] ?? 'Site' ) );

        $menu_id = 0;
        if ( $add_menu && $post_ids ) {
            $menu_name = $name . ' Menü';
            $existing  = wp_get_nav_menu_object( $menu_name );
            if ( $existing ) {
                $menu_id = (int) $existing->term_id;
                // Eski item'ları temizle
                $items = wp_get_nav_menu_items( $menu_id );
                if ( is_array( $items ) ) foreach ( $items as $it ) wp_delete_post( $it->ID, true );
            } else {
                $menu_id = wp_create_nav_menu( $menu_name );
                if ( is_wp_error( $menu_id ) ) $menu_id = 0;
            }
            if ( $menu_id ) {
                foreach ( $post_ids as $pid ) {
                    $p = get_post( $pid );
                    if ( ! $p ) continue;
                    wp_update_nav_menu_item( $menu_id, 0, array(
                        'menu-item-title'     => $p->post_title,
                        'menu-item-object'    => 'page',
                        'menu-item-object-id' => $pid,
                        'menu-item-type'      => 'post_type',
                        'menu-item-status'    => 'publish',
                    ) );
                }
                // Primary konumu tanımlıysa bağla (tema destekliyorsa)
                $locations = get_theme_mod( 'nav_menu_locations' );
                if ( ! is_array( $locations ) ) $locations = array();
                $registered = get_registered_nav_menus();
                $target_loc = '';
                foreach ( array( 'primary', 'main', 'top', 'header', 'menu-1' ) as $cand ) {
                    if ( isset( $registered[ $cand ] ) ) { $target_loc = $cand; break; }
                }
                if ( ! $target_loc && $registered ) {
                    $target_loc = array_key_first( $registered );
                }
                if ( $target_loc ) {
                    $locations[ $target_loc ] = $menu_id;
                    set_theme_mod( 'nav_menu_locations', $locations );
                }
            }
        }

        if ( $set_front && $post_ids ) {
            foreach ( $post_ids as $pid ) {
                if ( get_post_meta( $pid, '_ahenk_sb_page_key', true ) === 'anasayfa' ) {
                    update_option( 'show_on_front', 'page' );
                    update_option( 'page_on_front', $pid );
                    break;
                }
            }
        }

        wp_send_json_success( array( 'menu_id' => $menu_id ) );
    }

    /* =========================================================================
     * Helpers
     * ========================================================================= */

    private function page_labels() {
        return array(
            'anasayfa'    => 'Anasayfa',
            'hakkimizda'  => 'Hakkımızda',
            'hizmetler'   => 'Hizmetlerimiz',
            'referanslar' => 'Referanslar',
            'iletisim'    => 'İletişim',
            'sss'         => 'Sıkça Sorulan Sorular',
            'galeri'      => 'Galeri',
            'fiyatlar'    => 'Fiyatlar',
        );
    }

    private function sanitize_color( $v ) {
        $v = trim( (string) $v );
        if ( preg_match( '/^#[0-9a-fA-F]{6}$/', $v ) ) return $v;
        return '#0a66c2';
    }

    /** Aktif tema adı (AI prompt'una ipucu olarak) */
    private function theme_name() {
        $t = wp_get_theme();
        return $t ? $t->get( 'Name' ) : 'WordPress';
    }

    /**
     * OpenAI chat completion — premium sayfa HTML'i üretir.
     * Başarısızlıkta '' döner, çağıran fallback kullanır.
     */
    private function ai_generate_page_html( $api_key, $ctx ) {
        $tone_map = array(
            'profesyonel' => 'profesyonel, kurumsal, güven veren',
            'modern'      => 'modern, teknolojik, çağdaş',
            'sicak'       => 'sıcak, samimi, insana dokunan',
            'luks'        => 'lüks, premium, sofistike',
            'enerjik'     => 'enerjik, genç, dinamik',
            'guvenilir'   => 'güvenilir, tecrübeli, köklü',
        );
        $tone_txt = $tone_map[ $ctx['tone'] ] ?? 'profesyonel';

        $page_brief = $this->page_specific_brief( $ctx['page'] );

        $system = "Sen üst düzey bir web tasarımcısı ve kopya yazarısın. Görevin: WordPress sayfası için ULTRA PREMIUM, modern, inline-CSS kullanan Türkçe bir HTML bloğu üretmek. KURALLAR: 1) <html>, <head>, <body> etiketi YAZMA. 2) Sadece <div>'lerle başla. 3) Her section farklı layout kullan (hero, 2 sütun, 3 kart, icon list, testimonial, CTA banner). 4) Görsel yerine CSS gradient, SVG icon (inline) veya büyük emoji kullan. 5) Tüm stilleri INLINE (style=\"...\") yaz — eklenti tarafından süzülecek. 6) 'İletişim' sayfasında mutlaka telefon/adres/email göster. 7) Her sayfa 500-900 kelime, SEO uyumlu (h1, h2, h3 hiyerarşisi). 8) Sadece HTML döndür, açıklama/markdown yazma.";

        $user = "İŞLETME: {$ctx['name']}\nTANIM: {$ctx['brief']}\nTON: {$tone_txt}\nANA RENK: {$ctx['color']}\nTELEFON: {$ctx['phone']}\nADRES: {$ctx['addr']}\nE-POSTA: {$ctx['email']}\n\nÜRETİLECEK SAYFA: {$ctx['title']}\nSAYFA AMACI: {$page_brief}\n\nANA RENK ({$ctx['color']}) hero arka planında, button'larda, h2 altındaki vurgu çizgisinde ve CTA kutularında kullanılmalı. Tipografi: system-ui, Segoe UI, Roboto stack. Hero'da büyük başlık, alt-başlık, 2 adet CTA butonu. Section'lar arası bolca padding, yuvarlatılmış köşeler (12-16px), yumuşak gölgeler.";

        $payload = array(
            'model'       => 'gpt-4o-mini',
            'messages'    => array(
                array( 'role' => 'system', 'content' => $system ),
                array( 'role' => 'user',   'content' => $user ),
            ),
            'temperature' => 0.85,
            'max_tokens'  => 3500,
        );

        $resp = wp_remote_post( 'https://api.openai.com/v1/chat/completions', array(
            'timeout' => 90,
            'headers' => array(
                'Authorization' => 'Bearer ' . $api_key,
                'Content-Type'  => 'application/json',
            ),
            'body'    => wp_json_encode( $payload ),
        ) );
        if ( is_wp_error( $resp ) ) return '';
        $code = wp_remote_retrieve_response_code( $resp );
        if ( $code !== 200 ) { error_log( '[AhenkSB] OpenAI HTTP ' . $code . ': ' . wp_remote_retrieve_body( $resp ) ); return ''; }
        $data = json_decode( wp_remote_retrieve_body( $resp ), true );
        $html = isset( $data['choices'][0]['message']['content'] ) ? (string) $data['choices'][0]['message']['content'] : '';
        $html = trim( $html );
        // Markdown code fence temizliği
        $html = preg_replace( '/^```(?:html)?\s*\n?/', '', $html );
        $html = preg_replace( '/\n?```\s*$/', '', $html );
        return trim( $html );
    }

    private function page_specific_brief( $page ) {
        switch ( $page ) {
            case 'anasayfa':    return 'Hero + firma değer önerisi + öne çıkan 3 hizmet + referans/rakam vurgu + 2 CTA (teklif al / iletişim).';
            case 'hakkimizda':  return 'Firma hikayesi, misyon, vizyon, ekip/kurucu vurgusu, neden biz, kilometre taşları.';
            case 'hizmetler':   return 'Tüm hizmetler detaylı (min 5 hizmet), her hizmet için açıklama + fayda listesi + "Teklif Al" CTA.';
            case 'referanslar': return 'Müşteri yorumları (4-6 adet, kurgusal isimler), proje sayıları, marka logoları yerine emoji/gradient kartlar.';
            case 'iletisim':    return 'Büyük iletişim kutuları (telefon, adres, email), çalışma saatleri, basit iletişim formu (HTML).';
            case 'sss':         return 'En az 8 soru-cevap, her soru expandable görünümde (detaylı paragraflarla).';
            case 'galeri':      return '6-9 proje kartı (her biri başlık + açıklama + gradient veya emoji placeholder görsel).';
            case 'fiyatlar':    return '3 paket (Temel/Standart/Premium) fiyatlandırma tablosu + her paketin özellik listesi + tavsiye edilen işaretli.';
        }
        return 'Profesyonel bir kurumsal sayfa.';
    }

    private function fallback_html( $title, $name, $brief, $color, $phone, $addr, $email ) {
        $h = '<div style="max-width:1100px;margin:0 auto;padding:60px 24px;font-family:system-ui,Segoe UI,Roboto,sans-serif;">';
        $h .= '<div style="background:linear-gradient(135deg,' . esc_attr( $color ) . ' 0%,#1a1a2e 100%);color:#fff;padding:60px 40px;border-radius:16px;text-align:center;margin-bottom:40px;">';
        $h .= '<h1 style="margin:0 0 16px;font-size:42px;">' . esc_html( $title ) . '</h1>';
        $h .= '<p style="font-size:18px;opacity:.92;margin:0;">' . esc_html( $name ) . '</p>';
        $h .= '</div>';
        $h .= '<div style="font-size:16px;line-height:1.8;color:#333;max-width:800px;margin:0 auto;">' . esc_html( $brief ) . '</div>';
        if ( $phone || $addr || $email ) {
            $h .= '<div style="margin-top:40px;padding:24px;background:#f6f7f7;border-left:4px solid ' . esc_attr( $color ) . ';border-radius:8px;">';
            if ( $phone ) $h .= '<p>📞 <strong>' . esc_html( $phone ) . '</strong></p>';
            if ( $email ) $h .= '<p>✉️ ' . esc_html( $email ) . '</p>';
            if ( $addr )  $h .= '<p>📍 ' . esc_html( $addr ) . '</p>';
            $h .= '</div>';
        }
        $h .= '</div>';
        return $h;
    }
}
