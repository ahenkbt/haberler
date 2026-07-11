/** Platform varsayılan HM telif / kullanım şartları sayfası HTML gövdesi. */
export const HM_TELIF_DEFAULT_BODY_HTML = `<div class="hm-vkv-masthead-page-root">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Merriweather:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">

<style>
    /* Global template reset overrides */
    #content, #MainContent, main#content { max-width: 100% !important; padding: 0 !important; width: 100% !important; margin: 0 !important; }
    .page-hero, .page-content, .page__heading, .page__header, .page-header, .page-title { display: none !important; }
    
    .hm-vkv-masthead-page-root {
        --vkv-blue: #0F172A;
        --vkv-blue-light: #1E293B;
        --vkv-red: #DC2626;
        --vkv-gold: #D97706;
        --vkv-gray-bg: #F8FAFC;
        --vkv-border: #E2E8F0;
        --vkv-text-dark: #334155;
        --vkv-text-muted: #64748B;
        --font-main: 'Inter', sans-serif;
        --font-serif: 'Merriweather', Georgia, serif;
    }

    .pw-masthead { font-family: var(--font-main); color: var(--vkv-text-dark); background-color: #ffffff; line-height: 1.6; padding: 40px 0; }
    .masthead-container { width: 100%; max-width: 1100px; margin: 0 auto; padding: 0 20px; box-sizing: border-box; }
    
    *, *::before, *::after { box-sizing: border-box; }

    /* HEADER STYLE */
    .masthead-header { text-align: center; border-bottom: 3px solid var(--vkv-red); padding-bottom: 20px; margin-bottom: 40px; }
    .masthead-header h1 { color: var(--vkv-blue); font-family: var(--font-serif); font-size: 34px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: 1.5px; }
    .masthead-header p { color: var(--vkv-red); font-weight: 700; margin: 8px 0 0 0; letter-spacing: 3px; font-size: 13px; text-transform: uppercase; }

    /* INFRASTRUCTURE BANNER */
    .infra-card { background: var(--vkv-blue); padding: 25px 30px; border-radius: 8px; border-left: 8px solid var(--vkv-gold); box-shadow: 0 4px 20px rgba(0,0,0,0.08); margin-bottom: 35px; }
    .infra-title { color: var(--vkv-gold); font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
    .infra-desc { color: #E2E8F0; font-size: 14px; line-height: 1.6; margin: 0; text-align: justify; }
    .infra-desc a { color: var(--vkv-gold); text-decoration: none; font-weight: 600; }
    .infra-desc a:hover { text-decoration: underline; }

    /* GRID ARCHITECTURE */
    .masthead-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 25px; margin-bottom: 40px; }
    .full-width-block { grid-column: span 2; }
    
    /* CONTENT BLOCKS */
    .masthead-block { background: var(--vkv-gray-bg); border: 1px solid var(--vkv-border); border-radius: 8px; padding: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
    .masthead-block h2 { font-family: var(--font-serif); font-size: 18px; color: var(--vkv-blue); margin: 0 0 20px 0; border-bottom: 2px solid rgba(15, 23, 42, 0.08); padding-bottom: 10px; display: flex; align-items: center; gap: 10px; font-weight: 700; }
    .masthead-block h2 i { color: var(--vkv-red); font-size: 16px; }

    /* KURUMSAL İLETİŞİM — küçük tipografi, iki sütun */
    .masthead-block-corporate-info { font-size: 11px; line-height: 1.5; }
    .masthead-block-corporate-info h2 { font-size: 14px; }
    .masthead-block-corporate-info .info-table td { font-size: 10.5px; }
    .masthead-block-corporate-info .info-label { font-size: 8.5px; }
    .masthead-block-corporate-info .info-value { font-size: 10.5px; }
    .corporate-info-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 28px; margin-top: 8px; }

    /* LIST MATRIX */
    .policy-list { list-style: none; padding: 0; margin: 0; }
    .policy-item { position: relative; padding-left: 30px; margin-bottom: 15px; font-size: 14.5px; }
    .policy-item:last-child { margin-bottom: 0; }
    .policy-item i { position: absolute; left: 0; top: 4px; color: var(--vkv-red); font-size: 14px; }
    .policy-item strong { color: var(--vkv-blue); display: block; margin-bottom: 2px; }

    /* TABLES FOR PROVIDER INFO */
    .info-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .info-table td { padding: 12px 0; border-bottom: 1px solid rgba(0,0,0,0.05); font-size: 14px; vertical-align: top; }
    .info-table tr:last-child td { border-bottom: none; }
    .info-label { font-weight: 700; color: var(--vkv-text-muted); width: 140px; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; padding-top: 3px !important; }
    .info-value { color: var(--vkv-blue); font-weight: 600; padding-left: 15px; }
    .info-value a { color: var(--vkv-blue); text-decoration: none; }
    .info-value a:hover { color: var(--vkv-red); }

    /* FOOTER */
    .masthead-footer { margin-top: 50px; padding: 20px; background: var(--vkv-gray-bg); border: 1px solid var(--vkv-border); border-radius: 8px; text-align: center; color: var(--vkv-text-muted); font-size: 13px; }
    .masthead-footer strong { color: var(--vkv-blue); }

    /* RESPONSIVE DESIGN */
    @media (max-width: 768px) {
        .masthead-grid { grid-template-columns: 1fr; gap: 20px; }
        .full-width-block { grid-column: span 1; }
        .masthead-header h1 { font-size: 26px; }
        .corporate-info-columns { grid-template-columns: 1fr; }
    }
</style>

<div class="pw-masthead">
    <div class="masthead-container">

        <div class="masthead-header">
            <h1>⚖️ TELİF VE KULLANIM ŞARTLARI ⚖️</h1>
            <p>YASAL BİLGİLENDİRME VE YAYIN İLKELERİ</p>
        </div>

        <!-- PLATFORM VE ALTYAPI HAKKINDA -->
        <div class="infra-card">
            <div class="infra-title"><i class="fa-solid fa-cubes"></i> Platform ve Altyapı Hakkında</div>
            <p class="infra-desc">
                Bu web sitesi, Türkiye'nin ve Türk Dünyasının yerli ve milli arama motoru ve süper uygulaması (Super App) ekosistemi olan <a href="https://yekpare.net/habermerkezi" target="_blank">yekpare.net/habermerkezi</a> bulut haber altyapısını kullanmaktadır. Sitemizde yer alan içeriklerin bir kısmı kendi özgün kadromuz tarafından üretilirken, bir kısmı ise Türkiye ve dünyadan çeşitli haber kaynaklarından anlık veri akışı ile sağlanmaktadır.
            </p>
        </div>

        <div class="masthead-grid">

            <!-- ÖZGÜN KADRO VE YAYIN İLKELERİ -->
            <div class="masthead-block">
                <h2><i class="fa-solid fa-pen-nib"></i> Özgün Kadromuz ve Yayın İlkelerimiz</h2>
                <ul class="policy-list">
                    <li class="policy-item">
                        <i class="fa-solid fa-feather-pointed"></i>
                        <strong>Özgün İçerik Üretimi</strong>
                        Sitemizde yer alan özel haber, köşe yazısı, analiz, röportaj ve multimedya içeriklerinin bir kısmı doğrudan kendi özgün yayın kadromuz tarafından gazetecilik etiğine uygun olarak üretilmektedir.
                    </li>
                    <li class="policy-item">
                        <i class="fa-solid fa-bullseye"></i>
                        <strong>Doğruluk ve Tarafsızlık</strong>
                        Özgün kadromuz tarafından hazırlanan tüm içeriklerde; nesnellik, doğruluk, kamu yararı gözetilmesi ve cevap hakkına saygı ilkeleri titizlikle uygulanır. Çıkar çatışmalarından uzak, bağımsız habercilik hedeflenir.
                    </li>
                    <li class="policy-item">
                        <i class="fa-solid fa-user-shield"></i>
                        <strong>Fikri Mülkiyet ve Hak Saklılığı</strong>
                        Kadromuzun ürettiği tüm yazılı, görsel ve işitsel içeriklerin telif hakları yasalarca saklıdır. Kaynak gösterilmeden veya yazılı izin alınmadan ticari amaçlarla kopyalanması, alıntılanması ya da yeniden yayınlanması yasaktır.
                    </li>
                </ul>
            </div>

            <!-- RSS FEED SİSTEMİ -->
            <div class="masthead-block">
                <h2><i class="fa-solid fa-rss"></i> 1. RSS Feed (Haber Akışı) Sistemi</h2>
                <ul class="policy-list">
                    <li class="policy-item">
                        <i class="fa-solid fa-bolt"></i>
                        <strong>Dinamik Gösterim Teknolojisi</strong>
                        RSS Feed yoluyla çekilen dış kaynaklı içerikler sadece bilgi sunma amacıyla anlık yayınlanır.
                    </li>
                    <li class="policy-item">
                        <i class="fa-solid fa-server"></i>
                        <strong>Veritabanı ve Arşiv Muafiyeti</strong>
                        RSS haberleri veritabanına kaydedilmez, sunucularda barındırılmaz, son 10 haber listelenir ve arşivlenmez.
                    </li>
                    <li class="policy-item">
                        <i class="fa-solid fa-copyright"></i>
                        <strong>Telif ve Yayıncı Hakları</strong>
                        Telif hakları tamamen kaynak siteye aittir; platformumuz bu dış içerikler üzerinde hak iddia etmez.
                    </li>
                    <li class="policy-item">
                        <i class="fa-solid fa-scale-balanced"></i>
                        <strong>Haber Sorumluluğu</strong>
                        Dış kaynaklardan çekilen haberlerin doğruluğu, güncelliği ve hukuki sorumluluğu tamamen kaynak siteye aittir.
                    </li>
                    <li class="policy-item">
                        <i class="fa-solid fa-link"></i>
                        <strong>Kaynak ve Bağlantı Gösterimi</strong>
                        RSS haber akışında haber kaynağı site ve haber linki yer almaktadır.
                    </li>
                </ul>
            </div>

            <!-- YASAKLI İÇERİKLER -->
            <div class="masthead-block full-width-block">
                <h2><i class="fa-solid fa-hand-holding-hand"></i> 2. Yasaklı İçerikler ve Yayın Kısıtlamaları</h2>
                <ul class="policy-list">
                    <li class="policy-item">
                        <i class="fa-solid fa-circle-xmark"></i>
                        <strong>Karalama ve Hakaret Yasağı:</strong> Gerçek veya tüzel kişilere, kamu veya özel kurumlara karşı hakaret, iftira ve karalama niteliği taşıyan içerikler yayınlanamaz.
                    </li>
                    <li class="policy-item">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <strong>Ayrımcılık ve Nefret Söylemi:</strong> Toplumu kin, nefret ve düşmanlığa tahrik eden, ayrımcılık içeren yayınlara yer verilmez.
                    </li>
                    <li class="policy-item">
                        <i class="fa-solid fa-gavel"></i>
                        <strong>Haksız Rekabet ve Ahlak:</strong> Haksız rekabet yaratan, genel ahlak kurallarını ihlal eden içerikler platform kuralları gereği elenir.
                    </li>
                </ul>
            </div>

            <!-- UYAR-KALDIR SİSTEMİ -->
            <div class="masthead-block full-width-block">
                <h2><i class="fa-solid fa-shield-halved"></i> 3. "Uyar-Kaldır" Sistemi ve Hukuki Uyum</h2>
                <p style="margin: 0; font-size: 14.5px; text-align: justify;">
                    Platformumuz, <strong>5651 sayılı Kanun</strong> kapsamında <strong>"Yer Sağlayıcı"</strong> ilkesiyle hareket etmektedir. Gerek özgün kadromuz gerekse dış kaynaklarca sağlanan içeriklerde; hak sahipleri tarafından kişilik hakları ihlali, telif hakkı tecavüzü beyan edildiğinde veya yasal merciler tarafından şikayet/bildirim ulaştığı anda, içerik derhal incelenerek sistemimizden kaldırılır.
                </p>
            </div>

            <!-- ALTYAPI SAĞLAYICI BİLGİLERİ -->
            <div class="masthead-block full-width-block masthead-block-corporate-info">
                <h2><i class="fa-solid fa-building-shield"></i> 4. Yekpare Haber Merkezi Kurumsal Bilgiler ve İletişim</h2>
                <div class="corporate-info-columns">
                    <table class="info-table">
                        <tr>
                            <td class="info-label">Altyapı Sağlayıcı</td>
                            <td class="info-value">Ahenk Bilgi Teknolojileri Ltd</td>
                        </tr>
                        <tr>
                            <td class="info-label">📩 E-Posta</td>
                            <td class="info-value"><a href="mailto:ahenkbt@gmail.com">ahenkbt@gmail.com</a></td>
                        </tr>
                        <tr>
                            <td class="info-label">🌐 Kurumsal Web</td>
                            <td class="info-value"><a href="https://ahenk.net.tr" target="_blank">https://ahenk.net.tr</a></td>
                        </tr>
                    </table>
                    <table class="info-table">
                        <tr>
                            <td class="info-label">🚀 Portal</td>
                            <td class="info-value"><a href="https://yekpare.net" target="_blank">https://yekpare.net</a></td>
                        </tr>
                        <tr>
                            <td class="info-label">📍 Resmi Adres</td>
                            <td class="info-value">71-75, Shelton Street, Covent Garden, London, United Kingdom, WC2H 9JQ</td>
                        </tr>
                    </table>
                </div>
            </div>

        </div> 
        
        <div class="masthead-footer">
            © 2026 <strong>Yekpare Haber Merkezi</strong> Altyapı Ekosistemi | 5651 Sayılı Kanun Uyarınca Yer Sağlayıcı Bildirimidir.
        </div>

    </div>
</div>
</div>`;
