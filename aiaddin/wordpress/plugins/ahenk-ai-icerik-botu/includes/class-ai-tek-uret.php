<?php
/**
 * AI Tek Üret — Sayfa veya Haber tek tek AI ile üretme aracı.
 *
 * v2 ozellikleri:
 *   - Sayfa sablonlari (standart / premium-biyografi / premium-tanitim / premium-hakkimizda)
 *     AI'a yapilandirilmis JSON schema gonderilir, bolumler inline-CSS ile premium HTML'e render edilir.
 *   - Gorsel modeli secimi: gpt-image-1 (yeni, kaliteli, Turkce destekli) veya dall-e-3.
 *   - Sayfanin altinda gecmis uretimler listesi (duzenle / goruntule / sil).
 */

if ( ! defined( 'ABSPATH' ) ) exit;

class Ahenk_AI_Tek_Uret {

    const NONCE  = 'ahenk_aiuret';
    const SLUG   = 'ahenk-ai-tek-uret';
    const META   = '_ahb_aiuret';

    const TAMSAYFA_SLUG = 'ahenk-tamsayfa';

    public static function init() {
        $self = new self();
        add_action( 'admin_menu',                       array( $self, 'menu' ), 31 );
        // Tam sayfa template kaydi
        add_filter( 'theme_page_templates', array( $self, 'register_tamsayfa_template' ) );
        add_filter( 'template_include',     array( $self, 'load_tamsayfa_template' ), 99 );
        add_action( 'wp_ajax_ahenk_aiuret_generate',    array( $self, 'ajax_generate' ) );
        add_action( 'wp_ajax_ahenk_aiuret_delete',      array( $self, 'ajax_delete' ) );
        add_action( 'wp_ajax_ahenk_aiuret_websearch',   array( $self, 'ajax_websearch' ) );
    }

    public function menu() {
        add_submenu_page(
            'ai-haber-botu',
            'AI Tek Üret',
            '✨ AI Tek Üret',
            'manage_options',
            self::SLUG,
            array( $this, 'render' )
        );
    }

    /* ============ ADMIN SAYFASI ============ */

