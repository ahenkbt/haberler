<?php
/**
 * Template Name: Contact
 * Template Post Type: page
 */
get_header();
vkv_breadcrumb();
// VKV Sayfa İçerik Sistemi:
// 1. VKV Admin Paneli'nden içerik girilmişse göster
// 2. WordPress/Elementor içeriği varsa göster  
// 3. Hiçbiri yoksa Shopify HTML'ini göster
if (have_posts()) { the_post(); }
$vkv_slug = 'contact';
$vkv_custom = function_exists('vkv_get_custom_page_content') ? vkv_get_custom_page_content($vkv_slug) : '';
$vkv_wp_content = get_the_content();
$vkv_has_custom = !empty(trim($vkv_custom));
$vkv_has_wp     = !empty(trim(strip_tags($vkv_wp_content)));
if ($vkv_has_custom):
    // VKV Panel içeriği
    ?>
    <div style="max-width:100%;width:100%;padding:0;margin:0">
    <?php echo apply_filters('the_content', $vkv_custom); ?>
    </div>
    <?php
elseif ($vkv_has_wp):
    // WordPress / Elementor içeriği
    ?>
    <div style="max-width:100%;width:100%;padding:0;margin:0">
    <?php the_content(); ?>
    </div>
    <?php
else:
    // Shopify'dan dönüştürülmüş orijinal içerik
?>
<style>
/* Shopify CSS değişken uyumluluğu */
:root {
  --r:#8C1A2E;--rd:#6E1222;--rl:rgba(140,26,46,.09);
  --g:#C9A84C;--gl:rgba(201,168,76,.1);
  --dk:#0D1117;--dk2:#1C2330;--wh:#FAFAF8;
  --gr:#F5F2ED;--bd:#E4E0D8;
  --t1:#1A1F28;--t2:#4A5568;--t3:#718096;
  --fn:'Nunito Sans',system-ui,sans-serif;
  --fs:'Merriweather',Georgia,serif;
  --w:1440px;
}
</style>
<script>
(function(){
  // Shopify'ın tüm olası page başlığı wrapper'larını gizle
  var selectors = [
    '.page-hero', '.page-content', '.page-title', 
    '.page__heading', '.page__header', '.page-header',
    'h1.title', '.template-page > h1',
    '.shopify-section-page .page-hero'
  ];
  selectors.forEach(function(s){
    document.querySelectorAll(s).forEach(function(el){
      el.style.display = 'none';
    });
  });
  // Main content'i tam genişlik yap
  var content = document.getElementById('content');
  if(content){
    content.style.cssText = 'max-width:100%!important;padding:0!important;width:100%!important;margin:0!important';
  }
})();
</script>
<style>
#content,#MainContent,main#content{max-width:100%!important;padding:0!important;width:100%!important;margin:0!important}
.page-hero,.page-content,.page__heading,.page__header,.page-header,.page-title{display:none!important}
</style>
<div class="pw">
<div class="ph">
  <div class="ph-w">
    <div>
      <div class="lang-sw">
        <a href="<?php echo esc_url(home_url('/iletisim')); ?>">🇹🇷 Türkçe</a>
        <a href="<?php echo esc_url(home_url('/contact')); ?>" class="on">🇬🇧 English</a>
      </div>
      <div class="ph-ew">📩 Contact Us</div>
      <h1 class="ph-h1">We're Here<em>for You</em></h1>
      <p class="ph-desc">Whether you're a veteran seeking support, a donor wanting to contribute, or a partner interested in collaboration — <strong>we're here for you.</strong> Our team responds within 24 hours.</p>
    </div>
    <div class="ph-cinfo">
      <div class="ph-ci"><div class="ph-ci-icon">📞</div><div><div class="ph-ci-lbl">Phone (Veteran Helpline)</div><div class="ph-ci-val"><a href="tel:+903129630795">+90 312 963 07 95</a></div></div></div>
      <div class="ph-ci"><div class="ph-ci-icon">✉️</div><div><div class="ph-ci-lbl">E-mail</div><div class="ph-ci-val"><a href="mailto:vakif@vatankahramanlari.org">vakif@vatankahramanlari.org</a></div></div></div>
      <div class="ph-ci"><div class="ph-ci-icon">🌐</div><div><div class="ph-ci-lbl">Website</div><div class="ph-ci-val"><a href="https://vatankahramanlari.org">vatankahramanlari.org</a></div></div></div>
      <div class="ph-ci"><div class="ph-ci-icon">📍</div><div><div class="ph-ci-lbl">Headquarters</div><div class="ph-ci-val">Karanfil Sokak 4/91, Çankaya, Ankara</div></div></div>
    </div>
  </div>
