<?php
/**
 * Ahenk AI Icerik Robotu - Import / Export Aracı
 *
 * Yazarlari (ky-yazar / kullanici), makaleleri (ky-makale), haberleri (haber)
 * ve istenen herhangi bir post type'i JSON olarak disa/icer aktarir. Ayrica
 * ayni eklenti yuklu uzak siteden REST API ile cekme yapar.
 *
 * - Resim modu: link / sunucuya indir / atla
 * - AJAX batch (50 kayit/sefer) — buyuk arsivlerde sunucuyu sismaz
 * - REST endpoint: ahb/v1/types ve ahb/v1/export (token korumali)
 */

if ( ! defined( 'ABSPATH' ) ) exit;

class AHB_Import_Export {

    const TOKEN_OPT   = 'ahb_remote_export_token';
    const NONCE       = 'ahb_ie_nonce';
    const REST_NS     = 'ahb/v1';
    const BATCH_SIZE  = 50;
    const IMP_BATCH   = 10;

    public static function init() {
        $self = new self();
        add_action( 'admin_menu',                array( $self, 'add_menu' ), 30 );
        add_action( 'wp_ajax_ahb_ie_export',     array( $self, 'ajax_export' ) );
        add_action( 'wp_ajax_ahb_ie_import',     array( $self, 'ajax_import' ) );
        add_action( 'wp_ajax_ahb_ie_remote',     array( $self, 'ajax_remote_fetch' ) );
        add_action( 'wp_ajax_ahb_ie_token',      array( $self, 'ajax_save_token' ) );
        add_action( 'wp_ajax_ahb_ie_remote_types', array( $self, 'ajax_remote_types' ) );
        add_action( 'wp_ajax_ahb_ie_db_kesif',     array( $self, 'ajax_db_kesif' ) );
        add_action( 'wp_ajax_ahb_ie_tax_terms',    array( $self, 'ajax_tax_terms' ) );
        add_action( 'rest_api_init',             array( $self, 'register_rest' ) );
    }

    /* ====================== ADMIN MENU ====================== */

    public function add_menu() {
        // Sol panelde gostermeden URL ile erisilebilir tut — Site Bakimi/Icerikler
        // tabindan link ile aciliyor.
        add_submenu_page(
            null,
            'İçe/Dışa Aktarım',
            '📦 İçe/Dışa Aktarım',
            'manage_options',
            'ai-haber-botu-ie',
            array( $this, 'render_page' )
        );
    }

