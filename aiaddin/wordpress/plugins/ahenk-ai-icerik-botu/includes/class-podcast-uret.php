<?php
/**
 * Podcast Üret — ElevenLabs API ile AI seslendirme.
 *
 * Akış:
 *   1) Kullanici konu yazar veya hazir script yapistirir.
 *   2) (Konu girildiyse) OpenAI ile podcast script'i uretiriz.
 *   3) Script'i ElevenLabs TTS'e gondeririz, MP3 aliriz.
 *   4) MP3'u WP medya kutuphanesine kaydederiz.
 *   5) Post olustururuz; icerige <audio controls> + transcript ekleriz.
 *
 * ElevenLabs API key kullanicinin kendi WordPress site'inde saklanir
 * (option: ahenk_elevenlabs_api_key) — Turkce icin model: eleven_multilingual_v2.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

class Ahenk_Podcast_Uret {

    const NONCE     = 'ahenk_podcast';
    const SLUG      = 'ahenk-podcast-uret';
    const OPT_KEY   = 'ahenk_elevenlabs_api_key';
    const OPT_VOICE = 'ahenk_elevenlabs_voice_id';
    const OPT_MODEL = 'ahenk_elevenlabs_model';

    public static function init() {
        $self = new self();
        add_action( 'admin_menu',                            array( $self, 'menu' ), 32 );
        add_action( 'wp_ajax_ahenk_podcast_save_settings',   array( $self, 'ajax_save_settings' ) );
        add_action( 'wp_ajax_ahenk_podcast_list_voices',     array( $self, 'ajax_list_voices' ) );
        add_action( 'wp_ajax_ahenk_podcast_generate',        array( $self, 'ajax_generate' ) );
        add_action( 'wp_ajax_ahenk_podcast_delete',          array( $self, 'ajax_delete' ) );
    }

    public function ajax_delete() {
        check_ajax_referer( self::NONCE );
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( array( 'msg' => 'yetki yok' ) );
        $pid = (int) ( $_POST['post_id'] ?? 0 );
        if ( ! $pid ) wp_send_json_error( array( 'msg' => 'id yok' ) );
        if ( get_post_meta( $pid, '_ahb_podcast', true ) !== '1' ) wp_send_json_error( array( 'msg' => 'Podcast değil' ) );
        wp_trash_post( $pid );
        wp_send_json_success();
    }

    private function render_history_table() {
        $q = new WP_Query( array(
            'post_type'      => 'any',
            'post_status'    => array( 'publish', 'draft', 'pending', 'private', 'future' ),
            'posts_per_page' => 50,
            'meta_key'       => '_ahb_podcast',
            'orderby'        => 'date',
            'order'          => 'DESC',
            'no_found_rows'  => true,
        ) );
        if ( ! $q->have_posts() ) {
            echo '<p style="color:#888;">Henüz üretilmiş podcast yok.</p>';
            return;
        }
        ?>
        <table class="wp-list-table widefat striped">
            <thead><tr>
                <th style="width:140px;">Tarih</th>
                <th>Başlık</th>
                <th style="width:90px;">Tür</th>
                <th style="width:80px;">Durum</th>
                <th style="width:240px;">İşlemler</th>
            </tr></thead>
            <tbody>
            <?php while ( $q->have_posts() ) : $q->the_post(); $pid = get_the_ID(); ?>
                <tr>
                    <td><?php echo esc_html( get_the_date( 'd.m.Y H:i' ) ); ?></td>
                    <td><strong><?php the_title(); ?></strong></td>
                    <td><code><?php echo esc_html( get_post_type() ); ?></code></td>
                    <td><?php echo esc_html( get_post_status() ); ?></td>
                    <td>
                        <a href="<?php echo esc_url( get_edit_post_link( $pid ) ); ?>" class="button button-small" target="_blank">✏️ Düzenle</a>
                        <a href="<?php echo esc_url( get_permalink( $pid ) ); ?>" class="button button-small" target="_blank">👁</a>
                        <button class="button button-small pc-del" data-pid="<?php echo (int) $pid; ?>" style="color:#d63638;">🗑 Sil</button>
                    </td>
                </tr>
            <?php endwhile; wp_reset_postdata(); ?>
            </tbody>
        </table>
        <?php
    }

    public function menu() {
        add_submenu_page(
            'ai-haber-botu',
            'Podcast Üret',
            '🎙️ Podcast Üret',
            'manage_options',
            self::SLUG,
            array( $this, 'render' )
        );
    }

    /* ============ ADMIN SAYFASI ============ */

    public function render() {
        if ( ! current_user_can( 'manage_options' ) ) return;

        $openai_set = (bool) trim( (string) get_option( 'ahb_openai_api_key', '' ) );
        $el_key     = (string) get_option( self::OPT_KEY, '' );
        $voice_id   = (string) get_option( self::OPT_VOICE, '' );
        $el_model   = (string) get_option( self::OPT_MODEL, 'eleven_multilingual_v2' );
        $nonce      = wp_create_nonce( self::NONCE );

        $allowed_types = array();
        $all_pt = get_post_types( array( 'public' => true ), 'objects' );
        foreach ( $all_pt as $pt ) {
            if ( in_array( $pt->name, array( 'attachment', 'nav_menu_item', 'revision' ), true ) ) continue;
            $allowed_types[ $pt->name ] = $pt->labels->singular_name . ' (' . $pt->name . ')';
        }
        ?>
        <div class="wrap">
            <h1>🎙️ Podcast Üret — ElevenLabs ile AI Seslendirme</h1>
            <p style="color:#555;max-width:820px;">Konu yazın veya hazır script yapıştırın — yapay zekâ podcast metnini üretsin, ElevenLabs ile Türkçe seslendirsin, ses dosyası WordPress'e kaydedilip yazıya gömülsün.</p>

            <h2 style="margin-top:24px;">⚙️ ElevenLabs Ayarları</h2>
            <table class="form-table">
                <tr>
                    <th><label for="el-key">ElevenLabs API Key</label></th>
                    <td>
                        <input type="password" id="el-key" class="regular-text" style="width:100%;max-width:520px;" value="<?php echo esc_attr( $el_key ); ?>" placeholder="sk_...">
                        <p class="description"><a href="https://elevenlabs.io/app/settings/api-keys" target="_blank">elevenlabs.io → Profile → API Keys</a> sayfasından alın. Ücretsiz plan ayda ~10.000 karakter verir.</p>
                    </td>
                </tr>
                <tr>
                    <th>Model</th>
                    <td>
                        <select id="el-model">
                            <option value="eleven_multilingual_v2"  <?php selected( $el_model, 'eleven_multilingual_v2' ); ?>>eleven_multilingual_v2 (Türkçe için önerilen, kaliteli)</option>
                            <option value="eleven_turbo_v2_5"        <?php selected( $el_model, 'eleven_turbo_v2_5' ); ?>>eleven_turbo_v2_5 (hızlı, daha ucuz)</option>
                            <option value="eleven_flash_v2_5"        <?php selected( $el_model, 'eleven_flash_v2_5' ); ?>>eleven_flash_v2_5 (en hızlı, düşük gecikme)</option>
                        </select>
                    </td>
                </tr>
                <tr>
                    <th><label for="el-voice">Ses (Voice ID)</label></th>
                    <td>
                        <select id="el-voice" style="min-width:340px;">
                            <option value="">— Önce key'i kaydedip "Sesleri Yükle"ye basın —</option>
                            <?php if ( $voice_id ) : ?>
                                <option value="<?php echo esc_attr( $voice_id ); ?>" selected>Kayıtlı: <?php echo esc_html( $voice_id ); ?></option>
                            <?php endif; ?>
                        </select>
                        <button type="button" class="button" id="el-load-voices">🔄 Sesleri Yükle</button>
                        <button type="button" class="button" id="el-preview-voice">▶️ Önizle</button>
                        <p class="description">Türkçe için iyi sonuç verenler genellikle multilingual model + nötr aksanlı ses. Önizleme ile dinleyip seçin.</p>
                    </td>
                </tr>
                <tr>
                    <th></th>
                    <td>
                        <button type="button" class="button button-primary" id="el-save-settings">💾 Ayarları Kaydet</button>
                        <span id="el-save-status" style="margin-left:10px;color:#46b450;"></span>
                    </td>
                </tr>
            </table>

            <hr style="margin:30px 0;">

            <h2>🎬 Podcast Üret</h2>

            <?php if ( ! $openai_set ) : ?>
                <div class="notice notice-error inline"><p>OpenAI API anahtarı tanımlı değil — script üretimi için gerekli. (Ayarlar sayfasından girin.)</p></div>
            <?php endif; ?>

            <table class="form-table">
                <tr>
                    <th><label for="pc-type">Hedef tür</label></th>
                    <td>
                        <select id="pc-type" style="min-width:240px;">
                            <?php foreach ( $allowed_types as $slug => $label ) :
                                $sel = ( $slug === 'post' ) ? 'selected' : ''; ?>
                                <option value="<?php echo esc_attr( $slug ); ?>" <?php echo $sel; ?>><?php echo esc_html( $label ); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </td>
                </tr>
                <tr>
                    <th><label for="pc-prompt">Konu / Yönerge</label></th>
                    <td>
                        <textarea id="pc-prompt" rows="3" style="width:100%;max-width:820px;" placeholder="Örnek: Ankara'nın bu haftaki gündemi — ulaşım, kültür ve spor başlıkları"></textarea>
                        <p class="description">Hazır script yapıştırırsanız bu alanı boş bırakabilirsiniz; konu boşsa script alanı zorunludur.</p>
                    </td>
                </tr>
                <tr>
                    <th><label for="pc-script">Hazır script (opsiyonel)</label></th>
                    <td>
                        <textarea id="pc-script" rows="8" style="width:100%;max-width:820px;font-family:Consolas,Menlo,monospace;font-size:12px;" placeholder="Eğer kendi metniniz varsa buraya yapıştırın — AI script üretmez, doğrudan seslendirir."></textarea>
                    </td>
                </tr>
                <tr>
                    <th>Süre hedefi</th>
                    <td>
                        <select id="pc-length">
                            <option value="500">Kısa podcast (~2 dk, ~500 kelime)</option>
                            <option value="1200" selected>Orta (~5 dk, ~1200 kelime)</option>
                            <option value="2200">Uzun (~10 dk, ~2200 kelime)</option>
                        </select>
                        <span style="margin-left:10px;color:#888;font-size:12px;">Kelime sayısına göre ElevenLabs karakter ücreti uygulanır.</span>
                    </td>
                </tr>
                <tr>
                    <th>Yayın durumu</th>
                    <td>
                        <label><input type="radio" name="pc-status" value="draft" checked> 📝 Taslak</label> &nbsp;
                        <label><input type="radio" name="pc-status" value="publish"> ✅ Hemen yayınla</label>
                    </td>
                </tr>
            </table>

            <p>
                <button type="button" class="button button-primary button-hero" id="pc-go">🎙️ Podcast Üret</button>
            </p>

            <div id="pc-progress" style="display:none;margin-top:14px;background:#fff;border:1px solid #ccd0d4;padding:14px;border-radius:6px;">
                <p id="pc-step" style="margin:0;font-weight:600;">Başlatılıyor...</p>
                <div style="background:#f1f1f1;height:6px;border-radius:3px;margin-top:8px;overflow:hidden;">
                    <div id="pc-bar" style="background:#2271b1;height:100%;width:0;transition:width .3s;"></div>
                </div>
            </div>

            <div id="pc-result" style="display:none;margin-top:14px;background:#fff;border:1px solid #46b450;padding:18px;border-radius:6px;">
                <h3 style="margin-top:0;color:#46b450;">✅ Podcast hazır</h3>
                <p id="pc-result-text"></p>
                <audio id="pc-audio" controls style="width:100%;max-width:600px;display:block;margin:10px 0;"></audio>
                <div id="pc-result-buttons"></div>
            </div>

            <hr style="margin:32px 0 18px;">
            <h2>📚 Geçmiş Podcast'ler</h2>
            <?php $this->render_history_table(); ?>
        </div>

        <audio id="pc-preview" style="display:none;"></audio>

        <script>
        (function(){
            const NONCE = '<?php echo esc_js( $nonce ); ?>';
            const AJAX  = '<?php echo esc_url_raw( admin_url( 'admin-ajax.php' ) ); ?>';
            const $ = id => document.getElementById(id);

            async function ajax(action, params = {}) {
                const fd = new FormData();
                fd.append('action', action);
                fd.append('_ajax_nonce', NONCE);
                Object.entries(params).forEach(([k, v]) => fd.append(k, v));
                const r = await fetch(AJAX, { method: 'POST', body: fd, credentials: 'same-origin' });
                return r.json();
            }

            $('el-save-settings').addEventListener('click', async () => {
                const j = await ajax('ahenk_podcast_save_settings', {
                    api_key:  $('el-key').value.trim(),
                    voice_id: $('el-voice').value,
                    model:    $('el-model').value,
                });
                $('el-save-status').textContent = j.success ? '✅ Kaydedildi' : ('❌ ' + (j.data?.msg || ''));
                setTimeout(() => $('el-save-status').textContent = '', 3000);
            });

            $('el-load-voices').addEventListener('click', async () => {
                const key = $('el-key').value.trim();
                if (!key) { alert('Önce API key girin.'); return; }
                $('el-load-voices').disabled = true;
                $('el-load-voices').textContent = '⏳ Yükleniyor...';
                const j = await ajax('ahenk_podcast_list_voices', { api_key: key });
                $('el-load-voices').disabled = false;
                $('el-load-voices').textContent = '🔄 Sesleri Yükle';
                if (!j.success) { alert('Hata: ' + (j.data?.msg || 'bilinmiyor')); return; }
                const sel = $('el-voice');
                sel.innerHTML = '<option value="">— Ses seçin —</option>';
                j.data.voices.forEach(v => {
                    const o = document.createElement('option');
                    o.value = v.voice_id;
                    o.textContent = v.name + (v.labels?.language ? ' [' + v.labels.language + ']' : '') + (v.labels?.accent ? ' · ' + v.labels.accent : '');
                    o.dataset.preview = v.preview_url || '';
                    sel.appendChild(o);
                });
            });

            $('el-preview-voice').addEventListener('click', () => {
                const opt = $('el-voice').selectedOptions[0];
                const url = opt?.dataset?.preview;
                if (!url) { alert('Bu ses için önizleme yok (önce "Sesleri Yükle" çalıştırın).'); return; }
                const a = $('pc-preview');
                a.src = url; a.play();
            });

            function step(msg, pct) {
                $('pc-progress').style.display = '';
                $('pc-step').textContent = msg;
                $('pc-bar').style.width = pct + '%';
            }

            $('pc-go').addEventListener('click', async () => {
                const prompt = $('pc-prompt').value.trim();
                const script = $('pc-script').value.trim();
                if (!prompt && !script) { alert('Konu veya hazır script girin.'); return; }
                if (!$('el-voice').value) { alert('Bir ses seçin (önce "Sesleri Yükle" + "Ayarları Kaydet").'); return; }

                $('pc-result').style.display = 'none';
                $('pc-go').disabled = true;
                step(script ? 'Hazır script seslendiriliyor...' : 'AI script üretiyor...', 15);

                try {
                    const j = await ajax('ahenk_podcast_generate', {
                        type:   $('pc-type').value,
                        prompt: prompt,
                        script: script,
                        length: $('pc-length').value,
                        status: document.querySelector('input[name=pc-status]:checked').value,
                    });
                    $('pc-go').disabled = false;
                    if (!j.success) {
                        step('❌ Hata: ' + (j.data?.msg || 'bilinmiyor'), 0);
                        $('pc-bar').style.background = '#d63638';
                        return;
                    }
                    step('Tamamlandı', 100);
                    $('pc-bar').style.background = '#46b450';
                    $('pc-result').style.display = '';
                    $('pc-result-text').innerHTML =
                        '<strong>' + j.data.title + '</strong><br>' +
                        'Tür: <code>' + j.data.type + '</code> · Durum: <code>' + j.data.status + '</code> · ' +
                        'Kelime: ' + j.data.word_count + ' · ' +
                        'Ses dosyası: ' + Math.round(j.data.audio_size / 1024) + ' KB';
                    $('pc-audio').src = j.data.audio_url;
                    $('pc-result-buttons').innerHTML =
                        '<a href="' + j.data.edit_url + '" class="button button-primary" target="_blank">✏️ Düzenle</a> ' +
                        '<a href="' + j.data.view_url + '" class="button" target="_blank">👁 Görüntüle</a> ' +
                        '<a href="' + j.data.audio_url + '" class="button" target="_blank" download>⬇️ MP3 İndir</a>';
                } catch (e) {
                    $('pc-go').disabled = false;
                    step('❌ Ağ hatası: ' + e.message, 0);
                    $('pc-bar').style.background = '#d63638';
                }
            });

            // Sil
            document.querySelectorAll('.pc-del').forEach(b => {
                b.addEventListener('click', async () => {
                    if (!confirm('Bu podcast silinsin mi? (Çöpe gider)')) return;
                    const j = await ajax('ahenk_podcast_delete', { post_id: b.dataset.pid });
                    if (j.success) b.closest('tr').remove();
                    else alert('Hata: ' + (j.data?.msg || ''));
                });
            });
        })();
        </script>
        <?php
    }

    /* ============ AYARLARI KAYDET ============ */

    public function ajax_save_settings() {
        check_ajax_referer( self::NONCE );
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( array( 'msg' => 'yetki yok' ) );
        update_option( self::OPT_KEY,   trim( (string) ( $_POST['api_key']  ?? '' ) ) );
        update_option( self::OPT_VOICE, sanitize_text_field( (string) ( $_POST['voice_id'] ?? '' ) ) );
        update_option( self::OPT_MODEL, sanitize_text_field( (string) ( $_POST['model']    ?? 'eleven_multilingual_v2' ) ) );
        wp_send_json_success();
    }

    /* ============ SESLERİ LİSTELE ============ */

    public function ajax_list_voices() {
        check_ajax_referer( self::NONCE );
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( array( 'msg' => 'yetki yok' ) );
        $key = trim( (string) ( $_POST['api_key'] ?? '' ) );
        if ( $key === '' ) wp_send_json_error( array( 'msg' => 'API key boş' ) );

        $resp = wp_remote_get( 'https://api.elevenlabs.io/v1/voices', array(
            'headers' => array( 'xi-api-key' => $key, 'Accept' => 'application/json' ),
            'timeout' => 30,
        ) );
        if ( is_wp_error( $resp ) ) wp_send_json_error( array( 'msg' => $resp->get_error_message() ) );
        $code = wp_remote_retrieve_response_code( $resp );
        if ( $code !== 200 ) wp_send_json_error( array( 'msg' => 'ElevenLabs HTTP ' . $code . ': ' . wp_remote_retrieve_body( $resp ) ) );
        $j = json_decode( wp_remote_retrieve_body( $resp ), true );
        $voices = array();
        foreach ( ( $j['voices'] ?? array() ) as $v ) {
            $voices[] = array(
                'voice_id'    => $v['voice_id'] ?? '',
                'name'        => $v['name']     ?? '(isimsiz)',
                'preview_url' => $v['preview_url'] ?? '',
                'labels'      => $v['labels']      ?? array(),
            );
        }
        wp_send_json_success( array( 'voices' => $voices ) );
    }

    /* ============ ÜRETİM ============ */

    public function ajax_generate() {
        check_ajax_referer( self::NONCE );
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( array( 'msg' => 'yetki yok' ) );

        $el_key   = trim( (string) get_option( self::OPT_KEY, '' ) );
        $voice_id = trim( (string) get_option( self::OPT_VOICE, '' ) );
        $el_model = trim( (string) get_option( self::OPT_MODEL, 'eleven_multilingual_v2' ) );
        if ( $el_key === ''   ) wp_send_json_error( array( 'msg' => 'ElevenLabs API key kayıtlı değil' ) );
        if ( $voice_id === '' ) wp_send_json_error( array( 'msg' => 'Voice ID kayıtlı değil' ) );

        $type   = sanitize_key( $_POST['type'] ?? 'post' );
        if ( ! post_type_exists( $type ) ) wp_send_json_error( array( 'msg' => 'Geçersiz post tipi' ) );
        $prompt = trim( wp_unslash( (string) ( $_POST['prompt'] ?? '' ) ) );
        $script = trim( wp_unslash( (string) ( $_POST['script'] ?? '' ) ) );
        $length = max( 200, min( 4000, (int) ( $_POST['length'] ?? 1200 ) ) );
        $status = in_array( ( $_POST['status'] ?? 'draft' ), array( 'draft', 'publish' ), true ) ? $_POST['status'] : 'draft';

        // ===== 1) Script (varsa kullan, yoksa OpenAI ile uret) =====
        $title = '';
        if ( $script === '' ) {
            $openai_key = trim( (string) get_option( 'ahb_openai_api_key', '' ) );
            if ( $openai_key === '' ) wp_send_json_error( array( 'msg' => 'OpenAI key tanımlı değil — hazır script girin veya OpenAI key ekleyin' ) );
            $gen = $this->generate_script( $openai_key, $prompt, $length );
            if ( ! $gen ) wp_send_json_error( array( 'msg' => 'AI script üretemedi (loglara bakın)' ) );
            $title  = $gen['title'];
            $script = $gen['script'];
        } else {
            $title = $prompt !== '' ? $prompt : ( 'Podcast — ' . wp_date( 'd.m.Y H:i' ) );
        }

        if ( mb_strlen( $script ) < 30 ) wp_send_json_error( array( 'msg' => 'Script çok kısa (min 30 karakter)' ) );

        // ===== 2) ElevenLabs TTS =====
        $mp3 = $this->elevenlabs_tts( $el_key, $voice_id, $el_model, $script );
        if ( is_wp_error( $mp3 ) ) wp_send_json_error( array( 'msg' => 'ElevenLabs: ' . $mp3->get_error_message() ) );
        if ( ! $mp3 ) wp_send_json_error( array( 'msg' => 'ElevenLabs ses üretemedi' ) );

        // ===== 3) Post oluştur (önce, attachment'ı bağlamak icin) =====
        $post_id = wp_insert_post( array(
            'post_type'    => $type,
            'post_status'  => $status,
            'post_title'   => $title,
            'post_content' => '', // ses kaydından sonra dolduracağız
            'meta_input'   => array(
                '_ahb_podcast'        => 1,
                '_ahb_podcast_prompt' => $prompt,
                '_ahb_podcast_voice'  => $voice_id,
                '_ahb_podcast_at'     => current_time( 'mysql' ),
            ),
        ), true );
        if ( is_wp_error( $post_id ) ) wp_send_json_error( array( 'msg' => 'Post oluşturulamadı: ' . $post_id->get_error_message() ) );

        // ===== 4) MP3'u medya kutuphanesine kaydet =====
        $att_id = $this->save_audio( $mp3, sanitize_title( $title ) . '.mp3', $post_id );
        if ( ! $att_id ) {
            wp_delete_post( $post_id, true );
            wp_send_json_error( array( 'msg' => 'Ses dosyası medya kütüphanesine kaydedilemedi' ) );
        }
        $audio_url = wp_get_attachment_url( $att_id );

        // ===== 5) İcerigi olustur (audio + transcript) =====
        $script_html = wpautop( esc_html( $script ) );
        $content  = '<audio controls style="width:100%;max-width:600px;display:block;margin:0 0 16px;"><source src="' . esc_url( $audio_url ) . '" type="audio/mpeg">Tarayıcınız ses çalmayı desteklemiyor.</audio>';
        $content .= '<details style="margin:14px 0;"><summary style="cursor:pointer;font-weight:600;">📝 Podcast Metni (Transkript)</summary><div style="margin-top:10px;">' . $script_html . '</div></details>';

        wp_update_post( array( 'ID' => $post_id, 'post_content' => $content ) );

        wp_send_json_success( array(
            'post_id'    => $post_id,
            'type'       => $type,
            'status'     => $status,
            'title'      => $title,
            'word_count' => str_word_count( $script ),
            'audio_url'  => $audio_url,
            'audio_size' => strlen( $mp3 ),
            'edit_url'   => get_edit_post_link( $post_id, '' ),
            'view_url'   => get_permalink( $post_id ),
        ) );
    }

    /* ============ OPENAI: PODCAST SCRIPT ============ */

    private function generate_script( $api_key, $prompt, $length ) {
        $model = get_option( 'ahb_openai_model', 'gpt-4o-mini' );
        $sys = "Sen Türkçe podcast script yazan deneyimli bir editörsün. ÇIKTI HER ZAMAN GEÇERLİ JSON OLMALIDIR. " .
               "Schema: {\"title\":string,\"script\":string}. Script, doğal konuşma diline uygun, sesli okunduğunda akıcı olsun. " .
               "Liste, başlık, markdown KULLANMA — sadece konuşma metni. Emoji yok. Hedef kelime sayısına yakın yaz. " .
               "Açılış selamı ve kapanış cümlesi olsun.";
        $user = "KONU: " . $prompt . "\nHEDEF KELİME: yaklaşık " . $length . "\nÇıktı sadece JSON olsun.";

        $resp = wp_remote_post( 'https://api.openai.com/v1/chat/completions', array(
            'headers' => array( 'Authorization' => 'Bearer ' . $api_key, 'Content-Type' => 'application/json' ),
            'body'    => wp_json_encode( array(
                'model'           => $model,
                'response_format' => array( 'type' => 'json_object' ),
                'temperature'     => 0.75,
                'messages'        => array(
                    array( 'role' => 'system', 'content' => $sys ),
                    array( 'role' => 'user',   'content' => $user ),
                ),
            ) ),
            'timeout' => 120,
        ) );
        if ( is_wp_error( $resp ) ) { error_log( '[AHB-PODCAST-SCRIPT] ' . $resp->get_error_message() ); return false; }
        if ( wp_remote_retrieve_response_code( $resp ) !== 200 ) {
            error_log( '[AHB-PODCAST-SCRIPT] ' . wp_remote_retrieve_body( $resp ) );
            return false;
        }
        $j = json_decode( wp_remote_retrieve_body( $resp ), true );
        $content_str = $j['choices'][0]['message']['content'] ?? '';
        $parsed = json_decode( $content_str, true );
        if ( ! is_array( $parsed ) || empty( $parsed['script'] ) ) return false;
        return array(
            'title'  => wp_strip_all_tags( $parsed['title'] ?? ( 'Podcast — ' . wp_date( 'd.m.Y' ) ) ),
            'script' => (string) $parsed['script'],
        );
    }

    /* ============ ELEVENLABS TTS ============ */

    private function elevenlabs_tts( $api_key, $voice_id, $model, $text ) {
        $url = 'https://api.elevenlabs.io/v1/text-to-speech/' . rawurlencode( $voice_id );
        $resp = wp_remote_post( $url, array(
            'headers' => array(
                'xi-api-key'   => $api_key,
                'Accept'       => 'audio/mpeg',
                'Content-Type' => 'application/json',
            ),
            'body'    => wp_json_encode( array(
                'text'     => $text,
                'model_id' => $model,
                'voice_settings' => array(
                    'stability'        => 0.5,
                    'similarity_boost' => 0.75,
                    'style'            => 0.0,
                    'use_speaker_boost'=> true,
                ),
            ) ),
            'timeout' => 240, // uzun script icin
        ) );
        if ( is_wp_error( $resp ) ) return $resp;
        $code = wp_remote_retrieve_response_code( $resp );
        $body = wp_remote_retrieve_body( $resp );
        if ( $code !== 200 ) {
            error_log( '[AHB-ELEVEN] HTTP ' . $code . ' body=' . substr( $body, 0, 500 ) );
            return new WP_Error( 'eleven_http', 'HTTP ' . $code . ' — ' . substr( $body, 0, 300 ) );
        }
        return $body; // binary mp3
    }

    /* ============ MEDYA KAYIT ============ */

    private function save_audio( $bin, $filename, $post_id = 0 ) {
        $upload = wp_upload_dir();
        if ( ! empty( $upload['error'] ) ) return false;
        if ( ! pathinfo( $filename, PATHINFO_EXTENSION ) ) $filename .= '.mp3';
        $filename = wp_unique_filename( $upload['path'], $filename );
        $filepath = trailingslashit( $upload['path'] ) . $filename;
        if ( ! file_put_contents( $filepath, $bin ) ) return false;
        $att = array(
            'guid'           => trailingslashit( $upload['url'] ) . $filename,
            'post_mime_type' => 'audio/mpeg',
            'post_title'     => sanitize_file_name( pathinfo( $filename, PATHINFO_FILENAME ) ),
            'post_content'   => '',
            'post_status'    => 'inherit',
        );
        $att_id = wp_insert_attachment( $att, $filepath, $post_id );
        if ( ! $att_id || is_wp_error( $att_id ) ) return false;
        require_once ABSPATH . 'wp-admin/includes/image.php';
        $meta = wp_generate_attachment_metadata( $att_id, $filepath );
        wp_update_attachment_metadata( $att_id, $meta );
        return $att_id;
    }
}

Ahenk_Podcast_Uret::init();
