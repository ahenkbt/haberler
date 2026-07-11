<?php
/**
 * Template Name: Vatan - Şehit Gazi Hakları (Premium Rehber)
 * Template Post Type: page
 */
get_header();
if (have_posts()) { the_post(); }
$vkv_slug = 'sehit-gazi-haklari';
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
    --v-red: #B22234; /* Ay-Yıldız Kırmızısı */
    --v-red-dark: #8B0000;
    --v-gold: #D4AF37; /* Prestij Altın */
    --v-gold-light: #F4E5B2;
    --v-dark: #121212;
    --v-dark-soft: #1E1E1E;
    --v-text-main: #2D3436;
    --v-text-muted: #636E72;
    --v-bg-light: #F9FAFB;
    --v-glass: rgba(255, 255, 255, 0.95);
    --shadow-premium: 0 10px 30px rgba(0,0,0,0.08);
}
.sgr-portal { 
    font-family: 'Inter', sans-serif; 
    background: var(--v-bg-light); 
    color: var(--v-text-main); 
    line-height: 1.6;
}
/* --- Hero Section --- */
.sgr-hero {
    position: relative;
    background: linear-gradient(135deg, rgba(18, 18, 18, 0.9), rgba(139, 0, 0, 0.7)), 
                url('https://images.unsplash.com/photo-1590234900693-80e793910543?q=80&w=2000');
    background-size: cover; background-position: center;
    padding: 120px 20px; text-align: center; color: #fff;
    border-bottom: 5px solid var(--v-gold);
}
.sgr-hero-badge {
    display: inline-block;
    background: var(--v-gold);
    color: #000;
    padding: 6px 18px;
    border-radius: 50px;
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
    margin-bottom: 20px;
    letter-spacing: 2px;
}
.sgr-hero h1 { 
    font-family: 'Playfair Display', serif; 
    font-size: clamp(2.5rem, 6vw, 4rem); 
    margin-bottom: 20px; 
    font-weight: 900;
    text-shadow: 2px 2px 10px rgba(0,0,0,0.3);
}
.sgr-hero p { 
    max-width: 900px; margin: 0 auto 35px; 
    font-size: 1.2rem; opacity: 0.9; font-weight: 300;
}
/* --- Navigation --- */
.sgr-nav-wrap { 
    position: sticky; top: 0; z-index: 1000; 
    background: var(--v-glass); 
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(0,0,0,0.05); 
    box-shadow: var(--shadow-premium);
}
.sgr-nav { 
    display: flex; max-width: 1300px; margin: 0 auto; 
    overflow-x: auto; scrollbar-width: none;
}
.sgr-nav::-webkit-scrollbar { display: none; }
.sgr-btn {
    padding: 22px 30px; border: none; background: none; 
    font-weight: 700; font-size: 12px; color: var(--v-text-muted);
    cursor: pointer; white-space: nowrap; text-transform: uppercase; 
    letter-spacing: 1.5px; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    border-bottom: 3px solid transparent;
}
.sgr-btn i { margin-right: 8px; font-size: 14px; }
.sgr-btn:hover { color: var(--v-red); }
.sgr-btn.active { 
    color: var(--v-red); 
    border-bottom-color: var(--v-red); 
    background: rgba(178, 34, 52, 0.05);
}
/* --- Content Areas --- */
.sgr-container { max-width: 1300px; margin: 50px auto; padding: 0 25px; }
.sgr-panel { display: none; animation: vPremiumFade 0.6s ease-out forwards; }
.sgr-panel.active { display: block; }
@keyframes vPremiumFade { 
    from { opacity: 0; transform: translateY(30px) scale(0.98); } 
    to { opacity: 1; transform: translateY(0) scale(1); } 
}
/* --- Section Header --- */
.v-section-head { margin-bottom: 40px; border-left: 5px solid var(--v-red); padding-left: 20px; }
.v-section-head h2 { font-family: 'Montserrat', sans-serif; font-weight: 800; color: var(--v-dark); margin: 0; font-size: 1.8rem; }
.v-section-head p { color: var(--v-text-muted); margin: 5px 0 0; }
/* --- Grid & Cards --- */
.sgr-grid { 
    display: grid; 
    grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); 
    gap: 25px; 
}
.sgr-card {
    background: #fff; 
    border: 1px solid #E5E7EB; 
    border-radius: 20px; 
    padding: 40px 30px;
    text-decoration: none !important; 
    transition: all 0.4s; 
    display: flex; 
    flex-direction: column;
    position: relative; 
    overflow: hidden;
    box-shadow: 0 4px 6px rgba(0,0,0,0.02);
}
.sgr-card::before {
    content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 0;
    background: var(--v-red); transition: 0.4s;
}
.sgr-card:hover { 
    transform: translateY(-10px); 
    border-color: transparent; 
    box-shadow: 0 25px 50px rgba(0,0,0,0.1); 
}
.sgr-card:hover::before { height: 100%; }
.sgr-card i { 
    font-size: 40px; margin-bottom: 20px; color: var(--v-red); 
    background: rgba(178, 34, 52, 0.05); width: 70px; height: 70px;
    display: flex; align-items: center; justify-content: center; border-radius: 15px;
    transition: 0.4s;
}
.sgr-card:hover i { background: var(--v-red); color: #fff; transform: rotate(-5deg); }
.sgr-card h3 { 
    font-family: 'Montserrat', sans-serif; font-size: 1.35rem; 
    color: var(--v-dark); margin-bottom: 15px; font-weight: 700; 
}
.sgr-card p { 
    font-size: 14.5px; color: var(--v-text-muted); 
    line-height: 1.7; flex-grow: 1; margin-bottom: 25px; 
}
.sgr-card-footer { 
    display: flex; align-items: center; justify-content: space-between; 
    padding-top: 20px; border-top: 1px solid #F3F4F6; 
}
.sgr-card-link { 
    font-size: 12px; font-weight: 700; color: var(--v-red); 
    display: flex; align-items: center; gap: 5px;
}
.sgr-card-src { 
    font-size: 10px; background: #F3F4F6; padding: 5px 12px; 
    border-radius: 6px; color: var(--v-text-muted); font-weight: 600; 
}
/* --- Alert / Info Box --- */
.sgr-alert { 
    background: var(--v-dark-soft); color: #fff; padding: 40px; 
    border-radius: 20px; margin-bottom: 40px; 
    background-image: linear-gradient(to right, rgba(212, 175, 55, 0.1), transparent);
    border-left: 8px solid var(--v-gold); 
}
.sgr-alert h4 { 
    color: var(--v-gold); margin-bottom: 15px; 
    font-family: 'Montserrat', sans-serif; font-size: 1.4rem; display: flex; align-items: center; gap: 10px;
}
/* --- Mevzuat Bölümü (Yeni) --- */
.v-mevzuat-list {
    display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px;
}
.v-mevzuat-item {
    background: #fff; padding: 15px; border-radius: 10px; border: 1px solid #eee;
    display: flex; align-items: center; gap: 15px; transition: 0.3s;
}
.v-mevzuat-item:hover { border-color: var(--v-gold); background: #FFFCF5; }
/* --- CTA Section --- */
.sgr-cta-box { 
    background: linear-gradient(135deg, var(--v-dark), #2c3e50); 
    color: #fff; padding: 80px 40px; text-align: center; border-radius: 30px; 
    margin-top: 80px; position: relative; overflow: hidden;
    border-bottom: 10px solid var(--v-red);
}
.sgr-cta-box::after {
    content: 'TR'; position: absolute; right: -20px; bottom: -20px;
    font-size: 200px; font-weight: 900; opacity: 0.03;
}
.sgr-cta-box h2 { font-family: 'Playfair Display', serif; font-size: 2.5rem; margin-bottom: 20px; }
.v-phone-card {
    background: rgba(255,255,255,0.05); display: inline-flex; align-items: center;
    padding: 20px 40px; border-radius: 100px; border: 1px solid rgba(255,255,255,0.1);
    margin: 30px 0; transition: 0.3s;
}
.v-phone-card:hover { background: rgba(255,255,255,0.1); transform: scale(1.05); }
.btn-vkv-premium { 
    display: inline-block; background: var(--v-gold); color: #000; 
    padding: 20px 50px; border-radius: 50px; text-decoration: none; 
    font-weight: 800; transition: 0.4s; text-transform: uppercase; letter-spacing: 1px;
}
.btn-vkv-premium:hover { background: #fff; transform: translateY(-3px); box-shadow: 0 10px 20px rgba(0,0,0,0.2); }
@media (max-width: 992px) { .v-mevzuat-list { grid-template-columns: 1fr; } }
@media (max-width: 768px) { 
    .sgr-grid { grid-template-columns: 1fr; } 
    .sgr-hero { padding: 80px 20px; }
    .sgr-hero h1 { font-size: 2rem; }
}
</style>
<div class="sgr-portal">
    <section class="sgr-hero">
        <div class="sgr-container">
            <span class="sgr-hero-badge">RESMİ REHBER PORTALI</span>
            <h1>🛡️ Şehit & Gazi Hakları Tam Rehberi</h1>
            <p>T.C. Aile ve Sosyal Hizmetler Bakanlığı verileriyle güncellenmiş, kahramanlarımız ve emanetleri için hazırlanmış en kapsamlı yasal haklar dökümü.</p>
            <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                <span style="background: rgba(255,255,255,0.1); padding: 8px 15px; border-radius: 5px; font-size: 13px;"><i class="fa fa-check-circle"></i> Güncel Mevzuat</span>
                <span style="background: rgba(255,255,255,0.1); padding: 8px 15px; border-radius: 5px; font-size: 13px;"><i class="fa fa-check-circle"></i> Resmi Başvuru Linkleri</span>
                <span style="background: rgba(255,255,255,0.1); padding: 8px 15px; border-radius: 5px; font-size: 13px;"><i class="fa fa-check-circle"></i> 7/24 Destek Hattı</span>
            </div>
        </div>
    </section>
    <nav class="sgr-nav-wrap">
        <div class="sgr-nav">
            <button class="sgr-btn active" onclick="vTab('mali', this)"><i class="fa fa-wallet"></i> Mali Haklar</button>
            <button class="sgr-btn" onclick="vTab('saglik', this)"><i class="fa fa-heartpulse"></i> Sağlık</button>
            <button class="sgr-btn" onclick="vTab('egitim', this)"><i class="fa fa-graduation-cap"></i> Eğitim & Askerlik</button>
            <button class="sgr-btn" onclick="vTab('sosyal', this)"><i class="fa fa-users-gear"></i> Sosyal Haklar</button>
            <button class="sgr-btn" onclick="vTab('muharip', this)"><i class="fa fa-medal"></i> Muharip & Sivil</button>
            <button class="sgr-btn" onclick="vTab('15temmuz', this)"><i class="fa fa-star-and-crescent"></i> 15 Temmuz</button>
            <button class="sgr-btn" onclick="vTab('mevzuat', this)"><i class="fa fa-gavel"></i> Mevzuat & Sorgulama</button>
        </div>
    </nav>
    <div class="sgr-container">
        <div class="sgr-panel active" id="p-mali">
            <div class="v-section-head">
                <h2>Ekonomik Destekler ve Maaş Hakları</h2>
                <p>Şehit yakınları ve gazilerimize sağlanan düzenli ödeme ve tazminatlar.</p>
            </div>
            <div class="sgr-grid">
                <a href="https://aile.tr/sss/sehit-yakinlari-ve-gazilere-yonelik-hizmetler-dairesi-baskanligi/maas-baglama/" target="_blank" class="sgr-card">
                    <i class="fa-solid fa-money-bill-transfer"></i>
                    <h3>Maaş Bağlama</h3>
                    <p>Şehit yakınları ve gazilerimize SGK tarafından aylık bağlanması, başvuru süreçleri ve yasal esaslar.</p>
                    <div class="sgr-card-footer"><span class="sgr-card-link">Resmi Bilgi <i class="fa fa-arrow-right"></i></span><span class="sgr-card-src">aile.tr</span></div>
                </a>
                <a href="https://aile.tr/sss/sehit-yakinlari-ve-gazilere-yonelik-hizmetler-dairesi-baskanligi/nakdi-tazminat/" target="_blank" class="sgr-card">
                    <i class="fa-solid fa-building-columns"></i>
                    <h3>Nakdi Tazminat</h3>
                    <p>Güvenlik ve asayişin sağlanmasında şehit olanların hak sahipleri ile gazilere ödenen tek seferlik tazminat.</p>
                    <div class="sgr-card-footer"><span class="sgr-card-link">Resmi Bilgi <i class="fa fa-arrow-right"></i></span><span class="sgr-card-src">aile.tr</span></div>
                </a>
                <a href="https://aile.tr/sss/sehit-yakinlari-ve-gazilere-yonelik-hizmetler-dairesi-baskanligi/faizsiz-konut-kredisi/" target="_blank" class="sgr-card">
                    <i class="fa-solid fa-house-chimney"></i>
                    <h3>Faizsiz Konut Kredisi</h3>
                    <p>TOKİ aracılığıyla sağlanan 240 ay vadeli faizsiz konut kredisi kullanım şartları ve mülk edindirme hakları.</p>
                    <div class="sgr-card-footer"><span class="sgr-card-link">Resmi Bilgi <i class="fa fa-arrow-right"></i></span><span class="sgr-card-src">aile.tr</span></div>
                </a>
                <a href="https://aile.tr/sss/sehit-yakinlari-ve-gazilere-yonelik-hizmetler-dairesi-baskanligi/elektrik-ve-su-ucret-indirimi/" target="_blank" class="sgr-card">
                    <i class="fa-solid fa-bolt-lightning"></i>
                    <h3>Elektrik ve Su İndirimi</h3>
                    <p>Elektrik ücretinde %40, su ücretinde %50'den az olmamak üzere belirlenen indirimli tarifeler.</p>
                    <div class="sgr-card-footer"><span class="sgr-card-link">Resmi Bilgi <i class="fa fa-arrow-right"></i></span><span class="sgr-card-src">aile.tr</span></div>
                </a>
                <a href="https://aile.tr/sss/sehit-yakinlari-ve-gazilere-yonelik-hizmetler-dairesi-baskanligi/dogalgaz-indirimi/" target="_blank" class="sgr-card">
                    <i class="fa-solid fa-fire-flame-curved"></i>
                    <h3>Doğalgaz İndirimi</h3>
                    <p>Şehit yakınları ve gaziler için doğalgaz kullanımında sağlanan indirimli tarife ve uygulama esasları.</p>
                    <div class="sgr-card-footer"><span class="sgr-card-link">Resmi Bilgi <i class="fa fa-arrow-right"></i></span><span class="sgr-card-src">aile.tr</span></div>
                </a>
                <a href="https://aile.tr/sss/sehit-yakinlari-ve-gazilere-yonelik-hizmetler-dairesi-baskanligi/ek-odeme-ve-egitim-ogretim-yardimi/" target="_blank" class="sgr-card">
                    <i class="fa-solid fa-circle-plus"></i>
                    <h3>Ek Ödeme Hakları</h3>
                    <p>Maluliyet derecelerine göre her yıl ödenen ek ödemeler ve yıllık tütün ikramiyesi detayları.</p>
                    <div class="sgr-card-footer"><span class="sgr-card-link">Resmi Bilgi <i class="fa fa-arrow-right"></i></span><span class="sgr-card-src">aile.tr</span></div>
                </a>
            </div>
        </div>
        <div class="sgr-panel" id="p-saglik">
            <div class="sgr-alert">
                <h4><i class="fa fa-shield-medical"></i> Sağlık Uygulama Tebliği (SUT) Avantajları</h4>
                <p>Harp malulleri ve terör gazileri tüm sağlık hizmetlerinde <strong>katılım payından muaftır.</strong> Diş tedavileri, protez ve tıbbi malzeme giderleri en üst devlet desteği ile karşılanır.</p>
            </div>
            <div class="sgr-grid">
                <a href="https://aile.tr/sss/sehit-yakinlari-ve-gazilere-yonelik-hizmetler-dairesi-baskanligi/maluliyet-derecesi/" target="_blank" class="sgr-card">
                    <i class="fa-solid fa-notes-medical"></i>
                    <h3>Maluliyet Derecesi</h3>
                    <p>Yaralanma derecesi ve maluliyet tespiti süreçleri ile rapor işlemleri hakkında rehber.</p>
                    <div class="sgr-card-footer"><span class="sgr-card-link">Resmi Bilgi <i class="fa fa-arrow-right"></i></span><span class="sgr-card-src">aile.tr</span></div>
                </a>
                <a href="https://aile.tr/sss/sehit-yakinlari-ve-gazilere-yonelik-hizmetler-dairesi-baskanligi/malul-sayilmayanlar/" target="_blank" class="sgr-card">
                    <i class="fa-solid fa-circle-info"></i>
                    <h3>Malul Sayılmayanlar</h3>
                    <p>Malul sayılmayacak derecede yaralananların hakları ve başvuru süreçleri.</p>
                    <div class="sgr-card-footer"><span class="sgr-card-link">Resmi Bilgi <i class="fa fa-arrow-right"></i></span><span class="sgr-card-src">aile.tr</span></div>
                </a>
                <a href="https://aile.tr/sss/sehit-yakinlari-ve-gazilere-yonelik-hizmetler-dairesi-baskanligi/tup-bebek-uygulamalari/" target="_blank" class="sgr-card">
                    <i class="fa-solid fa-baby"></i>
                    <h3>Tüp Bebek Desteği</h3>
                    <p>Gazilerimiz ve şehit yakınları için sağlanan tıbbi yardımcı üreme teknikleri desteği kapsamı.</p>
                    <div class="sgr-card-footer"><span class="sgr-card-link">Resmi Bilgi <i class="fa fa-arrow-right"></i></span><span class="sgr-card-src">aile.tr</span></div>
                </a>
            </div>
        </div>
        <div class="sgr-panel" id="p-egitim">
            <div class="sgr-grid">
                <a href="https://aile.tr/sss/sehit-yakinlari-ve-gazilere-yonelik-hizmetler-dairesi-baskanligi/ogrenim/" target="_blank" class="sgr-card">
                    <i class="fa-solid fa-user-graduate"></i>
                    <h3>Öğrenim Hakları</h3>
                    <p>KYK bursları, yurt önceliği ve ücretsiz öğrenim imkanları hakkında başvuru rehberi.</p>
                    <div class="sgr-card-footer"><span class="sgr-card-link">Resmi Bilgi <i class="fa fa-arrow-right"></i></span><span class="sgr-card-src">aile.tr</span></div>
                </a>
                <a href="https://aile.tr/sss/sehit-yakinlari-ve-gazilere-yonelik-hizmetler-dairesi-baskanligi/ek-odeme-ve-egitim-ogretim-yardimi/" target="_blank" class="sgr-card">
                    <i class="fa-solid fa-book-open"></i>
                    <h3>Eğitim-Öğretim Yardımı</h3>
                    <p>Şehit ve gazi çocuklarına her yıl eğitim öğretim yılı başında yapılan maddi yardımlar.</p>
                    <div class="sgr-card-footer"><span class="sgr-card-link">Resmi Bilgi <i class="fa fa-arrow-right"></i></span><span class="sgr-card-src">aile.tr</span></div>
                </a>
                <a href="https://aile.tr/sss/sehit-yakinlari-ve-gazilere-yonelik-hizmetler-dairesi-baskanligi/askerlik-muafiyeti/" target="_blank" class="sgr-card">
                    <i class="fa-solid fa-shield-halved"></i>
                    <h3>Askerlik Muafiyeti</h3>
                    <p>Şehit ve gazi kardeşleri ile çocukları için askerlik görevinden muafiyet şartları.</p>
                    <div class="sgr-card-footer"><span class="sgr-card-link">Resmi Bilgi <i class="fa fa-arrow-right"></i></span><span class="sgr-card-src">aile.tr</span></div>
                </a>
            </div>
        </div>
        <div class="sgr-panel" id="p-sosyal">
            <div class="sgr-grid">
                <a href="https://aile.tr/sss/sehit-yakinlari-ve-gazilere-yonelik-hizmetler-dairesi-baskanligi/is-hakki-uygulamalari/" target="_blank" class="sgr-card">
                    <i class="fa-solid fa-briefcase"></i>
                    <h3>İş Hakkı Uygulamaları</h3>
                    <p>Şehit yakınları için 2, gaziler için 1 kişilik kamuda istihdam hakkı ve atama usulleri.</p>
                    <div class="sgr-card-footer"><span class="sgr-card-link">Resmi Bilgi <i class="fa fa-arrow-right"></i></span><span class="sgr-card-src">aile.tr</span></div>
                </a>
                <a href="https://aile.tr/sss/sehit-yakinlari-ve-gazilere-yonelik-hizmetler-dairesi-baskanligi/ucretsiz-seyahat-hakki/" target="_blank" class="sgr-card">
                    <i class="fa-solid fa-id-card"></i>
                    <h3>Ücretsiz Seyahat</h3>
                    <p>Şehir içi ve şehirler arası ulaşım, demiryolu ve denizyollarında ücretsiz seyahat kartı işlemleri.</p>
                    <div class="sgr-card-footer"><span class="sgr-card-link">Resmi Bilgi <i class="fa fa-arrow-right"></i></span><span class="sgr-card-src">aile.tr</span></div>
                </a>
                <a href="https://aile.tr/sss/sehit-yakinlari-ve-gazilere-yonelik-hizmetler-dairesi-baskanligi/sosyal-haklar/" target="_blank" class="sgr-card">
                    <i class="fa-solid fa-city"></i>
                    <h3>Genel Sosyal Haklar</h3>
                    <p>Emlak vergisi muafiyeti, kamu sosyal tesisleri ve diğer toplumsal destek kalemleri.</p>
                    <div class="sgr-card-footer"><span class="sgr-card-link">Resmi Bilgi <i class="fa fa-arrow-right"></i></span><span class="sgr-card-src">aile.tr</span></div>
                </a>
                <a href="https://aile.tr/sss/sehit-yakinlari-ve-gazilere-yonelik-hizmetler-dairesi-baskanligi/madalya-temini/" target="_blank" class="sgr-card">
                    <i class="fa-solid fa-award"></i>
                    <h3>Madalya Temini</h3>
                    <p>Devlet Övünç Madalyası ve İstiklal Madalyası temini ile şeref aylığı başvuru koşulları.</p>
                    <div class="sgr-card-footer"><span class="sgr-card-link">Resmi Bilgi <i class="fa fa-arrow-right"></i></span><span class="sgr-card-src">aile.tr</span></div>
                </a>
                <a href="https://aile.tr/sss/sehit-yakinlari-ve-gazilere-yonelik-hizmetler-dairesi-baskanligi/diger-sosyal-haklar/" target="_blank" class="sgr-card">
                    <i class="fa-solid fa-star"></i>
                    <h3>Diğer Sosyal Haklar</h3>
                    <p>ÖTV muafiyetinden kira yardımına kadar tanınan diğer güncel sosyal haklar listesi.</p>
                    <div class="sgr-card-footer"><span class="sgr-card-link">Resmi Bilgi <i class="fa fa-arrow-right"></i></span><span class="sgr-card-src">aile.tr</span></div>
                </a>
            </div>
        </div>
        <div class="sgr-panel" id="p-muharip">
            <div class="sgr-grid">
                <a href="https://aile.tr/sss/sehit-yakinlari-ve-gazilere-yonelik-hizmetler-dairesi-baskanligi/istiklal-savasi-kore-ve-kibris-gazileri-muharip-gaziler/" target="_blank" class="sgr-card">
                    <i class="fa-solid fa-trophy"></i>
                    <h3>Muharip Gaziler</h3>
                    <p>İstiklal Savaşı, Kore ve Kıbrıs Barış Harekatı gazilerimize sağlanan özel şeref aylığı ve sosyal haklar.</p>
                    <div class="sgr-card-footer"><span class="sgr-card-link">Resmi Bilgi <i class="fa fa-arrow-right"></i></span><span class="sgr-card-src">aile.tr</span></div>
                </a>
                <a href="https://aile.tr/sss/sehit-yakinlari-ve-gazilere-yonelik-hizmetler-dairesi-baskanligi/diger-sorular/" target="_blank" class="sgr-card">
                    <i class="fa-solid fa-users-line"></i>
                    <h3>Terör Mağduru Siviller</h3>
                    <p>Terör eylemleri nedeniyle hayatını kaybeden veya engelli hale gelen sivil vatandaşlarımıza sağlanan haklar.</p>
                    <div class="sgr-card-footer"><span class="sgr-card-link">Resmi Bilgi <i class="fa fa-arrow-right"></i></span><span class="sgr-card-src">aile.tr</span></div>
                </a>
            </div>
        </div>
        <div class="sgr-panel" id="p-15temmuz">
            <div class="v-section-head">
                <h2>15 Temmuz Demokrasi ve Milli Birlik</h2>
                <p>Darbe girişimi sırasında şehit olan ve gazi olan vatandaşlarımızın özel hakları.</p>
            </div>
            <div class="sgr-grid">
                <a href="https://aile.tr/sss/sehit-yakinlari-ve-gazilere-yonelik-hizmetler-dairesi-baskanligi/15-temmuz-darbe-girisiminde-sehit-olanlar/" target="_blank" class="sgr-card">
                    <i class="fa-solid fa-flag"></i>
                    <h3>15 Temmuz Şehit Yakınları</h3>
                    <p>15 Temmuz şehit yakınları için tanımlanan özel maaş, tazminat ve istihdam hakları.</p>
                    <div class="sgr-card-footer"><span class="sgr-card-link">Resmi Bilgi <i class="fa fa-arrow-right"></i></span><span class="sgr-card-src">aile.tr</span></div>
                </a>
                <a href="https://aile.tr/sss/sehit-yakinlari-ve-gazilere-yonelik-hizmetler-dairesi-baskanligi/15-temmuz-darbe-girisiminde-malul-olan-gaziler/" target="_blank" class="sgr-card">
                    <i class="fa-solid fa-kit-medical"></i>
                    <h3>15 Temmuz Malul Gaziler</h3>
                    <p>15 Temmuz'da malul olan gazilerimize tanınan sağlık, mali ve sosyal hakların dökümü.</p>
                    <div class="sgr-card-footer"><span class="sgr-card-link">Resmi Bilgi <i class="fa fa-arrow-right"></i></span><span class="sgr-card-src">aile.tr</span></div>
                </a>
                <a href="https://aile.tr/sss/sehit-yakinlari-ve-gazilere-yonelik-hizmetler-dairesi-baskanligi/15-temmuz-darbe-girisiminde-malul-sayilmayacak-derecede-yaralanan-gaziler/" target="_blank" class="sgr-card">
                    <i class="fa-solid fa-hand-holding-heart"></i>
                    <h3>15 Temmuz Yaralı Gaziler</h3>
                    <p>Malul sayılmayacak derecede yaralanan 15 Temmuz gazilerimizin hakları ve sağlanan destekler.</p>
                    <div class="sgr-card-footer"><span class="sgr-card-link">Resmi Bilgi <i class="fa fa-arrow-right"></i></span><span class="sgr-card-src">aile.tr</span></div>
                </a>
            </div>
        </div>
        <div class="sgr-panel" id="p-mevzuat">
            <div class="v-section-head">
                <h2>Mevzuat, Sorgulama ve SSS</h2>
                <p>Resmi kanunlar ve online sorgulama ekranlarına hızlı erişim.</p>
            </div>
            <div class="sgr-grid">
                <a href="https://www.aile.tr/syggm/s-s-s/" target="_blank" class="sgr-card">
                    <i class="fa-solid fa-clipboard-question"></i>
                    <h3>Bakanlık SSS Arşivi</h3>
                    <p>En çok sorulan 100+ sorunun bakanlık tarafından onaylanmış resmi yanıtları.</p>
                    <div class="sgr-card-footer"><span class="sgr-card-link">Sorulara Git <i class="fa fa-arrow-right"></i></span><span class="sgr-card-src">Resmi</span></div>
                </a>
                <a href="https://www.turkiye.gov.tr/sosyal-guvenlik-kurumu" target="_blank" class="sgr-card">
                    <i class="fa-solid fa-fingerprint"></i>
                    <h3>E-Devlet Sorgulama</h3>
                    <p>Maaş, ücretsiz seyahat kartı ve istihdam hakkı sorgulama ekranları.</p>
                    <div class="sgr-card-footer"><span class="sgr-card-link">E-Devlet Giriş <i class="fa fa-arrow-right"></i></span><span class="sgr-card-src">Sorgula</span></div>
                </a>
                <a href="https://www.sgk.gov.tr/" target="_blank" class="sgr-card">
                    <i class="fa-solid fa-landmark-dome"></i>
                    <h3>SGK Emeklilik Hizmetleri</h3>
                    <p>Vazife malullüğü ve aylık bağlama servisleri ile ilgili kurumsal detaylar.</p>
                    <div class="sgr-card-footer"><span class="sgr-card-link">Kuruma Git <i class="fa fa-arrow-right"></i></span><span class="sgr-card-src">SGK</span></div>
                </a>
            </div>
            <div style="margin-top: 50px;">
                <h3><i class="fa fa-book-scale"></i> Temel Dayanak Mevzuatlar</h3>
                <div class="v-mevzuat-list">
                    <div class="v-mevzuat-item">
                        <i class="fa fa-file-contract" style="color: var(--v-red);"></i>
                        <div><strong>2330 Sayılı Kanun</strong><br><small>Nakdi Tazminat ve Aylık Bağlanması Hakkında</small></div>
                    </div>
                    <div class="v-mevzuat-item">
                        <i class="fa fa-file-contract" style="color: var(--v-red);"></i>
                        <div><strong>3713 Sayılı Kanun</strong><br><small>Terörle Mücadele Kanunu Kapsamındaki Haklar</small></div>
                    </div>
                    <div class="v-mevzuat-item">
                        <i class="fa fa-file-contract" style="color: var(--v-red);"></i>
                        <div><strong>5434 Sayılı Kanun</strong><br><small>T.C. Emekli Sandığı Kanunu (Vazife Malullüğü)</small></div>
                    </div>
                    <div class="v-mevzuat-item">
                        <i class="fa fa-file-contract" style="color: var(--v-red);"></i>
                        <div><strong>1005 Sayılı Kanun</strong><br><small>Muharip Gazilere Şeref Aylığı Bağlanması</small></div>
                    </div>
                </div>
            </div>
        </div>
        <section class="sgr-cta-box">
            <div class="sgr-hero-badge" style="background: var(--v-red); color:#fff;">7/24 DANIŞMA HATTI</div>
            <h2>Resmi İletişim Hattı</h2>
            <p>Yasal haklarınız, başvurularınız ve her türlü destek talebiniz için Bakanlık uzmanlarına ulaşın.</p>
            <div class="v-phone-card">
                <i class="fa fa-phone-volume" style="font-size: 30px; margin-right: 20px; color: var(--v-gold);"></i>
                <div style="text-align: left;">
                    <div style="font-size: 12px; opacity: 0.8; text-transform: uppercase;">Sosyal Hizmet Merkezi</div>
                    <div style="font-size: 32px; font-weight: 900; letter-spacing: 2px;">ALO 183</div>
                </div>
            </div>
            <br>
            <a href="tel:183" class="btn-vkv-premium">Hemen Ücretsiz Ara</a>
            <div style="margin-top: 25px; font-size: 13px; opacity: 0.6;">T.C. Aile ve Sosyal Hizmetler Bakanlığı İletişim Merkezi</div>
        </section>
    </div>
</div>
<script>
function vTab(id, btn) {
    // Panel değiştirme
    document.querySelectorAll('.sgr-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.sgr-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('p-' + id).classList.add('active');
    btn.classList.add('active');
    // Yumuşak geçiş
    const navOffset = document.querySelector('.sgr-nav-wrap').offsetTop - 10;
    window.scrollTo({ top: navOffset, behavior: 'smooth' });
}
</script>
<?php 
endif; 
get_footer(); 
?>