</div>
<div class="qc-sec">
  <div class="qc-w">
    <div class="qc-item"><div class="qc-icon">📞</div><div><div class="qc-lbl">Veteran Helpline</div><div class="qc-val"><a href="tel:+903129630795">+90 312 963 07 95</a></div></div></div>
    <div class="qc-item"><div class="qc-icon">✉️</div><div><div class="qc-lbl">E-mail</div><div class="qc-val"><a href="mailto:vakif@vatankahramanlari.org">vakif@vatankahramanlari.org</a></div></div></div>
    <div class="qc-item"><div class="qc-icon">💝</div><div><div class="qc-lbl">Donations</div><div class="qc-val"><a href="<?php echo esc_url(home_url('/donation')); ?>">vatankahramanlari.org/pages/donation</a></div></div></div>
    <div class="qc-item"><div class="qc-icon">🤝</div><div><div class="qc-lbl">Partnership</div><div class="qc-val"><a href="<?php echo esc_url(home_url('/isbirligi')); ?>">Cooperation Programs</a></div></div></div>
  </div>
</div>
<div class="of-sec">
  <div style="margin-bottom:4px;font-size:8.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--r)">📍 Our Offices</div>
  <div style="font-family:var(--fs);font-size:1.4rem;font-weight:700;color:var(--t1)">5 Offices · 4 Continents</div>
  <div class="of-grid">
    <div class="of-card"><div class="of-flag">🇹🇷</div><div class="of-city">Ankara, Turkey</div><div class="of-name">Vatan Kahramanları Derneği</div><div class="of-addr">Meşrutiyet Mah. Karanfil Sokak 4/91, Çankaya</div></div>
    <div class="of-card"><div class="of-flag">🇺🇸</div><div class="of-city">Wyoming, USA</div><div class="of-name">Heroes of the Homeland Foundation Inc.</div><div class="of-addr">1621 Central Ave, Cheyenne WY 82001</div></div>
    <div class="of-card"><div class="of-flag">🇦🇿</div><div class="of-city">Baku, Azerbaijan</div><div class="of-name">International Veterans Organization MMC</div><div class="of-addr">Caferov Qardaşları No: 19, İçerişeher</div></div>
    <div class="of-card"><div class="of-flag">🇬🇧</div><div class="of-city">London, UK</div><div class="of-name">Vatan Social Services</div><div class="of-addr">71-75 Shelton Street, Covent Garden WC2H 9JQ</div></div>
    <div class="of-card"><div class="of-flag">🇬🇪</div><div class="of-city">Batumi, Georgia</div><div class="of-name">VKV Batumi Representative</div><div class="of-addr">Kutaisi Street No: 1, Old Batumi</div></div>
  </div>
</div>
<div class="fm-sec">
  <div class="fm-w">
    <div>
      <div class="fm-box">
        <div class="fm-head"><div class="fm-head-icon">✉️</div><div><h3>Send a Message</h3><p>We will respond within 24 hours</p></div></div>
        <div class="fm-body">
          <div class="fg-row">
            <div class="fg"><label>Full Name *</label><input type="text" placeholder="Your Name Surname"></div>
            <div class="fg"><label>E-mail *</label><input type="email" placeholder="example@mail.com"></div>
          </div>
          <div class="fg-row">
            <div class="fg"><label>Phone</label><input type="tel" placeholder="+1 ___ ___ __ __"></div>
            <div class="fg"><label>Subject *</label>
              <select>
                <option value="">Select...</option>
                <option>Veteran Support</option>
                <option>Donation</option>
                <option>Scholarship Application</option>
                <option>Partnership Proposal</option>
                <option>Media & Press</option>
                <option>General Information</option>
              </select>
            </div>
          </div>
          <div class="fg"><label>Your Message *</label><textarea rows="5" placeholder="Please explain your request..."></textarea></div>
          <button class="fg-submit" onclick="this.textContent='✓ Message Sent';this.style.background='#15803D';setTimeout(()=>{this.textContent='Send →';this.style.background='#8C1A2E'},3000)">Send →</button>
        </div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="map-box">
        <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3059.7!2d32.8597!3d39.9208!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMznCsDU1JzE1LjAiTiAzMsKwNTEnMzQuOCJF!5e0!3m2!1str!2str!4v1" allowfullscreen="" loading="lazy" style="width:100%;height:320px;border:none;display:block"></iframe>
        <div class="map-info"><div class="map-addr"><strong>Ankara Headquarters</strong>Meşrutiyet Mah. Karanfil Sokak 4/91, Çankaya / Ankara</div></div>
      </div>
      <div style="background:#fff;border:1px solid var(--bd);border-radius:8px;padding:20px 22px">
        <div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--r);margin-bottom:12px">Working Hours</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;color:var(--t2)">
          <div>Monday – Friday</div><div style="font-weight:700;color:var(--t1)">09:00 – 18:00</div>
          <div>Saturday</div><div style="font-weight:700;color:var(--t1)">10:00 – 14:00</div>
          <div>Sunday</div><div style="color:var(--t3)">Closed</div>
        </div>
        <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--bd);font-size:11.5px;color:var(--t2)">🔴 <strong style="color:var(--t1)">Veteran Helpline</strong> — available 7/24 for urgent needs</div>
      </div>
    </div>
  </div>
</div>
</div>
<?php endif; ?>
<?php get_footer(); ?>
