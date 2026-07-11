<?php
/**
 * Template Name: İlişkili Kurumlar (Tam Eksiksiz Premium Rehber)
 * Template Post Type: page
 */
get_header();
vkv_breadcrumb();
if (have_posts()) { the_post(); }
$vkv_slug = 'kurumlar';
$vkv_custom = function_exists('vkv_get_custom_page_content') ? vkv_get_custom_page_content($vkv_slug) : '';
$vkv_wp_content = get_the_content();
$vkv_has_custom = !empty(trim($vkv_custom));
$vkv_has_wp     = !empty(trim(strip_tags($vkv_wp_content)));
if ($vkv_has_custom):
    echo apply_filters('the_content', $vkv_custom);
elseif ($vkv_has_wp):
    the_content();
else:
?>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<style>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&family=Playfair+Display:wght@700;900&family=Inter:wght@300;400;500;600&display=swap');
:root {
    --v-red: #8C1A2E; --v-red-d: #6E1222; --v-gold: #C9A84C;
    --v-dark: #0D1117; --v-dark-2: #1C2330; --v-text: #1A1F28;
    --v-gray: #F5F2ED; --v-border: #E4E0D8; --v-white: #FFFFFF;
    --shadow-p: 0 15px 35px rgba(0,0,0,0.1);
}
.kurum-portal { font-family: 'Inter', sans-serif; background: #FAFAFA; color: var(--v-text); padding-bottom: 100px; }
/* Hero */
.kurum-hero {
    background: linear-gradient(150deg, var(--v-dark) 0%, var(--v-dark-2) 55%, #18060a 100%);
    padding: 100px 24px; text-align: center; color: #fff; position: relative; border-bottom: 5px solid var(--v-gold);
}
.kurum-hero::before { content: ''; position: absolute; inset: 0; background: url('https://www.transparenttextures.com/patterns/carbon-fibre.png'); opacity: 0.1; }
.kurum-hero h1 { font-family: 'Playfair Display', serif; font-size: clamp(2.5rem, 6vw, 3.8rem); margin-bottom: 20px; font-weight: 900; position: relative; }
.kurum-hero p { max-width: 800px; margin: 0 auto; font-size: 1.2rem; opacity: 0.8; font-weight: 300; position: relative; }
/* Sticky Navigation & Search */
.kurum-controls {
    position: sticky; top: 0; z-index: 1000; background: rgba(255,255,255,0.98);
    backdrop-filter: blur(10px); border-bottom: 1px solid var(--v-border); box-shadow: var(--shadow-p);
    padding: 20px 24px;
}
.controls-inner { max-width: 1400px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 30px; flex-wrap: wrap; }
.search-wrap { flex: 1; min-width: 320px; position: relative; }
.search-wrap input {
    width: 100%; padding: 16px 55px 16px 25px; border-radius: 100px; border: 2px solid var(--v-border);
    font-size: 15px; font-weight: 500; outline: none; transition: 0.4s; background: var(--v-gray);
}
.search-wrap input:focus { border-color: var(--v-red); background: #fff; box-shadow: 0 0 0 5px rgba(140, 26, 46, 0.1); }
.search-wrap i { position: absolute; right: 25px; top: 50%; transform: translateY(-50%); color: var(--v-red); font-size: 18px; }
.filter-pills { display: flex; gap: 12px; flex-wrap: wrap; }
.f-pill {
    padding: 12px 24px; border-radius: 100px; border: 1.5px solid var(--v-border);
    background: #fff; font-size: 12px; font-weight: 800; cursor: pointer;
    transition: 0.3s; text-transform: uppercase; letter-spacing: 1px; color: var(--v-text);
}
.f-pill.active, .f-pill:hover { background: var(--v-red); color: #fff; border-color: var(--v-red); transform: translateY(-2px); }
/* Main Grid Layout */
.kurum-container { max-width: 1400px; margin: 60px auto; padding: 0 24px; }
.kurum-sec-head {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 35px; border-left: 6px solid var(--v-red); padding-left: 20px;
}
.kurum-sec-head h2 { font-family: 'Montserrat', sans-serif; font-size: 1.6rem; font-weight: 800; color: var(--v-dark); margin: 0; }
.kurum-sec-head .count { background: var(--v-gold); color: #000; padding: 6px 16px; border-radius: 50px; font-size: 12px; font-weight: 900; }
.kurum-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 20px; margin-bottom: 80px; }
/* Premium Card Design */
.kurum-card {
    background: #fff; border: 1px solid var(--v-border); border-radius: 18px;
    padding: 30px 25px; display: flex; align-items: flex-start; gap: 20px;
    text-decoration: none !important; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    position: relative; overflow: hidden;
}
.kurum-card::after { content: ''; position: absolute; bottom: 0; left: 0; width: 0; height: 4px; background: var(--v-red); transition: 0.4s; }
.kurum-card:hover { transform: translateY(-8px); border-color: transparent; box-shadow: var(--shadow-p); }
.kurum-card:hover::after { width: 100%; }
.kurum-emblem {
    width: 65px; height: 65px; border-radius: 15px; background: var(--v-gray);
    display: flex; align-items: center; justify-content: center; font-size: 2rem; flex-shrink: 0;
    transition: 0.4s; border: 1px solid rgba(0,0,0,0.05);
}
.kurum-card:hover .kurum-emblem { background: var(--v-red); color: #fff; transform: scale(1.1) rotate(-5deg); }
.kurum-info { flex-grow: 1; }
.kurum-name { display: block; font-weight: 800; color: var(--v-dark); font-size: 14px; line-height: 1.4; margin-bottom: 6px; transition: 0.3s; }
.kurum-desc { display: block; font-size: 12px; color: #718096; font-weight: 500; }
.kurum-card:hover .kurum-name { color: var(--v-red); }
.k-link-icon { align-self: center; font-size: 14px; color: var(--v-border); transition: 0.3s; }
.kurum-card:hover .k-link-icon { color: var(--v-gold); transform: translateX(5px); }
/* No Result */
#no-result { display: none; text-align: center; padding: 100px 20px; background: #fff; border-radius: 30px; border: 2px dashed var(--v-border); }
#no-result i { font-size: 60px; color: var(--v-red); margin-bottom: 20px; opacity: 0.3; }
@media (max-width: 768px) { .kurum-grid { grid-template-columns: 1fr; } .controls-inner { flex-direction: column; } .search-wrap { width: 100%; } }
</style>
<div class="kurum-portal">
    <section class="kurum-hero">
        <div class="kurum-container">
            <div style="font-size:12px; letter-spacing:4px; color:var(--v-gold); font-weight:800; margin-bottom:15px; text-transform:uppercase;">Stratejik Çözüm Ortakları</div>
            <h1>İlişkili Kurumlar Portalı</h1>
            <p>Türkiye Cumhuriyeti'nin köklü devlet yapıları, Türk Dünyası'nın birleştirici kurumları ve küresel düzeydeki stratejik ortaklarımız.</p>
        </div>
    </section>
    <div class="kurum-controls">
        <div class="controls-inner">
            <div class="search-wrap">
                <input type="text" id="kinp" placeholder="Bakanlık, kurum adı veya anahtar kelime..." oninput="KPortal.search(this.value)">
                <i class="fa-solid fa-magnifying-glass"></i>
            </div>
            <div class="filter-pills">
                <button class="f-pill active" onclick="KPortal.filter('all', this)">📋 Tüm Liste</button>
                <button class="f-pill" onclick="KPortal.filter('askeri', this)">⚔️ Askeri</button>
                <button class="f-pill" onclick="KPortal.filter('devlet', this)">🏛️ Devlet</button>
                <button class="f-pill" onclick="KPortal.filter('sivil', this)">🤝 Sivil</button>
                <button class="f-pill" onclick="KPortal.filter('uluslararasi', this)">🌐 Uluslararası</button>
            </div>
        </div>
    </div>
    <div class="kurum-container">
        <div class="kurum-section" data-cat="askeri">
            <div class="kurum-sec-head">
                <h2>Askeri Kurumlar</h2>
                <span class="count">7 KURUM</span>
            </div>
            <div class="kurum-grid">
                <a href="https://www.msb.gov.tr" target="_blank" class="kurum-card" data-n="Genelkurmay Başkanlığı TSK">
                    <div class="kurum-emblem">🪖</div>
                    <div class="kurum-info"><span class="kurum-name">Genelkurmay Başkanlığı</span><span class="kurum-desc">msb.gov.tr</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
                <a href="https://www.kkk.tsk.tr" target="_blank" class="kurum-card" data-n="Kara Kuvvetleri Komutanlığı">
                    <div class="kurum-emblem">🛡️</div>
                    <div class="kurum-info"><span class="kurum-name">Kara Kuvvetleri Komutanlığı</span><span class="kurum-desc">kkk.tsk.tr</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
                <a href="https://www.hvkk.tsk.tr" target="_blank" class="kurum-card" data-n="Hava Kuvvetleri Komutanlığı">
                    <div class="kurum-emblem">✈️</div>
                    <div class="kurum-info"><span class="kurum-name">Hava Kuvvetleri Komutanlığı</span><span class="kurum-desc">hvkk.tsk.tr</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
                <a href="https://www.dzkk.tsk.tr" target="_blank" class="kurum-card" data-n="Deniz Kuvvetleri Komutanlığı">
                    <div class="kurum-emblem">⚓</div>
                    <div class="kurum-info"><span class="kurum-name">Deniz Kuvvetleri Komutanlığı</span><span class="kurum-desc">dzkk.tsk.tr</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
                <a href="https://www.jandarma.gov.tr" target="_blank" class="kurum-card" data-n="Jandarma Genel Komutanlığı">
                    <div class="kurum-emblem">🦅</div>
                    <div class="kurum-info"><span class="kurum-name">Jandarma Genel Komutanlığı</span><span class="kurum-desc">jandarma.gov.tr</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
                <a href="https://www.egm.gov.tr" target="_blank" class="kurum-card" data-n="Emniyet Genel Müdürlüğü Polis">
                    <div class="kurum-emblem">👮</div>
                    <div class="kurum-info"><span class="kurum-name">Emniyet Genel Müdürlüğü</span><span class="kurum-desc">egm.gov.tr</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
                <a href="https://www.msb.gov.tr" target="_blank" class="kurum-card" data-n="Milli Savunma Bakanlığı MSB">
                    <div class="kurum-emblem">⭐</div>
                    <div class="kurum-info"><span class="kurum-name">Milli Savunma Bakanlığı</span><span class="kurum-desc">msb.gov.tr</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
            </div>
        </div>
        <div class="kurum-section" data-cat="devlet">
            <div class="kurum-sec-head">
                <h2>Devlet Kurumları</h2>
                <span class="count">12 KURUM</span>
            </div>
            <div class="kurum-grid">
                <a href="https://www.tccb.gov.tr" target="_blank" class="kurum-card" data-n="Cumhurbaşkanlığı TC">
                    <div class="kurum-emblem">🇹🇷</div>
                    <div class="kurum-info"><span class="kurum-name">T.C. Cumhurbaşkanlığı</span><span class="kurum-desc">tccb.gov.tr</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
                <a href="https://www.tbmm.gov.tr" target="_blank" class="kurum-card" data-n="TBMM Türkiye Büyük Millet Meclisi">
                    <div class="kurum-emblem">🏛️</div>
                    <div class="kurum-info"><span class="kurum-name">TBMM</span><span class="kurum-desc">tbmm.gov.tr</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
                <a href="https://www.aile.gov.tr" target="_blank" class="kurum-card" data-n="ASHB Aile Sosyal Hizmetler Bakanlığı Şehit Gazi">
                    <div class="kurum-emblem">👨‍👩‍👧</div>
                    <div class="kurum-info"><span class="kurum-name">ASHB (Aile Sosyal Hizmetler)</span><span class="kurum-desc">aile.gov.tr</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
                <a href="https://www.sgk.gov.tr" target="_blank" class="kurum-card" data-n="SGK Sosyal Güvenlik Kurumu emekli maaş">
                    <div class="kurum-emblem">📋</div>
                    <div class="kurum-info"><span class="kurum-name">Sosyal Güvenlik Kurumu</span><span class="kurum-desc">sgk.gov.tr</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
                <a href="https://www.icisleri.gov.tr" target="_blank" class="kurum-card" data-n="İçişleri Bakanlığı güvenlik">
                    <div class="kurum-emblem">🔏</div>
                    <div class="kurum-info"><span class="kurum-name">İçişleri Bakanlığı</span><span class="kurum-desc">icisleri.gov.tr</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
                <a href="https://www.meb.gov.tr" target="_blank" class="kurum-card" data-n="MEB Milli Eğitim Bakanlığı">
                    <div class="kurum-emblem">🎓</div>
                    <div class="kurum-info"><span class="kurum-name">Milli Eğitim Bakanlığı</span><span class="kurum-desc">meb.gov.tr</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
                <a href="https://www.saglik.gov.tr" target="_blank" class="kurum-card" data-n="Sağlık Bakanlığı hastane">
                    <div class="kurum-emblem">🏥</div>
                    <div class="kurum-info"><span class="kurum-name">Sağlık Bakanlığı</span><span class="kurum-desc">saglik.gov.tr</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
                <a href="https://www.toki.gov.tr" target="_blank" class="kurum-card" data-n="TOKİ Toplu Konut İdaresi konut">
                    <div class="kurum-emblem">🏠</div>
                    <div class="kurum-info"><span class="kurum-name">TOKİ</span><span class="kurum-desc">toki.gov.tr</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
                <a href="https://www.kyk.gov.tr" target="_blank" class="kurum-card" data-n="KYK Kredi Yurtlar Kurumu burs yurt">
                    <div class="kurum-emblem">🎒</div>
                    <div class="kurum-info"><span class="kurum-name">KYK</span><span class="kurum-desc">kyk.gov.tr</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
                <a href="https://www.diyanet.gov.tr" target="_blank" class="kurum-card" data-n="Diyanet İşleri Başkanlığı">
                    <div class="kurum-emblem">☪️</div>
                    <div class="kurum-info"><span class="kurum-name">Diyanet İşleri Başkanlığı</span><span class="kurum-desc">diyanet.gov.tr</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
                <a href="https://www.tika.gov.tr" target="_blank" class="kurum-card" data-n="TİKA Türk İşbirliği Koordinasyon Ajansı">
                    <div class="kurum-emblem">🌐</div>
                    <div class="kurum-info"><span class="kurum-name">TİKA</span><span class="kurum-desc">tika.gov.tr</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
                <a href="https://www.ytb.gov.tr" target="_blank" class="kurum-card" data-n="YTB Yurtdışı Türkler Akraba Topluluklar">
                    <div class="kurum-emblem">🌍</div>
                    <div class="kurum-info"><span class="kurum-name">YTB</span><span class="kurum-desc">ytb.gov.tr</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
            </div>
        </div>
        <div class="kurum-section" data-cat="sivil">
            <div class="kurum-sec-head">
                <h2>Sivil Kuruluşlar</h2>
                <span class="count">10 KURULUŞ</span>
            </div>
            <div class="kurum-grid">
                <a href="https://vatankahramanlari.org/" target="_blank" class="kurum-card" data-n="Vatan Kahramanları Derneği">
                    <div class="kurum-emblem">🎖️</div>
                    <div class="kurum-info"><span class="kurum-name">Vatan Kahramanları Derneği</span><span class="kurum-desc">vatankahramanlari.org.tr</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
                <a href="https://tukav.org/tr/" target="_blank" class="kurum-card" data-n="TürkAta Vakfı">
                    <div class="kurum-emblem">⚔️</div>
                    <div class="kurum-info"><span class="kurum-name">TürkAta Vakfı</span><span class="kurum-desc">turkatav.org</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
                <a href="https://www.turksoy.org" target="_blank" class="kurum-card" data-n="TÜRKSOY Uluslararası Türk Kültürü Teşkilatı">
                    <div class="kurum-emblem">🎭</div>
                    <div class="kurum-info"><span class="kurum-name">TÜRKSOY</span><span class="kurum-desc">turksoy.org</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
                <a href="https://www.kizilay.org.tr" target="_blank" class="kurum-card" data-n="Türk Kızılay insani yardım">
                    <div class="kurum-emblem">🔴</div>
                    <div class="kurum-info"><span class="kurum-name">Türk Kızılay</span><span class="kurum-desc">kizilay.org.tr</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
                <a href="https://www.turkovac.gov.tr" target="_blank" class="kurum-card" data-n="Türk Silahlı Kuvvetleri Güçlendirme Vakfı TSKGV">
                    <div class="kurum-emblem">🏭</div>
                    <div class="kurum-info"><span class="kurum-name">TSK Güçlendirme Vakfı</span><span class="kurum-desc">tskgv.org.tr</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
                <a href="https://www.atatürk.org.tr" target="_blank" class="kurum-card" data-n="Atatürk Kültür Dil Tarih Yüksek Kurumu">
                    <div class="kurum-emblem">📚</div>
                    <div class="kurum-info"><span class="kurum-name">Atatürk Kültür Kurumu</span><span class="kurum-desc">akmb.gov.tr</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
                <a href="https://www.yunusemreenstitusu.org" target="_blank" class="kurum-card" data-n="Yunus Emre Enstitüsü kültür dil">
                    <div class="kurum-emblem">📖</div>
                    <div class="kurum-info"><span class="kurum-name">Yunus Emre Enstitüsü</span><span class="kurum-desc">yunusemreenstitusu.org</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
                <a href="https://www.turkmaarif.org" target="_blank" class="kurum-card" data-n="Türkiye Maarif Vakfı eğitim yurt dışı">
                    <div class="kurum-emblem">🎓</div>
                    <div class="kurum-info"><span class="kurum-name">Türkiye Maarif Vakfı</span><span class="kurum-desc">turkmaarif.org</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
                <a href="https://www.15temmuz.gov.tr" target="_blank" class="kurum-card" data-n="15 Temmuz Milli Birlik Demokrasi">
                    <div class="kurum-emblem">🕯️</div>
                    <div class="kurum-info"><span class="kurum-name">15 Temmuz Vakfı</span><span class="kurum-desc">15temmuz.gov.tr</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
                <a href="https://vatankahramanlari.org.tr" target="_blank" class="kurum-card" data-n="Vatan Kahramanları Vakfı şehit gazi" style="border: 2px solid var(--v-red);">
                    <div class="kurum-emblem" style="background:var(--v-red); color:#fff; font-size:12px; font-weight:900;">VKV</div>
                    <div class="kurum-info"><span class="kurum-name" style="color:var(--v-red)">Vatan Kahramanları Derneği</span><span class="kurum-desc">vatankahramanlari.org.tr</span></div>
                    <i class="fa-solid fa-star" style="color:var(--v-gold)"></i>
                </a>
            </div>
        </div>
        <div class="kurum-section" data-cat="uluslararasi">
            <div class="kurum-sec-head">
                <h2>Uluslararası Kuruluşlar</h2>
                <span class="count">13 KURULUŞ</span>
            </div>
            <div class="kurum-grid">
                <a href="https://www.who.int" target="_blank" class="kurum-card" data-n="WHO Dünya Sağlık Örgütü World Health Organization">
                    <div class="kurum-emblem">🏥</div>
                    <div class="kurum-info"><span class="kurum-name">WHO (Dünya Sağlık Örgütü)</span><span class="kurum-desc">who.int</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
                <a href="https://unhabitat.org" target="_blank" class="kurum-card" data-n="UN-HABITAT BM İnsan Yerleşimleri Programı">
                    <div class="kurum-emblem">🏙️</div>
                    <div class="kurum-info"><span class="kurum-name">UN-HABITAT</span><span class="kurum-desc">unhabitat.org</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
                <a href="https://www.oic-oci.org" target="_blank" class="kurum-card" data-n="OIC İİT İslam İşbirliği Teşkilatı">
                    <div class="kurum-emblem">☪️</div>
                    <div class="kurum-info"><span class="kurum-name">OIC / İİT (İslam İşbirliği)</span><span class="kurum-desc">oic-oci.org</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
                <a href="https://www.eco.int" target="_blank" class="kurum-card" data-n="ECO EİT Ekonomik İşbirliği Teşkilatı">
                    <div class="kurum-emblem">📈</div>
                    <div class="kurum-info"><span class="kurum-name">ECO / EİT (Ekonomik İşbirliği)</span><span class="kurum-desc">eco.int</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
                <a href="https://www.osce.org" target="_blank" class="kurum-card" data-n="OSCE AGİT Avrupa Güvenlik İşbirliği Teşkilatı">
                    <div class="kurum-emblem">🕊️</div>
                    <div class="kurum-info"><span class="kurum-name">OSCE / AGİT</span><span class="kurum-desc">osce.org</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
                <a href="https://www.unossc.org" target="_blank" class="kurum-card" data-n="UNOSSC BM Güney Güney İşbirliği Ofisi">
                    <div class="kurum-emblem">🌍</div>
                    <div class="kurum-info"><span class="kurum-name">UNOSSC</span><span class="kurum-desc">unossc.org</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
                <a href="https://www.unaoc.org" target="_blank" class="kurum-card" data-n="UNAOC BM Medeniyetler İttifakı">
                    <div class="kurum-emblem">🤝</div>
                    <div class="kurum-info"><span class="kurum-name">UNAOC</span><span class="kurum-desc">unaoc.org</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
                <a href="https://www.unwto.org" target="_blank" class="kurum-card" data-n="UNWTO Dünya Turizm Örgütü">
                    <div class="kurum-emblem">✈️</div>
                    <div class="kurum-info"><span class="kurum-name">UNWTO (Dünya Turizm)</span><span class="kurum-desc">unwto.org</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
                <a href="https://www.cica-online.org" target="_blank" class="kurum-card" data-n="CICA AİGK Asya Güven Artırıcı Önlemler Konferansı">
                    <div class="kurum-emblem">🏔️</div>
                    <div class="kurum-info"><span class="kurum-name">CICA / AİGK</span><span class="kurum-desc">cica-online.org</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
                <a href="https://www.icss.ae" target="_blank" class="kurum-card" data-n="ICSS SIGA Uluslararası Spor Güvenliği Emniyet">
                    <div class="kurum-emblem">🏅</div>
                    <div class="kurum-info"><span class="kurum-name">ICSS & SIGA</span><span class="kurum-desc">icss.ae</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
                <a href="https://www.unido.org" target="_blank" class="kurum-card" data-n="UNIDO BM Sınai Kalkınma Örgütü">
                    <div class="kurum-emblem">🏭</div>
                    <div class="kurum-info"><span class="kurum-name">UNIDO</span><span class="kurum-desc">unido.org</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
                <a href="https://www.icesco.org" target="_blank" class="kurum-card" data-n="ICESCO İslam Dünyası Eğitim Bilim Kültür">
                    <div class="kurum-emblem">📚</div>
                    <div class="kurum-info"><span class="kurum-name">ICESCO</span><span class="kurum-desc">icesco.org</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
                <a href="https://www.undp.org" target="_blank" class="kurum-card" data-n="UNDP BM Kalkınma Programı">
                    <div class="kurum-emblem">🌱</div>
                    <div class="kurum-info"><span class="kurum-name">UNDP</span><span class="kurum-desc">undp.org</span></div>
                    <i class="fa-solid fa-arrow-up-right-from-square k-link-icon"></i>
                </a>
            </div>
        </div>
        <div id="no-result">
            <i class="fa-solid fa-magnifying-glass"></i>
            <h3>Sonuç Bulunamadı</h3>
            <p>Aradığınız kriterlere uygun bir kurum kaydı mevcut değil.</p>
        </div>
    </div>
</div>
<script>
const KPortal = {
    filter: function(cat, btn) {
        document.querySelectorAll('.f-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('kinp').value = '';
        document.getElementById('no-result').style.display = 'none';
        document.querySelectorAll('.kurum-section').forEach(sec => {
            sec.style.display = (cat === 'all' || sec.dataset.cat === cat) ? 'block' : 'none';
        });
        document.querySelectorAll('.kurum-card').forEach(card => card.style.display = 'flex');
    },
    search: function(val) {
        const q = val.toLowerCase().trim();
        let foundAny = false;
        document.querySelectorAll('.kurum-section').forEach(sec => {
            let secFound = 0;
            sec.querySelectorAll('.kurum-card').forEach(card => {
                const searchData = (card.dataset.n + ' ' + card.querySelector('.kurum-name').innerText).toLowerCase();
                const match = searchData.includes(q);
                card.style.display = match ? 'flex' : 'none';
                if(match) { secFound++; foundAny = true; }
            });
            sec.style.display = secFound > 0 ? 'block' : 'none';
        });
        document.getElementById('no-result').style.display = (!foundAny && q !== '') ? 'block' : 'none';
    }
};
</script>
<?php endif; ?>
<?php get_footer(); ?>