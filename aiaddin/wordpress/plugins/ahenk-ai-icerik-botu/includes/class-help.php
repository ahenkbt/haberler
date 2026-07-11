<?php
/**
 * Ahenk Help / Kullanım Kılavuzu
 *
 * 7 dilde (TR/EN/AR/DE/FR/ES/RU) kurulum ve kullanım kılavuzunu admin panele ekler.
 * Her bölümde ilgili eklenti sayfasına/dış siteye tıklanabilir bağlantı vardır.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

class Ahenk_Help {

    const MENU_SLUG = 'ahenk-kilavuz';

    public static function init() {
        $self = new self();
        add_action( 'admin_menu', array( $self, 'menu' ), 40 );
    }

    public function menu() {
        add_submenu_page(
            'ai-haber-botu',
            'Kullanım Kılavuzu',
            '📖 Kullanım Kılavuzu',
            'manage_options',
            self::MENU_SLUG,
            array( $this, 'render' )
        );
    }

    /** Dahili bağlantılar (admin sayfaları) */
    private function links() {
        return array(
            'settings' => admin_url( 'admin.php?page=ai-haber-botu-settings' ),
            'panel'    => admin_url( 'admin.php?page=ai-haber-botu' ),
            'license'  => admin_url( 'admin.php?page=ahenk-license' ),
            'sb'       => admin_url( 'admin.php?page=ahenk-site-kurucu' ),
            'tek'      => admin_url( 'admin.php?page=ahenk-ai-tek-uret' ),
            'tanitim'  => admin_url( 'admin.php?page=ahenk-tanitim' ),
            'video'    => admin_url( 'admin.php?page=ahenk-video-uret' ),
            'podcast'  => admin_url( 'admin.php?page=ahenk-podcast-uret' ),
            'vtv'      => admin_url( 'admin.php?page=video-tv' ),
            'rss'      => admin_url( 'admin.php?page=ahbrss-kampanyalar' ),
            'bloklar'  => admin_url( 'admin.php?page=ahb-bloklar-hikaye' ),
            'airobot'  => 'https://ahenk.net.tr/airobot',
            'wa'       => 'https://wa.me/905413136245',
            'mail'     => 'mailto:ahenkbt@gmail.com',
            'openai'   => 'https://platform.openai.com/api-keys',
        );
    }

    public function render() {
        if ( ! current_user_can( 'manage_options' ) ) return;
        $L = $this->links();
        $data = $this->guide_data( $L );
        ?>
        <div class="wrap ahenk-help-wrap">
            <style>
            .ahenk-help-wrap h1.ah-title{margin:0 0 6px;font-size:26px;}
            .ahenk-help-wrap .ah-intro{color:#3c434a;font-size:14px;max-width:900px;margin:0 0 18px;}
            .ahenk-help-wrap .ah-lang{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 20px;}
            .ahenk-help-wrap .ah-lang button{background:#fff;border:1px solid #dcdcde;color:#2271b1;font-weight:600;padding:6px 14px;border-radius:20px;cursor:pointer;font-size:13px;}
            .ahenk-help-wrap .ah-lang button.active{background:#2271b1;color:#fff;border-color:#2271b1;}
            .ahenk-help-wrap .ah-toc{background:#f6f7f7;border:1px solid #dcdcde;border-radius:8px;padding:14px 18px;margin:0 0 20px;max-width:1100px;}
            .ahenk-help-wrap .ah-toc h3{margin:0 0 8px;font-size:14px;color:#1d2327;}
            .ahenk-help-wrap .ah-toc ol{margin:0;padding-left:22px;columns:2;}
            .ahenk-help-wrap .ah-toc a{text-decoration:none;color:#2271b1;}
            .ahenk-help-wrap .ah-section{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:22px 26px;margin:0 0 16px;max-width:1100px;box-shadow:0 1px 3px rgba(0,0,0,.03);}
            .ahenk-help-wrap .ah-section h2{margin:0 0 10px;font-size:20px;color:#1d2327;}
            .ahenk-help-wrap .ah-section p{line-height:1.7;color:#3c434a;margin:0 0 10px;}
            .ahenk-help-wrap .ah-section ul, .ahenk-help-wrap .ah-section ol{margin:0 0 12px 20px;line-height:1.7;color:#3c434a;}
            .ahenk-help-wrap .ah-section a{color:#2271b1;font-weight:500;}
            .ahenk-help-wrap .ah-section a.btn{display:inline-block;background:#2271b1;color:#fff !important;padding:6px 14px;border-radius:6px;text-decoration:none;font-size:13px;margin:2px 4px 2px 0;}
            .ahenk-help-wrap .ah-section a.btn:hover{background:#135e96;}
            .ahenk-help-wrap .ah-section code{background:#f0f0f1;padding:2px 6px;border-radius:4px;font-size:13px;}
            .ahenk-help-wrap[dir="rtl"] .ah-toc ol{padding-right:22px;padding-left:0;}
            .ahenk-help-wrap[dir="rtl"] .ah-section ul, .ahenk-help-wrap[dir="rtl"] .ah-section ol{margin:0 20px 12px 0;}
            @media(max-width:760px){.ahenk-help-wrap .ah-toc ol{columns:1;}}
            </style>

            <h1 class="ah-title" id="ah-title"></h1>
            <p class="ah-intro" id="ah-intro"></p>

            <div class="ah-lang">
                <button type="button" data-lang="tr" class="active">🇹🇷 Türkçe</button>
                <button type="button" data-lang="en">🇬🇧 English</button>
                <button type="button" data-lang="ar">🇸🇦 العربية</button>
                <button type="button" data-lang="de">🇩🇪 Deutsch</button>
                <button type="button" data-lang="fr">🇫🇷 Français</button>
                <button type="button" data-lang="es">🇪🇸 Español</button>
                <button type="button" data-lang="ru">🇷🇺 Русский</button>
            </div>

            <div class="ah-toc" id="ah-toc"></div>
            <div id="ah-body"></div>
        </div>

        <script>
        (function(){
            const DATA = <?php echo wp_json_encode( $data ); ?>;
            const wrap = document.querySelector('.ahenk-help-wrap');
            const title = document.getElementById('ah-title');
            const intro = document.getElementById('ah-intro');
            const toc   = document.getElementById('ah-toc');
            const body  = document.getElementById('ah-body');

            function render(lang){
                const d = DATA[lang] || DATA.tr;
                wrap.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
                document.documentElement.lang = lang;
                title.textContent = d.title;
                intro.textContent = d.intro;

                // TOC
                let tocHtml = '<h3>' + d.toc_title + '</h3><ol>';
                d.sections.forEach((s, i) => {
                    tocHtml += '<li><a href="#ah-s-' + i + '">' + s.icon + ' ' + s.title + '</a></li>';
                });
                tocHtml += '</ol>';
                toc.innerHTML = tocHtml;

                // Sections
                let html = '';
                d.sections.forEach((s, i) => {
                    html += '<div class="ah-section" id="ah-s-' + i + '">';
                    html += '<h2>' + s.icon + ' ' + s.title + '</h2>';
                    html += s.body;
                    html += '</div>';
                });
                body.innerHTML = html;

                document.querySelectorAll('.ah-lang button').forEach(b => {
                    b.classList.toggle('active', b.dataset.lang === lang);
                });
                try { localStorage.setItem('ahenk_lang', lang); } catch(e){}
            }

            document.querySelectorAll('.ah-lang button').forEach(b => {
                b.addEventListener('click', () => render(b.dataset.lang));
            });
            const saved = (function(){ try { return localStorage.getItem('ahenk_lang'); } catch(e){ return null; } })();
            render(saved && DATA[saved] ? saved : 'tr');
        })();
        </script>
        <?php
    }

    /* =====================================================================
     * 7 DİLDE REHBER İÇERİĞİ
     * ===================================================================== */
    private function guide_data( $L ) {
        // Buton helper (PHP)
        $b = function( $href, $text ) { return '<a class="btn" href="' . esc_url( $href ) . '">' . esc_html( $text ) . ' →</a>'; };
        $bx = function( $href, $text ) { return '<a class="btn" href="' . esc_url( $href ) . '" target="_blank" rel="noopener">' . esc_html( $text ) . ' ↗</a>'; };

        /* ======================= TÜRKÇE ======================= */
        $tr = array(
            'title' => '📖 Ahenk AI İçerik Robotu — Kullanım Kılavuzu',
            'intro' => 'Bu rehber, eklentinin tüm özelliklerini adım adım anlatır. İlk kurulumdan ilk içerik üretimine, site kurucusundan lisans yenilemeye kadar her şey için açıklama ve doğrudan bağlantılar içerir.',
            'toc_title' => 'İçindekiler',
            'sections' => array(
                array( 'icon'=>'📦', 'title'=>'1. Kurulum ve İlk Açılış', 'body'=>
                    '<p>Eklentiyi <strong>Eklentiler → Yeni Ekle → Eklenti Yükle</strong> yolundan ZIP olarak yükleyin ve etkinleştirin. Kurulumdan sonra sol menüde <strong>"Ahenk AI"</strong> ve <strong>"Ahenk Lisans"</strong> menüleri görünür.</p>'
                    .'<p>İlk kurulumda bir kereye mahsus, rastgele üretilmiş yönetici şifresi sarı uyarı kutusunda gösterilir. Bu şifreyi güvenli bir yere kaydedin ve uyarıyı kapatın. WordPress yöneticisi iseniz şifreye hiç ihtiyacınız yok — panele otomatik giriş yaparsınız.</p>'
                    .'<p>Güncel sürüm paketi, tanıtım sayfası ve kullanım videoları için: ' . $bx( $L['airobot'], 'ahenk.net.tr/airobot' ) . '</p>'
                    .'<p><strong>Hızlı eylemler:</strong> ' . $b( $L['license'], 'Lisans Paneli' ) . $b( $L['settings'], 'Ayarlar' ) . '</p>'
                ),
                array( 'icon'=>'🔑', 'title'=>'2. OpenAI API Anahtarı', 'body'=>
                    '<p>Eklenti, içerik ve görsel üretimi için OpenAI servislerini kullanır. Kendi API anahtarınızı girmeniz gerekir:</p>'
                    .'<ol>'
                    .'<li>' . $bx( $L['openai'], 'platform.openai.com/api-keys' ) . ' adresinden <code>sk-</code> ile başlayan bir anahtar oluşturun.</li>'
                    .'<li>WordPress panelinde ' . $b( $L['settings'], 'Ayarlar' ) . ' sekmesine gidin.</li>'
                    .'<li>"OpenAI API Anahtarı" alanına yapıştırın, model olarak <code>gpt-4o-mini</code> (hız/maliyet dengesi) veya <code>gpt-4o</code> (en yüksek kalite) seçin ve kaydedin.</li>'
                    .'</ol>'
                    .'<p>Aynı anahtar AI Site Kurucu, köşe yazarları ve tüm AI üretim modülleri tarafından ortak kullanılır. Kullanım ücretleri doğrudan OpenAI hesabınızdan kesilir.</p>'
                ),
                array( 'icon'=>'🎁', 'title'=>'3. Lisans ve 7 Günlük Deneme', 'body'=>
                    '<p>Eklentinin tüm özellikleri ücretsiz <strong>7 günlük denemeyle</strong> açık gelir. Deneme bitince ' . $b( $L['license'], 'Ahenk Lisans' ) . ' sayfasından bir plan seçip ödemenizi tamamlarsınız.</p>'
                    .'<p><strong>Planlar:</strong></p>'
                    .'<ul>'
                    .'<li><strong>Aylık — $40</strong>: 30 gün, esnek kullanım.</li>'
                    .'<li><strong>6 Aylık — $200</strong> (popüler): 180 gün, ~$33/ay, $40 tasarruf.</li>'
                    .'<li><strong>Yıllık — $350</strong>: 365 gün, ~$29/ay, $130 tasarruf + VIP destek.</li>'
                    .'</ul>'
                    .'<p><strong>Ödeme yolları:</strong> Stripe (kredi kartı), banka havalesi (IBAN: TR57 0010 3000 0000 0081 2207 96 — Vatan Sosyal Hizmetler Ltd), WhatsApp ile manuel yönlendirme. Havale sonrası lisans panelindeki "Dekont Bildir" alanından dekont yükleyin; yönetici onayından sonra aboneliğiniz aktif olur.</p>'
                    .'<p>Her lisans <strong>tek domaine kilitlidir</strong>. Alan adınız değiştiğinde destek ile iletişime geçin: ' . $bx( $L['wa'], 'WhatsApp' ) . $bx( $L['mail'], 'E-posta' ) . '</p>'
                ),
                array( 'icon'=>'🤖', 'title'=>'4. AI ile Haber/İçerik Üretimi', 'body'=>
                    '<p>Ana içerik üretim motoru <strong>Ahenk AI</strong> menüsündedir. Üç üretim şekli vardır:</p>'
                    .'<ul>'
                    .'<li><strong>RSS/Google News/HTML tarama:</strong> Kaynak listesi tanımlarsınız, bot belirli aralıklarla yeni haberleri çeker, AI ile özgünleştirir ve WordPress yazısı olarak yayınlar. Sıcak gelişme, kategori atama, ilgili haber bağlantıları ve duplicate kontrolü otomatik çalışır.</li>'
                    .'<li><strong>Tek haber üret:</strong> ' . $b( $L['tek'], 'Ahenk AI: Tek Haber Üret' ) . ' — Tek bir URL veya konu başlığından anında özgün yazı oluşturur.</li>'
                    .'<li><strong>AI görsel:</strong> Her yazı için DALL-E 3 / GPT-Image ile öne çıkan görsel, web görsel arama ile çoklu seçimli galeri ekleme.</li>'
                    .'</ul>'
                    .'<p>Temel akış: ' . $b( $L['settings'], 'Ayarlar' ) . ' → kaynakları ekleyin → prompt/kategori ayarlarını yapın → ' . $b( $L['panel'], 'Kampanya Başlat' ) . '. İşlem geçmişi, eklenen haberler ve duplicate log\'u admin panelden takip edebilirsiniz.</p>'
                ),
                array( 'icon'=>'✍️', 'title'=>'5. AI Köşe Yazarları', 'body'=>
                    '<p>Kendi "yazar" karakterlerinizi oluşturup otomatik köşe yazıları ürettirebilirsiniz. Her yazarın uzmanlık alanı, üslubu, biyografisi ve profil görseli AI tarafından tanımlanır.</p>'
                    .'<ol>'
                    .'<li>Ahenk AI menüsünde "Köşe Yazarları" sekmesine girin, <strong>Yeni Yazar Ekle</strong> deyin.</li>'
                    .'<li>Ad, cinsiyet ve uzmanlık alanlarını (siyaset, ekonomi, spor, vb.) girin; AI otomatik biyografi ve görsel üretir.</li>'
                    .'<li>Yazı sıklığı, uzunluk (600+ kelime) ve yayın saatini ayarlayın; bot otomatik köşe yazıları yayınlar.</li>'
                    .'</ol>'
                    .'<p>Şablon hub\'ından önceden hazırlanmış yazar profillerini de içe aktarabilirsiniz.</p>'
                ),
                array( 'icon'=>'🏗', 'title'=>'6. AI Site Kurucu (YENİ)', 'body'=>
                    '<p>Tek tıkla, AI ile <strong>tamamen ultra premium bir web sitesi</strong> kurar. Aktif temanız <strong>korunur</strong>; yeni sayfalar eklentinin özel "tam sayfa" şablonunda yayınlanır.</p>'
                    .'<ol>'
                    .'<li>' . $b( $L['sb'], 'AI Site Kurucu' ) . ' sayfasına gidin.</li>'
                    .'<li>İşletme adınızı ve 3-5 satırlık <strong>kısa bir tanım</strong> girin (örn: "Ankara\'da 20 yıllık tecrübeyle parke döşeme hizmeti sunan firma, 10.000+ tamamlanmış proje, 5 yıl garanti").</li>'
                    .'<li>İstediğiniz sayfaları seçin: Anasayfa, Hakkımızda, Hizmetlerimiz, Referanslar, İletişim, SSS, Galeri, Fiyatlar.</li>'
                    .'<li>Ana renk, ton (profesyonel/modern/sıcak/lüks/enerjik), telefon, adres, e-posta girin.</li>'
                    .'<li>"Siteyi AI ile Kur" butonuna basın. Her sayfa için 20-40 saniye, toplam 2-5 dakika sürer. İşlem sonunda tüm sayfalar yayınlanır, birincil menüye eklenir ve istenirse Anasayfa WP ön sayfası olarak atanır.</li>'
                    .'</ol>'
                    .'<p>Oluşturulan içerik SEO uyumlu, inline-CSS ile modern tasarımlıdır (hero + çok sütun + kart + CTA). Her sayfayı dilediğiniz gibi WordPress editöründen düzenleyebilirsiniz.</p>'
                ),
                array( 'icon'=>'🌟', 'title'=>'7. Tanıtım Sayfaları', 'body'=>
                    '<p>' . $b( $L['tanitim'], 'Tanıtım Sayfaları' ) . ' modülü; tek bir ürün, hizmet veya kampanya için tek tıkla açılış (landing) sayfası üretir. AI Site Kurucu çoklu sayfa içindir; tanıtım sayfası ise tek ve odaklı bir satış sayfasıdır.</p>'
                    .'<p>Hazır şablonlardan seçin → ürün/kampanya bilgilerini girin → AI sizin için hero, özellikler, fiyat kutusu ve CTA bölümlerini üretir. Sayfa anında yayına alınır ve paylaşılabilir bir URL oluşur.</p>'
                ),
                array( 'icon'=>'📺', 'title'=>'8. Video TV ve AI Video/Podcast Üretimi', 'body'=>
                    '<p><strong>Video TV:</strong> ' . $b( $L['vtv'], 'Video TV → Kaynaklar' ) . ' üzerinden YouTube kanalları, Dailymotion ve canlı TV kaynakları eklenir. Bot yeni videoları otomatik çeker; kategori, oynatma listesi ve arşiv olarak site içinde özel bir şablonda yayınlar.</p>'
                    .'<p><strong>AI Video Üretimi:</strong> ' . $b( $L['video'], 'Video Üret' ) . ' — HeyGen entegrasyonuyla yazıdan konuşan sunucu videosu üretir.</p>'
                    .'<p><strong>AI Podcast Üretimi:</strong> ' . $b( $L['podcast'], 'Podcast Üret' ) . ' — Yazıyı doğal ses tonuyla seslendirir; web sitesinde oynatılabilir bölüm olarak yayınlar.</p>'
                ),
                array( 'icon'=>'📰', 'title'=>'9. RSS Direkt (AI\'sız Haber Botu)', 'body'=>
                    '<p>AI kullanmadan, saf RSS kaynaklarından haberleri <strong>doğrudan</strong> WordPress\'e aktarır. OpenAI kotanız olmadığında veya saf haber akışı istediğinizde uygundur.</p>'
                    .'<p>Modül <strong>varsayılan kapalıdır</strong>. Etkinleştirmek için ' . $b( $L['license'], 'Ahenk Lisans' ) . ' sayfasındaki "🔌 Modüller" kartından "RSS Direkt" anahtarını açın. Sonra ' . $b( $L['rss'], 'Kampanyalar' ) . ' ekranından yeni kampanya oluşturun (kaynak RSS URL\'leri, kategori, aralık, yazar atama).</p>'
                ),
                array( 'icon'=>'📦', 'title'=>'10. Bloklar — Hikaye, Manşet, Tab', 'body'=>
                    '<p>' . $b( $L['bloklar'], 'Bloklar Yönetimi' ) . ' üzerinden üç tip içerik bloğu hazırlayabilirsiniz:</p>'
                    .'<ul>'
                    .'<li><strong>Hikaye blokları:</strong> Instagram story benzeri hızlı kaydırmalı içerikler.</li>'
                    .'<li><strong>Manşet blokları:</strong> Anasayfa ve kategori sayfalarında gösterilen öne çıkan haber kutuları.</li>'
                    .'<li><strong>Tab kategorileri:</strong> Sekmeli çoklu kategori listeleri (örn. "Gündem / Spor / Ekonomi").</li>'
                    .'</ul>'
                    .'<p>Blokları shortcode ile herhangi bir sayfaya yerleştirebilirsiniz; örn. <code>[ahenk_blok_hikaye id="3"]</code>.</p>'
                ),
                array( 'icon'=>'🧩', 'title'=>'11. Tam Sayfa Şablonu', 'body'=>
                    '<p>AI Site Kurucu ve tanıtım sayfalarında kullanılan <strong>"Ahenk Tam Sayfa"</strong> şablonu, tema başlığı/altlığını gizler ve sayfayı içeriğin tam genişliğinde gösterir.</p>'
                    .'<p>Kendi oluşturduğunuz herhangi bir WordPress sayfası için de kullanabilirsiniz: <strong>Sayfa düzenle → Sağdaki "Sayfa Özellikleri" → Şablon → "Ahenk Tam Sayfa"</strong>.</p>'
                ),
                array( 'icon'=>'🔐', 'title'=>'12. Güvenlik ve Admin Erişimi', 'body'=>
                    '<p>v3.11.4 ile güvenlik güçlendirildi:</p>'
                    .'<ul>'
                    .'<li>Eklenti şifreleri <strong>pepper + bcrypt (cost=12)</strong> ile saklanır; pepper kodda değil WordPress salt\'larından türetilir.</li>'
                    .'<li>DB sızdırılsa bile saldırgan, WordPress yönetici rolüne erişmeden panele giremez.</li>'
                    .'<li>WordPress yöneticisi iseniz eklenti şifresi hiç gerekmez — otomatik tanınırsınız.</li>'
                    .'<li>Kurulumda varsayılan şifre kaldırıldı; rastgele üretiliyor ve bir kerelik gösteriliyor.</li>'
                    .'</ul>'
                    .'<p>Kendi eklenti şifrenizi değiştirmek için lisans panelinde "Şifre Değiştir" bölümünü kullanın.</p>'
                ),
                array( 'icon'=>'📞', 'title'=>'13. Destek ve İletişim', 'body'=>
                    '<p>Sorun, öneri veya özel konfigürasyon ihtiyacınız için:</p>'
                    .'<p>' . $bx( $L['wa'], 'WhatsApp: +90 541 313 62 45' ) . $bx( $L['mail'], 'E-posta: ahenkbt@gmail.com' ) . $bx( $L['airobot'], 'ahenk.net.tr/airobot' ) . '</p>'
                    .'<p>VIP destek (Yıllık plan): WhatsApp\'tan doğrudan yanıt, özel şablon talebi, kurulum danışmanlığı.</p>'
                ),
            ),
        );

        /* ======================= ENGLISH ======================= */
        $en = array(
            'title' => '📖 Ahenk AI Content Robot — User Guide',
            'intro' => 'This guide walks you through every feature, step by step — from first install to content generation, site building, and license renewal. Direct links to every relevant page are included.',
            'toc_title' => 'Table of Contents',
            'sections' => array(
                array( 'icon'=>'📦', 'title'=>'1. Installation & First Launch', 'body'=>
                    '<p>Install via <strong>Plugins → Add New → Upload Plugin</strong> using the ZIP and activate it. After activation, "Ahenk AI" and "Ahenk License" menus appear in the sidebar.</p>'
                    .'<p>On first install, a one-time randomly generated admin password is shown in a yellow notice. Save it somewhere safe and dismiss the notice. If you are a WordPress administrator, you do not need this password — you sign in automatically.</p>'
                    .'<p>Latest release, brochure and tutorials: ' . $bx( $L['airobot'], 'ahenk.net.tr/airobot' ) . '</p>'
                    .'<p><strong>Quick actions:</strong> ' . $b( $L['license'], 'License Panel' ) . $b( $L['settings'], 'Settings' ) . '</p>'
                ),
                array( 'icon'=>'🔑', 'title'=>'2. OpenAI API Key', 'body'=>
                    '<p>The plugin uses OpenAI for all AI generation. You must supply your own API key:</p>'
                    .'<ol>'
                    .'<li>Create a key starting with <code>sk-</code> at ' . $bx( $L['openai'], 'platform.openai.com/api-keys' ) . '.</li>'
                    .'<li>Open ' . $b( $L['settings'], 'Settings' ) . '.</li>'
                    .'<li>Paste the key, choose <code>gpt-4o-mini</code> (speed/cost) or <code>gpt-4o</code> (top quality), save.</li>'
                    .'</ol>'
                    .'<p>The same key is shared across AI Site Builder, columnists and every AI module. Usage is billed directly by OpenAI.</p>'
                ),
                array( 'icon'=>'🎁', 'title'=>'3. License & 7-Day Free Trial', 'body'=>
                    '<p>All features come fully unlocked for a <strong>7-day free trial</strong>. After trial, choose a plan from the ' . $b( $L['license'], 'License Panel' ) . '.</p>'
                    .'<p><strong>Plans:</strong></p>'
                    .'<ul>'
                    .'<li><strong>Monthly — $40</strong>: 30 days, flexible.</li>'
                    .'<li><strong>6 Months — $200</strong> (popular): 180 days, ~$33/mo, save $40.</li>'
                    .'<li><strong>Annual — $350</strong>: 365 days, ~$29/mo, save $130 + VIP support.</li>'
                    .'</ul>'
                    .'<p><strong>Payment methods:</strong> Stripe (card), bank transfer (IBAN: TR57 0010 3000 0000 0081 2207 96 — Vatan Sosyal Hizmetler Ltd), WhatsApp for manual flow. After wire transfer, upload your receipt in the "Report Receipt" area; admin approval activates your subscription.</p>'
                    .'<p>Each license is <strong>locked to one domain</strong>. For domain changes contact support: ' . $bx( $L['wa'], 'WhatsApp' ) . $bx( $L['mail'], 'Email' ) . '</p>'
                ),
                array( 'icon'=>'🤖', 'title'=>'4. AI News & Content Generation', 'body'=>
                    '<p>The core engine lives under the <strong>Ahenk AI</strong> menu. Three generation modes:</p>'
                    .'<ul>'
                    .'<li><strong>RSS / Google News / HTML scraping:</strong> Define sources; the bot fetches new items at intervals, rewrites them with AI for uniqueness, assigns categories and publishes as WordPress posts. Hot-update tracking, related-news linking and duplicate detection run automatically.</li>'
                    .'<li><strong>Single article:</strong> ' . $b( $L['tek'], 'Ahenk AI: Single Post' ) . ' — turn any URL or topic into a unique article instantly.</li>'
                    .'<li><strong>AI images:</strong> DALL-E 3 / GPT-Image for featured images, and multi-select web image search for gallery.</li>'
                    .'</ul>'
                    .'<p>Typical flow: ' . $b( $L['settings'], 'Settings' ) . ' → add sources → configure prompts/categories → ' . $b( $L['panel'], 'Run Campaign' ) . '. History, added posts and duplicate logs are all visible in the admin.</p>'
                ),
                array( 'icon'=>'✍️', 'title'=>'5. AI Columnists', 'body'=>
                    '<p>Create "author" characters that publish op-eds automatically. Each has its own expertise, tone, bio and profile photo — all generated by AI.</p>'
                    .'<ol>'
                    .'<li>Open the "Columnists" tab under Ahenk AI and click <strong>Add Author</strong>.</li>'
                    .'<li>Enter name, gender and expertise (politics, economy, sports, …). AI auto-creates bio and portrait.</li>'
                    .'<li>Set frequency, length (600+ words) and schedule — the bot publishes on its own.</li>'
                    .'</ol>'
                    .'<p>Pre-built author profiles are available in the template hub.</p>'
                ),
                array( 'icon'=>'🏗', 'title'=>'6. AI Site Builder (NEW)', 'body'=>
                    '<p>Build a complete, ultra-premium website with a single click. Your active theme is <strong>preserved</strong>; new pages publish with the plugin\'s built-in full-width template.</p>'
                    .'<ol>'
                    .'<li>Open ' . $b( $L['sb'], 'AI Site Builder' ) . '.</li>'
                    .'<li>Enter business name and a 3-5 line <strong>short brief</strong> (e.g. "Parquet flooring in Ankara, 20 years of experience, 10,000+ projects, 5-year warranty").</li>'
                    .'<li>Pick pages: Home, About, Services, References, Contact, FAQ, Gallery, Pricing.</li>'
                    .'<li>Set brand color, tone (professional/modern/warm/luxury/energetic), phone, address, email.</li>'
                    .'<li>Click "Build the Site with AI". Each page takes 20-40 s; total 2-5 min. Pages are published, added to the primary menu, and optionally the Home page is set as WP front page.</li>'
                    .'</ol>'
                    .'<p>All output is SEO-friendly with modern inline-CSS design (hero + multi-column + cards + CTA). You can edit any page normally inside WordPress.</p>'
                ),
                array( 'icon'=>'🌟', 'title'=>'7. Landing Pages', 'body'=>
                    '<p>The ' . $b( $L['tanitim'], 'Landing Pages' ) . ' module generates a single-product/service/campaign page with one click. Site Builder is for multi-page sites; Landing is a focused sales page.</p>'
                    .'<p>Pick a template → enter product/campaign info → AI produces hero, features, pricing box and CTA. Page publishes instantly with a shareable URL.</p>'
                ),
                array( 'icon'=>'📺', 'title'=>'8. Video TV & AI Video/Podcast', 'body'=>
                    '<p><strong>Video TV:</strong> Add YouTube channels, Dailymotion and live TV sources in ' . $b( $L['vtv'], 'Video TV → Sources' ) . '. The bot pulls new videos and publishes them in a custom template with categories, playlists and archive.</p>'
                    .'<p><strong>AI Video:</strong> ' . $b( $L['video'], 'Generate Video' ) . ' — text-to-presenter video via HeyGen integration.</p>'
                    .'<p><strong>AI Podcast:</strong> ' . $b( $L['podcast'], 'Generate Podcast' ) . ' — natural-voice narration, published as a playable episode.</p>'
                ),
                array( 'icon'=>'📰', 'title'=>'9. RSS Direct (Non-AI News Bot)', 'body'=>
                    '<p>Imports RSS items <strong>directly</strong> without AI — useful when you have no OpenAI quota or want pure feed syndication.</p>'
                    .'<p>This module is <strong>disabled by default</strong>. Enable it in ' . $b( $L['license'], 'License → Modules' ) . ' card by toggling "RSS Direct". Then open ' . $b( $L['rss'], 'Campaigns' ) . ' and create a new campaign (feed URLs, category, interval, author mapping).</p>'
                ),
                array( 'icon'=>'📦', 'title'=>'10. Blocks — Stories, Headlines, Tabs', 'body'=>
                    '<p>' . $b( $L['bloklar'], 'Block Manager' ) . ' provides three block types:</p>'
                    .'<ul>'
                    .'<li><strong>Stories:</strong> Instagram-style swipeable stories.</li>'
                    .'<li><strong>Headlines:</strong> Featured-post cards for home/category pages.</li>'
                    .'<li><strong>Tabs:</strong> Tabbed multi-category lists (e.g. News / Sports / Business).</li>'
                    .'</ul>'
                    .'<p>Insert via shortcodes, e.g. <code>[ahenk_blok_hikaye id="3"]</code>.</p>'
                ),
                array( 'icon'=>'🧩', 'title'=>'11. Full-Page Template', 'body'=>
                    '<p>The <strong>"Ahenk Full Page"</strong> template (used by Site Builder and landing pages) hides theme header/footer and renders the page at full content width.</p>'
                    .'<p>Use it on any WordPress page: <strong>Edit page → Page Attributes → Template → "Ahenk Full Page"</strong>.</p>'
                ),
                array( 'icon'=>'🔐', 'title'=>'12. Security & Admin Access', 'body'=>
                    '<p>Hardened in v3.11.4:</p>'
                    .'<ul>'
                    .'<li>Plugin passwords are stored with <strong>pepper + bcrypt (cost=12)</strong>; the pepper is derived from WordPress salts, not stored in code.</li>'
                    .'<li>Even if the DB leaks, an attacker without WordPress admin rights cannot enter.</li>'
                    .'<li>WordPress admins never need the plugin password — auto sign-in.</li>'
                    .'<li>Default install password removed — now random and shown once.</li>'
                    .'</ul>'
                    .'<p>Change your plugin password in the License panel under "Change Password".</p>'
                ),
                array( 'icon'=>'📞', 'title'=>'13. Support & Contact', 'body'=>
                    '<p>For issues, requests or custom configuration:</p>'
                    .'<p>' . $bx( $L['wa'], 'WhatsApp: +90 541 313 62 45' ) . $bx( $L['mail'], 'Email: ahenkbt@gmail.com' ) . $bx( $L['airobot'], 'ahenk.net.tr/airobot' ) . '</p>'
                    .'<p>VIP support (Annual plan): direct WhatsApp, custom template requests, setup consultation.</p>'
                ),
            ),
        );

        /* ======================= ARABIC (العربية) ======================= */
        $ar = array(
            'title' => '📖 Ahenk AI — دليل المستخدم',
            'intro' => 'دليل شامل لجميع ميزات الإضافة خطوة بخطوة: من التثبيت إلى توليد المحتوى، بناء الموقع، وتجديد الترخيص. يحتوي على روابط مباشرة لكل صفحة ذات صلة.',
            'toc_title' => 'فهرس المحتويات',
            'sections' => array(
                array( 'icon'=>'📦', 'title'=>'١. التثبيت والتشغيل الأول', 'body'=>
                    '<p>ثبّت الإضافة عبر <strong>الإضافات ← أضف جديدًا ← رفع الإضافة</strong> من ملف ZIP وفعّلها. ستظهر قائمتا "Ahenk AI" و"Ahenk License" في القائمة الجانبية.</p>'
                    .'<p>عند أول تثبيت، تُعرض كلمة مرور إدارية عشوائية لمرة واحدة في إشعار أصفر. احفظها في مكان آمن. إذا كنت مديرًا في ووردبريس، فلا تحتاج لكلمة المرور — يتم تسجيل دخولك تلقائيًا.</p>'
                    .'<p>أحدث إصدار وأدلة الاستخدام: ' . $bx( $L['airobot'], 'ahenk.net.tr/airobot' ) . '</p>'
                    .'<p><strong>روابط سريعة:</strong> ' . $b( $L['license'], 'لوحة الترخيص' ) . $b( $L['settings'], 'الإعدادات' ) . '</p>'
                ),
                array( 'icon'=>'🔑', 'title'=>'٢. مفتاح OpenAI API', 'body'=>
                    '<p>تستخدم الإضافة OpenAI لجميع عمليات التوليد، ويجب إدخال مفتاح خاص بك:</p>'
                    .'<ol>'
                    .'<li>أنشئ مفتاحًا يبدأ بـ <code>sk-</code> من ' . $bx( $L['openai'], 'platform.openai.com/api-keys' ) . '.</li>'
                    .'<li>افتح ' . $b( $L['settings'], 'الإعدادات' ) . '.</li>'
                    .'<li>ألصق المفتاح، اختر <code>gpt-4o-mini</code> (سرعة/تكلفة) أو <code>gpt-4o</code> (أعلى جودة)، ثم احفظ.</li>'
                    .'</ol>'
                    .'<p>يُستخدم المفتاح نفسه عبر جميع الوحدات. الرسوم تُحتسب مباشرة من حسابك في OpenAI.</p>'
                ),
                array( 'icon'=>'🎁', 'title'=>'٣. الترخيص وتجربة ٧ أيام مجانية', 'body'=>
                    '<p>جميع الميزات مفتوحة مجانًا لمدة <strong>٧ أيام</strong>. بعد التجربة، اختر خطة من ' . $b( $L['license'], 'لوحة الترخيص' ) . '.</p>'
                    .'<ul>'
                    .'<li><strong>شهري — $40</strong>: ٣٠ يومًا، مرن.</li>'
                    .'<li><strong>٦ أشهر — $200</strong> (الأكثر شعبية): ١٨٠ يومًا، ~$33/شهر، توفير $40.</li>'
                    .'<li><strong>سنوي — $350</strong>: ٣٦٥ يومًا، ~$29/شهر، توفير $130 + دعم VIP.</li>'
                    .'</ul>'
                    .'<p><strong>طرق الدفع:</strong> Stripe (بطاقة)، تحويل بنكي (IBAN: TR57 0010 3000 0000 0081 2207 96)، واتساب. بعد التحويل ارفع الإيصال في قسم "الإبلاغ عن الإيصال" — يتم التفعيل بعد موافقة الإدارة.</p>'
                    .'<p>كل ترخيص <strong>مقيّد بنطاق واحد</strong>. لتغيير النطاق: ' . $bx( $L['wa'], 'واتساب' ) . $bx( $L['mail'], 'البريد' ) . '</p>'
                ),
                array( 'icon'=>'🤖', 'title'=>'٤. توليد الأخبار والمحتوى بالذكاء الاصطناعي', 'body'=>
                    '<p>محرك التوليد الأساسي في قائمة <strong>Ahenk AI</strong>. ثلاثة أوضاع:</p>'
                    .'<ul>'
                    .'<li><strong>RSS / Google News / كشط HTML:</strong> تعرّف المصادر، يجلب البوت العناصر الجديدة ويُعيد صياغتها بالذكاء الاصطناعي، ثم ينشرها كمقالات ووردبريس مع تصنيف تلقائي وربط مقالات ذات صلة.</li>'
                    .'<li><strong>مقالة واحدة:</strong> ' . $b( $L['tek'], 'توليد مقالة' ) . ' — من أي رابط أو موضوع.</li>'
                    .'<li><strong>صور AI:</strong> DALL-E 3 / GPT-Image وبحث الصور متعدد الاختيار للمعرض.</li>'
                    .'</ul>'
                    .'<p>التدفق: ' . $b( $L['settings'], 'الإعدادات' ) . ' → أضف المصادر → اضبط الطلبات/الفئات → ' . $b( $L['panel'], 'تشغيل الحملة' ) . '.</p>'
                ),
                array( 'icon'=>'✍️', 'title'=>'٥. كتّاب الأعمدة بالذكاء الاصطناعي', 'body'=>
                    '<p>أنشئ شخصيات "كتّاب" تنشر افتتاحيات تلقائيًا، مع مجال تخصص وأسلوب وسيرة وصورة — كل ذلك يُولَّد بالذكاء الاصطناعي.</p>'
                    .'<ol><li>افتح تبويب "الكتّاب" في قائمة Ahenk AI واضغط <strong>إضافة كاتب</strong>.</li><li>أدخل الاسم، الجنس ومجالات التخصص (سياسة، اقتصاد، رياضة...).</li><li>اضبط التكرار والطول (٦٠٠+ كلمة) والجدولة.</li></ol>'
                    .'<p>يمكن استيراد ملفات كتّاب جاهزة من مركز القوالب.</p>'
                ),
                array( 'icon'=>'🏗', 'title'=>'٦. بناء الموقع بالذكاء الاصطناعي (جديد)', 'body'=>
                    '<p>بنقرة واحدة، ابنِ <strong>موقعًا كاملًا بمستوى ممتاز</strong>. يبقى قالبك النشط سليمًا؛ تُنشر الصفحات الجديدة بقالب "ملء الشاشة" الخاص بالإضافة.</p>'
                    .'<ol>'
                    .'<li>افتح ' . $b( $L['sb'], 'بناء الموقع' ) . '.</li>'
                    .'<li>أدخل اسم النشاط ووصفًا قصيرًا من ٣-٥ أسطر.</li>'
                    .'<li>اختر الصفحات: الرئيسية، من نحن، خدماتنا، مراجع، اتصل بنا، الأسئلة الشائعة، المعرض، الأسعار.</li>'
                    .'<li>حدد اللون الأساسي، النبرة، الهاتف، العنوان، البريد.</li>'
                    .'<li>اضغط "ابنِ الموقع بالذكاء الاصطناعي". كل صفحة ٢٠-٤٠ ثانية، الإجمالي ٢-٥ دقائق.</li>'
                    .'</ol>'
                    .'<p>النتيجة متوافقة مع SEO، بتصميم حديث وCSS مضمّن.</p>'
                ),
                array( 'icon'=>'🌟', 'title'=>'٧. صفحات الترويج', 'body'=>
                    '<p>' . $b( $L['tanitim'], 'صفحات الترويج' ) . ' لإنشاء صفحة هبوط لمنتج/خدمة/حملة واحدة. بناء الموقع يخدم المواقع متعددة الصفحات، أما الترويج فصفحة بيع واحدة مركّزة.</p>'
                ),
                array( 'icon'=>'📺', 'title'=>'٨. تلفزيون الفيديو + فيديو/بودكاست AI', 'body'=>
                    '<p>' . $b( $L['vtv'], 'Video TV — المصادر' ) . ' لإضافة قنوات YouTube وDailymotion والبث المباشر. ' . $b( $L['video'], 'توليد فيديو' ) . ' (HeyGen). ' . $b( $L['podcast'], 'توليد بودكاست' ) . ' بصوت طبيعي.</p>'
                ),
                array( 'icon'=>'📰', 'title'=>'٩. RSS Direct (بدون AI)', 'body'=>
                    '<p>يستورد عناصر RSS <strong>مباشرة</strong> بدون ذكاء اصطناعي. الوحدة <strong>مغلقة افتراضيًا</strong> — فعّلها من ' . $b( $L['license'], 'الترخيص ← الوحدات' ) . '. ثم افتح ' . $b( $L['rss'], 'الحملات' ) . ' وأنشئ حملة (روابط RSS، الفئة، الفاصل، الكاتب).</p>'
                ),
                array( 'icon'=>'📦', 'title'=>'١٠. الكتل — قصص، عناوين، تبويبات', 'body'=>
                    '<p>' . $b( $L['bloklar'], 'مدير الكتل' ) . ' يوفر: قصص (كستوري إنستغرام)، كتل عناوين مميزة، قوائم تبويب متعددة الفئات. أدرجها بالشيفرات المختصرة مثل <code>[ahenk_blok_hikaye id="3"]</code>.</p>'
                ),
                array( 'icon'=>'🧩', 'title'=>'١١. قالب ملء الصفحة', 'body'=>
                    '<p>قالب <strong>"Ahenk Full Page"</strong> يخفي رأس وتذييل القالب ويعرض المحتوى بعرض كامل. استخدامه: <strong>تحرير الصفحة → خصائص الصفحة → القالب → "Ahenk Full Page"</strong>.</p>'
                ),
                array( 'icon'=>'🔐', 'title'=>'١٢. الأمان والوصول', 'body'=>
                    '<p>في الإصدار 3.11.4: كلمات المرور تُخزّن بـ <strong>pepper + bcrypt (cost=12)</strong>. مديرو ووردبريس يدخلون تلقائيًا — بدون كلمة مرور. حتى لو تسربت قاعدة البيانات، لا يمكن للمهاجم الدخول دون صلاحية مدير ووردبريس.</p>'
                ),
                array( 'icon'=>'📞', 'title'=>'١٣. الدعم والتواصل', 'body'=>
                    '<p>' . $bx( $L['wa'], 'واتساب: +90 541 313 62 45' ) . $bx( $L['mail'], 'بريد: ahenkbt@gmail.com' ) . $bx( $L['airobot'], 'ahenk.net.tr/airobot' ) . '</p>'
                    .'<p>دعم VIP (الخطة السنوية): واتساب مباشر، قوالب مخصصة، استشارة إعداد.</p>'
                ),
            ),
        );

        /* ======================= DEUTSCH ======================= */
        $de = array(
            'title' => '📖 Ahenk AI Content Robot — Benutzerhandbuch',
            'intro' => 'Dieses Handbuch führt Sie Schritt für Schritt durch alle Funktionen — von der Installation über die Inhaltserstellung bis zum Site-Builder und der Lizenzverlängerung. Mit direkten Links zu jeder relevanten Seite.',
            'toc_title' => 'Inhaltsverzeichnis',
            'sections' => array(
                array( 'icon'=>'📦', 'title'=>'1. Installation & erster Start', 'body'=>
                    '<p>Installieren Sie über <strong>Plugins → Installieren → Plugin hochladen</strong> mit der ZIP-Datei und aktivieren Sie es. Danach erscheinen die Menüs "Ahenk AI" und "Ahenk License".</p>'
                    .'<p>Bei der Erstinstallation wird einmalig ein zufällig generiertes Admin-Passwort in einem gelben Hinweis angezeigt. Notieren Sie es sicher. WordPress-Administratoren benötigen es nicht — automatische Anmeldung.</p>'
                    .'<p>Neueste Version & Anleitungen: ' . $bx( $L['airobot'], 'ahenk.net.tr/airobot' ) . '</p>'
                    .'<p><strong>Schnellzugriff:</strong> ' . $b( $L['license'], 'Lizenz' ) . $b( $L['settings'], 'Einstellungen' ) . '</p>'
                ),
                array( 'icon'=>'🔑', 'title'=>'2. OpenAI API-Schlüssel', 'body'=>
                    '<p>Das Plugin nutzt OpenAI für alle KI-Generierungen. Eigener API-Schlüssel erforderlich:</p>'
                    .'<ol><li>Erstellen Sie einen <code>sk-</code>-Schlüssel auf ' . $bx( $L['openai'], 'platform.openai.com/api-keys' ) . '.</li><li>Öffnen Sie ' . $b( $L['settings'], 'Einstellungen' ) . '.</li><li>Schlüssel einfügen, Modell <code>gpt-4o-mini</code> (Geschwindigkeit) oder <code>gpt-4o</code> (Qualität) wählen, speichern.</li></ol>'
                    .'<p>Ein Schlüssel für alle Module. Die Nutzung wird direkt über Ihr OpenAI-Konto abgerechnet.</p>'
                ),
                array( 'icon'=>'🎁', 'title'=>'3. Lizenz & 7 Tage kostenlos', 'body'=>
                    '<p>Alle Funktionen <strong>7 Tage gratis</strong>. Nach Ablauf einen Plan wählen in ' . $b( $L['license'], 'Lizenz-Panel' ) . '.</p>'
                    .'<ul><li><strong>Monatlich — $40</strong>: 30 Tage.</li><li><strong>6 Monate — $200</strong>: 180 Tage, ~$33/Mon., $40 sparen.</li><li><strong>Jährlich — $350</strong>: 365 Tage, ~$29/Mon., $130 sparen + VIP-Support.</li></ul>'
                    .'<p><strong>Zahlung:</strong> Stripe, Banküberweisung (IBAN: TR57 0010 3000 0000 0081 2207 96), WhatsApp. Nach Überweisung den Beleg hochladen; Freischaltung nach Admin-Prüfung.</p>'
                    .'<p>Lizenz ist an <strong>eine Domain gebunden</strong>. Domainwechsel: ' . $bx( $L['wa'], 'WhatsApp' ) . $bx( $L['mail'], 'E-Mail' ) . '</p>'
                ),
                array( 'icon'=>'🤖', 'title'=>'4. KI-Inhalts- & Nachrichtengenerierung', 'body'=>
                    '<p>Drei Modi im <strong>Ahenk AI</strong>-Menü:</p>'
                    .'<ul>'
                    .'<li><strong>RSS / Google News / HTML:</strong> Quellen definieren, Bot holt automatisch, KI schreibt um, veröffentlicht als WordPress-Beitrag mit Kategorien und Duplikat-Check.</li>'
                    .'<li><strong>Einzelbeitrag:</strong> ' . $b( $L['tek'], 'Einzelbeitrag' ) . ' aus jeder URL oder Thema.</li>'
                    .'<li><strong>KI-Bilder:</strong> DALL-E 3 / GPT-Image + Web-Bildersuche.</li>'
                    .'</ul>'
                    .'<p>Ablauf: ' . $b( $L['settings'], 'Einstellungen' ) . ' → Quellen → Prompts/Kategorien → ' . $b( $L['panel'], 'Kampagne starten' ) . '.</p>'
                ),
                array( 'icon'=>'✍️', 'title'=>'5. KI-Kolumnisten', 'body'=>
                    '<p>Eigene "Autor"-Charaktere mit Fachgebiet, Stil, Biografie und Porträt — alles KI-generiert. Aufzurufen im Tab "Kolumnisten" unter Ahenk AI. Häufigkeit, Länge (600+ Wörter) und Zeitplan einstellbar.</p>'
                ),
                array( 'icon'=>'🏗', 'title'=>'6. KI Site Builder (NEU)', 'body'=>
                    '<p>Mit einem Klick eine komplette Premium-Website erstellen. Aktives Theme bleibt erhalten; neue Seiten nutzen die Vollbild-Vorlage des Plugins.</p>'
                    .'<ol>'
                    .'<li>' . $b( $L['sb'], 'Site Builder' ) . ' öffnen.</li>'
                    .'<li>Firmenname + 3-5 Zeilen Kurzbeschreibung eingeben.</li>'
                    .'<li>Seiten wählen: Start, Über uns, Leistungen, Referenzen, Kontakt, FAQ, Galerie, Preise.</li>'
                    .'<li>Markenfarbe, Ton, Kontaktdaten eingeben.</li>'
                    .'<li>"Mit KI erstellen" klicken. 20-40 s pro Seite, gesamt 2-5 min.</li>'
                    .'</ol>'
                    .'<p>Ergebnis: SEO-freundlich, modernes Design mit Inline-CSS, im WP-Editor voll editierbar.</p>'
                ),
                array( 'icon'=>'🌟', 'title'=>'7. Landing Pages', 'body'=>
                    '<p>' . $b( $L['tanitim'], 'Landing Pages' ) . ' erzeugt eine einzelne fokussierte Verkaufsseite pro Produkt/Kampagne. Site Builder = Multi-Page, Landing = Single-Page.</p>'
                ),
                array( 'icon'=>'📺', 'title'=>'8. Video TV + KI-Video/Podcast', 'body'=>
                    '<p>' . $b( $L['vtv'], 'Video TV — Quellen' ) . ' für YouTube/Dailymotion/Live-TV. ' . $b( $L['video'], 'Video erzeugen' ) . ' via HeyGen. ' . $b( $L['podcast'], 'Podcast erzeugen' ) . ' mit natürlicher Stimme.</p>'
                ),
                array( 'icon'=>'📰', 'title'=>'9. RSS Direct (ohne KI)', 'body'=>
                    '<p>Importiert RSS-Artikel <strong>direkt</strong> ohne KI. Modul ist <strong>standardmäßig deaktiviert</strong> — in ' . $b( $L['license'], 'Lizenz → Module' ) . ' aktivieren, dann ' . $b( $L['rss'], 'Kampagnen' ) . ' anlegen.</p>'
                ),
                array( 'icon'=>'📦', 'title'=>'10. Blöcke — Stories, Schlagzeilen, Tabs', 'body'=>
                    '<p>' . $b( $L['bloklar'], 'Block-Manager' ) . ': Stories (Instagram-Stil), Schlagzeilen-Boxen, Tab-Listen. Shortcode z. B. <code>[ahenk_blok_hikaye id="3"]</code>.</p>'
                ),
                array( 'icon'=>'🧩', 'title'=>'11. Vollbild-Vorlage', 'body'=>
                    '<p>Vorlage <strong>"Ahenk Full Page"</strong> blendet Theme-Header/Footer aus. Anwendung: <strong>Seite bearbeiten → Seiteneigenschaften → Vorlage → "Ahenk Full Page"</strong>.</p>'
                ),
                array( 'icon'=>'🔐', 'title'=>'12. Sicherheit', 'body'=>
                    '<p>Gehärtet in 3.11.4: Passwörter mit <strong>Pepper + bcrypt (cost=12)</strong>, Pepper aus WP-Salts abgeleitet. WP-Admins benötigen kein Plugin-Passwort. Selbst bei DB-Leak bleibt der Zugang geschützt.</p>'
                ),
                array( 'icon'=>'📞', 'title'=>'13. Support', 'body'=>
                    '<p>' . $bx( $L['wa'], 'WhatsApp: +90 541 313 62 45' ) . $bx( $L['mail'], 'E-Mail: ahenkbt@gmail.com' ) . $bx( $L['airobot'], 'ahenk.net.tr/airobot' ) . '</p>'
                    .'<p>VIP-Support (Jahresplan): direkter WhatsApp-Kontakt, individuelle Vorlagen, Einrichtungsberatung.</p>'
                ),
            ),
        );

        /* ======================= FRANÇAIS ======================= */
        $fr = array(
            'title' => '📖 Ahenk AI Content Robot — Guide utilisateur',
            'intro' => 'Ce guide parcourt pas à pas toutes les fonctions — de l\'installation à la génération de contenu, en passant par le constructeur de site et le renouvellement de licence. Liens directs vers chaque page utile.',
            'toc_title' => 'Table des matières',
            'sections' => array(
                array( 'icon'=>'📦', 'title'=>'1. Installation & premier lancement', 'body'=>
                    '<p>Installez via <strong>Extensions → Ajouter → Téléverser</strong> à partir du ZIP et activez. Les menus "Ahenk AI" et "Ahenk License" apparaissent dans la barre latérale.</p>'
                    .'<p>À la première installation, un mot de passe administrateur aléatoire s\'affiche une seule fois dans un bandeau jaune. Conservez-le en lieu sûr. Les administrateurs WordPress n\'en ont pas besoin — connexion automatique.</p>'
                    .'<p>Dernière version & guides : ' . $bx( $L['airobot'], 'ahenk.net.tr/airobot' ) . '</p>'
                    .'<p><strong>Accès rapides :</strong> ' . $b( $L['license'], 'Licence' ) . $b( $L['settings'], 'Réglages' ) . '</p>'
                ),
                array( 'icon'=>'🔑', 'title'=>'2. Clé API OpenAI', 'body'=>
                    '<p>L\'extension utilise OpenAI pour toute la génération. Votre clé est requise :</p>'
                    .'<ol><li>Créez une clé <code>sk-</code> sur ' . $bx( $L['openai'], 'platform.openai.com/api-keys' ) . '.</li><li>Ouvrez ' . $b( $L['settings'], 'Réglages' ) . '.</li><li>Collez la clé, choisissez <code>gpt-4o-mini</code> (rapide) ou <code>gpt-4o</code> (qualité), enregistrez.</li></ol>'
                    .'<p>Même clé pour tous les modules. La facturation se fait directement sur votre compte OpenAI.</p>'
                ),
                array( 'icon'=>'🎁', 'title'=>'3. Licence & 7 jours offerts', 'body'=>
                    '<p>Toutes les fonctions sont <strong>gratuites 7 jours</strong>. Ensuite, choisissez un plan dans ' . $b( $L['license'], 'Panneau Licence' ) . '.</p>'
                    .'<ul><li><strong>Mensuel — 40 $</strong> : 30 jours.</li><li><strong>6 mois — 200 $</strong> : 180 jours, ~33 $/mois, 40 $ d\'économie.</li><li><strong>Annuel — 350 $</strong> : 365 jours, ~29 $/mois, 130 $ d\'économie + support VIP.</li></ul>'
                    .'<p><strong>Paiement :</strong> Stripe, virement (IBAN : TR57 0010 3000 0000 0081 2207 96), WhatsApp. Après virement, téléversez le reçu ; activation après validation.</p>'
                    .'<p>Licence <strong>liée à un seul domaine</strong>. Changement : ' . $bx( $L['wa'], 'WhatsApp' ) . $bx( $L['mail'], 'Email' ) . '</p>'
                ),
                array( 'icon'=>'🤖', 'title'=>'4. Génération IA d\'actualités et contenus', 'body'=>
                    '<p>Trois modes sous le menu <strong>Ahenk AI</strong> :</p>'
                    .'<ul><li><strong>RSS / Google News / scraping HTML :</strong> sources, récupération automatique, réécriture IA, publication WordPress avec catégorisation et anti-doublon.</li><li><strong>Article unique :</strong> ' . $b( $L['tek'], 'Article unique' ) . ' à partir de toute URL ou sujet.</li><li><strong>Images IA :</strong> DALL-E 3 / GPT-Image + recherche web.</li></ul>'
                    .'<p>Flux : ' . $b( $L['settings'], 'Réglages' ) . ' → sources → prompts → ' . $b( $L['panel'], 'Lancer la campagne' ) . '.</p>'
                ),
                array( 'icon'=>'✍️', 'title'=>'5. Chroniqueurs IA', 'body'=>
                    '<p>Créez des personnages d\'auteurs avec spécialité, ton, biographie et portrait — tous générés par l\'IA. Onglet "Chroniqueurs" sous Ahenk AI. Fréquence, longueur (600+ mots) et planning réglables.</p>'
                ),
                array( 'icon'=>'🏗', 'title'=>'6. Constructeur de site IA (NOUVEAU)', 'body'=>
                    '<p>Créez un site premium complet en un clic. Votre thème actif est <strong>préservé</strong>; les nouvelles pages utilisent le modèle pleine largeur intégré.</p>'
                    .'<ol>'
                    .'<li>Ouvrez ' . $b( $L['sb'], 'Site Builder' ) . '.</li>'
                    .'<li>Saisissez le nom + un brief court de 3-5 lignes.</li>'
                    .'<li>Cochez les pages : Accueil, À propos, Services, Références, Contact, FAQ, Galerie, Tarifs.</li>'
                    .'<li>Définissez couleur, ton, téléphone, adresse, email.</li>'
                    .'<li>Cliquez "Construire avec l\'IA". 20-40 s par page, 2-5 min au total.</li>'
                    .'</ol>'
                    .'<p>Sortie SEO, design moderne inline-CSS, modifiable dans l\'éditeur WP.</p>'
                ),
                array( 'icon'=>'🌟', 'title'=>'7. Pages de vente', 'body'=>
                    '<p>' . $b( $L['tanitim'], 'Pages de vente' ) . ' génère une page produit/campagne unique et focalisée.</p>'
                ),
                array( 'icon'=>'📺', 'title'=>'8. Video TV + Vidéo/Podcast IA', 'body'=>
                    '<p>' . $b( $L['vtv'], 'Video TV — Sources' ) . ' YouTube/Dailymotion/live. ' . $b( $L['video'], 'Générer vidéo' ) . ' (HeyGen). ' . $b( $L['podcast'], 'Générer podcast' ) . ' voix naturelle.</p>'
                ),
                array( 'icon'=>'📰', 'title'=>'9. RSS Direct (sans IA)', 'body'=>
                    '<p>Import RSS <strong>direct</strong> sans IA. Module <strong>désactivé par défaut</strong> — activez-le dans ' . $b( $L['license'], 'Licence → Modules' ) . ', puis configurez ' . $b( $L['rss'], 'Campagnes' ) . '.</p>'
                ),
                array( 'icon'=>'📦', 'title'=>'10. Blocs — Stories, Titres, Onglets', 'body'=>
                    '<p>' . $b( $L['bloklar'], 'Gestion des blocs' ) . ' : stories, encarts titres, listes à onglets multi-catégories. Shortcode <code>[ahenk_blok_hikaye id="3"]</code>.</p>'
                ),
                array( 'icon'=>'🧩', 'title'=>'11. Modèle pleine page', 'body'=>
                    '<p>Modèle <strong>"Ahenk Full Page"</strong> masque en-tête/pied du thème. <strong>Modifier la page → Attributs de page → Modèle → "Ahenk Full Page"</strong>.</p>'
                ),
                array( 'icon'=>'🔐', 'title'=>'12. Sécurité', 'body'=>
                    '<p>Renforcé en 3.11.4 : mots de passe <strong>pepper + bcrypt (cost=12)</strong>, pepper dérivé des salts WP. Les admins WP n\'utilisent pas de mot de passe d\'extension. Même en cas de fuite DB, accès bloqué.</p>'
                ),
                array( 'icon'=>'📞', 'title'=>'13. Support', 'body'=>
                    '<p>' . $bx( $L['wa'], 'WhatsApp : +90 541 313 62 45' ) . $bx( $L['mail'], 'Email : ahenkbt@gmail.com' ) . $bx( $L['airobot'], 'ahenk.net.tr/airobot' ) . '</p>'
                    .'<p>Support VIP (plan annuel) : WhatsApp direct, modèles sur mesure, conseil d\'installation.</p>'
                ),
            ),
        );

        /* ======================= ESPAÑOL ======================= */
        $es = array(
            'title' => '📖 Ahenk AI Content Robot — Guía de uso',
            'intro' => 'Esta guía recorre paso a paso todas las funciones — desde la instalación hasta la generación de contenido, el constructor de sitios y la renovación de licencia. Con enlaces directos a cada sección.',
            'toc_title' => 'Índice',
            'sections' => array(
                array( 'icon'=>'📦', 'title'=>'1. Instalación y primer arranque', 'body'=>
                    '<p>Instale desde <strong>Plugins → Añadir nuevo → Subir plugin</strong> con el ZIP y actívelo. Los menús "Ahenk AI" y "Ahenk License" aparecen en la barra lateral.</p>'
                    .'<p>En la primera instalación se muestra, una sola vez, una contraseña de administrador aleatoria en un aviso amarillo. Guárdela. Si es administrador de WordPress, no la necesita — inicio de sesión automático.</p>'
                    .'<p>Última versión y guías: ' . $bx( $L['airobot'], 'ahenk.net.tr/airobot' ) . '</p>'
                    .'<p><strong>Accesos rápidos:</strong> ' . $b( $L['license'], 'Licencia' ) . $b( $L['settings'], 'Ajustes' ) . '</p>'
                ),
                array( 'icon'=>'🔑', 'title'=>'2. Clave API de OpenAI', 'body'=>
                    '<p>El plugin usa OpenAI para toda la generación IA. Se requiere su propia clave:</p>'
                    .'<ol><li>Cree una clave <code>sk-</code> en ' . $bx( $L['openai'], 'platform.openai.com/api-keys' ) . '.</li><li>Abra ' . $b( $L['settings'], 'Ajustes' ) . '.</li><li>Pegue la clave, elija <code>gpt-4o-mini</code> (velocidad) o <code>gpt-4o</code> (calidad), guarde.</li></ol>'
                    .'<p>Misma clave para todos los módulos. El uso se factura directamente en su cuenta de OpenAI.</p>'
                ),
                array( 'icon'=>'🎁', 'title'=>'3. Licencia y 7 días gratis', 'body'=>
                    '<p>Todas las funciones <strong>gratis 7 días</strong>. Tras la prueba elija un plan en ' . $b( $L['license'], 'Panel de Licencia' ) . '.</p>'
                    .'<ul><li><strong>Mensual — $40</strong>: 30 días.</li><li><strong>6 meses — $200</strong>: 180 días, ~$33/mes, ahorro $40.</li><li><strong>Anual — $350</strong>: 365 días, ~$29/mes, ahorro $130 + soporte VIP.</li></ul>'
                    .'<p><strong>Pago:</strong> Stripe, transferencia (IBAN: TR57 0010 3000 0000 0081 2207 96), WhatsApp. Tras la transferencia, suba el comprobante; activación con aprobación.</p>'
                    .'<p>Licencia <strong>ligada a un dominio</strong>. Para cambios: ' . $bx( $L['wa'], 'WhatsApp' ) . $bx( $L['mail'], 'Email' ) . '</p>'
                ),
                array( 'icon'=>'🤖', 'title'=>'4. Generación IA de noticias y contenidos', 'body'=>
                    '<p>Tres modos en el menú <strong>Ahenk AI</strong>:</p>'
                    .'<ul><li><strong>RSS / Google News / HTML:</strong> defina fuentes, el bot importa y la IA reescribe con categorización y anti-duplicados.</li><li><strong>Artículo único:</strong> ' . $b( $L['tek'], 'Artículo único' ) . ' desde cualquier URL o tema.</li><li><strong>Imágenes IA:</strong> DALL-E 3 / GPT-Image + búsqueda web.</li></ul>'
                    .'<p>Flujo: ' . $b( $L['settings'], 'Ajustes' ) . ' → fuentes → prompts → ' . $b( $L['panel'], 'Iniciar campaña' ) . '.</p>'
                ),
                array( 'icon'=>'✍️', 'title'=>'5. Columnistas IA', 'body'=>
                    '<p>Cree autores con especialidad, tono, biografía y foto — generados por IA. Pestaña "Columnistas" bajo Ahenk AI. Frecuencia, longitud (600+ palabras) y calendario configurables.</p>'
                ),
                array( 'icon'=>'🏗', 'title'=>'6. Constructor de Sitio IA (NUEVO)', 'body'=>
                    '<p>Cree un sitio premium completo con un clic. Su tema activo se <strong>conserva</strong>; las páginas nuevas usan la plantilla a pantalla completa del plugin.</p>'
                    .'<ol><li>Abra ' . $b( $L['sb'], 'Site Builder' ) . '.</li><li>Nombre del negocio + resumen de 3-5 líneas.</li><li>Elija páginas: Inicio, Nosotros, Servicios, Referencias, Contacto, FAQ, Galería, Precios.</li><li>Defina color, tono, teléfono, dirección, email.</li><li>Pulse "Construir con IA". 20-40 s por página, 2-5 min total.</li></ol>'
                    .'<p>Resultado SEO, diseño moderno con CSS inline, editable en WP.</p>'
                ),
                array( 'icon'=>'🌟', 'title'=>'7. Páginas de aterrizaje', 'body'=>
                    '<p>' . $b( $L['tanitim'], 'Páginas de aterrizaje' ) . ' genera una landing única enfocada.</p>'
                ),
                array( 'icon'=>'📺', 'title'=>'8. Video TV + Video/Podcast IA', 'body'=>
                    '<p>' . $b( $L['vtv'], 'Video TV' ) . ' para YouTube/Dailymotion/directo. ' . $b( $L['video'], 'Generar vídeo' ) . ' (HeyGen). ' . $b( $L['podcast'], 'Generar podcast' ) . ' voz natural.</p>'
                ),
                array( 'icon'=>'📰', 'title'=>'9. RSS Direct (sin IA)', 'body'=>
                    '<p>Importa RSS <strong>directamente</strong> sin IA. Módulo <strong>desactivado por defecto</strong> — actívelo en ' . $b( $L['license'], 'Licencia → Módulos' ) . ', luego configure ' . $b( $L['rss'], 'Campañas' ) . '.</p>'
                ),
                array( 'icon'=>'📦', 'title'=>'10. Bloques — Stories, Titulares, Pestañas', 'body'=>
                    '<p>' . $b( $L['bloklar'], 'Gestor de bloques' ) . ': stories, tarjetas de titulares, listas por pestañas. Shortcode <code>[ahenk_blok_hikaye id="3"]</code>.</p>'
                ),
                array( 'icon'=>'🧩', 'title'=>'11. Plantilla a pantalla completa', 'body'=>
                    '<p>Plantilla <strong>"Ahenk Full Page"</strong> oculta cabecera/pie del tema. <strong>Editar página → Atributos → Plantilla → "Ahenk Full Page"</strong>.</p>'
                ),
                array( 'icon'=>'🔐', 'title'=>'12. Seguridad', 'body'=>
                    '<p>Reforzado en 3.11.4: contraseñas con <strong>pepper + bcrypt (cost=12)</strong>, pepper derivado de los salts de WP. Administradores WP entran sin contraseña del plugin.</p>'
                ),
                array( 'icon'=>'📞', 'title'=>'13. Soporte', 'body'=>
                    '<p>' . $bx( $L['wa'], 'WhatsApp: +90 541 313 62 45' ) . $bx( $L['mail'], 'Email: ahenkbt@gmail.com' ) . $bx( $L['airobot'], 'ahenk.net.tr/airobot' ) . '</p>'
                    .'<p>Soporte VIP (plan anual): WhatsApp directo, plantillas a medida, consultoría de instalación.</p>'
                ),
            ),
        );

        /* ======================= РУССКИЙ ======================= */
        $ru = array(
            'title' => '📖 Ahenk AI Content Robot — Руководство пользователя',
            'intro' => 'Это пошаговое руководство по всем функциям — от установки и генерации контента до конструктора сайта и продления лицензии. С прямыми ссылками на все нужные разделы.',
            'toc_title' => 'Содержание',
            'sections' => array(
                array( 'icon'=>'📦', 'title'=>'1. Установка и первый запуск', 'body'=>
                    '<p>Установите через <strong>Плагины → Добавить новый → Загрузить</strong> ZIP и активируйте. В боковом меню появятся пункты "Ahenk AI" и "Ahenk License".</p>'
                    .'<p>При первой установке один раз отображается случайно сгенерированный пароль администратора в жёлтом уведомлении. Сохраните его. Администраторам WordPress пароль не нужен — вход автоматический.</p>'
                    .'<p>Последняя версия и руководства: ' . $bx( $L['airobot'], 'ahenk.net.tr/airobot' ) . '</p>'
                    .'<p><strong>Быстрый доступ:</strong> ' . $b( $L['license'], 'Лицензия' ) . $b( $L['settings'], 'Настройки' ) . '</p>'
                ),
                array( 'icon'=>'🔑', 'title'=>'2. Ключ OpenAI API', 'body'=>
                    '<p>Плагин использует OpenAI для всей ИИ-генерации. Нужен ваш собственный ключ:</p>'
                    .'<ol><li>Создайте ключ <code>sk-</code> на ' . $bx( $L['openai'], 'platform.openai.com/api-keys' ) . '.</li><li>Откройте ' . $b( $L['settings'], 'Настройки' ) . '.</li><li>Вставьте ключ, выберите <code>gpt-4o-mini</code> (скорость) или <code>gpt-4o</code> (качество), сохраните.</li></ol>'
                    .'<p>Один ключ для всех модулей. Оплата — напрямую через ваш аккаунт OpenAI.</p>'
                ),
                array( 'icon'=>'🎁', 'title'=>'3. Лицензия и 7 дней бесплатно', 'body'=>
                    '<p>Все функции <strong>бесплатно 7 дней</strong>. После пробного периода выберите тариф в ' . $b( $L['license'], 'панели Лицензии' ) . '.</p>'
                    .'<ul><li><strong>Месяц — $40</strong>: 30 дней.</li><li><strong>6 месяцев — $200</strong>: 180 дней, ~$33/мес, экономия $40.</li><li><strong>Год — $350</strong>: 365 дней, ~$29/мес, экономия $130 + VIP-поддержка.</li></ul>'
                    .'<p><strong>Оплата:</strong> Stripe, банковский перевод (IBAN: TR57 0010 3000 0000 0081 2207 96), WhatsApp. После перевода загрузите квитанцию; активация после проверки администратором.</p>'
                    .'<p>Лицензия <strong>привязывается к одному домену</strong>. Смена домена: ' . $bx( $L['wa'], 'WhatsApp' ) . $bx( $L['mail'], 'Email' ) . '</p>'
                ),
                array( 'icon'=>'🤖', 'title'=>'4. ИИ-генерация новостей и контента', 'body'=>
                    '<p>Три режима в меню <strong>Ahenk AI</strong>:</p>'
                    .'<ul><li><strong>RSS / Google News / HTML-скрейпинг:</strong> задайте источники, бот сам забирает новые материалы, ИИ переписывает уникально, публикует как записи WordPress с категоризацией и анти-дубликатами.</li><li><strong>Одна статья:</strong> ' . $b( $L['tek'], 'Одна статья' ) . ' из любого URL или темы.</li><li><strong>ИИ-картинки:</strong> DALL-E 3 / GPT-Image + веб-поиск.</li></ul>'
                    .'<p>Поток: ' . $b( $L['settings'], 'Настройки' ) . ' → источники → промпты → ' . $b( $L['panel'], 'Запустить кампанию' ) . '.</p>'
                ),
                array( 'icon'=>'✍️', 'title'=>'5. ИИ-колумнисты', 'body'=>
                    '<p>Создавайте авторов с тематикой, стилем, биографией и портретом — всё ИИ. Вкладка "Колумнисты" в Ahenk AI. Частота, длина (600+ слов) и расписание настраиваются.</p>'
                ),
                array( 'icon'=>'🏗', 'title'=>'6. ИИ-конструктор сайта (НОВОЕ)', 'body'=>
                    '<p>Одним кликом — полноценный премиум-сайт. Активная тема <strong>сохраняется</strong>; новые страницы используют полноэкранный шаблон плагина.</p>'
                    .'<ol><li>Откройте ' . $b( $L['sb'], 'Site Builder' ) . '.</li><li>Введите название и короткое описание 3-5 строк.</li><li>Выберите страницы: Главная, О нас, Услуги, Отзывы, Контакты, FAQ, Галерея, Цены.</li><li>Укажите цвет, тон, телефон, адрес, e-mail.</li><li>Нажмите "Создать сайт с ИИ". 20-40 сек на страницу, всего 2-5 мин.</li></ol>'
                    .'<p>Результат SEO-оптимизирован, современный дизайн на inline-CSS, редактируется в WP.</p>'
                ),
                array( 'icon'=>'🌟', 'title'=>'7. Лендинги', 'body'=>
                    '<p>' . $b( $L['tanitim'], 'Лендинги' ) . ' создаёт одну фокусированную продающую страницу.</p>'
                ),
                array( 'icon'=>'📺', 'title'=>'8. Video TV + ИИ-видео/подкаст', 'body'=>
                    '<p>' . $b( $L['vtv'], 'Video TV' ) . ' для YouTube/Dailymotion/прямого эфира. ' . $b( $L['video'], 'Создать видео' ) . ' (HeyGen). ' . $b( $L['podcast'], 'Создать подкаст' ) . ' с естественным голосом.</p>'
                ),
                array( 'icon'=>'📰', 'title'=>'9. RSS Direct (без ИИ)', 'body'=>
                    '<p>Импорт RSS <strong>напрямую</strong> без ИИ. Модуль <strong>отключён по умолчанию</strong> — включите в ' . $b( $L['license'], 'Лицензия → Модули' ) . ', затем настройте ' . $b( $L['rss'], 'Кампании' ) . '.</p>'
                ),
                array( 'icon'=>'📦', 'title'=>'10. Блоки — Stories, Заголовки, Вкладки', 'body'=>
                    '<p>' . $b( $L['bloklar'], 'Менеджер блоков' ) . ': stories, карточки заголовков, многовкладочные списки. Шорткод <code>[ahenk_blok_hikaye id="3"]</code>.</p>'
                ),
                array( 'icon'=>'🧩', 'title'=>'11. Полноэкранный шаблон', 'body'=>
                    '<p>Шаблон <strong>"Ahenk Full Page"</strong> скрывает шапку/подвал темы. <strong>Правка страницы → Атрибуты → Шаблон → "Ahenk Full Page"</strong>.</p>'
                ),
                array( 'icon'=>'🔐', 'title'=>'12. Безопасность', 'body'=>
                    '<p>Усилено в 3.11.4: пароли хранятся с <strong>pepper + bcrypt (cost=12)</strong>, pepper берётся из солей WP. Администраторы WP входят без пароля плагина. Даже при утечке БД вход заблокирован.</p>'
                ),
                array( 'icon'=>'📞', 'title'=>'13. Поддержка', 'body'=>
                    '<p>' . $bx( $L['wa'], 'WhatsApp: +90 541 313 62 45' ) . $bx( $L['mail'], 'Email: ahenkbt@gmail.com' ) . $bx( $L['airobot'], 'ahenk.net.tr/airobot' ) . '</p>'
                    .'<p>VIP-поддержка (годовой тариф): прямой WhatsApp, индивидуальные шаблоны, консультации по настройке.</p>'
                ),
            ),
        );

        return compact( 'tr', 'en', 'ar', 'de', 'fr', 'es', 'ru' );
    }
}
