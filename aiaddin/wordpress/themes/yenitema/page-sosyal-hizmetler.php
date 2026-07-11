<?php
/**
 * Template Name: Sosyal Hizmetler (Dijital Portal)
 * Template Post Type: page
 */
get_header();
vkv_breadcrumb();
if (have_posts()) { the_post(); }
$vkv_slug = 'sosyal-hizmetler';
$vkv_custom = function_exists('vkv_get_custom_page_content') ? vkv_get_custom_page_content($vkv_slug) : '';
$vkv_wp_content = get_the_content();
$vkv_has_custom = !empty(trim($vkv_custom));
$vkv_has_wp     = !empty(trim(strip_tags($vkv_wp_content)));
if ($vkv_has_custom):
    echo '<div class="vkv-content">'.apply_filters('the_content', $vkv_custom).'</div>';
elseif ($vkv_has_wp):
    echo '<div class="vkv-content">'; the_content(); echo '</div>';
else:
?>
<style>
@import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@300;400;600;700;800&family=Merriweather:ital,wght@0,400;0,700;1,400&display=swap');
:root {
  --v-red: #8C1A2E; --v-blue: #1A56DB; --v-gold: #C9A84C;
  --v-dark: #0D1117; --v-text: #1A1F28; --v-border: #EAE6DE;
}
.sh-portal { font-family: 'Nunito Sans', sans-serif; background: #fafafa; padding-bottom: 80px; }
/* Hero */
.sh-hero-v3 {
  background: linear-gradient(135deg, #0D1117, #1C2330);
  padding: 80px 20px; text-align: center; color: #fff; border-bottom: 4px solid var(--v-gold);
}
.sh-hero-v3 h1 { font-family: 'Merriweather', serif; font-size: clamp(2rem, 5vw, 2.8rem); margin-bottom: 15px; }
.sh-hero-v3 p { max-width: 800px; margin: 0 auto; opacity: 0.8; font-size: 1.1rem; }
.sh-container { max-width: 1300px; margin: 0 auto; padding: 0 20px; }
/* Search & Filter Simulation Area */
.sh-filter-bar {
  background: #fff; padding: 25px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.05);
  margin: -40px auto 40px; border: 1px solid var(--v-border); display: flex; flex-direction: column; gap: 15px;
}
.sh-filter-title { font-weight: 800; font-size: 14px; text-transform: uppercase; color: var(--v-red); letter-spacing: 1px; }
/* Section Titles */
.sh-cat-head {
  display: flex; align-items: center; gap: 15px; margin: 40px 0 25px;
}
.sh-cat-head h2 { font-family: 'Merriweather', serif; font-size: 1.6rem; color: var(--v-dark); margin: 0; }
.sh-cat-head .line { flex-grow: 1; height: 2px; background: var(--v-border); }
/* Grid */
.sh-matrix { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
/* Card Style */
.sh-card-v3 {
  background: #fff; border: 1px solid var(--v-border); border-radius: 12px; padding: 30px;
  text-decoration: none !important; transition: 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  display: flex; flex-direction: column; height: 100%;
}
.sh-card-v3:hover { transform: translateY(-8px); border-color: var(--v-blue); box-shadow: 0 20px 40px rgba(26, 86, 219, 0.1); }
.sh-type-badge {
  display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 10px; font-weight: 800;
  text-transform: uppercase; margin-bottom: 15px;
}
.type-e { background: #EBF5FF; color: #1A56DB; }
.type-web { background: #F0FDF4; color: #15803D; }
.type-mob { background: #FDF2F8; color: #BE185D; }
.type-app { background: #F5F3FF; color: #6D28D9; }
.sh-card-v3 h3 { font-size: 15px; font-weight: 800; color: var(--v-dark); margin-bottom: 12px; line-height: 1.5; height: 45px; overflow: hidden; }
.sh-card-v3 p { font-size: 13px; color: #4A5568; line-height: 1.6; margin-bottom: 20px; flex-grow: 1; }
.sh-btn-v3 {
  font-size: 12px; font-weight: 800; color: var(--v-blue); text-transform: uppercase;
  display: flex; align-items: center; gap: 8px; border-top: 1px solid #f0f0f0; padding-top: 15px;
}
/* Contact Area */
.sh-contact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 50px; }
.sh-contact-box { background: #fff; border: 2px solid var(--v-border); border-radius: 15px; padding: 40px; display: flex; align-items: center; gap: 25px; transition: 0.3s; }
.sh-contact-box:hover { border-color: var(--v-gold); background: #fff; }
.sh-c-icon { font-size: 50px; }
.sh-c-info h4 { margin: 0 0 5px 0; font-family: 'Merriweather', serif; font-size: 1.2rem; }
.sh-c-info span { font-size: 1.8rem; font-weight: 900; color: var(--v-red); display: block; }
@media (max-width: 768px) { .sh-contact-grid { grid-template-columns: 1fr; } .sh-matrix { grid-template-columns: 1fr; } }
</style>
<div class="sh-portal">
  <section class="sh-hero-v3">
    <div class="sh-container">
      <h1>🏛️ Sosyal Hizmetler Kataloğu</h1>
      <p>İhtiyacınız olan tüm kamu hizmetleri, e-devlet uygulamaları ve sosyal destekler tek bir noktada.</p>
    </div>
  </section>
  <div class="sh-container">
    <div class="sh-filter-bar">
      <div class="sh-filter-title">Hızlı Erişim Menüsü</div>
      <div style="display:flex; gap:10px; flex-wrap:wrap">
        <a href="#cat-sehit" style="text-decoration:none; padding:8px 15px; background:var(--v-gray); border-radius:6px; font-size:12px; font-weight:700; color:var(--v-text)">Şehit & Gazi İşlemleri</a>
        <a href="#cat-aile" style="text-decoration:none; padding:8px 15px; background:var(--v-gray); border-radius:6px; font-size:12px; font-weight:700; color:var(--v-text)">Aile & Çocuk</a>
        <a href="#cat-kurumsal" style="text-decoration:none; padding:8px 15px; background:var(--v-gray); border-radius:6px; font-size:12px; font-weight:700; color:var(--v-text)">Kurumsal Uygulamalar</a>
      </div>
    </div>
    <div class="sh-cat-head" id="cat-sehit">
      <h2>Şehit Yakınları ve Gaziler</h2>
      <div class="line"></div>
    </div>
    <div class="sh-matrix">
      <a href="https://www.turkiye.gov.tr/aile-ve-sosyal-hizmetler-sehit-yakinlari-gazi-ve-gazi-yakinlari-atama-kura-sonucu-sorgulama" target="_blank" class="sh-card-v3">
        <span class="sh-type-badge type-e">E-Hizmet</span>
        <h3>3713 Sayılı Kanuna Göre Atama Kurası Sorgulama</h3>
        <p>Şehit ve gazi yakınları ile gaziler için yapılan atama kura sonuçlarınızı e-devlet üzerinden sorgulayın.</p>
        <div class="sh-btn-v3">Hizmete Git ↗</div>
      </a>
      <a href="https://www.turkiye.gov.tr/aile-ve-sosyal-hizmetler-sehit-yakinlari-gazi-ve-gazi-yakinlari-ucretsiz-seyahat-karti-on-basvurusu" target="_blank" class="sh-card-v3">
        <span class="sh-type-badge type-e">E-Hizmet</span>
        <h3>Ücretsiz Seyahat Kartı Ön Başvurusu</h3>
        <p>Hak sahibi kendisi, eşi, anne, babası ve çocukları için ücretsiz seyahat kartı başvurusu.</p>
        <div class="sh-btn-v3">Hizmete Git ↗</div>
      </a>
      <a href="https://www.turkiye.gov.tr/aile-ve-sosyal-hizmetler-sehit-yakinlari-gazi-ve-gazi-yakinlari-istihdam-basvuru-sorgulama" target="_blank" class="sh-card-v3">
        <span class="sh-type-badge type-e">E-Hizmet</span>
        <h3>İstihdam Başvuru Sorgulama</h3>
        <p>Daire Başkanlığı'na intikal eden istihdam başvurularınızın güncel durumunu takip edin.</p>
        <div class="sh-btn-v3">Hizmete Git ↗</div>
      </a>
      <a href="https://apps.apple.com/tr/app/%C5%9Fehit-gazi-mobil/id1527448375" target="_blank" class="sh-card-v3">
        <span class="sh-type-badge type-mob">Mobil Uygulama</span>
        <h3>Şehit Gazi Mobil Uygulaması</h3>
        <p>QR kod destekli dijital kimlik ve tüm haklara mobil cihazlar üzerinden 7/24 erişim.</p>
        <div class="sh-btn-v3">Uygulamayı İndir ↗</div>
      </a>
    </div>
    <div class="sh-cat-head" id="cat-aile">
      <h2>Aile, Çocuk ve Sosyal Yardım</h2>
      <div class="line"></div>
    </div>
    <div class="sh-matrix">
      <a href="https://ailegenclikfonu.aile.gov.tr/" target="_blank" class="sh-card-v3">
        <span class="sh-type-badge type-web">Web Sitesi</span>
        <h3>Aile ve Gençlik Fonu</h3>
        <p>Evlenecek gençlere sunulan faizsiz kredi ve eğitim destekleri hakkında bilgi ve başvuru.</p>
        <div class="sh-btn-v3">Hizmete Git ↗</div>
      </a>
      <a href="https://www.turkiye.gov.tr/aile-ve-sosyal-hizmetler-sosyal-ve-ekonomik-destek-hizmeti-on-basvurusu" target="_blank" class="sh-card-v3">
        <span class="sh-type-badge type-e">E-Hizmet</span>
        <h3>Sosyal ve Ekonomik Destek (SED) Başvurusu</h3>
        <p>Ekonomik yoksunluk içindeki çocukların temel ihtiyaçları için SED ön başvurusu.</p>
        <div class="sh-btn-v3">Hizmete Git ↗</div>
      </a>
      <a href="https://cizgi.aile.gov.tr/" target="_blank" class="sh-card-v3">
        <span class="sh-type-badge type-web">Web Sitesi</span>
        <h3>Aile Çocuk Dergisi</h3>
        <p>Çocuklar için eğitici ve eğlenceli dijital içerikler sunan güvenli okuma platformu.</p>
        <div class="sh-btn-v3">Hizmete Git ↗</div>
      </a>
      <a href="https://www.turkiye.gov.tr/aile-ve-sosyal-hizmetler-evlat-edinme-on-basvurusu" target="_blank" class="sh-card-v3">
        <span class="sh-type-badge type-e">E-Hizmet</span>
        <h3>Evlat Edinme Ön Başvurusu</h3>
        <p>Evlat edinme süreçleri ve ilgili mevzuat kapsamında online başvuru hizmeti.</p>
        <div class="sh-btn-v3">Hizmete Git ↗</div>
      </a>
    </div>
    <div class="sh-cat-head" id="cat-kurumsal">
      <h2>Kurumsal Bağlantılar ve Eğitim</h2>
      <div class="line"></div>
    </div>
    <div class="sh-matrix">
      <a href="https://aileakademi.aile.gov.tr/" target="_blank" class="sh-card-v3">
        <span class="sh-type-badge type-app">Kurum Dışı Uygulama</span>
        <h3>Aile Akademi</h3>
        <p>Vatandaşlara yönelik eğitimler ve sertifika programları ile aile yapısını güçlendirme.</p>
        <div class="sh-btn-v3">Hizmete Git ↗</div>
      </a>
      <a href="https://ekutuphane.aile.gov.tr/" target="_blank" class="sh-card-v3">
        <span class="sh-type-badge type-web">Web Sitesi</span>
        <h3>E-Kütüphane</h3>
        <p>Bakanlık bünyesindeki tüm dijital yayınlar, rehberler ve bilimsel çalışmalara erişim.</p>
        <div class="sh-btn-v3">Hizmete Git ↗</div>
      </a>
      <a href="https://erdem.aile.gov.tr/" target="_blank" class="sh-card-v3">
        <span class="sh-type-badge type-app">Erişilebilirlik</span>
        <h3>ERDEM Modülü</h3>
        <p>Erişilebilirlik Değerlendirme Modülü üzerinden kamu ve özel alan denetimleri.</p>
        <div class="sh-btn-v3">Hizmete Git ↗</div>
      </a>
      <a href="https://www.aile.tr/btgmd/e-hizmetler-yeni/" target="_blank" class="sh-card-v3">
        <span class="sh-type-badge type-web" style="background:#000; color:#fff">Tüm Liste</span>
        <h3>Bakanlık Hizmet Kataloğu</h3>
        <p>Tüm e-hizmetlerin, mobil uygulamaların ve web sitelerinin tam listesine ulaşın.</p>
        <div class="sh-btn-v3">Resmi Listeyi Gör ↗</div>
      </a>
    </div>
    <div class="sh-contact-grid">
      <div class="sh-contact-box">
        <div class="sh-c-icon">📞</div>
        <div class="sh-c-info">
          <h4>Vakıf Danışma Hattı</h4>
          <span>+90 312 963 07 95</span>
          <p style="margin:5px 0 0; font-size:12px; color:#666">Hafta içi 09:00 - 18:00 arası</p>
        </div>
      </div>
      <div class="sh-contact-box" style="border-color: var(--v-blue);">
        <div class="sh-c-icon">🏛️</div>
        <div class="sh-c-info">
          <h4>Alo 183 Bakanlık Hattı</h4>
          <span>7/24 Kesintisiz</span>
          <p style="margin:5px 0 0; font-size:12px; color:#666">T.C. Aile ve Sosyal Hizmetler Bakanlığı</p>
        </div>
      </div>
    </div>
  </div>
</div>
<script>
// Pürüzsüz kaydırma
document.querySelectorAll('.sh-filter-bar a').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});
</script>
<?php endif; ?>
<?php get_footer(); ?>