    public function render_page() {
        if ( ! current_user_can( 'manage_options' ) ) return;
        $token = (string) get_option( self::TOKEN_OPT, '' );
        $types = $this->liste_post_types();
        $nonce = wp_create_nonce( self::NONCE );
        ?>
        <div class="wrap">
            <h1>📦 İçe / Dışa Aktarım</h1>
            <p style="background:#fff3cd;border-left:4px solid #ffba00;padding:10px;">
                <strong>Önemli:</strong> Büyük arşivlerde işlem 50'lik gruplar halinde çalışır.
                Sayfayı kapatmayın, ilerleme çubuğu bitene kadar bekleyin.
            </p>

            <h2 class="nav-tab-wrapper">
                <a href="#" class="nav-tab nav-tab-active" data-tab="export">⬇ Dışa Aktar</a>
                <a href="#" class="nav-tab" data-tab="import">⬆ İçe Aktar</a>
                <a href="#" class="nav-tab" data-tab="remote">🌐 Diğer Siteden Çek</a>
                <a href="#" class="nav-tab" data-tab="token">🔑 REST Anahtarı</a>
            </h2>

            <!-- ====================== EXPORT ====================== -->
            <div class="ahb-ie-tab" data-pane="export" style="background:#fff;padding:18px;border:1px solid #ccd0d4;">

                <div style="background:#fff8e1;border-left:4px solid #f0a500;padding:10px 14px;margin:0 0 14px;border-radius:4px;color:#5a4500;">
                    <strong>📷 Resimler hakkında:</strong> Dışa aktarımda öne çıkan görseller ve içerikteki tüm resim URL'leri JSON dosyasına <strong>link olarak</strong> yazılır — görsel dosyaları indirilmez (bu yüzden çıktı küçüktür ve hızlıdır). Yeni siteye yüklerken İçe Aktar sekmesindeki <strong>"Sunucuya indir"</strong> seçeneğiyle bu linkleri yeni sitenin medya kütüphanesine indirebilirsiniz.
                </div>

                <div style="background:#eef6ff;border:1px solid #b6d6ff;padding:12px 14px;margin:0 0 18px;border-radius:6px;">
                    <strong>🔍 Bilinmeyen tablo / post tipi mi var?</strong>
                    <span style="color:#555;">Köşe yazarları (ky-yazar) gibi özel bir eklenti kendi DB tablosunu kullanıyor olabilir. Veritabanını tarayın, sonucu paylaşın — desteği eklenir.</span>
                    <button type="button" id="ahb-ie-kesif-btn" class="button" style="margin-left:8px;">🔍 Veritabanını Tara</button>
                    <div id="ahb-ie-kesif-out" style="display:none;margin-top:12px;background:#fff;border:1px solid #ddd;padding:10px;max-height:360px;overflow:auto;font-family:Consolas,Menlo,monospace;font-size:12px;"></div>
                </div>

                <h3>Dışa Aktar (JSON)</h3>
                <p>Seçtiğin türdeki tüm kayıtları (yayında / taslak / çöp dahil) JSON dosyası olarak indirir. Resim URL'leri dahil, görseller ayrıca indirilmez.</p>

                <table class="form-table">
                    <tr>
                        <th>Tür</th>
                        <td>
                            <select id="ahb-ie-exp-type">
                                <?php foreach ( $types as $slug => $label ) : ?>
                                    <option value="<?php echo esc_attr( $slug ); ?>"><?php echo esc_html( $label ); ?></option>
                                <?php endforeach; ?>
                                <option value="__users__">👤 WP Kullanıcılar (yazar/admin)</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th>Durum filtresi</th>
                        <td>
                            <label><input type="checkbox" class="ahb-ie-st" value="publish" checked> Yayında</label> &nbsp;
                            <label><input type="checkbox" class="ahb-ie-st" value="draft" checked> Taslak</label> &nbsp;
                            <label><input type="checkbox" class="ahb-ie-st" value="pending" checked> Beklemede</label> &nbsp;
                            <label><input type="checkbox" class="ahb-ie-st" value="future" checked> Zamanlı</label> &nbsp;
                            <label><input type="checkbox" class="ahb-ie-st" value="private" checked> Özel</label> &nbsp;
                            <label><input type="checkbox" class="ahb-ie-st" value="trash"> Çöp</label>
                        </td>
                    </tr>
                    <tr id="ahb-ie-cat-row">
                        <th>Kategori filtresi <span style="font-weight:400;color:#888;font-size:12px;">(opsiyonel)</span></th>
                        <td>
                            <p style="margin:0 0 6px;color:#555;">
                                Sadece seçili kategori/taksonomilerdeki kayıtları dışa aktar. <strong>Hiçbiri seçili değilse tüm kategoriler</strong> dahil edilir.
                                Liste, üstte seçili post tipine göre otomatik güncellenir (örn. "haber" tipi için <code>haber-kategorisi</code>).
                            </p>
                            <p style="margin:0 0 6px;padding:6px 10px;background:#fff8e1;border-left:3px solid #f0a500;color:#5a4500;font-size:12px;max-width:500px;">
                                <strong>Önemli:</strong> Arama kutusu sadece listeyi süzer — <strong>seçim yapmaz</strong>. Filtre etkili olsun diye listeden Ctrl/⌘+tıkla seçin <em>ya da</em> arayıp <strong>Enter</strong>'a basın / <strong>Eşleşenleri Seç</strong> butonuna tıklayın.
                            </p>
                            <div style="display:flex;gap:6px;max-width:500px;margin-bottom:6px;">
                                <input type="text" id="ahb-ie-cat-search" placeholder="🔍 Kategori adında ara, Enter ile seç..."
                                       style="flex:1;padding:6px 10px;border:1px solid #ccd0d4;border-radius:4px;">
                                <button type="button" class="button" id="ahb-ie-cat-pick">↳ Eşleşenleri Seç</button>
                            </div>
                            <select id="ahb-ie-cat-list" multiple size="14" style="width:100%;max-width:500px;font-family:Consolas,Menlo,monospace;">
                                <option disabled>Yükleniyor...</option>
                            </select>
                            <p style="margin:6px 0 0;font-size:12px;color:#666;">
                                <button type="button" class="button button-small" id="ahb-ie-cat-clear">🗑 Seçimi Temizle</button>
                                <span id="ahb-ie-cat-count" style="margin-left:10px;font-weight:600;"></span>
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <th>Çıktı formatı</th>
                        <td>
                            <label><input type="radio" name="ahb_ie_fmt" value="json" checked> 📄 JSON dosyası (düz metin)</label> &nbsp;&nbsp;
                            <label><input type="radio" name="ahb_ie_fmt" value="zip"> 🗜️ ZIP arşivi (sıkıştırılmış — büyük çıktılar için önerilir)</label>
                            <p style="margin:6px 0 0;font-size:12px;color:#666;">ZIP, JSON'u arşive paketleyip ~%80 küçültür. İçe Aktar her iki formatı da kabul eder.</p>
                        </td>
                    </tr>
                </table>

                <p>
                    <button type="button" class="button button-primary" id="ahb-ie-exp-start">⬇ Dışa Aktarımı Başlat</button>
                </p>
                <div id="ahb-ie-exp-progress" style="display:none;">
                    <div style="background:#f1f1f1;height:24px;border-radius:4px;overflow:hidden;">
                        <div id="ahb-ie-exp-bar" style="background:#2271b1;height:100%;width:0;transition:width .2s;"></div>
                    </div>
                    <p id="ahb-ie-exp-text" style="margin-top:8px;"></p>
                </div>
            </div>

            <!-- ====================== IMPORT ====================== -->
            <div class="ahb-ie-tab" data-pane="import" style="display:none;background:#fff;padding:18px;border:1px solid #ccd0d4;">
                <h3>İçe Aktar (JSON dosyası)</h3>
                <p>Daha önce dışa aktardığın JSON dosyasını yükle. Aynı slug'a sahip kayıt varsa <em>atlanır</em> (üzerine yazma yok).</p>

                <table class="form-table">
                    <tr>
                        <th>Dosya (JSON veya ZIP)</th>
                        <td>
                            <input type="file" id="ahb-ie-imp-file" accept=".json,.zip,application/json,application/zip">
                            <p style="margin:4px 0 0;font-size:12px;color:#666;">Hem <code>.json</code> hem de Dışa Aktar'dan oluşturulan <code>.zip</code> kabul edilir.</p>
                        </td>
                    </tr>
                    <tr>
                        <th>Resim Modu</th>
                        <td>
                            <label><input type="radio" name="ahb_ie_img" value="link" checked> 🔗 Sadece link kullan (sunucuya indirme)</label><br>
                            <label><input type="radio" name="ahb_ie_img" value="download"> ⬇ Sunucuya indir (medya kütüphanesine ekle)</label><br>
                            <label><input type="radio" name="ahb_ie_img" value="skip"> 🚫 Resmi tamamen atla</label>
                        </td>
                    </tr>
                </table>

                <p>
                    <button type="button" class="button button-primary" id="ahb-ie-imp-start">⬆ İçe Aktarımı Başlat</button>
                </p>
                <div id="ahb-ie-imp-progress" style="display:none;">
                    <div style="background:#f1f1f1;height:24px;border-radius:4px;overflow:hidden;">
                        <div id="ahb-ie-imp-bar" style="background:#46b450;height:100%;width:0;transition:width .2s;"></div>
                    </div>
                    <p id="ahb-ie-imp-text" style="margin-top:8px;"></p>
                </div>
            </div>

            <!-- ====================== REMOTE ====================== -->
            <div class="ahb-ie-tab" data-pane="remote" style="display:none;background:#fff;padding:18px;border:1px solid #ccd0d4;">
                <h3>Diğer Siteden Çek</h3>
                <p>Aynı eklenti yüklü <strong>uzak</strong> bir WordPress sitesinden REST API ile içerik çek. Hedef siteden REST anahtarını alıp aşağı yapıştır.</p>

                <table class="form-table">
                    <tr>
                        <th>Site URL</th>
                        <td><input type="url" id="ahb-ie-rem-url" class="regular-text" placeholder="https://eskisite.com" style="width:100%;max-width:480px;"></td>
                    </tr>
                    <tr>
                        <th>REST Anahtarı</th>
                        <td><input type="text" id="ahb-ie-rem-token" class="regular-text" placeholder="Hedef sitenin REST anahtarı" style="width:100%;max-width:480px;"></td>
                    </tr>
                    <tr>
                        <th></th>
                        <td><button type="button" class="button" id="ahb-ie-rem-types">🔍 Türleri Listele</button></td>
                    </tr>
                    <tr id="ahb-ie-rem-typewrap" style="display:none;">
                        <th>Tür</th>
                        <td><select id="ahb-ie-rem-type"></select></td>
                    </tr>
                    <tr>
                        <th>Resim Modu</th>
                        <td>
                            <label><input type="radio" name="ahb_ie_rimg" value="link" checked> 🔗 Sadece link kullan</label><br>
                            <label><input type="radio" name="ahb_ie_rimg" value="download"> ⬇ Sunucuya indir</label><br>
                            <label><input type="radio" name="ahb_ie_rimg" value="skip"> 🚫 Resmi atla</label>
                        </td>
                    </tr>
                </table>

                <p>
                    <button type="button" class="button button-primary" id="ahb-ie-rem-start" disabled>🌐 Çekmeyi Başlat</button>
                </p>
                <div id="ahb-ie-rem-progress" style="display:none;">
                    <div style="background:#f1f1f1;height:24px;border-radius:4px;overflow:hidden;">
                        <div id="ahb-ie-rem-bar" style="background:#9c27b0;height:100%;width:0;transition:width .2s;"></div>
                    </div>
                    <p id="ahb-ie-rem-text" style="margin-top:8px;"></p>
                </div>
            </div>

            <!-- ====================== TOKEN ====================== -->
            <div class="ahb-ie-tab" data-pane="token" style="display:none;background:#fff;padding:18px;border:1px solid #ccd0d4;">
                <h3>REST Anahtarı</h3>
                <p>Bu siteden başka bir site içerik çekecekse, ona aşağıdaki anahtarı vermelisin. Anahtar boşsa REST endpoint kapalıdır.</p>
                <p>
                    <input type="text" id="ahb-ie-token-val" class="regular-text" value="<?php echo esc_attr( $token ); ?>" style="width:100%;max-width:480px;font-family:monospace;">
                </p>
                <p>
                    <button type="button" class="button" id="ahb-ie-token-gen">🎲 Yeni Anahtar Üret</button>
                    <button type="button" class="button button-primary" id="ahb-ie-token-save">💾 Kaydet</button>
                    <span id="ahb-ie-token-msg" style="margin-left:10px;"></span>
                </p>
                <p><strong>Endpoint:</strong> <code><?php echo esc_html( rest_url( self::REST_NS . '/export' ) ); ?></code></p>
            </div>
        </div>

        <script>
        (function(){
            const NONCE = '<?php echo esc_js( $nonce ); ?>';
            const AJAX = '<?php echo esc_js( admin_url( 'admin-ajax.php' ) ); ?>';

            // Sekme gecisi
            document.querySelectorAll('.nav-tab').forEach(tab => {
                tab.addEventListener('click', e => {
                    e.preventDefault();
                    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('nav-tab-active'));
                    tab.classList.add('nav-tab-active');
                    const target = tab.dataset.tab;
                    document.querySelectorAll('.ahb-ie-tab').forEach(p => {
                        p.style.display = (p.dataset.pane === target) ? '' : 'none';
                    });
                });
            });

            // ============ DB KESIF ============
            const kBtn = document.getElementById('ahb-ie-kesif-btn');
            const kOut = document.getElementById('ahb-ie-kesif-out');
            if (kBtn) kBtn.addEventListener('click', async () => {
                kBtn.disabled = true; kBtn.textContent = '⏳ Taranıyor...';
                kOut.style.display = 'block';
                kOut.textContent = 'Tablolar ve post tipleri okunuyor...';
                const fd = new FormData();
                fd.append('action', 'ahb_ie_db_kesif');
                fd.append('nonce', NONCE);
                try {
                    const r = await fetch(AJAX, { method: 'POST', body: fd, credentials: 'same-origin' });
                    const j = await r.json();
                    if (!j.success) { kOut.textContent = 'Hata: ' + (j.data || ''); return; }
                    const d = j.data;
                    let html = '<strong>Prefix:</strong> ' + d.prefix + '\n\n';
                    html += '=== POST TİPLERİ (wp_posts.post_type) ===\n';
                    d.posttypes.forEach(p => { html += '  ' + p.post_type + '  →  ' + p.c + ' kayıt\n'; });
                    html += '\n=== TÜM TABLOLAR (' + d.tables.length + ') ===\n';
                    d.tables.forEach(t => { html += '  ' + d.prefix + t.table + '  →  ' + t.count + ' satır\n'; });
                    html += '\nBu çıktıyı kopyalayıp geliştiriciye gönderin. Köşe yazarı tablosu muhtemelen "ky_" veya "kose" ile başlar.';
                    kOut.innerHTML = '<pre style="margin:0;white-space:pre-wrap;">' + html.replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c])) + '</pre><p style="margin:10px 0 0;"><button type="button" class="button" id="ahb-kesif-copy">📋 Panoya Kopyala</button></p>';
                    document.getElementById('ahb-kesif-copy').addEventListener('click', () => {
                        const txt = kOut.querySelector('pre').textContent;
                        navigator.clipboard.writeText(txt).then(() => { alert('Kopyalandı! Mesajınıza yapıştırın.'); });
                    });
                } catch (e) { kOut.textContent = 'Ağ hatası: ' + e.message; }
                kBtn.disabled = false; kBtn.textContent = '🔍 Veritabanını Tara';
            });

            // ============ EXPORT — Kategori filtresi yardimcilari ============
            const catSearch = document.getElementById('ahb-ie-cat-search');
            const catList   = document.getElementById('ahb-ie-cat-list');
            const catCount  = document.getElementById('ahb-ie-cat-count');
            const catRow    = document.getElementById('ahb-ie-cat-row');
            const expType   = document.getElementById('ahb-ie-exp-type');
            function refreshCatCount() {
                const sel = Array.from(catList.selectedOptions).filter(o => !o.disabled).length;
                catCount.textContent = sel ? (sel + ' kategori seçili') : 'Tüm kategoriler dahil edilecek';
            }
            async function loadTaxTermsFor(type) {
                catList.innerHTML = '<option disabled>Yükleniyor...</option>';
                catCount.textContent = '';
                try {
                    const fd = new FormData();
                    fd.append('action', 'ahb_ie_tax_terms');
                    fd.append('_ajax_nonce', NONCE);
                    fd.append('type', type);
                    const r = await fetch(AJAX, { method: 'POST', body: fd, credentials: 'same-origin' });
                    const j = await r.json();
                    if (!j.success) { catList.innerHTML = '<option disabled>Yüklenemedi</option>'; return; }
                    const groups = j.data.groups || [];
                    if (!groups.length) {
                        catList.innerHTML = '<option disabled>Bu tür için taksonomi yok</option>';
                        return;
                    }
                    const parts = [];
                    groups.forEach(g => {
                        if (!g.terms.length) return;
                        parts.push('<optgroup label="' + g.label + ' (' + g.taxonomy + ')">');
                        g.terms.forEach(t => {
                            parts.push('<option value="' + g.taxonomy + ':' + t.id +
                                '" data-name="' + (t.name || '').toLowerCase().replace(/"/g,'&quot;') +
                                '">' + t.name + ' (' + t.count + ')</option>');
                        });
                        parts.push('</optgroup>');
                    });
                    catList.innerHTML = parts.join('') || '<option disabled>Taksonomi bulunamadı</option>';
                    refreshCatCount();
                } catch (e) {
                    catList.innerHTML = '<option disabled>Ağ hatası</option>';
                }
            }
            function toggleCatRow() {
                const t = expType.value;
                const hide = (t === '__users__' || t === '__tax__' || t.indexOf('vtv_') === 0 || t.indexOf('__tbl_') === 0);
                catRow.style.display = hide ? 'none' : '';
                if (!hide) loadTaxTermsFor(t);
            }
            function pickVisibleMatches() {
                const q = (catSearch.value || '').toLowerCase().trim();
                if (!q) { alert('Önce arama kutusuna kategori adı yazın.'); return; }
                let n = 0;
                Array.from(catList.querySelectorAll('option')).forEach(o => {
                    if (o.disabled) return;
                    if ((o.dataset.name || '').indexOf(q) !== -1) { o.selected = true; n++; }
                });
                refreshCatCount();
                if (!n) alert('"' + catSearch.value + '" ile eşleşen kategori bulunamadı.');
            }
            if (catSearch) {
                catSearch.addEventListener('input', () => {
                    const q = catSearch.value.toLowerCase().trim();
                    Array.from(catList.querySelectorAll('option')).forEach(o => {
                        o.style.display = (!q || (o.dataset.name || '').indexOf(q) !== -1) ? '' : 'none';
                    });
                });
                catSearch.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') { e.preventDefault(); pickVisibleMatches(); }
                });
            }
            const catPickBtn = document.getElementById('ahb-ie-cat-pick');
            if (catPickBtn) catPickBtn.addEventListener('click', pickVisibleMatches);
            if (catList) {
                catList.addEventListener('change', refreshCatCount);
            }
            if (document.getElementById('ahb-ie-cat-clear')) {
                document.getElementById('ahb-ie-cat-clear').addEventListener('click', () => {
                    Array.from(catList.options).forEach(o => o.selected = false);
                    refreshCatCount();
                });
            }
            if (expType) { expType.addEventListener('change', toggleCatRow); toggleCatRow(); }

            // ============ EXPORT ============
            let expBuffer = [];
            document.getElementById('ahb-ie-exp-start').addEventListener('click', async () => {
                const type = document.getElementById('ahb-ie-exp-type').value;
                const statuses = Array.from(document.querySelectorAll('.ahb-ie-st:checked')).map(c => c.value);
                if (!statuses.length) { alert('En az bir durum seçin'); return; }
                const selectedCatOpts = Array.from(catList ? catList.selectedOptions : [])
                    .filter(o => !o.disabled && o.value);
                const catIds = selectedCatOpts.map(o => o.value).join(',');
                // Kategori adlarını dosya adı / meta için sakla
                const catNames = selectedCatOpts.map(o => (o.textContent || '').replace(/\s*\(\d+\)\s*$/, '').trim()).filter(Boolean);
                // Guvenlik: arama kutusunda metin var ama hic secim yoksa, kullaniciya sor.
                if (!catIds && catSearch && catSearch.value.trim() && catRow.style.display !== 'none') {
                    const ok = confirm(
                        'Arama kutusunda "' + catSearch.value.trim() + '" yazıyor ama listeden hiç kategori seçilmedi.\n\n' +
                        'Bu durumda TÜM kategorilerdeki kayıtlar indirilir.\n\n' +
                        'Devam etmek istiyor musunuz?\n' +
                        '(İptal edip Enter\'a basarsanız eşleşenler otomatik seçilir.)'
                    );
                    if (!ok) return;
                }
                expBuffer = [];
                document.getElementById('ahb-ie-exp-progress').style.display = '';
                document.getElementById('ahb-ie-exp-bar').style.width = '0%';
                document.getElementById('ahb-ie-exp-text').textContent = 'Başlıyor...';

                let offset = 0, total = 0, meta = null;
                while (true) {
                    const fd = new FormData();
                    fd.append('action', 'ahb_ie_export');
                    fd.append('_ajax_nonce', NONCE);
                    fd.append('type', type);
                    fd.append('statuses', statuses.join(','));
                    fd.append('cats', catIds);
                    fd.append('offset', offset);
                    const r = await fetch(AJAX, { method: 'POST', body: fd, credentials: 'same-origin' });
                    const j = await r.json();
                    if (!j.success) { alert('Hata: ' + (j.data && j.data.msg || 'bilinmiyor')); return; }
                    if (!meta) { meta = { version: 1, type: type, exported_at: j.data.now, source: location.host, categories_filter: catNames }; total = j.data.total; }
                    expBuffer = expBuffer.concat(j.data.items);
                    offset += j.data.items.length;
                    const pct = total ? Math.round(offset / total * 100) : 100;
                    document.getElementById('ahb-ie-exp-bar').style.width = pct + '%';
                    document.getElementById('ahb-ie-exp-text').textContent = `${offset} / ${total} kayıt aktarıldı...`;
                    if (j.data.items.length === 0 || offset >= total) break;
                }
                const fmt = (document.querySelector('input[name=ahb_ie_fmt]:checked') || {}).value || 'json';
                const jsonStr = JSON.stringify({...meta, total: expBuffer.length, items: expBuffer}, null, 2);
                // Dosya adına kategori adını ekle (en fazla 3 kategori, Türkçe karakterleri sadeleştir)
                const slugify = s => s.toString()
                    .replace(/ğ/gi,'g').replace(/ü/gi,'u').replace(/ş/gi,'s')
                    .replace(/ı/g,'i').replace(/İ/g,'I').replace(/ö/gi,'o').replace(/ç/gi,'c')
                    .replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-+|-+$/g,'').substring(0,40);
                let catPart = '';
                if (catNames.length) {
                    const show = catNames.slice(0,3).map(slugify).filter(Boolean).join('_');
                    const more = catNames.length > 3 ? `_ve${catNames.length-3}` : '';
                    catPart = show ? `-${show}${more}` : '';
                }
                const baseName = `ahb-export-${type}${catPart}-${Date.now()}`;
                let blob, fileName;
                if (fmt === 'zip') {
                    document.getElementById('ahb-ie-exp-text').textContent = `Sıkıştırılıyor (${expBuffer.length} kayıt)...`;
                    if (typeof JSZip === 'undefined') {
                        await new Promise((res, rej) => {
                            const s = document.createElement('script');
                            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
                            s.onload = res; s.onerror = () => rej(new Error('JSZip yüklenemedi'));
                            document.head.appendChild(s);
                        }).catch(e => { alert('ZIP kütüphanesi yüklenemedi (internet kontrol edin). JSON olarak indirilecek.'); });
                    }
                    if (typeof JSZip !== 'undefined') {
                        const zip = new JSZip();
                        zip.file(baseName + '.json', jsonStr);
                        blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
                        fileName = baseName + '.zip';
                    } else {
                        blob = new Blob([jsonStr], { type: 'application/json' });
                        fileName = baseName + '.json';
                    }
                } else {
                    blob = new Blob([jsonStr], { type: 'application/json' });
                    fileName = baseName + '.json';
                }
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a); a.click(); a.remove();
                URL.revokeObjectURL(url);
                const sizeMb = (blob.size / 1048576).toFixed(2);
                document.getElementById('ahb-ie-exp-text').textContent = `✅ Tamamlandı: ${expBuffer.length} kayıt, ${sizeMb} MB (${fileName}) indirildi.`;
            });

            // ============ IMPORT ============
            document.getElementById('ahb-ie-imp-start').addEventListener('click', async () => {
                const f = document.getElementById('ahb-ie-imp-file').files[0];
                if (!f) { alert('JSON ya da ZIP dosyası seçin'); return; }
                const imgMode = document.querySelector('input[name=ahb_ie_img]:checked').value;
                let data, jsonText;
                const isZip = /\.zip$/i.test(f.name);
                if (isZip) {
                    if (typeof JSZip === 'undefined') {
                        try {
                            await new Promise((res, rej) => {
                                const s = document.createElement('script');
                                s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
                                s.onload = res; s.onerror = () => rej(new Error('JSZip yüklenemedi'));
                                document.head.appendChild(s);
                            });
                        } catch (e) { alert('ZIP açıcı yüklenemedi (internet kontrol). Lütfen JSON yükleyin.'); return; }
                    }
                    try {
                        const zip = await JSZip.loadAsync(await f.arrayBuffer());
                        const jsonFile = Object.values(zip.files).find(z => !z.dir && /\.json$/i.test(z.name));
                        if (!jsonFile) { alert('ZIP içinde .json dosyası bulunamadı'); return; }
                        jsonText = await jsonFile.async('string');
                    } catch (e) { alert('ZIP açılamadı: ' + e.message); return; }
                } else {
                    jsonText = await f.text();
                }
                try { data = JSON.parse(jsonText); } catch (e) { alert('Geçersiz JSON'); return; }
                if (!data.items || !Array.isArray(data.items)) { alert('JSON formatı tanınmadı'); return; }
                const items = data.items;
                const total = items.length;
                document.getElementById('ahb-ie-imp-progress').style.display = '';
                let done = 0, ok = 0, skip = 0, err = 0;
                while (done < total) {
                    const batch = items.slice(done, done + <?php echo (int) self::IMP_BATCH; ?>);
                    const fd = new FormData();
                    fd.append('action', 'ahb_ie_import');
                    fd.append('_ajax_nonce', NONCE);
                    fd.append('type', data.type);
                    fd.append('img_mode', imgMode);
                    fd.append('items', JSON.stringify(batch));
                    const r = await fetch(AJAX, { method: 'POST', body: fd, credentials: 'same-origin' });
                    const j = await r.json();
                    if (!j.success) { alert('Hata: ' + (j.data && j.data.msg || 'bilinmiyor')); return; }
                    ok += j.data.ok; skip += j.data.skip; err += j.data.err;
                    done += batch.length;
                    const pct = Math.round(done / total * 100);
                    document.getElementById('ahb-ie-imp-bar').style.width = pct + '%';
                    document.getElementById('ahb-ie-imp-text').textContent = `${done}/${total} işlendi · ✅ ${ok} eklendi · ⏭ ${skip} atlandı · ❌ ${err} hata`;
                }
                document.getElementById('ahb-ie-imp-text').textContent += '  →  TAMAMLANDI';
            });

            // ============ REMOTE ============
            document.getElementById('ahb-ie-rem-types').addEventListener('click', async () => {
                const url = document.getElementById('ahb-ie-rem-url').value.trim().replace(/\/$/, '');
                const tok = document.getElementById('ahb-ie-rem-token').value.trim();
                if (!url || !tok) { alert('URL ve anahtar gerekli'); return; }
                const fd = new FormData();
                fd.append('action', 'ahb_ie_remote_types');
                fd.append('_ajax_nonce', NONCE);
                fd.append('url', url);
                fd.append('token', tok);
                const r = await fetch(AJAX, { method: 'POST', body: fd, credentials: 'same-origin' });
                const j = await r.json();
                if (!j.success) { alert('Hata: ' + (j.data && j.data.msg || 'bağlantı hatası')); return; }
                const sel = document.getElementById('ahb-ie-rem-type');
                sel.innerHTML = '';
                Object.entries(j.data.types).forEach(([slug, label]) => {
                    const o = document.createElement('option');
                    o.value = slug; o.textContent = label + ' (' + j.data.counts[slug] + ')';
                    sel.appendChild(o);
                });
                document.getElementById('ahb-ie-rem-typewrap').style.display = '';
                document.getElementById('ahb-ie-rem-start').disabled = false;
            });

            document.getElementById('ahb-ie-rem-start').addEventListener('click', async () => {
                const url = document.getElementById('ahb-ie-rem-url').value.trim().replace(/\/$/, '');
                const tok = document.getElementById('ahb-ie-rem-token').value.trim();
                const type = document.getElementById('ahb-ie-rem-type').value;
                const imgMode = document.querySelector('input[name=ahb_ie_rimg]:checked').value;
                document.getElementById('ahb-ie-rem-progress').style.display = '';
                let offset = 0, total = 0, ok = 0, skip = 0, err = 0;
                while (true) {
                    const fd = new FormData();
                    fd.append('action', 'ahb_ie_remote');
                    fd.append('_ajax_nonce', NONCE);
                    fd.append('url', url);
                    fd.append('token', tok);
                    fd.append('type', type);
                    fd.append('offset', offset);
                    fd.append('img_mode', imgMode);
                    const r = await fetch(AJAX, { method: 'POST', body: fd, credentials: 'same-origin' });
                    const j = await r.json();
                    if (!j.success) { alert('Hata: ' + (j.data && j.data.msg || 'çekme hatası')); return; }
                    total = j.data.total;
                    offset += j.data.fetched;
                    ok += j.data.ok; skip += j.data.skip; err += j.data.err;
                    const pct = total ? Math.round(offset / total * 100) : 100;
                    document.getElementById('ahb-ie-rem-bar').style.width = pct + '%';
                    document.getElementById('ahb-ie-rem-text').textContent = `${offset}/${total} · ✅ ${ok} · ⏭ ${skip} · ❌ ${err}`;
                    if (j.data.fetched === 0 || offset >= total) break;
                }
                document.getElementById('ahb-ie-rem-text').textContent += '  →  TAMAMLANDI';
            });

            // ============ TOKEN ============
            document.getElementById('ahb-ie-token-gen').addEventListener('click', () => {
                const arr = new Uint8Array(24);
                crypto.getRandomValues(arr);
                document.getElementById('ahb-ie-token-val').value = Array.from(arr).map(b => b.toString(16).padStart(2,'0')).join('');
            });
            document.getElementById('ahb-ie-token-save').addEventListener('click', async () => {
                const v = document.getElementById('ahb-ie-token-val').value.trim();
                const fd = new FormData();
                fd.append('action', 'ahb_ie_token');
                fd.append('_ajax_nonce', NONCE);
                fd.append('token', v);
                const r = await fetch(AJAX, { method: 'POST', body: fd, credentials: 'same-origin' });
                const j = await r.json();
                document.getElementById('ahb-ie-token-msg').textContent = j.success ? '✅ Kaydedildi' : '❌ Hata';
            });
        })();
        </script>
        <?php
    }

    /* ====================== HELPERS ====================== */

    private function liste_post_types() {
        $out = array();
        // TUM post type'lari listele (private/custom dahil) — ky-yazar gibi
        // ozel post type'larin gorunmesi icin 'public' filtresini koymuyoruz.
        $skip = array(
            'attachment', 'revision', 'nav_menu_item', 'customize_changeset',
            'oembed_cache', 'user_request', 'wp_block', 'wp_template',
            'wp_template_part', 'wp_navigation', 'wp_global_styles',
            'wp_font_face', 'wp_font_family', 'custom_css',
        );
        $types = get_post_types( array(), 'objects' );
        foreach ( $types as $pt ) {
            if ( in_array( $pt->name, $skip, true ) ) continue;
            $label = $pt->label ?: $pt->name;
            $out[ $pt->name ] = $label . ' (' . $pt->name . ')';
        }
        // WP Taksonomileri (kategori, etiket vb.) — bos olanlar dahil
        $out['__tax__'] = '🏷 WP Kategoriler / Etiketler (tum taksonomiler)';
        // Kose Yazarlari (ky_yazarlar custom tablosu) — varsa
        if ( $this->ozel_tablo_var_mi( 'ky_yazarlar' ) ) {
            $out['__tbl_ky_yazarlar__'] = '✍️ Köşe Yazarları (ky_yazarlar tablosu)';
        }
        // Yazar-Kategori eslesmeleri (opma_author_categories) — varsa
        if ( $this->ozel_tablo_var_mi( 'opma_author_categories' ) ) {
            $out['__tbl_opma_author_categories__'] = '🔗 Yazar-Kategori Eşleşmeleri (opma_author_categories)';
        }
        // Video TV tablolari (varsa) — sirayla aktarilmali
        if ( $this->vtv_var_mi() ) {
            $out['vtv_kategori']       = '📺 Video TV: 1) Kategoriler';
            $out['vtv_kaynak']         = '📺 Video TV: 2) Kaynaklar (Kanallar)';
            $out['vtv_video']          = '📺 Video TV: 3) Videolar';
            $out['vtv_playlist']       = '📺 Video TV: 4) Playlistler';
            $out['vtv_playlist_video'] = '📺 Video TV: 5) Playlist Videolari';
            $out['vtv_ayar']           = '📺 Video TV: 6) Ayarlar';
        }
        return $out;
    }

    /* ============ ÖZEL TABLO (generic) destegi ============
     * ky_yazarlar gibi 3. parti custom tablolari icin tek-tablo dinamik
     * export/import. Sema DESCRIBE ile cekilir, ID korunarak REPLACE INTO
     * kullanilir (yazar ID referanslari kirilmasin).
     */
    private function ozel_tablo_var_mi( $kisa_ad ) {
        global $wpdb;
        $tbl = $wpdb->prefix . $kisa_ad;
        return (bool) $wpdb->get_var( $wpdb->prepare( "SHOW TABLES LIKE %s", $tbl ) );
    }

    /** Type slugundan tablo kisa adini cikar: __tbl_ky_yazarlar__ -> ky_yazarlar */
    private function ozel_tablo_adi( $type ) {
        if ( strpos( $type, '__tbl_' ) === 0 && substr( $type, -2 ) === '__' ) {
            return substr( $type, 6, -2 );
        }
        return '';
    }

    private function ozel_tablo_count( $type ) {
        global $wpdb;
        $kisa = $this->ozel_tablo_adi( $type );
        if ( ! $kisa || ! $this->ozel_tablo_var_mi( $kisa ) ) return 0;
        $tbl = $wpdb->prefix . $kisa;
        return (int) $wpdb->get_var( "SELECT COUNT(*) FROM `" . esc_sql( $tbl ) . "`" );
    }

    private function ozel_tablo_rows( $type, $offset, $limit ) {
        global $wpdb;
        $kisa = $this->ozel_tablo_adi( $type );
        if ( ! $kisa || ! $this->ozel_tablo_var_mi( $kisa ) ) return array();
        $tbl = $wpdb->prefix . $kisa;
        // Birincil anahtari bul (yoksa ilk kolon)
        $cols = $wpdb->get_results( "SHOW COLUMNS FROM `" . esc_sql( $tbl ) . "`", ARRAY_A );
        $pk   = '';
        foreach ( $cols as $c ) {
            if ( ( $c['Key'] ?? '' ) === 'PRI' ) { $pk = $c['Field']; break; }
        }
        if ( ! $pk && $cols ) $pk = $cols[0]['Field'];
        $rows = $wpdb->get_results( $wpdb->prepare(
            "SELECT * FROM `" . esc_sql( $tbl ) . "` ORDER BY `" . esc_sql( $pk ) . "` ASC LIMIT %d OFFSET %d",
            $limit, $offset
        ), ARRAY_A );
        return $rows ?: array();
    }

    /** REPLACE INTO ile satir ekle — orijinal ID korunur, ayni ID varsa uzerine yazar.
     * Donus: 'ok' | 'skip' | 'err' (vtv_import_row ile uyumlu)
     */
    private function ozel_tablo_import_row( $type, $row ) {
        global $wpdb;
        $kisa = $this->ozel_tablo_adi( $type );
        if ( ! $kisa || ! $this->ozel_tablo_var_mi( $kisa ) ) return 'skip';
        if ( ! is_array( $row ) || empty( $row ) ) return 'skip';
        $tbl = $wpdb->prefix . $kisa;
        $col_rows = $wpdb->get_col( "SHOW COLUMNS FROM `" . esc_sql( $tbl ) . "`" );
        $temiz = array();
        foreach ( $col_rows as $c ) {
            if ( array_key_exists( $c, $row ) ) $temiz[ $c ] = $row[ $c ];
        }
        if ( empty( $temiz ) ) return 'err';
        $kolonlar = array();
        $placeholders = array();
        $values = array();
        foreach ( $temiz as $k => $v ) {
            $kolonlar[] = '`' . esc_sql( $k ) . '`';
            if ( is_null( $v ) ) { $placeholders[] = 'NULL'; }
            elseif ( is_int( $v ) ) { $placeholders[] = '%d'; $values[] = $v; }
            elseif ( is_float( $v ) ) { $placeholders[] = '%f'; $values[] = $v; }
            else { $placeholders[] = '%s'; $values[] = (string) $v; }
        }
        $sql = "REPLACE INTO `" . esc_sql( $tbl ) . "` (" . implode( ',', $kolonlar ) . ") VALUES (" . implode( ',', $placeholders ) . ")";
        $ok  = $values ? $wpdb->query( $wpdb->prepare( $sql, $values ) ) : $wpdb->query( $sql );
        return ( $ok === false ) ? 'err' : 'ok';
    }

    private function vtv_var_mi() {
        global $wpdb;
        $t = $wpdb->prefix . 'vtv_kategoriler';
        return (bool) $wpdb->get_var( $wpdb->prepare( "SHOW TABLES LIKE %s", $t ) );
    }

    private function vtv_tablo_haritasi() {
        global $wpdb;
        return array(
            'vtv_kategori'       => $wpdb->prefix . 'vtv_kategoriler',
            'vtv_kaynak'         => $wpdb->prefix . 'vtv_kaynaklar',
            'vtv_video'          => $wpdb->prefix . 'vtv_videolar',
            'vtv_playlist'       => $wpdb->prefix . 'vtv_playlistler',
            'vtv_playlist_video' => $wpdb->prefix . 'vtv_playlist_videolar',
            'vtv_ayar'           => $wpdb->prefix . 'vtv_ayarlar',
        );
    }

    /* ============ VIDEO TV: EXPORT ============ */

    private function vtv_count( $type ) {
        global $wpdb;
        $tbl = $this->vtv_tablo_haritasi();
        if ( empty( $tbl[ $type ] ) ) return 0;
        return (int) $wpdb->get_var( "SELECT COUNT(*) FROM `" . esc_sql( $tbl[ $type ] ) . "`" );
    }

    private function vtv_rows( $type, $offset, $limit ) {
        global $wpdb;
        $tbl = $this->vtv_tablo_haritasi();
        if ( empty( $tbl[ $type ] ) ) return array();
        $rows = $wpdb->get_results( $wpdb->prepare(
            "SELECT * FROM `" . esc_sql( $tbl[ $type ] ) . "` ORDER BY " .
            ( $type === 'vtv_ayar' ? 'ayar_adi' : 'id' ) .
            " ASC LIMIT %d OFFSET %d",
            $limit, $offset
        ), ARRAY_A );
        return $rows ?: array();
    }

    /* ============ VIDEO TV: IMPORT (ID eslemeli) ============ */

    private function vtv_map_get( $table ) {
        return get_option( 'ahb_vtv_id_map_' . $table, array() );
    }
    private function vtv_map_set( $table, $map ) {
        update_option( 'ahb_vtv_id_map_' . $table, $map, false );
    }

    /**
     * VTV satirini hedef tabloya ekle. ID cakismasi yapmaz; orijinal ID
     * yeni ID'ye eslenir ve eslemeler ahb_vtv_id_map_<table> option'da tutulur.
     */
    private function vtv_import_row( $type, $row, $img_mode ) {
        global $wpdb;
        $tbl = $this->vtv_tablo_haritasi();
        if ( empty( $tbl[ $type ] ) || ! is_array( $row ) ) return 'err';
        $table = $tbl[ $type ];
        $orig_id = isset( $row['id'] ) ? (int) $row['id'] : 0;
        unset( $row['id'] );

        // Resim modu: link (varsayilan) | download | skip
        $img_cols = array(
            'vtv_kategori'       => array(),
            'vtv_kaynak'         => array( 'kapak_resmi', 'logo', 'kanal_logo', 'kanal_banner' ),
            'vtv_video'          => array( 'thumbnail' ),
            'vtv_playlist'       => array( 'thumbnail' ),
            'vtv_playlist_video' => array( 'thumbnail' ),
            'vtv_ayar'           => array(),
        );
        if ( ! empty( $img_cols[ $type ] ) ) {
            foreach ( $img_cols[ $type ] as $col ) {
                if ( empty( $row[ $col ] ) ) continue;
                if ( $img_mode === 'skip' ) {
                    $row[ $col ] = '';
                } elseif ( $img_mode === 'download' ) {
                    $att = $this->indir_attachment( $row[ $col ], 0 );
                    if ( $att ) {
                        $u = wp_get_attachment_url( $att );
                        if ( $u ) $row[ $col ] = $u;
                    }
                }
                // link modu: dokunma
            }
        }

        // FK (yabanci anahtar) yeniden eslemesi
        if ( $type === 'vtv_kaynak' && ! empty( $row['kategori_id'] ) ) {
            $m = $this->vtv_map_get( 'vtv_kategori' );
            $row['kategori_id'] = (int) ( $m[ (int) $row['kategori_id'] ] ?? 0 );
        }
        if ( $type === 'vtv_video' ) {
            $mk = $this->vtv_map_get( 'vtv_kaynak' );
            $mc = $this->vtv_map_get( 'vtv_kategori' );
            if ( ! empty( $row['kaynak_id'] ) )   $row['kaynak_id']   = (int) ( $mk[ (int) $row['kaynak_id'] ] ?? 0 );
            if ( ! empty( $row['kategori_id'] ) ) $row['kategori_id'] = (int) ( $mc[ (int) $row['kategori_id'] ] ?? 0 );
        }
        if ( $type === 'vtv_playlist' && ! empty( $row['kaynak_id'] ) ) {
            $m = $this->vtv_map_get( 'vtv_kaynak' );
            $row['kaynak_id'] = (int) ( $m[ (int) $row['kaynak_id'] ] ?? 0 );
        }
        if ( $type === 'vtv_playlist_video' ) {
            $mp = $this->vtv_map_get( 'vtv_playlist' );
            $mk = $this->vtv_map_get( 'vtv_kaynak' );
            if ( ! empty( $row['playlist_id_db'] ) ) $row['playlist_id_db'] = (int) ( $mp[ (int) $row['playlist_id_db'] ] ?? 0 );
            if ( ! empty( $row['kaynak_id'] ) )      $row['kaynak_id']      = (int) ( $mk[ (int) $row['kaynak_id'] ] ?? 0 );
        }

        // AYAR tipi: ayar_adi UNIQUE → upsert
        if ( $type === 'vtv_ayar' ) {
            $exists = $wpdb->get_var( $wpdb->prepare( "SELECT ayar_adi FROM `" . esc_sql( $table ) . "` WHERE ayar_adi=%s", $row['ayar_adi'] ?? '' ) );
            if ( $exists !== null ) {
                $wpdb->update( $table, array( 'ayar_deger' => $row['ayar_deger'] ?? '' ), array( 'ayar_adi' => $row['ayar_adi'] ) );
                return 'ok';
            }
            $wpdb->insert( $table, $row );
            return $wpdb->insert_id ? 'ok' : 'err';
        }

        // Cakisma kontrolu (slug, isim+platform vb.)
        if ( $type === 'vtv_kategori' && ! empty( $row['slug'] ) ) {
            $exists = (int) $wpdb->get_var( $wpdb->prepare( "SELECT id FROM `" . esc_sql( $table ) . "` WHERE slug=%s", $row['slug'] ) );
            if ( $exists ) {
                if ( $orig_id ) { $m = $this->vtv_map_get( 'vtv_kategori' ); $m[ $orig_id ] = $exists; $this->vtv_map_set( 'vtv_kategori', $m ); }
                return 'skip';
            }
        }
        if ( $type === 'vtv_kaynak' && ! empty( $row['kanal_id'] ) ) {
            $exists = (int) $wpdb->get_var( $wpdb->prepare( "SELECT id FROM `" . esc_sql( $table ) . "` WHERE kanal_id=%s AND platform=%s", $row['kanal_id'], $row['platform'] ?? 'youtube' ) );
            if ( $exists ) {
                if ( $orig_id ) { $m = $this->vtv_map_get( 'vtv_kaynak' ); $m[ $orig_id ] = $exists; $this->vtv_map_set( 'vtv_kaynak', $m ); }
                return 'skip';
            }
        }
        if ( $type === 'vtv_video' && ! empty( $row['video_id'] ) ) {
            $exists = (int) $wpdb->get_var( $wpdb->prepare( "SELECT id FROM `" . esc_sql( $table ) . "` WHERE video_id=%s AND platform=%s", $row['video_id'], $row['platform'] ?? 'youtube' ) );
            if ( $exists ) return 'skip';
        }
        if ( $type === 'vtv_playlist' && ! empty( $row['playlist_id'] ) ) {
            $exists = (int) $wpdb->get_var( $wpdb->prepare( "SELECT id FROM `" . esc_sql( $table ) . "` WHERE playlist_id=%s AND platform=%s", $row['playlist_id'], $row['platform'] ?? 'youtube' ) );
            if ( $exists ) {
                if ( $orig_id ) { $m = $this->vtv_map_get( 'vtv_playlist' ); $m[ $orig_id ] = $exists; $this->vtv_map_set( 'vtv_playlist', $m ); }
                return 'skip';
            }
        }

        $ok = $wpdb->insert( $table, $row );
        if ( ! $ok ) return 'err';
        $new_id = (int) $wpdb->insert_id;
        if ( $orig_id && in_array( $type, array( 'vtv_kategori', 'vtv_kaynak', 'vtv_playlist' ), true ) ) {
            $m = $this->vtv_map_get( $type );
            $m[ $orig_id ] = $new_id;
            $this->vtv_map_set( $type, $m );
        }
        return 'ok';
    }

    /* ============ TAKSONOMI EXPORT/IMPORT (kategoriler vb.) ============ */

    private function tax_export_all() {
        $taxes = get_taxonomies( array( 'public' => true ), 'objects' );
        $out = array();
        foreach ( $taxes as $tax ) {
            $terms = get_terms( array( 'taxonomy' => $tax->name, 'hide_empty' => false ) );
            if ( is_wp_error( $terms ) ) continue;
            $list = array();
            foreach ( $terms as $t ) {
                $parent_slug = '';
                if ( $t->parent ) {
                    $p = get_term( $t->parent, $tax->name );
                    if ( $p && ! is_wp_error( $p ) ) $parent_slug = $p->slug;
                }
                $list[] = array(
                    'name'        => $t->name,
                    'slug'        => $t->slug,
                    'description' => $t->description,
                    'parent_slug' => $parent_slug,
                );
            }
            $out[] = array( 'taxonomy' => $tax->name, 'label' => $tax->label, 'terms' => $list );
        }
        return $out;
    }

    private function tax_import_one( $item ) {
        $tax = $item['taxonomy'] ?? '';
        if ( ! taxonomy_exists( $tax ) ) return 'err';
        $terms = $item['terms'] ?? array();
        // Iki gecis: once parent'siz olanlari, sonra parent'lari
        $by_slug = array();
        foreach ( $terms as $t ) {
            $existing = get_term_by( 'slug', $t['slug'], $tax );
            if ( $existing ) { $by_slug[ $t['slug'] ] = $existing->term_id; continue; }
            $r = wp_insert_term( $t['name'], $tax, array( 'slug' => $t['slug'], 'description' => $t['description'] ?? '' ) );
            if ( ! is_wp_error( $r ) ) $by_slug[ $t['slug'] ] = (int) $r['term_id'];
        }
        foreach ( $terms as $t ) {
            if ( empty( $t['parent_slug'] ) ) continue;
            if ( empty( $by_slug[ $t['slug'] ] ) || empty( $by_slug[ $t['parent_slug'] ] ) ) continue;
            wp_update_term( $by_slug[ $t['slug'] ], $tax, array( 'parent' => $by_slug[ $t['parent_slug'] ] ) );
        }
        return 'ok';
    }

    private function tum_statusler() {
        return array( 'publish', 'draft', 'pending', 'future', 'private', 'trash' );
    }

    /**
     * Tek bir post'u JSON-uyumlu diziye cevir.
     */
    private function post_to_array( $post_id ) {
        $p = get_post( $post_id );
        if ( ! $p ) return null;
        $thumb_url = '';
        $tid = get_post_thumbnail_id( $post_id );
        if ( $tid ) {
            $u = wp_get_attachment_url( $tid );
            if ( $u ) $thumb_url = $u;
        }
        if ( ! $thumb_url ) {
            $alt = get_post_meta( $post_id, '_ahb_resim_url', true );
            if ( $alt ) $thumb_url = $alt;
        }
        // Taxonomiler
        $tax_terms = array();
        $cat_names = array();
        $taxes = get_object_taxonomies( $p->post_type );
        foreach ( $taxes as $tax ) {
            $terms = wp_get_object_terms( $post_id, $tax, array( 'fields' => 'all' ) );
            if ( is_wp_error( $terms ) ) continue;
            $tax_terms[ $tax ] = array();
            foreach ( $terms as $t ) {
                $tax_terms[ $tax ][] = array( 'name' => $t->name, 'slug' => $t->slug );
                // "kategori", "category", "haber-kategorisi" gibi kategori taksonomilerini okunabilir özete ekle
                if ( preg_match( '/(category|kategori)/i', $tax ) ) $cat_names[] = $t->name;
            }
        }
        $categories_text = implode( ', ', array_values( array_unique( $cat_names ) ) );
        // Meta'lar (private "_" ile baslayan dahil ama wp internal'lari at)
        $meta_raw = get_post_meta( $post_id );
        $meta = array();
        $skip_meta = array( '_edit_lock', '_edit_last', '_thumbnail_id' );
        foreach ( $meta_raw as $k => $vals ) {
            if ( in_array( $k, $skip_meta, true ) ) continue;
            // Dizi -> tek deger sadelestir
            $meta[ $k ] = ( count( $vals ) === 1 ) ? maybe_unserialize( $vals[0] ) : array_map( 'maybe_unserialize', $vals );
        }
        $author_login = '';
        if ( $p->post_author ) {
            $u = get_userdata( $p->post_author );
            if ( $u ) $author_login = $u->user_login;
        }
        return array(
            'id'                 => $p->ID,
            'title'              => $p->post_title,
            'slug'               => $p->post_name,
            'content'            => $p->post_content,
            'excerpt'            => $p->post_excerpt,
            'status'             => $p->post_status,
            'date'               => $p->post_date,
            'date_gmt'           => $p->post_date_gmt,
            'type'               => $p->post_type,
            'author_login'       => $author_login,
            'taxonomies'         => $tax_terms,
            'categories_text'    => $categories_text,
            'featured_image_url' => $thumb_url,
            'meta'               => $meta,
        );
    }

    private function user_to_array( $u ) {
        $avatar_url = '';
        $avatar_id  = get_user_meta( $u->ID, 'wp_user_avatar', true ); // basic_user_avatars / wp_user_avatars
        if ( $avatar_id ) {
            $avatar_url = wp_get_attachment_url( $avatar_id );
        }
        if ( ! $avatar_url ) {
            $avatar_url = get_avatar_url( $u->ID );
        }
        return array(
            'login'        => $u->user_login,
            'email'        => $u->user_email,
            'display_name' => $u->display_name,
            'first_name'   => get_user_meta( $u->ID, 'first_name', true ),
            'last_name'    => get_user_meta( $u->ID, 'last_name', true ),
            'description'  => get_user_meta( $u->ID, 'description', true ),
            'roles'        => $u->roles,
            'url'          => $u->user_url,
            'avatar_url'   => $avatar_url,
            'meta'         => array(
                'twitter'  => get_user_meta( $u->ID, 'twitter', true ),
                'facebook' => get_user_meta( $u->ID, 'facebook', true ),
                'youtube'  => get_user_meta( $u->ID, 'youtube', true ),
                'instagram'=> get_user_meta( $u->ID, 'instagram', true ),
            ),
        );
    }

    /**
     * Bir item'i bu siteye ekler. Slug cakismasinda atlar.
     * @return string 'ok' | 'skip' | 'err'
     */
    private function import_item( $item, $type, $img_mode ) {
        if ( $type === '__users__' ) {
            return $this->import_user( $item, $img_mode );
        }
        $slug = sanitize_title( $item['slug'] ?? sanitize_title( $item['title'] ?? '' ) );
        if ( $slug === '' ) return 'err';
        // Cakisma kontrolu
        $existing = get_page_by_path( $slug, OBJECT, $type );
        if ( $existing ) return 'skip';

        $author_id = 0;
        if ( ! empty( $item['author_login'] ) ) {
            $u = get_user_by( 'login', $item['author_login'] );
            if ( $u ) $author_id = $u->ID;
        }
        $post_arr = array(
            'post_title'    => $item['title'] ?? '',
            'post_name'     => $slug,
            'post_content'  => $item['content'] ?? '',
            'post_excerpt'  => $item['excerpt'] ?? '',
            'post_status'   => $item['status'] ?? 'draft',
            'post_type'     => $type,
            'post_date'     => $item['date'] ?? current_time( 'mysql' ),
            'post_date_gmt' => $item['date_gmt'] ?? current_time( 'mysql', 1 ),
            'post_author'   => $author_id ?: get_current_user_id(),
        );
        $pid = wp_insert_post( wp_slash( $post_arr ), true );
        if ( is_wp_error( $pid ) || ! $pid ) return 'err';

        // Taxonomiler
        if ( ! empty( $item['taxonomies'] ) && is_array( $item['taxonomies'] ) ) {
            foreach ( $item['taxonomies'] as $tax => $terms ) {
                if ( ! taxonomy_exists( $tax ) ) continue;
                $term_ids = array();
                foreach ( $terms as $t ) {
                    $name = $t['name'] ?? '';
                    $slg  = $t['slug'] ?? sanitize_title( $name );
                    if ( $name === '' ) continue;
                    $term = get_term_by( 'slug', $slg, $tax );
                    if ( ! $term ) {
                        $r = wp_insert_term( $name, $tax, array( 'slug' => $slg ) );
                        if ( ! is_wp_error( $r ) ) $term_ids[] = (int) $r['term_id'];
                    } else {
                        $term_ids[] = (int) $term->term_id;
                    }
                }
                if ( $term_ids ) wp_set_object_terms( $pid, $term_ids, $tax );
            }
        }

        // Meta'lar
        if ( ! empty( $item['meta'] ) && is_array( $item['meta'] ) ) {
            foreach ( $item['meta'] as $k => $v ) {
                if ( $k === '_thumbnail_id' ) continue;
                update_post_meta( $pid, $k, $v );
            }
        }

        // Resim
        $img_url = $item['featured_image_url'] ?? '';
        if ( $img_url && $img_mode !== 'skip' ) {
            if ( $img_mode === 'download' ) {
                $att = $this->indir_ve_thumb_yap( $img_url, $pid );
                if ( ! $att ) update_post_meta( $pid, '_ahb_resim_url', esc_url_raw( $img_url ) );
            } else {
                update_post_meta( $pid, '_ahb_resim_url', esc_url_raw( $img_url ) );
            }
        }
        return 'ok';
    }

    private function import_user( $item, $img_mode ) {
        $login = sanitize_user( $item['login'] ?? '' );
        if ( $login === '' ) return 'err';
        if ( username_exists( $login ) ) return 'skip';
        $email = sanitize_email( $item['email'] ?? ( $login . '@' . wp_parse_url( home_url(), PHP_URL_HOST ) ) );
        if ( email_exists( $email ) ) $email = $login . '+' . wp_generate_password( 4, false ) . '@' . wp_parse_url( home_url(), PHP_URL_HOST );
        $uid = wp_insert_user( array(
            'user_login'   => $login,
            'user_email'   => $email,
            'user_pass'    => wp_generate_password( 16 ),
            'display_name' => $item['display_name'] ?? $login,
            'first_name'   => $item['first_name'] ?? '',
            'last_name'    => $item['last_name'] ?? '',
            'description'  => $item['description'] ?? '',
            'user_url'     => $item['url'] ?? '',
            'role'         => ( ! empty( $item['roles'][0] ) ? $item['roles'][0] : 'author' ),
        ) );
        if ( is_wp_error( $uid ) ) return 'err';
        if ( ! empty( $item['meta'] ) && is_array( $item['meta'] ) ) {
            foreach ( $item['meta'] as $k => $v ) {
                if ( $v !== '' ) update_user_meta( $uid, $k, $v );
            }
        }
        $av = $item['avatar_url'] ?? '';
        if ( $av && $img_mode !== 'skip' ) {
            if ( $img_mode === 'download' ) {
                $att = $this->indir_attachment( $av, 0 );
                if ( $att ) {
                    update_user_meta( $uid, 'wp_user_avatar', $att );
                    update_user_meta( $uid, 'simple_local_avatar', array( 'media_id' => $att, 'full' => wp_get_attachment_url( $att ) ) );
                } else {
                    update_user_meta( $uid, 'ahb_avatar_url', esc_url_raw( $av ) );
                }
            } else {
                update_user_meta( $uid, 'ahb_avatar_url', esc_url_raw( $av ) );
            }
        }
        return 'ok';
    }

    private function indir_ve_thumb_yap( $url, $post_id ) {
        $att = $this->indir_attachment( $url, $post_id );
        if ( $att ) {
            set_post_thumbnail( $post_id, $att );
            return $att;
        }
        return 0;
    }

    private function indir_attachment( $url, $post_id ) {
        if ( ! function_exists( 'media_handle_sideload' ) ) {
            require_once ABSPATH . 'wp-admin/includes/file.php';
            require_once ABSPATH . 'wp-admin/includes/media.php';
            require_once ABSPATH . 'wp-admin/includes/image.php';
        }
        $tmp = download_url( $url, 25 );
        if ( is_wp_error( $tmp ) ) return 0;
        $name = basename( wp_parse_url( $url, PHP_URL_PATH ) );
        if ( ! $name ) $name = 'image-' . md5( $url ) . '.jpg';
        $file = array( 'name' => $name, 'tmp_name' => $tmp );
        $att = media_handle_sideload( $file, (int) $post_id );
        if ( is_wp_error( $att ) ) {
            @unlink( $tmp );
            return 0;
        }
        return (int) $att;
    }

    /* ====================== AJAX HANDLERS ====================== */

    public function ajax_export() {
        check_ajax_referer( self::NONCE );
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( array( 'msg' => 'yetki yok' ) );
        $type     = sanitize_text_field( $_POST['type'] ?? '' );
        $offset   = max( 0, (int) ( $_POST['offset'] ?? 0 ) );
        $statuses = array_filter( array_map( 'sanitize_text_field', explode( ',', (string) ( $_POST['statuses'] ?? '' ) ) ) );
        if ( ! $statuses ) $statuses = array( 'publish' );

        if ( $type === '__users__' ) {
            $total = (int) count_users()['total_users'];
            $users = get_users( array(
                'number' => self::BATCH_SIZE,
                'offset' => $offset,
                'orderby'=> 'ID',
                'order'  => 'ASC',
            ) );
            $items = array_map( array( $this, 'user_to_array' ), $users );
            wp_send_json_success( array( 'total' => $total, 'items' => $items, 'now' => current_time( 'mysql' ) ) );
        }

        if ( $type === '__tax__' ) {
            // Tek seferde tum taksonomileri don (genelde kucuk)
            $items = ( $offset === 0 ) ? $this->tax_export_all() : array();
            wp_send_json_success( array( 'total' => count( $items ), 'items' => $items, 'now' => current_time( 'mysql' ) ) );
        }

        if ( strpos( $type, 'vtv_' ) === 0 ) {
            $total = $this->vtv_count( $type );
            $items = $this->vtv_rows( $type, $offset, self::BATCH_SIZE );
            wp_send_json_success( array( 'total' => $total, 'items' => $items, 'now' => current_time( 'mysql' ) ) );
        }

        if ( strpos( $type, '__tbl_' ) === 0 ) {
            $total = $this->ozel_tablo_count( $type );
            $items = $this->ozel_tablo_rows( $type, $offset, self::BATCH_SIZE );
            wp_send_json_success( array( 'total' => $total, 'items' => $items, 'now' => current_time( 'mysql' ) ) );
        }

        if ( ! post_type_exists( $type ) ) wp_send_json_error( array( 'msg' => 'gecersiz tur' ) );

        // Kategori filtresi (opsiyonel) — "taxonomy:term_id" formatinda virgulle ayrilmis liste
        $raw_cats = (string) ( $_POST['cats'] ?? '' );
        $tax_groups = array(); // [taxonomy => [term_id, ...]]
        if ( $raw_cats !== '' ) {
            foreach ( explode( ',', $raw_cats ) as $pair ) {
                $pair = trim( $pair );
                if ( $pair === '' || strpos( $pair, ':' ) === false ) continue;
                list( $tx, $tid ) = explode( ':', $pair, 2 );
                $tx  = sanitize_key( $tx );
                $tid = (int) $tid;
                if ( $tx && $tid && taxonomy_exists( $tx ) ) {
                    $tax_groups[ $tx ][] = $tid;
                }
            }
        }
        $args = array(
            'post_type'      => $type,
            'post_status'    => $statuses,
            'posts_per_page' => self::BATCH_SIZE,
            'offset'         => $offset,
            'orderby'        => 'ID',
            'order'          => 'ASC',
            'no_found_rows'  => false,
            'fields'         => 'ids',
        );
        if ( ! empty( $tax_groups ) ) {
            $tq = array( 'relation' => 'OR' );
            foreach ( $tax_groups as $tx => $ids ) {
                $tq[] = array(
                    'taxonomy'         => $tx,
                    'field'            => 'term_id',
                    'terms'            => array_values( array_unique( $ids ) ),
                    'include_children' => true,
                );
            }
            $args['tax_query'] = $tq;
        }
        $q = new WP_Query( $args );
        $items = array();
        foreach ( $q->posts as $pid ) {
            $a = $this->post_to_array( $pid );
            if ( $a ) $items[] = $a;
        }
        wp_send_json_success( array( 'total' => (int) $q->found_posts, 'items' => $items, 'now' => current_time( 'mysql' ) ) );
    }

    public function ajax_import() {
        check_ajax_referer( self::NONCE );
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( array( 'msg' => 'yetki yok' ) );
        $type     = sanitize_text_field( $_POST['type'] ?? '' );
        $img_mode = in_array( $_POST['img_mode'] ?? '', array( 'link', 'download', 'skip' ), true ) ? $_POST['img_mode'] : 'link';
        $items    = json_decode( wp_unslash( $_POST['items'] ?? '[]' ), true );
        if ( ! is_array( $items ) ) wp_send_json_error( array( 'msg' => 'gecersiz veri' ) );
        $ok = 0; $skip = 0; $err = 0;
        foreach ( $items as $it ) {
            if ( $type === '__tax__' )                      $r = $this->tax_import_one( $it );
            elseif ( strpos( $type, 'vtv_' ) === 0 )        $r = $this->vtv_import_row( $type, $it, $img_mode );
            elseif ( strpos( $type, '__tbl_' ) === 0 )      $r = $this->ozel_tablo_import_row( $type, $it );
            else                                             $r = $this->import_item( $it, $type, $img_mode );
            if ( $r === 'ok' ) $ok++;
            elseif ( $r === 'skip' ) $skip++;
            else $err++;
        }
        wp_send_json_success( compact( 'ok', 'skip', 'err' ) );
    }

    public function ajax_save_token() {
        check_ajax_referer( self::NONCE );
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( array( 'msg' => 'yetki yok' ) );
        $tok = preg_replace( '/[^a-zA-Z0-9]/', '', (string) ( $_POST['token'] ?? '' ) );
        update_option( self::TOKEN_OPT, $tok );
        wp_send_json_success();
    }

    public function ajax_remote_types() {
        check_ajax_referer( self::NONCE );
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( array( 'msg' => 'yetki yok' ) );
        $url   = esc_url_raw( $_POST['url'] ?? '' );
        $token = preg_replace( '/[^a-zA-Z0-9]/', '', (string) ( $_POST['token'] ?? '' ) );
        if ( ! $url || ! $token ) wp_send_json_error( array( 'msg' => 'eksik bilgi' ) );
        $r = wp_remote_get( trailingslashit( $url ) . 'wp-json/' . self::REST_NS . '/types?token=' . urlencode( $token ), array( 'timeout' => 20, 'sslverify' => false ) );
        if ( is_wp_error( $r ) ) wp_send_json_error( array( 'msg' => $r->get_error_message() ) );
        $code = (int) wp_remote_retrieve_response_code( $r );
        $body = json_decode( wp_remote_retrieve_body( $r ), true );
        if ( $code !== 200 || ! is_array( $body ) ) wp_send_json_error( array( 'msg' => 'hedef site yanit vermedi (HTTP ' . $code . ')' ) );
        wp_send_json_success( $body );
    }

    public function ajax_remote_fetch() {
        check_ajax_referer( self::NONCE );
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( array( 'msg' => 'yetki yok' ) );
        $url      = esc_url_raw( $_POST['url'] ?? '' );
        $token    = preg_replace( '/[^a-zA-Z0-9]/', '', (string) ( $_POST['token'] ?? '' ) );
        $type     = sanitize_text_field( $_POST['type'] ?? '' );
        $offset   = max( 0, (int) ( $_POST['offset'] ?? 0 ) );
        $img_mode = in_array( $_POST['img_mode'] ?? '', array( 'link', 'download', 'skip' ), true ) ? $_POST['img_mode'] : 'link';
        if ( ! $url || ! $token || ! $type ) wp_send_json_error( array( 'msg' => 'eksik bilgi' ) );

        $endpoint = trailingslashit( $url ) . 'wp-json/' . self::REST_NS . '/export?token=' . urlencode( $token )
                    . '&type=' . urlencode( $type ) . '&offset=' . $offset . '&limit=' . self::BATCH_SIZE;
        $r = wp_remote_get( $endpoint, array( 'timeout' => 60, 'sslverify' => false ) );
        if ( is_wp_error( $r ) ) wp_send_json_error( array( 'msg' => $r->get_error_message() ) );
        $body = json_decode( wp_remote_retrieve_body( $r ), true );
        if ( ! is_array( $body ) || ! isset( $body['items'] ) ) wp_send_json_error( array( 'msg' => 'gecersiz yanit' ) );

        $ok = 0; $skip = 0; $err = 0;
        foreach ( $body['items'] as $it ) {
            if ( $type === '__tax__' )                      $r2 = $this->tax_import_one( $it );
            elseif ( strpos( $type, 'vtv_' ) === 0 )        $r2 = $this->vtv_import_row( $type, $it, $img_mode );
            elseif ( strpos( $type, '__tbl_' ) === 0 )      $r2 = $this->ozel_tablo_import_row( $type, $it );
            else                                             $r2 = $this->import_item( $it, $type, $img_mode );
            if ( $r2 === 'ok' ) $ok++;
            elseif ( $r2 === 'skip' ) $skip++;
            else $err++;
        }
        wp_send_json_success( array(
            'total'   => (int) ( $body['total'] ?? 0 ),
            'fetched' => count( $body['items'] ),
            'ok'      => $ok, 'skip' => $skip, 'err' => $err,
        ) );
    }

    /* ====================== DB KESIF (Yardimci) ======================
     * Kullanici "ky-yazar" gibi gorunmeyen veriler icin DB tablolarini ve
     * post tipi sayilarini listeler. Sonucu kullanici bize iletir, biz desteg
     * ekleriz.
     */
    /**
     * Bir post tipine bagli tum taksonomileri ve term'leri dondurur.
     * Cikti: { groups: [{ taxonomy, label, terms: [{id,name,count}] }] }
     */
    public function ajax_tax_terms() {
        check_ajax_referer( self::NONCE );
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( array( 'msg' => 'yetki yok' ), 403 );
        $type = sanitize_key( $_POST['type'] ?? '' );
        if ( ! $type || ! post_type_exists( $type ) ) {
            wp_send_json_success( array( 'groups' => array() ) );
        }
        $taxes  = get_object_taxonomies( $type, 'objects' );
        $groups = array();
        foreach ( $taxes as $tx_slug => $tx_obj ) {
            $terms = get_terms( array(
                'taxonomy'   => $tx_slug,
                'hide_empty' => false,
                'orderby'    => 'name',
                'number'     => 0,
            ) );
            $list = array();
            if ( ! is_wp_error( $terms ) ) {
                foreach ( $terms as $t ) {
                    $list[] = array(
                        'id'    => (int) $t->term_id,
                        'name'  => $t->name,
                        'count' => (int) $t->count,
                    );
                }
            }
            $groups[] = array(
                'taxonomy' => $tx_slug,
                'label'    => $tx_obj->labels->name ?? $tx_slug,
                'terms'    => $list,
            );
        }
        wp_send_json_success( array( 'groups' => $groups ) );
    }

    public function ajax_db_kesif() {
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( 'Yetkisiz' );
        check_ajax_referer( self::NONCE, 'nonce' );

        global $wpdb;
        $prefix = $wpdb->prefix;

        // 1) Tum tablolar (prefix'li)
        $tables = $wpdb->get_col( "SHOW TABLES" );
        $rows   = array();
        foreach ( $tables as $t ) {
            // sadece prefix ile baslayanlari (multisite vb. dahil) goster
            if ( strpos( $t, $prefix ) !== 0 ) continue;
            $kisa = substr( $t, strlen( $prefix ) );
            // sistem tablolarini atlamayalim — hepsini goster, kullanici kendi karar verir
            $sayi = (int) $wpdb->get_var( "SELECT COUNT(*) FROM `$t`" );
            $rows[] = array( 'table' => $kisa, 'count' => $sayi );
        }
        // 2) Post tipi sayimi (wp_posts icinden)
        $pt_rows = $wpdb->get_results(
            "SELECT post_type, COUNT(*) AS c FROM {$wpdb->posts} GROUP BY post_type ORDER BY c DESC",
            ARRAY_A
        );

        wp_send_json_success( array(
            'prefix'    => $prefix,
            'tables'    => $rows,
            'posttypes' => $pt_rows,
        ) );
    }

    /* ====================== REST API (kaynak site) ====================== */

    public function register_rest() {
        register_rest_route( self::REST_NS, '/types', array(
            'methods'  => 'GET',
            'permission_callback' => array( $this, 'rest_check_token' ),
            'callback' => array( $this, 'rest_types' ),
        ) );
        register_rest_route( self::REST_NS, '/export', array(
            'methods'  => 'GET',
            'permission_callback' => array( $this, 'rest_check_token' ),
            'callback' => array( $this, 'rest_export' ),
        ) );
    }

    public function rest_check_token( $req ) {
        $expected = (string) get_option( self::TOKEN_OPT, '' );
        if ( ! $expected ) return new WP_Error( 'no_token', 'REST anahtari ayarlanmamis', array( 'status' => 403 ) );
        $given = (string) $req->get_param( 'token' );
        if ( ! hash_equals( $expected, $given ) ) return new WP_Error( 'bad_token', 'gecersiz anahtar', array( 'status' => 403 ) );
        return true;
    }

    public function rest_types( $req ) {
        $types  = $this->liste_post_types();
        $counts = array();
        foreach ( array_keys( $types ) as $pt ) {
            if ( $pt === '__tax__' ) {
                $counts[ $pt ] = count( get_taxonomies( array( 'public' => true ) ) );
            } elseif ( strpos( $pt, 'vtv_' ) === 0 ) {
                $counts[ $pt ] = $this->vtv_count( $pt );
            } elseif ( strpos( $pt, '__tbl_' ) === 0 ) {
                $counts[ $pt ] = $this->ozel_tablo_count( $pt );
            } elseif ( post_type_exists( $pt ) ) {
                $c = wp_count_posts( $pt );
                $counts[ $pt ] = (int) ( ( $c->publish ?? 0 ) + ( $c->draft ?? 0 ) + ( $c->pending ?? 0 ) + ( $c->future ?? 0 ) + ( $c->private ?? 0 ) );
            } else {
                $counts[ $pt ] = 0;
            }
        }
        $types['__users__'] = '👤 WP Kullanıcılar';
        $counts['__users__'] = (int) ( count_users()['total_users'] ?? 0 );
        return array( 'types' => $types, 'counts' => $counts );
    }

    public function rest_export( $req ) {
        $type   = sanitize_text_field( $req->get_param( 'type' ) );
        $offset = max( 0, (int) $req->get_param( 'offset' ) );
        $limit  = min( 100, max( 1, (int) $req->get_param( 'limit' ) ) );

        if ( $type === '__users__' ) {
            $total = (int) count_users()['total_users'];
            $users = get_users( array( 'number' => $limit, 'offset' => $offset, 'orderby' => 'ID', 'order' => 'ASC' ) );
            return array( 'total' => $total, 'items' => array_map( array( $this, 'user_to_array' ), $users ) );
        }
        if ( $type === '__tax__' ) {
            $items = ( $offset === 0 ) ? $this->tax_export_all() : array();
            return array( 'total' => count( $items ), 'items' => $items );
        }
        if ( strpos( $type, 'vtv_' ) === 0 ) {
            return array( 'total' => $this->vtv_count( $type ), 'items' => $this->vtv_rows( $type, $offset, $limit ) );
        }
        if ( strpos( $type, '__tbl_' ) === 0 ) {
            return array( 'total' => $this->ozel_tablo_count( $type ), 'items' => $this->ozel_tablo_rows( $type, $offset, $limit ) );
        }
        if ( ! post_type_exists( $type ) ) return new WP_Error( 'bad_type', 'gecersiz tur', array( 'status' => 400 ) );
        $q = new WP_Query( array(
            'post_type'      => $type,
            'post_status'    => $this->tum_statusler(),
            'posts_per_page' => $limit,
            'offset'         => $offset,
            'orderby'        => 'ID',
            'order'          => 'ASC',
            'fields'         => 'ids',
        ) );
        $items = array();
        foreach ( $q->posts as $pid ) {
            $a = $this->post_to_array( $pid );
            if ( $a ) $items[] = $a;
        }
        return array( 'total' => (int) $q->found_posts, 'items' => $items );
    }
}