    public function render() {
        if ( ! current_user_can( 'manage_options' ) ) return;

        $api_key_set = (bool) trim( (string) get_option( 'ahb_openai_api_key', '' ) );
        $model       = get_option( 'ahb_openai_model', 'gpt-4o-mini' );
        $nonce       = wp_create_nonce( self::NONCE );

        $allowed_types = array();
        $all_pt = get_post_types( array( 'public' => true ), 'objects' );
        foreach ( $all_pt as $pt ) {
            if ( in_array( $pt->name, array( 'attachment', 'nav_menu_item', 'revision' ), true ) ) continue;
            $allowed_types[ $pt->name ] = $pt->labels->singular_name . ' (' . $pt->name . ')';
        }
        $cats = get_terms( array( 'taxonomy' => 'category', 'hide_empty' => false, 'orderby' => 'name', 'number' => 0 ) );
        ?>
        <div class="wrap">
            <h1>✨ AI Tek Üret — Sayfa veya Haber</h1>

            <?php if ( ! $api_key_set ) : ?>
                <div class="notice notice-error"><p><strong>OpenAI API anahtarı tanımlı değil.</strong> Ayarlar sayfasından girin.</p></div>
            <?php endif; ?>

            <p style="color:#555;max-width:820px;">
                Tek bir konu girin (örn. <em>"Atatürk hakkında ultra premium tanıtım sayfası"</em> veya <em>"Hakkımızda sayfası"</em>) — yapay zekâ seçtiğiniz şablona göre içerik üretip WordPress'e doğrudan kaydeder.
            </p>

            <table class="form-table">
                <tr>
                    <th><label for="aiuret-type">Hedef tür</label></th>
                    <td>
                        <select id="aiuret-type" style="min-width:240px;">
                            <?php foreach ( $allowed_types as $slug => $label ) :
                                $sel = ( $slug === 'page' ) ? 'selected' : ''; ?>
                                <option value="<?php echo esc_attr( $slug ); ?>" <?php echo $sel; ?>><?php echo esc_html( $label ); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </td>
                </tr>
                <tr>
                    <th><label for="aiuret-template">Şablon</label></th>
                    <td>
                        <select id="aiuret-template" style="min-width:340px;">
                            <option value="standart">Standart yazı (basit HTML)</option>
                            <option value="premium-biyografi" selected>★ Premium Biyografi (hero + alıntı + istatistikler + kronoloji)</option>
                            <option value="premium-tanitim">★ Premium Tanıtım (hero + özellikler + CTA)</option>
                            <option value="premium-hakkimizda">★ Premium Hakkımızda (hero + misyon/vizyon + değerler + ekip)</option>
                            <option value="premium-hub">★★ Premium Hub — Zincirleme Sayfalar (ana hub + N alt sayfa, otomatik bağlanır)</option>
                        </select>
                        <p class="description">Premium şablonlar inline CSS ile gelir, temanızdan bağımsız modern görünüm üretir. <strong>Hub modu:</strong> AI önce plan yapar, ana sayfa + alt sayfaları oluşturur, hepsini WordPress parent/child hiyerarşisiyle bağlar (örn. /atatuk → /atatuk/kronoloji, /atatuk/ilkeler).</p>
                    </td>
                </tr>
                <tr id="aiuret-design-row">
                    <th>Renk teması</th>
                    <td>
                        <select id="aiuret-theme">
                            <option value="lacivert-altin" selected>🌃 Lacivert + Altın (klasik premium)</option>
                            <option value="bordo-krem">🍷 Bordo + Krem (zarif kurumsal)</option>
                            <option value="yesil-altin">🌿 Yeşil + Altın (doğal şık)</option>
                            <option value="mor-pembe">💜 Mor + Pembe (modern canlı)</option>
                            <option value="mavi-turuncu">🌊 Mavi + Turuncu (enerjik)</option>
                            <option value="siyah-beyaz">⬛ Siyah + Beyaz (minimal)</option>
                            <option value="kurumsal-kirmizi">🔴 Siyah + Kırmızı (kurumsal)</option>
                        </select>
                        &nbsp;&nbsp;
                        <label><strong>Sayfa düzeni:</strong>
                            <select id="aiuret-layout" style="margin-left:6px;">
                                <option value="standard" selected>📄 Temaya göre (tema container'ı içinde)</option>
                                <option value="fullwidth">🖥 Tam genişlik (ekrana yayıl — zorla)</option>
                            </select>
                        </label>
                        <p class="description" style="margin-top:6px;">🖥 <strong>Tam genişlik</strong> modu tema wrapper'larını runtime'da geçersiz kılar — çerçevesiz görünür, içeriğiniz tüm ekrana yayılır. 📄 <strong>Temaya göre</strong> modu temanızın standart içerik alanı içinde kalır (sidebar, container sınırları korunur). Premium şablonlarda etkilidir.</p>
                    </td>
                </tr>
                <tr id="aiuret-subcount-row" style="display:none;">
                    <th><label for="aiuret-subcount">Alt sayfa sayısı</label></th>
                    <td>
                        <select id="aiuret-subcount">
                            <?php for ( $i = 2; $i <= 8; $i++ ) : ?>
                                <option value="<?php echo $i; ?>" <?php selected( $i, 4 ); ?>><?php echo $i; ?> alt sayfa</option>
                            <?php endfor; ?>
                        </select>
                        <span style="margin-left:10px;color:#888;font-size:12px;">⏱ Hub modu N+1 OpenAI çağrısı yapar, 1-3 dakika sürebilir.</span>
                    </td>
                </tr>
                <tr>
                    <th><label for="aiuret-prompt">Konu / Yönerge <span style="color:#d63638;">*</span></label></th>
                    <td>
                        <textarea id="aiuret-prompt" rows="3" style="width:100%;max-width:820px;" placeholder="Örnek: Mustafa Kemal Atatürk için ultra premium biyografi sayfası — gençlik, askeri kariyer, devrimler, miras."></textarea>
                    </td>
                </tr>
                <tr>
                    <th><label for="aiuret-title">Başlık</label></th>
                    <td>
                        <input type="text" id="aiuret-title" class="regular-text" style="width:100%;max-width:820px;" placeholder="Boşsa AI üretir">
                    </td>
                </tr>
                <tr>
                    <th><label for="aiuret-existing">Hazır metin (opsiyonel)</label></th>
                    <td>
                        <textarea id="aiuret-existing" rows="6" style="width:100%;max-width:820px;font-family:Consolas,Menlo,monospace;font-size:12px;" placeholder="Elinizde metin varsa yapıştırın — AI bunu temel alır, geliştirir."></textarea>
                    </td>
                </tr>
                <tr>
                    <th>İçerik uzunluğu</th>
                    <td>
                        <select id="aiuret-length">
                            <option value="500">Kısa (~500 kelime)</option>
                            <option value="1000" selected>Orta (~1000 kelime)</option>
                            <option value="2000">Uzun (~2000 kelime)</option>
                            <option value="3500">Ultra premium (~3500 kelime, çok bölümlü)</option>
                        </select>
                    </td>
                </tr>
                <tr>
                    <th>Üslup</th>
                    <td>
                        <select id="aiuret-style">
                            <option value="gazete">Gazete haberi</option>
                            <option value="profesyonel" selected>Profesyonel / kurumsal</option>
                            <option value="samimi">Samimi, sohbet</option>
                            <option value="akademik">Akademik, derin</option>
                            <option value="biyografi">Biyografik, kronolojik</option>
                        </select>
                    </td>
                </tr>
                <tr>
                    <th>Görsel</th>
                    <td>
                        <label><input type="radio" name="aiuret-img" value="none" checked> 🚫 Yok</label> &nbsp;
                        <label><input type="radio" name="aiuret-img" value="upload"> 📤 Dosya yükle</label> &nbsp;
                        <label><input type="radio" name="aiuret-img" value="ai"> 🤖 AI üretsin</label> &nbsp;
                        <label><input type="radio" name="aiuret-img" value="web"> 🔍 Web'den ara (ücretsiz)</label>

                        <div id="aiuret-img-upload-row" style="display:none;margin-top:10px;">
                            <input type="file" id="aiuret-img-file" accept="image/*">
                        </div>
                        <div id="aiuret-img-ai-row" style="display:none;margin-top:10px;max-width:820px;">
                            <label><strong>Görsel modeli:</strong>
                                <select id="aiuret-img-model" style="margin-left:8px;">
                                    <option value="gpt-image-1" selected>GPT Image 1 (yeni — kaliteli, Türkçe yazı destekli)</option>
                                    <option value="dall-e-3">DALL-E 3 (eski, hâlâ iyi)</option>
                                </select>
                            </label>
                            <input type="text" id="aiuret-img-prompt" class="regular-text" style="width:100%;margin-top:8px;" placeholder="Görsel için ek talimat (boşsa konudan türetilir)">
                            <p style="margin:6px 0 0;font-size:12px;color:#666;">Not: gpt-image-1 daha pahalıdır ama görsel kalitesi ve metin (Türkçe başlık vb.) çok daha iyidir.</p>
                        </div>
                        <div id="aiuret-img-web-row" style="display:none;margin-top:10px;max-width:980px;background:#f8f9fa;border:1px solid #e2e4e7;padding:14px;border-radius:6px;">
                            <p style="margin:0 0 8px;font-size:13px;color:#555;">Wikimedia Commons'dan ücretsiz, telif sorunsuz görsel arar. <strong>Birden fazla seçebilirsiniz</strong> — sırasıyla numaralanır. Hub modunda her alt sayfaya farklı görsel atanabilir.</p>
                            <div style="display:flex;gap:8px;">
                                <input type="text" id="aiuret-img-q" class="regular-text" style="flex:1;" placeholder="Aranacak kelime (boşsa konudan alınır) — örn: Atatürk portre">
                                <button type="button" class="button" id="aiuret-img-search">🔍 Ara</button>
                                <button type="button" class="button" id="aiuret-img-clear">🗑 Seçimi temizle</button>
                            </div>
                            <div id="aiuret-img-results" style="margin-top:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;max-height:560px;overflow-y:auto;padding:4px;"></div>
                            <div id="aiuret-img-selected-box" style="margin-top:12px;padding:10px 12px;background:#fff;border:1px dashed #ccd0d4;border-radius:6px;display:none;">
                                <strong style="font-size:13px;">📌 Seçilenler (<span id="aiuret-img-count">0</span>):</strong>
                                <div id="aiuret-img-picked-list" style="margin-top:6px;font-size:12px;color:#444;"></div>
                            </div>
                            <div id="aiuret-img-assign-box" style="margin-top:14px;padding:12px 14px;background:#fff;border:1px solid #c3c4c7;border-radius:6px;display:none;">
                                <label style="font-weight:600;font-size:13px;"><input type="checkbox" id="aiuret-img-auto" checked> 🤖 AI / otomatik dağıt (1. seçim ana sayfa, 2. seçim alt sayfa 1, 3. → alt 2 ...)</label>
                                <div id="aiuret-img-manual" style="margin-top:10px;display:none;"></div>
                            </div>
                            <input type="hidden" id="aiuret-img-picks-json" value="">
                        </div>
                    </td>
                </tr>
                <tr id="aiuret-cat-row" style="display:none;">
                    <th>Kategori (haber/yazı için)</th>
                    <td>
                        <select id="aiuret-cat">
                            <option value="">— Yok —</option>
                            <?php if ( ! is_wp_error( $cats ) ) foreach ( $cats as $c ) : ?>
                                <option value="<?php echo (int) $c->term_id; ?>"><?php echo esc_html( $c->name ); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </td>
                </tr>
                <tr>
                    <th>Yayın durumu</th>
                    <td>
                        <label><input type="radio" name="aiuret-status" value="draft" checked> 📝 Taslak</label> &nbsp;
                        <label><input type="radio" name="aiuret-status" value="publish"> ✅ Hemen yayınla</label>
                    </td>
                </tr>
            </table>

            <p>
                <button type="button" class="button button-primary button-hero" id="aiuret-go" <?php echo $api_key_set ? '' : 'disabled'; ?>>✨ Üret ve Kaydet</button>
                <span style="margin-left:14px;color:#888;font-size:12px;">Metin modeli: <code><?php echo esc_html( $model ); ?></code></span>
            </p>

            <div id="aiuret-progress" style="display:none;margin-top:14px;background:#fff;border:1px solid #ccd0d4;padding:14px;border-radius:6px;">
                <p id="aiuret-step" style="margin:0;font-weight:600;">Başlatılıyor...</p>
                <div style="background:#f1f1f1;height:6px;border-radius:3px;margin-top:8px;overflow:hidden;">
                    <div id="aiuret-bar" style="background:#2271b1;height:100%;width:0;transition:width .3s;"></div>
                </div>
            </div>

            <div id="aiuret-result" style="display:none;margin-top:14px;background:#fff;border:1px solid #46b450;padding:18px;border-radius:6px;">
                <h3 style="margin-top:0;color:#46b450;">✅ Üretim tamamlandı</h3>
                <p id="aiuret-result-text"></p>
                <div id="aiuret-result-buttons"></div>
            </div>

            <hr style="margin:32px 0 18px;">
            <h2>📚 Geçmiş AI Üretimleri</h2>
            <?php $this->render_history_table(); ?>
        </div>

        <script>
        (function(){
            const NONCE = '<?php echo esc_js( $nonce ); ?>';
            const AJAX  = '<?php echo esc_url_raw( admin_url( 'admin-ajax.php' ) ); ?>';
            const $ = id => document.getElementById(id);
            const typeSel = $('aiuret-type');
            const tplSel  = $('aiuret-template');
            const catRow  = $('aiuret-cat-row');
            const subRow  = $('aiuret-subcount-row');
            const imgUp   = $('aiuret-img-upload-row');
            const imgAi   = $('aiuret-img-ai-row');

            function syncCat() {
                const t = typeSel.value;
                catRow.style.display = (t === 'post' || t === 'haber') ? '' : 'none';
            }
            function syncTpl() {
                subRow.style.display = (tplSel.value === 'premium-hub') ? '' : 'none';
            }
            typeSel.addEventListener('change', syncCat); syncCat();
            tplSel.addEventListener('change', syncTpl); syncTpl();

            const imgWeb = $('aiuret-img-web-row');
            document.querySelectorAll('input[name=aiuret-img]').forEach(r => {
                r.addEventListener('change', () => {
                    const v = document.querySelector('input[name=aiuret-img]:checked').value;
                    imgUp.style.display  = (v === 'upload') ? '' : 'none';
                    imgAi.style.display  = (v === 'ai')     ? '' : 'none';
                    imgWeb.style.display = (v === 'web')    ? '' : 'none';
                });
            });

            // Web'den görsel ara — çoklu seçim
            const picked = []; // [{url, credit, title, thumb}, ...]

            function refreshPickedUI() {
                $('aiuret-img-count').textContent = picked.length;
                $('aiuret-img-selected-box').style.display = picked.length ? '' : 'none';
                $('aiuret-img-assign-box').style.display   = picked.length ? '' : 'none';
                const list = $('aiuret-img-picked-list');
                list.innerHTML = '';
                picked.forEach((it, i) => {
                    const span = document.createElement('span');
                    span.style.cssText = 'display:inline-block;margin:3px 6px 3px 0;padding:3px 8px;background:#eef;border-radius:12px;border:1px solid #ccd;';
                    span.innerHTML = '<strong>' + (i+1) + '.</strong> ' + it.title.substring(0, 40) + ' <a href="#" data-i="' + i + '" class="ai-pick-rm" style="color:#d63638;text-decoration:none;margin-left:4px;">✖</a>';
                    list.appendChild(span);
                });
                list.querySelectorAll('.ai-pick-rm').forEach(a => {
                    a.addEventListener('click', e => {
                        e.preventDefault();
                        const i = parseInt(a.dataset.i);
                        const removedUrl = picked[i].url;
                        picked.splice(i, 1);
                        // Sonuç grid'inde işareti kaldır
                        $('aiuret-img-results').querySelectorAll('[data-url]').forEach(d => {
                            if (d.dataset.url === removedUrl) {
                                d.style.borderColor = '#ddd';
                                const b = d.querySelector('.ai-pick-badge'); if (b) b.remove();
                            }
                        });
                        refreshPickedUI();
                        rebuildAssignUI();
                    });
                });
            }

            function rebuildAssignUI() {
                const tpl = $('aiuret-template').value;
                const isHub = tpl === 'premium-hub';
                const subCount = isHub ? parseInt($('aiuret-subcount').value || 0) : 0;
                const slots = [{ key: 'main', label: isHub ? '🏠 Ana hub sayfası' : '📄 Bu sayfa' }];
                for (let i = 0; i < subCount; i++) slots.push({ key: 'sub_' + i, label: '📄 Alt sayfa ' + (i + 1) });

                const manual = $('aiuret-img-manual');
                manual.innerHTML = '';
                if (!picked.length) { manual.innerHTML = '<p style="color:#888;font-size:12px;margin:0;">Önce görsel seçin.</p>'; return; }
                slots.forEach((s, slotIdx) => {
                    const row = document.createElement('div');
                    row.style.cssText = 'display:flex;align-items:center;gap:10px;margin:6px 0;padding:6px 10px;background:#f6f7f9;border:1px solid #e5e7eb;border-radius:4px;';
                    let opts = '<option value="">— Boş (görsel yok) —</option>';
                    picked.forEach((it, idx) => { opts += '<option value="' + idx + '">' + (idx+1) + '. ' + it.title.substring(0, 60) + '</option>'; });
                    row.innerHTML = '<strong style="min-width:170px;font-size:13px;">' + s.label + '</strong>' +
                                    '<select data-slot="' + s.key + '" style="flex:1;">' + opts + '</select>';
                    manual.appendChild(row);
                    const sel = row.querySelector('select');
                    if (slotIdx < picked.length) sel.value = String(slotIdx);
                });
            }

            $('aiuret-img-search').addEventListener('click', async () => {
                const q = $('aiuret-img-q').value.trim() || $('aiuret-prompt').value.trim() || $('aiuret-title').value.trim();
                if (!q) { alert('Arama kelimesi veya konu girin.'); return; }
                const box = $('aiuret-img-results');
                box.innerHTML = '<p style="color:#888;font-size:12px;">🔍 Aranıyor (30 sonuç)...</p>';
                const fd = new FormData();
                fd.append('action', 'ahenk_aiuret_websearch');
                fd.append('_ajax_nonce', NONCE);
                fd.append('q', q);
                try {
                    const r = await fetch(AJAX, { method:'POST', body:fd, credentials:'same-origin' });
                    const j = await r.json();
                    if (!j.success) { box.innerHTML = '<p style="color:#d63638;">Hata: ' + (j.data?.msg || '') + '</p>'; return; }
                    if (!j.data.items || !j.data.items.length) { box.innerHTML = '<p style="color:#888;">Sonuç yok. Başka kelime deneyin.</p>'; return; }
                    box.innerHTML = '';
                    j.data.items.forEach(it => {
                        const div = document.createElement('div');
                        div.dataset.url = it.url;
                        div.style.cssText = 'border:2px solid #ddd;border-radius:6px;overflow:hidden;cursor:pointer;background:#fff;position:relative;';
                        div.innerHTML =
                            '<img src="' + it.thumb + '" style="width:100%;height:100px;object-fit:cover;display:block;">' +
                            '<div style="padding:5px 6px;font-size:11px;color:#444;line-height:1.3;height:42px;overflow:hidden;">' + it.title + '</div>';
                        // Mevcut seçimi geri yükle (yeniden arandığında)
                        const existIdx = picked.findIndex(p => p.url === it.url);
                        if (existIdx >= 0) {
                            div.style.borderColor = '#46b450';
                            const b = document.createElement('span');
                            b.className = 'ai-pick-badge';
                            b.style.cssText = 'position:absolute;top:4px;left:4px;background:#46b450;color:#fff;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;box-shadow:0 1px 3px rgba(0,0,0,.3);';
                            b.textContent = (existIdx + 1);
                            div.appendChild(b);
                        }
                        div.addEventListener('click', () => {
                            const idx = picked.findIndex(p => p.url === it.url);
                            if (idx >= 0) {
                                // toggle off
                                picked.splice(idx, 1);
                                div.style.borderColor = '#ddd';
                                const oldB = div.querySelector('.ai-pick-badge'); if (oldB) oldB.remove();
                                // Tüm badge'leri yeniden numaralandır
                                box.querySelectorAll('.ai-pick-badge').forEach(b => {
                                    const u = b.parentNode.dataset.url;
                                    const ni = picked.findIndex(p => p.url === u);
                                    if (ni >= 0) b.textContent = (ni + 1);
                                });
                            } else {
                                if (picked.length >= 12) { alert('En fazla 12 görsel seçebilirsiniz.'); return; }
                                picked.push({ url: it.url, credit: it.credit, title: it.title, thumb: it.thumb });
                                div.style.borderColor = '#46b450';
                                const b = document.createElement('span');
                                b.className = 'ai-pick-badge';
                                b.style.cssText = 'position:absolute;top:4px;left:4px;background:#46b450;color:#fff;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;box-shadow:0 1px 3px rgba(0,0,0,.3);';
                                b.textContent = picked.length;
                                div.appendChild(b);
                            }
                            refreshPickedUI();
                            rebuildAssignUI();
                        });
                        box.appendChild(div);
                    });
                } catch (e) { box.innerHTML = '<p style="color:#d63638;">Ağ hatası: ' + e.message + '</p>'; }
            });

            $('aiuret-img-clear').addEventListener('click', () => {
                picked.length = 0;
                $('aiuret-img-results').querySelectorAll('[data-url]').forEach(d => {
                    d.style.borderColor = '#ddd';
                    const b = d.querySelector('.ai-pick-badge'); if (b) b.remove();
                });
                refreshPickedUI();
                rebuildAssignUI();
            });

            $('aiuret-img-auto').addEventListener('change', () => {
                $('aiuret-img-manual').style.display = $('aiuret-img-auto').checked ? 'none' : '';
            });

            // Şablon ya da alt sayfa sayısı değişince manuel atama UI'sı yenilensin
            $('aiuret-template').addEventListener('change', rebuildAssignUI);
            $('aiuret-subcount').addEventListener('change', rebuildAssignUI);

            // Picks JSON'ını generate gönderirken topla
            window.collectPicks = function() {
                const auto = $('aiuret-img-auto').checked;
                const out = {
                    urls:    picked.map(p => p.url),
                    credits: picked.map(p => p.credit || ''),
                    auto:    auto,
                    assignments: {},
                };
                if (!auto) {
                    $('aiuret-img-manual').querySelectorAll('select').forEach(sel => {
                        const v = sel.value;
                        if (v !== '') out.assignments[sel.dataset.slot] = parseInt(v);
                    });
                }
                return out;
            };

            function step(msg, pct) {
                $('aiuret-progress').style.display = '';
                $('aiuret-step').textContent = msg;
                $('aiuret-bar').style.width = pct + '%';
            }

            async function fileToB64(file) {
                return new Promise((res, rej) => {
                    const r = new FileReader();
                    r.onload = () => res(String(r.result).split(',')[1]);
                    r.onerror = rej;
                    r.readAsDataURL(file);
                });
            }

            $('aiuret-go').addEventListener('click', async () => {
                const prompt = $('aiuret-prompt').value.trim();
                if (!prompt) { alert('Konu/Yönerge zorunludur.'); return; }

                $('aiuret-result').style.display = 'none';
                $('aiuret-go').disabled = true;
                $('aiuret-bar').style.background = '#2271b1';
                step('AI içerik üretiyor...', 20);

                const fd = new FormData();
                fd.append('action', 'ahenk_aiuret_generate');
                fd.append('_ajax_nonce', NONCE);
                fd.append('type',     typeSel.value);
                fd.append('template', $('aiuret-template').value);
                fd.append('sub_count',$('aiuret-subcount').value);
                fd.append('theme',    $('aiuret-theme').value);
                fd.append('layout',   $('aiuret-layout').value);
                fd.append('prompt',   prompt);
                fd.append('title',    $('aiuret-title').value.trim());
                fd.append('existing', $('aiuret-existing').value);
                fd.append('length',   $('aiuret-length').value);
                fd.append('style',    $('aiuret-style').value);
                fd.append('status',   document.querySelector('input[name=aiuret-status]:checked').value);
                fd.append('cat',      $('aiuret-cat').value || '');
                const imgMode = document.querySelector('input[name=aiuret-img]:checked').value;
                fd.append('img_mode',   imgMode);
                fd.append('img_model',  $('aiuret-img-model').value);
                fd.append('img_prompt', $('aiuret-img-prompt').value);
                if (imgMode === 'upload') {
                    const f = $('aiuret-img-file').files[0];
                    if (!f) { alert('Görsel dosyası seçin.'); $('aiuret-go').disabled = false; return; }
                    step('Görsel yükleniyor...', 35);
                    fd.append('img_b64',  await fileToB64(f));
                    fd.append('img_name', f.name);
                }
                if (imgMode === 'ai') step('AI görsel üretiyor (30-90 sn)...', 50);
                if (imgMode === 'web') {
                    const picks = window.collectPicks();
                    if (!picks.urls.length) { alert('Önce arama yapıp en az bir görsel seçin.'); $('aiuret-go').disabled = false; return; }
                    fd.append('img_picks', JSON.stringify(picks));
                    step('Web görselleri indiriliyor (' + picks.urls.length + ' adet)...', 40);
                }

                try {
                    const r = await fetch(AJAX, { method: 'POST', body: fd, credentials: 'same-origin' });
                    const j = await r.json();
                    $('aiuret-go').disabled = false;
                    if (!j.success) {
                        step('❌ Hata: ' + ((j.data && j.data.msg) || 'bilinmiyor'), 0);
                        $('aiuret-bar').style.background = '#d63638';
                        return;
                    }
                    step('Tamamlandı', 100);
                    $('aiuret-bar').style.background = '#46b450';
                    $('aiuret-result').style.display = '';
                    let txt = '<strong>' + j.data.title + '</strong><br>' +
                        'Tür: <code>' + j.data.type + '</code> · Şablon: <code>' + j.data.template + '</code> · ' +
                        'Durum: <code>' + j.data.status + '</code> · Kelime: ' + j.data.word_count + ' · ' +
                        (j.data.image ? ('Görsel: ✅ ' + j.data.image_source) : 'Görsel: yok') +
                        (j.data.image_error ? '<br><span style="color:#d63638;">Görsel: ' + j.data.image_error + '</span>' : '');
                    if (j.data.subpages && j.data.subpages.length) {
                        txt += '<br><br><strong>📑 Üretilen alt sayfalar (' + j.data.subpages.length + ' adet):</strong><ul style="margin:6px 0 0 18px;">';
                        j.data.subpages.forEach(s => {
                            txt += '<li><a href="' + s.view + '" target="_blank">' + s.title + '</a> &middot; <a href="' + s.edit + '" target="_blank" style="font-size:12px;">düzenle</a></li>';
                        });
                        txt += '</ul>';
                    }
                    $('aiuret-result-text').innerHTML = txt;
                    $('aiuret-result-buttons').innerHTML =
                        '<a href="' + j.data.edit_url + '" class="button button-primary" target="_blank">✏️ Düzenle</a> ' +
                        '<a href="' + j.data.view_url + '" class="button" target="_blank">👁 Görüntüle</a> ' +
                        '<button type="button" class="button" onclick="location.reload()">🔄 Listeyi yenile</button>';
                } catch (e) {
                    $('aiuret-go').disabled = false;
                    step('❌ Ağ hatası: ' + e.message, 0);
                    $('aiuret-bar').style.background = '#d63638';
                }
            });

            // Sil
            document.querySelectorAll('.aiuret-del').forEach(b => {
                b.addEventListener('click', async (e) => {
                    if (!confirm('Bu kayıt silinsin mi? (Çöp kutusuna gider)')) return;
                    const pid = b.dataset.pid;
                    const fd = new FormData();
                    fd.append('action', 'ahenk_aiuret_delete');
                    fd.append('_ajax_nonce', NONCE);
                    fd.append('post_id', pid);
                    const r = await fetch(AJAX, { method: 'POST', body: fd, credentials: 'same-origin' });
                    const j = await r.json();
                    if (j.success) b.closest('tr').remove();
                    else alert('Hata: ' + (j.data?.msg || ''));
                });
            });
        })();
        </script>
        <?php
    }

    private function render_history_table() {
        $q = new WP_Query( array(
            'post_type'      => 'any',
            'post_status'    => array( 'publish', 'draft', 'pending', 'private', 'future' ),
            'posts_per_page' => 50,
            'meta_key'       => self::META,
            'orderby'        => 'date',
            'order'          => 'DESC',
            'no_found_rows'  => true,
        ) );
        if ( ! $q->have_posts() ) {
            echo '<p style="color:#888;">Henüz AI ile üretilmiş içerik yok.</p>';
            return;
        }
        ?>
        <table class="wp-list-table widefat striped">
            <thead><tr>
                <th style="width:140px;">Tarih</th>
                <th>Başlık</th>
                <th style="width:90px;">Tür</th>
                <th style="width:90px;">Şablon</th>
                <th style="width:80px;">Durum</th>
                <th style="width:240px;">İşlemler</th>
            </tr></thead>
            <tbody>
            <?php while ( $q->have_posts() ) : $q->the_post(); $pid = get_the_ID();
                $tpl = get_post_meta( $pid, '_ahb_aiuret_template', true ) ?: 'standart'; ?>
                <tr>
                    <td><?php echo esc_html( get_the_date( 'd.m.Y H:i' ) ); ?></td>
                    <td><strong><?php the_title(); ?></strong></td>
                    <td><code><?php echo esc_html( get_post_type() ); ?></code></td>
                    <td><code style="font-size:11px;"><?php echo esc_html( $tpl ); ?></code></td>
                    <td><?php echo esc_html( get_post_status() ); ?></td>
                    <td>
                        <a href="<?php echo esc_url( get_edit_post_link( $pid ) ); ?>" class="button button-small" target="_blank">✏️ Düzenle</a>
                        <a href="<?php echo esc_url( get_permalink( $pid ) ); ?>" class="button button-small" target="_blank">👁</a>
                        <button class="button button-small aiuret-del" data-pid="<?php echo (int) $pid; ?>" style="color:#d63638;">🗑 Sil</button>
                    </td>
                </tr>
            <?php endwhile; wp_reset_postdata(); ?>
            </tbody>
        </table>
        <?php
    }

    /* ============ AJAX SİL ============ */

    public function ajax_delete() {
        check_ajax_referer( self::NONCE );
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( array( 'msg' => 'yetki yok' ) );
        $pid = (int) ( $_POST['post_id'] ?? 0 );
        if ( ! $pid ) wp_send_json_error( array( 'msg' => 'id yok' ) );
        if ( get_post_meta( $pid, self::META, true ) !== '1' ) wp_send_json_error( array( 'msg' => 'AI üretimi değil' ) );
        wp_trash_post( $pid );
        wp_send_json_success();
    }

    /* ============ AJAX ÜRETİM ============ */

    public function ajax_generate() {
        check_ajax_referer( self::NONCE );
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( array( 'msg' => 'yetki yok' ) );

        $api_key = trim( (string) get_option( 'ahb_openai_api_key', '' ) );
        if ( $api_key === '' ) wp_send_json_error( array( 'msg' => 'OpenAI API anahtarı tanımlı değil' ) );

        $type     = sanitize_key( $_POST['type'] ?? 'page' );
        if ( ! post_type_exists( $type ) ) wp_send_json_error( array( 'msg' => 'Geçersiz post tipi: ' . $type ) );
        $template = sanitize_key( $_POST['template'] ?? 'standart' );
        if ( ! in_array( $template, array( 'standart', 'premium-biyografi', 'premium-tanitim', 'premium-hakkimizda', 'premium-hub' ), true ) ) $template = 'standart';
        $prompt   = trim( wp_unslash( (string) ( $_POST['prompt']   ?? '' ) ) );
        if ( $prompt === '' ) wp_send_json_error( array( 'msg' => 'Konu/Yönerge boş olamaz' ) );
        $title    = trim( wp_unslash( (string) ( $_POST['title']    ?? '' ) ) );
        $existing = trim( wp_unslash( (string) ( $_POST['existing'] ?? '' ) ) );
        $length   = max( 200, min( 5000, (int) ( $_POST['length']   ?? 1000 ) ) );
        $style    = sanitize_key( $_POST['style']  ?? 'profesyonel' );
        $status   = in_array( ( $_POST['status'] ?? 'draft' ), array( 'draft', 'publish' ), true ) ? $_POST['status'] : 'draft';
        $cat_id   = (int) ( $_POST['cat'] ?? 0 );
        $theme    = sanitize_key( $_POST['theme']  ?? 'lacivert-altin' );
        $layout   = ( ( $_POST['layout'] ?? 'standard' ) === 'fullwidth' ) ? 'fullwidth' : 'standard';

        // ===== 1) Metin üretimi (sablona gore) =====
        $hub_subpages_data = array(); // hub modunda doldurulur
        if ( $template === 'standart' ) {
            $generated = $this->generate_text_standard( $api_key, $prompt, $title, $existing, $length, $style );
            if ( ! $generated ) wp_send_json_error( array( 'msg' => 'AI metin üretemedi' ) );
            $final_title   = $generated['title']   ?: ( $title ?: 'AI Üretilen İçerik' );
            $final_content = $generated['content'] ?: '';
            $final_excerpt = $generated['excerpt'] ?: '';
            $final_tags    = $generated['tags']    ?: array();
        } elseif ( $template === 'premium-hub' ) {
            // Hub modunu zorunlu olarak page tipine cevir (parent/child icin sade ve guvenli)
            if ( $type !== 'page' ) $type = 'page';
            $sub_count = max( 2, min( 8, (int) ( $_POST['sub_count'] ?? 4 ) ) );
            $plan = $this->generate_hub_plan( $api_key, $prompt, $title, $existing, $length, $style, $sub_count );
            if ( ! $plan ) wp_send_json_error( array( 'msg' => 'AI hub planı üretemedi' ) );
            $final_title   = $plan['title']   ?: ( $title ?: 'AI Hub' );
            $final_excerpt = $plan['excerpt'] ?: '';
            $final_tags    = $plan['tags']    ?: array();
            // generated icerik render_hub_html ile sonra olusacak (alt sayfalar kaydedildikten sonra)
            $generated     = $plan;
            $final_content = '<!-- hub-placeholder -->';
        } else {
            $generated = $this->generate_text_premium( $api_key, $prompt, $title, $existing, $length, $style, $template );
            if ( ! $generated ) wp_send_json_error( array( 'msg' => 'AI premium şablon üretemedi' ) );
            $final_title   = $generated['title']   ?: ( $title ?: 'AI Üretilen Sayfa' );
            $final_content = $this->render_premium_html( $template, $generated, $theme, $layout );
            $final_excerpt = $generated['excerpt'] ?: '';
            $final_tags    = $generated['tags']    ?: array();
        }

        // ===== 2) Post olustur =====
        $post_id = wp_insert_post( array(
            'post_type'    => $type,
            'post_status'  => $status,
            'post_title'   => $final_title,
            'post_content' => $final_content,
            'post_excerpt' => $final_excerpt,
            'meta_input'   => array(
                self::META                 => '1',
                '_ahb_aiuret_prompt'       => $prompt,
                '_ahb_aiuret_template'     => $template,
                '_ahb_aiuret_theme'        => $theme,
                '_ahb_aiuret_layout'       => $layout,
                '_ahb_aiuret_at'           => current_time( 'mysql' ),
                '_wp_page_template'        => ( $layout === 'fullwidth' && $type === 'page' ) ? 'ahenk-tamsayfa' : 'default',
            ),
        ), true );
        if ( is_wp_error( $post_id ) ) wp_send_json_error( array( 'msg' => 'Post oluşturulamadı: ' . $post_id->get_error_message() ) );

        // ===== 1b) Hub modu: alt sayfalari uret + ana sayfayi update et =====
        if ( $template === 'premium-hub' ) {
            $subs = isset( $generated['subpages'] ) && is_array( $generated['subpages'] ) ? $generated['subpages'] : array();
            $resolved = array();
            foreach ( $subs as $idx => $sub ) {
                $sub_title  = isset( $sub['title'] )  ? wp_strip_all_tags( $sub['title'] )  : ( 'Alt Sayfa ' . ( $idx + 1 ) );
                $sub_slug   = isset( $sub['slug'] )   ? sanitize_title( $sub['slug'] )      : sanitize_title( $sub_title );
                $sub_summary= isset( $sub['summary'] )? wp_strip_all_tags( $sub['summary'] ): '';
                $sub_icon   = isset( $sub['icon'] )   ? mb_substr( (string) $sub['icon'], 0, 4 ) : '★';
                $sub_prompt_extra = isset( $sub['subprompt'] ) ? wp_strip_all_tags( $sub['subprompt'] ) : $sub_summary;

                // Sub-prompt: ana konuyu da bagla
                $sub_prompt = "Ana konu: " . $prompt . "\n" .
                              "Bu sayfa: " . $sub_title . "\n" .
                              "Yönerge: " . $sub_prompt_extra . "\n" .
                              "Bu sayfanın bağlamı, yukarıdaki ana konunun bir parçasıdır.";

                // Alt sayfa icin premium-biyografi sablonu kullan
                $sub_data = $this->generate_text_premium( $api_key, $sub_prompt, $sub_title, '', $length, $style, 'premium-biyografi' );
                if ( ! $sub_data ) {
                    error_log( '[AHB-AIURET-HUB] subpage failed: ' . $sub_title );
                    continue;
                }
                $sub_html = $this->render_premium_html( 'premium-biyografi', $sub_data, $theme, $layout );

                $sub_id = wp_insert_post( array(
                    'post_type'    => 'page',
                    'post_status'  => $status,
                    'post_parent'  => $post_id,
                    'post_title'   => $sub_data['title'] ?: $sub_title,
                    'post_name'    => $sub_slug,
                    'post_content' => $sub_html,
                    'post_excerpt' => $sub_data['excerpt'] ?? '',
                    'meta_input'   => array(
                        self::META             => '1',
                        '_ahb_aiuret_template' => 'premium-hub-child',
                        '_ahb_aiuret_parent'   => $post_id,
                        '_ahb_aiuret_theme'    => $theme,
                        '_ahb_aiuret_layout'   => $layout,
                        '_wp_page_template'    => ( $layout === 'fullwidth' ) ? 'ahenk-tamsayfa' : 'default',
                        '_ahb_aiuret_at'       => current_time( 'mysql' ),
                    ),
                ), true );
                if ( is_wp_error( $sub_id ) ) { error_log( '[AHB-AIURET-HUB] insert err: ' . $sub_id->get_error_message() ); continue; }

                $resolved[] = array(
                    'id'      => $sub_id,
                    'title'   => $sub_data['title'] ?: $sub_title,
                    'summary' => $sub_summary,
                    'icon'    => $sub_icon,
                    'view'    => get_permalink( $sub_id ),
                    'edit'    => get_edit_post_link( $sub_id, '' ),
                );
            }
            // Hub HTML'i alt sayfa URL'leriyle render et
            $generated['subpages_resolved'] = $resolved;
            $hub_html = $this->render_hub_html( $generated, $theme, $layout );
            wp_update_post( array( 'ID' => $post_id, 'post_content' => $hub_html ) );
            $final_content = $hub_html;
            $hub_subpages_data = $resolved;
        }

        if ( $cat_id && in_array( $type, array( 'post', 'haber' ), true ) ) {
            if ( $type === 'post' ) wp_set_post_categories( $post_id, array( $cat_id ) );
            else wp_set_object_terms( $post_id, array( $cat_id ), 'haber-kategorisi', false );
        }
        if ( ! empty( $final_tags ) && in_array( $type, array( 'post', 'haber' ), true ) ) {
            wp_set_post_tags( $post_id, $final_tags );
        }

        // ===== 3) Gorsel =====
        $img_mode      = sanitize_key( $_POST['img_mode']  ?? 'none' );
        $img_model     = sanitize_key( $_POST['img_model'] ?? 'gpt-image-1' );
        if ( ! in_array( $img_model, array( 'gpt-image-1', 'dall-e-3' ), true ) ) $img_model = 'gpt-image-1';
        $image_attached = false;
        $image_source   = '';
        $image_error    = '';

        if ( $img_mode === 'upload' ) {
            $b64  = (string) ( $_POST['img_b64']  ?? '' );
            $name = sanitize_file_name( (string) ( $_POST['img_name'] ?? 'aiuret.jpg' ) );
            if ( $b64 ) {
                $att_id = $this->save_image_from_base64( $b64, $name, $post_id );
                if ( $att_id ) { set_post_thumbnail( $post_id, $att_id ); $this->attach_hero_image_to_content( $post_id, $att_id ); $image_attached = true; $image_source = 'yüklendi'; }
                else $image_error = 'yüklenen dosya kaydedilemedi';
            }
        } elseif ( $img_mode === 'web' ) {
            $picks_raw = (string) ( $_POST['img_picks'] ?? '' );
            $picks = json_decode( wp_unslash( $picks_raw ), true );
            $urls   = ( is_array( $picks ) && isset( $picks['urls'] )    && is_array( $picks['urls'] ) )    ? array_map( 'esc_url_raw', $picks['urls'] )                  : array();
            $creds  = ( is_array( $picks ) && isset( $picks['credits'] ) && is_array( $picks['credits'] ) ) ? array_map( 'sanitize_text_field', $picks['credits'] )       : array();
            $auto   = ! empty( $picks['auto'] );
            $assign = ( is_array( $picks ) && isset( $picks['assignments'] ) && is_array( $picks['assignments'] ) ) ? $picks['assignments'] : array();

            // Geri uyumluluk: eski tek img_url alanı
            if ( ! $urls && ! empty( $_POST['img_url'] ) ) {
                $urls[]  = esc_url_raw( (string) $_POST['img_url'] );
                $creds[] = sanitize_text_field( (string) ( $_POST['img_credit'] ?? '' ) );
            }

            // Otomatik mod ya da assignment boşsa: 0→main, 1→sub_0, 2→sub_1...
            if ( ( $auto || ! $assign ) && $urls ) {
                $assign = array();
                if ( isset( $urls[0] ) ) $assign['main'] = 0;
                $sub_total = count( $hub_subpages_data );
                for ( $i = 0; $i < $sub_total; $i++ ) {
                    $idx = $i + 1;
                    if ( isset( $urls[ $idx ] ) ) $assign[ 'sub_' . $i ] = $idx;
                }
            }

            // Ana posta görsel ata
            if ( isset( $assign['main'] ) && isset( $urls[ (int) $assign['main'] ] ) ) {
                $u  = $urls[ (int) $assign['main'] ];
                $cr = isset( $creds[ (int) $assign['main'] ] ) ? $creds[ (int) $assign['main'] ] : '';
                $aid = $this->save_image_from_url( $u, $post_id, $cr );
                if ( $aid ) {
                    set_post_thumbnail( $post_id, $aid );
                    $this->attach_hero_image_to_content( $post_id, $aid );
                    $image_attached = true;
                    $image_source   = 'web · ' . count( $urls ) . ' seçim · ana: ' . ( $cr ?: 'kaynak' );
                } else {
                    $image_error = 'ana görsel indirilemedi';
                }
            }

            // Hub alt sayfalarına görsel ata
            $sub_assigned = 0;
            foreach ( $hub_subpages_data as $i => $sub ) {
                $key = 'sub_' . $i;
                if ( ! isset( $assign[ $key ] ) ) continue;
                $aidx = (int) $assign[ $key ];
                if ( ! isset( $urls[ $aidx ] ) ) continue;
                $u  = $urls[ $aidx ];
                $cr = isset( $creds[ $aidx ] ) ? $creds[ $aidx ] : '';
                $aid2 = $this->save_image_from_url( $u, (int) $sub['id'], $cr );
                if ( $aid2 ) { set_post_thumbnail( (int) $sub['id'], $aid2 ); $this->attach_hero_image_to_content( (int) $sub['id'], $aid2 ); $sub_assigned++; }
            }
            if ( $sub_assigned ) $image_source .= ' · ' . $sub_assigned . ' alt sayfaya da atandı';
            if ( ! $urls && ! $image_error ) $image_error = 'görsel seçilmemiş';
        } elseif ( $img_mode === 'ai' ) {
            $img_prompt = trim( wp_unslash( (string) ( $_POST['img_prompt'] ?? '' ) ) );
            if ( $img_prompt === '' ) $img_prompt = 'Yüksek kaliteli, profesyonel, konuya uygun görsel: ' . $final_title;
            $b64 = $this->generate_image_v2( $api_key, $img_model, $img_prompt );
            if ( is_string( $b64 ) && $b64 !== '' ) {
                $att_id = $this->save_image_from_base64( $b64, sanitize_title( $final_title ) . '.png', $post_id );
                if ( $att_id ) { set_post_thumbnail( $post_id, $att_id ); $this->attach_hero_image_to_content( $post_id, $att_id ); $image_attached = true; $image_source = $img_model; }
                else $image_error = 'AI görsel kaydedilemedi';
            } else {
                $image_error = is_string( $b64 ) ? 'API yanıt vermedi' : (string) $b64;
                $image_error = $image_error ?: ( $img_model . ' yanıt vermedi (key/kota olabilir)' );
            }
        }

        wp_send_json_success( array(
            'post_id'       => $post_id,
            'type'          => $type,
            'template'      => $template,
            'status'        => $status,
            'title'         => $final_title,
            'word_count'    => str_word_count( wp_strip_all_tags( $final_content ) ),
            'image'         => $image_attached,
            'image_source'  => $image_source,
            'image_error'   => $image_error,
            'edit_url'      => get_edit_post_link( $post_id, '' ),
            'view_url'      => get_permalink( $post_id ),
            'subpages'      => $hub_subpages_data,
        ) );
    }

    /* ============ HUB PLAN UR ============ */

    private function generate_hub_plan( $api_key, $prompt, $title, $existing, $length, $style, $sub_count ) {
        $schema = '{"title":string, "excerpt":string, "tags":[string], '
                . '"hero":{"eyebrow":string, "title":string, "subtitle":string, "intro":string(2-3 cümle), "quote":{"text":string,"by":string}, "buttons":[{"label":string,"anchor":string}]}, '
                . '"stats":[{"value":string,"label":string}](4-5 adet), '
                . '"intro_html":string(html, 1-2 paragraf, ana sayfanın hero altı tanıtımı), '
                . '"subpages":[{"slug":string(latin-tireli, kısa), "title":string, "summary":string(2-3 cümle, kart için), "icon":string(tek emoji), "subprompt":string(alt sayfa için detaylı prompt — neyi içermeli)}](' . $sub_count . ' adet), '
                . '"cta":{"title":string, "text":string, "label":string, "anchor":string}}';

        $sys = "Sen Türkçe ULTRA PREMIUM hub sayfa planlayıcısısın. Bir konuyu N alt sayfaya böler ve her birinin neyi içermesi gerektiğini tarif edersin. " .
               "ÇIKTI MUTLAKA GEÇERLİ JSON OLMALIDIR. Schema (TR): " . $schema . " " .
               "Önemli: subpages içindeki her bölüm birbirinden FARKLI bir AÇI/BAŞLIK olsun (örn. biyografi → 'Hayatı', 'Askeri Kariyer', 'Devrimleri', 'Mirası', 'Kronoloji', 'İlkeleri'). " .
               "subprompt alanı, o alt sayfanın AYRI bir AI çağrısında kullanılacak — orada neyin yazılması gerektiğini detaylı tarif et. " .
               "slug alanı kısa, latin, tireli olsun (örn. 'kronoloji', 'ilkeleri', 'askeri-kariyer').";
        $user = "ANA KONU: $prompt\n" . ( $title ? "ANA BAŞLIK: $title\n" : '' ) .
                ( $existing ? "MEVCUT METİN (temel al):\n" . mb_substr( $existing, 0, 6000 ) . "\n" : '' ) .
                "ALT SAYFA SAYISI: $sub_count\nÜSLUP: $style\nSadece JSON döndür.";

        $j = $this->openai_chat_json( $api_key, $sys, $user );
        if ( ! $j ) return false;
        $j['title']   = isset( $j['title'] )   ? wp_strip_all_tags( $j['title'] )   : '';
        $j['excerpt'] = isset( $j['excerpt'] ) ? wp_strip_all_tags( $j['excerpt'] ) : '';
        $j['tags']    = isset( $j['tags'] ) && is_array( $j['tags'] ) ? array_map( 'sanitize_text_field', $j['tags'] ) : array();
        return $j;
    }

    /* ============ TEMA PALETI + CSS BUILDER ============ */

    private function get_palette( $theme ) {
        $p = array(
            'lacivert-altin'   => array( 'p' => '#1a1f2e', 'p2' => '#2d3748', 'a' => '#d4af37', 'ad' => '#1a1f2e', 'c' => '#c41e3a', 'c2' => '#8b0000' ),
            'bordo-krem'       => array( 'p' => '#5d1a2e', 'p2' => '#7a1f2e', 'a' => '#e8d4a2', 'ad' => '#3a1a1a', 'c' => '#a52a2a', 'c2' => '#5d1a2e' ),
            'yesil-altin'      => array( 'p' => '#1a3d2e', 'p2' => '#2d5a3e', 'a' => '#d4af37', 'ad' => '#1a3d2e', 'c' => '#c41e3a', 'c2' => '#8b0000' ),
            'mor-pembe'        => array( 'p' => '#3d1f4d', 'p2' => '#5a2d6b', 'a' => '#ff6b9d', 'ad' => '#3d1f4d', 'c' => '#7a1f7a', 'c2' => '#3d1f4d' ),
            'mavi-turuncu'     => array( 'p' => '#1a3d6b', 'p2' => '#2d5a8b', 'a' => '#ff8c42', 'ad' => '#1a1f2e', 'c' => '#1a3d6b', 'c2' => '#0f2547' ),
            'siyah-beyaz'      => array( 'p' => '#000000', 'p2' => '#1f1f1f', 'a' => '#888888', 'ad' => '#ffffff', 'c' => '#000000', 'c2' => '#1f1f1f' ),
            'kurumsal-kirmizi' => array( 'p' => '#1a1a1a', 'p2' => '#2d2d2d', 'a' => '#dc143c', 'ad' => '#ffffff', 'c' => '#dc143c', 'c2' => '#8b0000' ),
        );
        return isset( $p[ $theme ] ) ? $p[ $theme ] : $p['lacivert-altin'];
    }

    private function build_css( $theme, $layout ) {
        $pal = $this->get_palette( $theme );
        $vars = sprintf(
            '--ahnp-p:%s;--ahnp-p2:%s;--ahnp-a:%s;--ahnp-ad:%s;--ahnp-c:%s;--ahnp-c2:%s;',
            $pal['p'], $pal['p2'], $pal['a'], $pal['ad'], $pal['c'], $pal['c2']
        );
        $fw = '';
        if ( $layout === 'fullwidth' ) {
            $fw = '
.ahnp.ahnp-fw{width:100vw;max-width:100vw;margin-left:calc(50% - 50vw);margin-right:calc(50% - 50vw);padding:0;}
.ahnp.ahnp-fw > section, .ahnp.ahnp-fw > h2, .ahnp.ahnp-fw > p{padding-left:max(20px,calc((100vw - 1280px)/2));padding-right:max(20px,calc((100vw - 1280px)/2));border-radius:0;margin-left:0;margin-right:0;}
.ahnp.ahnp-fw > section.ahnp-hero{padding-top:90px;padding-bottom:90px;border-radius:0;margin:0 0 30px;}
.ahnp.ahnp-fw > section.ahnp-cta{padding-top:64px;padding-bottom:64px;border-radius:0;margin:30px 0 0;}
.ahnp.ahnp-fw > section.ahnp-stats, .ahnp.ahnp-fw > section.ahnp-features, .ahnp.ahnp-fw > section.ahnp-mv, .ahnp.ahnp-fw > section.ahnp-hub-grid{padding-top:30px;padding-bottom:0;}
';
        }
        return '<style>
.ahnp{' . $vars . 'font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#1a1a1a;line-height:1.6;}
.ahnp *{box-sizing:border-box;}
.ahnp-hero{padding:60px 30px;background:linear-gradient(135deg,var(--ahnp-p) 0%,var(--ahnp-p2) 100%);color:#fff;border-radius:14px;margin:0 0 30px;position:relative;overflow:hidden;}
.ahnp-hero-grid{display:grid;grid-template-columns:1.4fr 1fr;gap:40px;align-items:center;}
@media(max-width:780px){.ahnp-hero-grid{grid-template-columns:1fr;}}
.ahnp-eyebrow{display:inline-block;background:rgba(255,255,255,.12);color:var(--ahnp-a);font-size:12px;letter-spacing:2px;padding:6px 14px;border-radius:20px;margin-bottom:18px;font-weight:700;}
.ahnp-hero h1{font-size:48px;line-height:1.1;margin:0 0 6px;font-weight:800;color:#fff;}
.ahnp-hero h2{font-size:36px;color:var(--ahnp-a);font-style:italic;margin:0 0 22px;font-weight:600;}
.ahnp-intro{font-size:16px;color:#cbd5e0;margin:0 0 24px;}
.ahnp-quote{border-left:3px solid var(--ahnp-a);padding:14px 20px;background:rgba(255,255,255,.04);border-radius:6px;margin:0 0 24px;font-style:italic;color:#e2e8f0;}
.ahnp-quote cite{display:block;margin-top:8px;font-style:normal;color:var(--ahnp-a);font-size:13px;font-weight:600;}
.ahnp-btns{display:flex;gap:10px;flex-wrap:wrap;}
.ahnp-btn{background:var(--ahnp-a);color:var(--ahnp-ad) !important;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;transition:opacity .2s;}
.ahnp-btn:hover{opacity:.85;}
.ahnp-btn-ghost{background:transparent;color:#fff !important;border:1px solid rgba(255,255,255,.25);}
.ahnp-hero-side{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;overflow:hidden;padding:0;min-height:280px;display:flex;align-items:center;justify-content:center;color:#a0aec0;font-size:13px;letter-spacing:2px;position:relative;}
.ahnp-hero-side img{width:100%;height:100%;min-height:280px;object-fit:cover;display:block;border-radius:12px;}
.ahnp-hero-side .ahnp-hero-side-ph{padding:30px;text-align:center;}
.ahnp-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:18px;margin:0 0 36px;}
.ahnp-stat{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:24px 14px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.04);}
.ahnp-stat-val{font-size:36px;font-weight:800;color:var(--ahnp-c);line-height:1;margin-bottom:8px;}
.ahnp-stat-lbl{font-size:11px;letter-spacing:1.5px;color:#64748b;font-weight:600;text-transform:uppercase;}
.ahnp-section{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:30px;margin:0 0 18px;}
.ahnp-section h3{font-size:24px;color:var(--ahnp-p);margin:0 0 14px;border-bottom:2px solid var(--ahnp-a);padding-bottom:10px;display:inline-block;}
.ahnp-section p{margin:0 0 12px;color:#374151;}
.ahnp-features{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px;margin:0 0 30px;}
.ahnp-feature{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:24px;text-align:left;}
.ahnp-feature-icon{font-size:32px;margin-bottom:12px;}
.ahnp-feature h4{margin:0 0 8px;color:var(--ahnp-p);font-size:18px;}
.ahnp-feature p{margin:0;color:#64748b;font-size:14px;}
.ahnp-mv{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:0 0 30px;}
@media(max-width:780px){.ahnp-mv{grid-template-columns:1fr;}}
.ahnp-mv-card{background:linear-gradient(135deg,#fff 0%,#f8fafc 100%);border:1px solid #e5e7eb;border-left:4px solid var(--ahnp-a);border-radius:10px;padding:30px;}
.ahnp-mv-card h4{margin:0 0 12px;color:var(--ahnp-p);font-size:22px;}
.ahnp-intro-block{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:24px 30px;margin:0 0 30px;color:#374151;font-size:15px;}
.ahnp-hub-title{text-align:center;margin:30px 0 6px;color:var(--ahnp-p);font-size:28px;font-weight:800;}
.ahnp-hub-sub{text-align:center;color:#64748b;margin:0 0 26px;font-size:15px;}
.ahnp-hub-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px;margin:0 0 30px;}
.ahnp-hub-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:30px 24px;text-decoration:none !important;color:inherit;transition:transform .2s,box-shadow .2s;display:flex;flex-direction:column;border-top:3px solid var(--ahnp-a);}
.ahnp-hub-card:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,.08);text-decoration:none !important;}
.ahnp-hub-icon{font-size:40px;margin-bottom:14px;line-height:1;}
.ahnp-hub-card h3{margin:0 0 10px;color:var(--ahnp-p);font-size:20px;border:0;padding:0;font-weight:700;}
.ahnp-hub-card p{margin:0 0 16px;color:#64748b;font-size:14px;flex:1;}
.ahnp-hub-card .ahnp-go{align-self:flex-start;color:var(--ahnp-c);font-weight:600;font-size:14px;}
.ahnp-cta{background:linear-gradient(135deg,var(--ahnp-c) 0%,var(--ahnp-c2) 100%);color:#fff;border-radius:14px;padding:48px 30px;text-align:center;margin:30px 0 0;}
.ahnp-cta h3{color:#fff;margin:0 0 12px;font-size:28px;border:0;}
.ahnp-cta p{color:rgba(255,255,255,.92);margin:0 0 22px;font-size:16px;}
.ahnp-cta .ahnp-btn{background:#fff;color:var(--ahnp-c) !important;}
' . $fw . '</style>' . ( $layout === 'fullwidth' ? '
<script>
(function(){
  function bust(){
    var el = document.querySelector(".ahnp.ahnp-fw");
    if(!el) return;
    var p = el.parentElement;
    while (p && p.tagName !== "BODY" && p.tagName !== "HTML") {
      try {
        p.style.maxWidth   = "none";
        p.style.width      = "100%";
        p.style.paddingLeft  = "0";
        p.style.paddingRight = "0";
        p.style.marginLeft   = "0";
        p.style.marginRight  = "0";
      } catch(e){}
      p = p.parentElement;
    }
    document.documentElement.style.setProperty("overflow-x","hidden","important");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bust);
  else bust();
})();
</script>' : '' );
    }

    /* ============ HUB HTML RENDER ============ */

    private function render_hub_html( $d, $theme = 'lacivert-altin', $layout = 'standard' ) {
        $css = $this->build_css( $theme, $layout );
        $cls = 'ahnp' . ( $layout === 'fullwidth' ? ' ahnp-fw' : '' );
        $out = $css . '<div class="' . $cls . '">';

        // Hero
        if ( ! empty( $d['hero'] ) ) {
            $h = $d['hero'];
            $out .= '<section class="ahnp-hero"><div class="ahnp-hero-grid"><div>';
            if ( ! empty( $h['eyebrow'] ) )  $out .= '<span class="ahnp-eyebrow">★ ' . esc_html( $h['eyebrow'] ) . '</span>';
            if ( ! empty( $h['title'] ) )    $out .= '<h1>' . esc_html( $h['title'] ) . '</h1>';
            if ( ! empty( $h['subtitle'] ) ) $out .= '<h2>' . esc_html( $h['subtitle'] ) . '</h2>';
            if ( ! empty( $h['intro'] ) )    $out .= '<p class="ahnp-intro">' . esc_html( $h['intro'] ) . '</p>';
            if ( ! empty( $h['quote']['text'] ) ) {
                $out .= '<div class="ahnp-quote">"' . esc_html( $h['quote']['text'] ) . '"';
                if ( ! empty( $h['quote']['by'] ) ) $out .= '<cite>— ' . esc_html( $h['quote']['by'] ) . '</cite>';
                $out .= '</div>';
            }
            // Hero butonlari: ilk N adet ile alt sayfalara link verelim (hero->buttons subpages_resolved'a yonlendirelim)
            if ( ! empty( $d['subpages_resolved'] ) ) {
                $out .= '<div class="ahnp-btns">';
                $i = 0;
                foreach ( $d['subpages_resolved'] as $sub ) {
                    if ( $i >= 4 ) break;
                    $cls = $i === 0 ? 'ahnp-btn' : 'ahnp-btn ahnp-btn-ghost';
                    $out .= '<a href="' . esc_url( $sub['view'] ) . '" class="' . $cls . '">' . esc_html( $sub['icon'] ) . ' ' . esc_html( $sub['title'] ) . '</a>';
                    $i++;
                }
                $out .= '</div>';
            }
            $ph = '<span class="ahnp-hero-side-ph">' . esc_html( strtoupper( wp_trim_words( $h['title'] ?? '', 4, '' ) ) ) . '</span>';
            $out .= '</div><div class="ahnp-hero-side"><!--AHENK_HERO_IMG-->' . $ph . '<!--/AHENK_HERO_IMG--></div></div></section>';
        }

        // Intro paragraph
        if ( ! empty( $d['intro_html'] ) ) {
            $out .= '<section class="ahnp-intro-block">' . wp_kses_post( $d['intro_html'] ) . '</section>';
        }

        // Stats
        if ( ! empty( $d['stats'] ) && is_array( $d['stats'] ) ) {
            $out .= '<section class="ahnp-stats">';
            foreach ( $d['stats'] as $s ) {
                $out .= '<div class="ahnp-stat"><div class="ahnp-stat-val">' . esc_html( $s['value'] ?? '' ) . '</div><div class="ahnp-stat-lbl">' . esc_html( $s['label'] ?? '' ) . '</div></div>';
            }
            $out .= '</section>';
        }

        // Hub-grid: alt sayfalar
        if ( ! empty( $d['subpages_resolved'] ) ) {
            $out .= '<h2 class="ahnp-hub-title">📚 Konuyu Keşfedin</h2>';
            $out .= '<p class="ahnp-hub-sub">Aşağıdaki bölümlerden birini seçerek devam edin</p>';
            $out .= '<section class="ahnp-hub-grid">';
            foreach ( $d['subpages_resolved'] as $sub ) {
                $out .= '<a class="ahnp-hub-card" href="' . esc_url( $sub['view'] ) . '">';
                $out .= '<div class="ahnp-hub-icon">' . esc_html( $sub['icon'] ?? '★' ) . '</div>';
                $out .= '<h3>' . esc_html( $sub['title'] ) . '</h3>';
                if ( ! empty( $sub['summary'] ) ) $out .= '<p>' . esc_html( $sub['summary'] ) . '</p>';
                $out .= '<span class="ahnp-go">Sayfaya Git →</span>';
                $out .= '</a>';
            }
            $out .= '</section>';
        }

        // CTA
        if ( ! empty( $d['cta'] ) ) {
            $c = $d['cta'];
            // CTA butonu: ilk subpage'e veya anchor'a yonlendir
            $href = '#';
            if ( ! empty( $d['subpages_resolved'][0]['view'] ) ) $href = $d['subpages_resolved'][0]['view'];
            elseif ( ! empty( $c['anchor'] ) ) $href = '#' . sanitize_title( ltrim( (string) $c['anchor'], '#' ) );
            $out .= '<section class="ahnp-cta">';
            if ( ! empty( $c['title'] ) ) $out .= '<h3>' . esc_html( $c['title'] ) . '</h3>';
            if ( ! empty( $c['text'] ) )  $out .= '<p>' . esc_html( $c['text'] ) . '</p>';
            if ( ! empty( $c['label'] ) ) $out .= '<a href="' . esc_url( $href ) . '" class="ahnp-btn">' . esc_html( $c['label'] ) . ' →</a>';
            $out .= '</section>';
        }

        $out .= '</div>';
        return $out;
    }

    /* ============ STANDART METIN ============ */

    private function generate_text_standard( $api_key, $prompt, $title, $existing, $length, $style ) {
        $sys = "Sen Türkçe içerik üreten bir editörsün. ÇIKTI HER ZAMAN GEÇERLİ JSON OLMALIDIR. Emoji KULLANMA. " .
               "HTML kullanabilirsin (h2, h3, p, ul, ol, li, blockquote, strong, em, br, a). " .
               "Schema: {\"title\":string,\"content\":string(html),\"excerpt\":string,\"tags\":[string]}";
        $user = "KONU: $prompt\n" . ( $title ? "BAŞLIK: $title\n" : '' ) .
                ( $existing ? "MEVCUT METİN (temel al):\n" . mb_substr( $existing, 0, 8000 ) . "\n" : '' ) .
                "HEDEF KELİME: ~$length\nÜSLUP: $style\nSadece JSON döndür.";
        $j = $this->openai_chat_json( $api_key, $sys, $user );
        if ( ! $j ) return false;
        return array(
            'title'   => isset( $j['title'] )   ? wp_strip_all_tags( $j['title'] )   : '',
            'content' => isset( $j['content'] ) ? wp_kses_post( $j['content'] )      : '',
            'excerpt' => isset( $j['excerpt'] ) ? wp_strip_all_tags( $j['excerpt'] ) : '',
            'tags'    => isset( $j['tags'] ) && is_array( $j['tags'] ) ? array_map( 'sanitize_text_field', $j['tags'] ) : array(),
        );
    }

    /* ============ PREMIUM METIN (yapilandirilmis JSON) ============ */

    private function generate_text_premium( $api_key, $prompt, $title, $existing, $length, $style, $template ) {
        $schemas = array(
            'premium-biyografi' => '{"title":string, "excerpt":string, "tags":[string], "hero":{"eyebrow":string(kategori adı, kısa CAPS), "title":string, "subtitle":string, "intro":string(2-3 cümle), "quote":{"text":string, "by":string}, "buttons":[{"label":string, "anchor":string}]}, "stats":[{"value":string, "label":string}](4-5 adet, kısa: yıl, sayı vb.), "sections":[{"id":string(slug), "heading":string, "body":string(html, p/ul/blockquote)}](4-6 adet)}',
            'premium-tanitim'   => '{"title":string, "excerpt":string, "tags":[string], "hero":{"eyebrow":string, "title":string, "subtitle":string, "intro":string, "buttons":[{"label":string, "anchor":string}]}, "features":[{"icon":string(emoji veya tek karakter), "title":string, "text":string}](4-6 adet), "sections":[{"id":string, "heading":string, "body":string(html)}](2-4 adet), "cta":{"title":string, "text":string, "label":string, "anchor":string}}',
            'premium-hakkimizda'=> '{"title":string, "excerpt":string, "tags":[string], "hero":{"eyebrow":string, "title":string, "subtitle":string, "intro":string}, "mission":{"title":string, "text":string}, "vision":{"title":string, "text":string}, "values":[{"icon":string, "title":string, "text":string}](3-5 adet), "sections":[{"id":string, "heading":string, "body":string(html)}](1-3 adet), "cta":{"title":string, "text":string, "label":string, "anchor":string}}',
        );
        $schema = $schemas[ $template ];

        $sys = "Sen Türkçe premium kurumsal sayfa içeriği üreten bir editörsün. ÇIKTI MUTLAKA GEÇERLİ JSON OLMALIDIR. " .
               "Emoji sadece izin verilen alanlarda (icon vb.). HTML sadece body alanlarında (h3, p, ul, ol, li, blockquote, strong, em, a, br). " .
               "Hero/section/feature başlıkları kısa ve etkileyici olsun. Stats kısa olsun (yıl, oran, sayı). " .
               "JSON Schema (TR): $schema";
        $user = "KONU: $prompt\n" . ( $title ? "BAŞLIK: $title\n" : '' ) .
                ( $existing ? "MEVCUT METİN (temel al, geliştir):\n" . mb_substr( $existing, 0, 8000 ) . "\n" : '' ) .
                "TOPLAM HEDEF KELİME: ~$length (bölümlere dağıt)\nÜSLUP: $style\nSadece JSON döndür, başka metin yok.";

        $j = $this->openai_chat_json( $api_key, $sys, $user );
        if ( ! $j ) return false;
        // Sanitize yapısal alanlar
        $j['title']   = isset( $j['title'] )   ? wp_strip_all_tags( $j['title'] )   : '';
        $j['excerpt'] = isset( $j['excerpt'] ) ? wp_strip_all_tags( $j['excerpt'] ) : '';
        $j['tags']    = isset( $j['tags'] ) && is_array( $j['tags'] ) ? array_map( 'sanitize_text_field', $j['tags'] ) : array();
        return $j;
    }

    /* ============ PREMIUM HTML RENDER ============ */

    private function render_premium_html( $template, $d, $theme = 'lacivert-altin', $layout = 'standard' ) {
        $css = $this->build_css( $theme, $layout );
        $cls = 'ahnp' . ( $layout === 'fullwidth' ? ' ahnp-fw' : '' );
        $out = $css . '<div class="' . $cls . '">';
        // Hero
        if ( ! empty( $d['hero'] ) ) {
            $h = $d['hero'];
            $out .= '<section class="ahnp-hero"><div class="ahnp-hero-grid"><div>';
            if ( ! empty( $h['eyebrow'] ) )  $out .= '<span class="ahnp-eyebrow">★ ' . esc_html( $h['eyebrow'] ) . '</span>';
            if ( ! empty( $h['title'] ) )    $out .= '<h1>' . esc_html( $h['title'] ) . '</h1>';
            if ( ! empty( $h['subtitle'] ) ) $out .= '<h2>' . esc_html( $h['subtitle'] ) . '</h2>';
            if ( ! empty( $h['intro'] ) )    $out .= '<p class="ahnp-intro">' . esc_html( $h['intro'] ) . '</p>';
            if ( ! empty( $h['quote']['text'] ) ) {
                $out .= '<div class="ahnp-quote">"' . esc_html( $h['quote']['text'] ) . '"';
                if ( ! empty( $h['quote']['by'] ) ) $out .= '<cite>— ' . esc_html( $h['quote']['by'] ) . '</cite>';
                $out .= '</div>';
            }
            if ( ! empty( $h['buttons'] ) && is_array( $h['buttons'] ) ) {
                $out .= '<div class="ahnp-btns">';
                foreach ( $h['buttons'] as $i => $b ) {
                    $cls = $i === 0 ? 'ahnp-btn' : 'ahnp-btn ahnp-btn-ghost';
                    $href = isset( $b['anchor'] ) ? '#' . sanitize_title( ltrim( (string) $b['anchor'], '#' ) ) : '#';
                    $out .= '<a href="' . esc_attr( $href ) . '" class="' . $cls . '">' . esc_html( $b['label'] ?? '' ) . '</a>';
                }
                $out .= '</div>';
            }
            $ph = '<span class="ahnp-hero-side-ph">' . esc_html( strtoupper( wp_trim_words( $h['title'] ?? '', 4, '' ) ) ) . '</span>';
            $out .= '</div><div class="ahnp-hero-side"><!--AHENK_HERO_IMG-->' . $ph . '<!--/AHENK_HERO_IMG--></div></div></section>';
        }

        // Stats (biyografi)
        if ( ! empty( $d['stats'] ) && is_array( $d['stats'] ) ) {
            $out .= '<section class="ahnp-stats">';
            foreach ( $d['stats'] as $s ) {
                $out .= '<div class="ahnp-stat"><div class="ahnp-stat-val">' . esc_html( $s['value'] ?? '' ) . '</div><div class="ahnp-stat-lbl">' . esc_html( $s['label'] ?? '' ) . '</div></div>';
            }
            $out .= '</section>';
        }

        // Features (tanitim)
        if ( ! empty( $d['features'] ) && is_array( $d['features'] ) ) {
            $out .= '<section class="ahnp-features">';
            foreach ( $d['features'] as $f ) {
                $out .= '<div class="ahnp-feature">';
                if ( ! empty( $f['icon'] ) ) $out .= '<div class="ahnp-feature-icon">' . esc_html( mb_substr( $f['icon'], 0, 4 ) ) . '</div>';
                $out .= '<h4>' . esc_html( $f['title'] ?? '' ) . '</h4>';
                $out .= '<p>' . esc_html( $f['text'] ?? '' ) . '</p>';
                $out .= '</div>';
            }
            $out .= '</section>';
        }

        // Misyon / Vizyon (hakkimizda)
        if ( ! empty( $d['mission'] ) || ! empty( $d['vision'] ) ) {
            $out .= '<section class="ahnp-mv">';
            if ( ! empty( $d['mission'] ) ) {
                $out .= '<div class="ahnp-mv-card"><h4>' . esc_html( $d['mission']['title'] ?? 'Misyonumuz' ) . '</h4><p>' . esc_html( $d['mission']['text'] ?? '' ) . '</p></div>';
            }
            if ( ! empty( $d['vision'] ) ) {
                $out .= '<div class="ahnp-mv-card"><h4>' . esc_html( $d['vision']['title'] ?? 'Vizyonumuz' ) . '</h4><p>' . esc_html( $d['vision']['text'] ?? '' ) . '</p></div>';
            }
            $out .= '</section>';
        }

        // Values (hakkimizda)
        if ( ! empty( $d['values'] ) && is_array( $d['values'] ) ) {
            $out .= '<section class="ahnp-features">';
            foreach ( $d['values'] as $v ) {
                $out .= '<div class="ahnp-feature">';
                if ( ! empty( $v['icon'] ) ) $out .= '<div class="ahnp-feature-icon">' . esc_html( mb_substr( $v['icon'], 0, 4 ) ) . '</div>';
                $out .= '<h4>' . esc_html( $v['title'] ?? '' ) . '</h4>';
                $out .= '<p>' . esc_html( $v['text'] ?? '' ) . '</p>';
                $out .= '</div>';
            }
            $out .= '</section>';
        }

        // Sections
        if ( ! empty( $d['sections'] ) && is_array( $d['sections'] ) ) {
            foreach ( $d['sections'] as $s ) {
                $sid = isset( $s['id'] ) ? sanitize_title( $s['id'] ) : '';
                $out .= '<section class="ahnp-section"' . ( $sid ? ' id="' . esc_attr( $sid ) . '"' : '' ) . '>';
                if ( ! empty( $s['heading'] ) ) $out .= '<h3>' . esc_html( $s['heading'] ) . '</h3>';
                if ( ! empty( $s['body'] ) )    $out .= wp_kses_post( $s['body'] );
                $out .= '</section>';
            }
        }

        // CTA
        if ( ! empty( $d['cta'] ) ) {
            $c = $d['cta'];
            $href = isset( $c['anchor'] ) ? '#' . sanitize_title( ltrim( (string) $c['anchor'], '#' ) ) : '#';
            $out .= '<section class="ahnp-cta">';
            if ( ! empty( $c['title'] ) ) $out .= '<h3>' . esc_html( $c['title'] ) . '</h3>';
            if ( ! empty( $c['text'] ) )  $out .= '<p>' . esc_html( $c['text'] ) . '</p>';
            if ( ! empty( $c['label'] ) ) $out .= '<a href="' . esc_attr( $href ) . '" class="ahnp-btn">' . esc_html( $c['label'] ) . '</a>';
            $out .= '</section>';
        }

        $out .= '</div>';
        return $out;
    }

    /* ============ TAM SAYFA TEMPLATE ============ */

    public function register_tamsayfa_template( $templates ) {
        $templates[ self::TAMSAYFA_SLUG ] = 'Ahenk — Tam Sayfa (başlıksız, çerçevesiz)';
        return $templates;
    }

    public function load_tamsayfa_template( $template ) {
        if ( ! is_singular( array( 'page' ) ) ) return $template;
        $pid = get_queried_object_id();
        if ( ! $pid ) return $template;
        $tpl = get_post_meta( $pid, '_wp_page_template', true );
        if ( $tpl !== self::TAMSAYFA_SLUG ) return $template;
        $plugin_tpl = trailingslashit( AHB_PLUGIN_DIR ) . 'templates/page-ahenk-tamsayfa.php';
        if ( file_exists( $plugin_tpl ) ) return $plugin_tpl;
        return $template;
    }

    /* ============ HERO IMAGE EMBED ============ */

    private function attach_hero_image_to_content( $post_id, $att_id ) {
        if ( ! $post_id || ! $att_id ) return;
        $url = wp_get_attachment_url( $att_id );
        if ( ! $url ) return;
        $post = get_post( $post_id );
        if ( ! $post || strpos( $post->post_content, '<!--AHENK_HERO_IMG-->' ) === false ) return;
        $alt = get_the_title( $post_id );
        $img = '<img src="' . esc_url( $url ) . '" alt="' . esc_attr( $alt ) . '" loading="lazy">';
        $new = preg_replace(
            '/<!--AHENK_HERO_IMG-->[\s\S]*?<!--\/AHENK_HERO_IMG-->/',
            '<!--AHENK_HERO_IMG-->' . $img . '<!--/AHENK_HERO_IMG-->',
            $post->post_content,
            1
        );
        if ( $new && $new !== $post->post_content ) {
            wp_update_post( array( 'ID' => $post_id, 'post_content' => $new ) );
        }
    }

    /* ============ OPENAI HELPER ============ */

    private function openai_chat_json( $api_key, $sys, $user ) {
        $model = get_option( 'ahb_openai_model', 'gpt-4o-mini' );
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
            'timeout' => 180,
        ) );
        if ( is_wp_error( $resp ) ) { error_log( '[AHB-AIURET] ' . $resp->get_error_message() ); return false; }
        $code = wp_remote_retrieve_response_code( $resp );
        $raw  = wp_remote_retrieve_body( $resp );
        if ( $code !== 200 ) { error_log( '[AHB-AIURET] HTTP ' . $code . ': ' . $raw ); return false; }
        $j = json_decode( $raw, true );
        $content_str = $j['choices'][0]['message']['content'] ?? '';
        $parsed = json_decode( $content_str, true );
        if ( ! is_array( $parsed ) ) { error_log( '[AHB-AIURET] JSON parse fail: ' . substr( $content_str, 0, 300 ) ); return false; }
        return $parsed;
    }

    /* ============ GORSEL UR (gpt-image-1 / dall-e-3) ============ */

    private function generate_image_v2( $api_key, $model, $prompt ) {
        if ( $model === 'dall-e-3' ) {
            $body = array(
                'model'           => 'dall-e-3',
                'prompt'          => $prompt,
                'n'               => 1,
                'size'            => '1024x1024',
                'response_format' => 'b64_json',
                'quality'         => 'standard',
            );
        } else {
            // gpt-image-1: response_format DESTEKLENMEZ, her zaman b64 doner.
            $body = array(
                'model'   => 'gpt-image-1',
                'prompt'  => $prompt,
                'n'       => 1,
                'size'    => '1024x1024',
                'quality' => 'high',
            );
        }
        $resp = wp_remote_post( 'https://api.openai.com/v1/images/generations', array(
            'headers' => array( 'Authorization' => 'Bearer ' . $api_key, 'Content-Type' => 'application/json' ),
            'body'    => wp_json_encode( $body ),
            'timeout' => 180,
        ) );
        if ( is_wp_error( $resp ) ) { error_log( '[AHB-IMG] ' . $resp->get_error_message() ); return ''; }
        $code = wp_remote_retrieve_response_code( $resp );
        $raw  = wp_remote_retrieve_body( $resp );
        if ( $code !== 200 ) { error_log( '[AHB-IMG] HTTP ' . $code . ': ' . substr( $raw, 0, 400 ) ); return ''; }
        $j = json_decode( $raw, true );
        return $j['data'][0]['b64_json'] ?? '';
    }

    /* ============ WIKIMEDIA COMMONS WEB ARAMA (AJAX) ============ */

    public function ajax_websearch() {
        check_ajax_referer( self::NONCE );
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( array( 'msg' => 'yetki yok' ) );
        $q = trim( wp_unslash( (string) ( $_POST['q'] ?? '' ) ) );
        if ( $q === '' ) wp_send_json_error( array( 'msg' => 'arama boş' ) );

        $args = array(
            'action'       => 'query',
            'format'       => 'json',
            'generator'    => 'search',
            'gsrsearch'    => $q . ' filetype:bitmap|drawing -fileres:0',
            'gsrnamespace' => 6, // File:
            'gsrlimit'     => 40,
            'prop'         => 'imageinfo',
            'iiprop'       => 'url|size|mime|extmetadata',
            'iiurlwidth'   => 300,
            'origin'       => '*',
        );
        $url = 'https://commons.wikimedia.org/w/api.php?' . http_build_query( $args );
        $resp = wp_remote_get( $url, array(
            'timeout'    => 25,
            'user-agent' => 'AhenkAiContentBot/1.0 (WordPress plugin)',
        ) );
        if ( is_wp_error( $resp ) ) wp_send_json_error( array( 'msg' => $resp->get_error_message() ) );
        $code = wp_remote_retrieve_response_code( $resp );
        if ( $code !== 200 ) wp_send_json_error( array( 'msg' => 'HTTP ' . $code ) );
        $j = json_decode( wp_remote_retrieve_body( $resp ), true );
        $pages = $j['query']['pages'] ?? array();
        $items = array();
        foreach ( $pages as $p ) {
            $info = $p['imageinfo'][0] ?? null;
            if ( ! $info ) continue;
            $mime = $info['mime'] ?? '';
            if ( ! in_array( $mime, array( 'image/jpeg', 'image/png', 'image/gif', 'image/webp' ), true ) ) continue;
            $title = isset( $p['title'] ) ? preg_replace( '/^File:/', '', $p['title'] ) : '';
            $thumb = $info['thumburl'] ?? ( $info['url'] ?? '' );
            $full  = $info['url'] ?? '';
            $artist = $info['extmetadata']['Artist']['value'] ?? '';
            $license = $info['extmetadata']['LicenseShortName']['value'] ?? 'Wikimedia Commons';
            $artist_clean = trim( wp_strip_all_tags( html_entity_decode( $artist, ENT_QUOTES, 'UTF-8' ) ) );
            $credit = ( $artist_clean ? $artist_clean . ' / ' : '' ) . $license;
            $items[] = array(
                'title'  => $title,
                'thumb'  => $thumb,
                'url'    => $full,
                'credit' => $credit,
            );
            if ( count( $items ) >= 30 ) break;
        }
        wp_send_json_success( array( 'items' => $items ) );
    }

    /* ============ URL'DEN GORSEL INDIR + KAYDET ============ */

    private function save_image_from_url( $url, $post_id = 0, $credit = '' ) {
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/media.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';
        $tmp = download_url( $url, 60 );
        if ( is_wp_error( $tmp ) ) { error_log( '[AHB-IMG-WEB] dl ' . $tmp->get_error_message() ); return false; }
        $file_array = array(
            'name'     => sanitize_file_name( basename( parse_url( $url, PHP_URL_PATH ) ) ?: 'web-image.jpg' ),
            'tmp_name' => $tmp,
        );
        $att_id = media_handle_sideload( $file_array, $post_id, $credit ? ( 'Kaynak: ' . $credit ) : '' );
        if ( is_wp_error( $att_id ) ) { @unlink( $tmp ); error_log( '[AHB-IMG-WEB] sideload ' . $att_id->get_error_message() ); return false; }
        if ( $credit ) {
            update_post_meta( $att_id, '_ahb_image_credit', $credit );
            update_post_meta( $att_id, '_wp_attachment_image_alt', wp_strip_all_tags( $credit ) );
        }
        return $att_id;
    }

    /* ============ GORSEL KAYDET ============ */

    private function save_image_from_base64( $b64, $filename, $post_id = 0 ) {
        $bin = base64_decode( $b64 );
        if ( ! $bin ) return false;
        $upload = wp_upload_dir();
        if ( ! empty( $upload['error'] ) ) return false;
        if ( ! pathinfo( $filename, PATHINFO_EXTENSION ) ) $filename .= '.png';
        $filename = wp_unique_filename( $upload['path'], $filename );
        $filepath = trailingslashit( $upload['path'] ) . $filename;
        if ( ! file_put_contents( $filepath, $bin ) ) return false;
        $filetype = wp_check_filetype( $filename, null );
        $att = array(
            'guid'           => trailingslashit( $upload['url'] ) . $filename,
            'post_mime_type' => $filetype['type'] ?: 'image/png',
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

Ahenk_AI_Tek_Uret::init();
