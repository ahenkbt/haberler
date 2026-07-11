<?php
/**
 * Template Name: Ansiklopedi
 * Slug: ansiklopedi → turkatav.org/ansiklopedi/ stilinde
 * Admin panelinden: header rengi, başlık, konu chips düzenlenebilir
 */
defined('ABSPATH') || exit;
get_header();
/* Admin ayarları */
$hdr_renk1   = get_option('vkv_ansi_renk1',    '#0d9488');
$hdr_renk2   = get_option('vkv_ansi_renk2',    '#0f766e');
$hdr_baslik  = get_option('vkv_ansi_baslik',   get_bloginfo('name') . ' Ansiklopedisi');
$hdr_altyazi = get_option('vkv_ansi_altyazi',  'Türk tarihi, kültürü ve medeniyeti hakkında ansiklopedik bilgi');
$ansi_dil    = get_option('vkv_ansi_dil',      'tr');
$konular_str = get_option('vkv_ansi_konular',  'Türk Tarihi,Atatürk,Çanakkale Savaşı,Osmanlı İmparatorluğu,Kurtuluş Savaşı,Türk Kültürü,Türk Devletleri,Selçuklu,Türkiye,Orta Asya');
$konular_arr = array_filter(array_map('trim', explode(',', $konular_str)));
?>
<style>
/* ── Ansiklopedi Hero ── */
.ansi-hero{background:linear-gradient(135deg,<?php echo esc_attr($hdr_renk1); ?>,<?php echo esc_attr($hdr_renk2); ?>);padding:56px 20px 40px;text-align:center;position:relative;overflow:hidden}
.ansi-hero::before{content:'';position:absolute;inset:0;background:url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="160" cy="40" r="80" fill="rgba(255,255,255,.04)"/><circle cx="40" cy="160" r="60" fill="rgba(255,255,255,.04)"/></svg>') center/cover;pointer-events:none}
.ansi-hero-inner{max-width:680px;margin:0 auto;position:relative;z-index:1}
.ansi-hero h1{font-family:var(--fh);font-size:clamp(2rem,5vw,3rem);font-weight:700;color:#fff;margin:0 0 10px;line-height:1.1}
.ansi-hero p{font-size:14px;color:rgba(255,255,255,.7);margin:0 0 30px;line-height:1.7}
/* ── Arama Kutusu ── */
.ansi-search-box{display:flex;gap:0;max-width:560px;margin:0 auto 28px;box-shadow:0 4px 24px rgba(0,0,0,.25)}
.ansi-search-box input{flex:1;border:none;padding:14px 20px;font-size:14px;outline:none;font-family:var(--fm)}
.ansi-search-box button{background:var(--dk);color:#fff;border:none;padding:0 24px;font-family:var(--fh);font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;cursor:pointer;transition:background .2s;white-space:nowrap}
.ansi-search-box button:hover{background:var(--cr)}
/* ── Konu Chips ── */
.ansi-chips-wrap{margin-top:8px}
.ansi-chips-label{font-family:var(--fh);font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:rgba(255,255,255,.45);margin-bottom:10px}
.ansi-chips{display:flex;flex-wrap:wrap;gap:7px;justify-content:center}
.ansi-chip{display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);color:#fff;padding:6px 14px;font-size:12px;font-family:var(--fm);cursor:pointer;transition:all .2s;border-radius:2px;text-decoration:none}
.ansi-chip:hover{background:rgba(255,255,255,.2);border-color:rgba(255,255,255,.4)}
.ansi-chip.aktif{background:rgba(255,255,255,.25);border-color:#fff}
/* ── Sonuçlar Bölümü ── */
.ansi-main{max-width:1440px;margin:0 auto;padding:40px 20px;min-height:300px}
.ansi-loading{text-align:center;padding:60px 20px;color:var(--yz3);font-family:var(--fh);font-size:14px}
.ansi-sonuc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.ansi-sonuc-kart{background:#fff;border:1px solid var(--sin);text-decoration:none;display:block;transition:all .2s;overflow:hidden}
.ansi-sonuc-kart:hover{border-color:<?php echo esc_attr($hdr_renk1); ?>;box-shadow:0 4px 20px rgba(0,0,0,.1);transform:translateY(-2px)}
.ansi-kart-img{width:100%;height:160px;object-fit:cover;background:var(--bg);display:block}
.ansi-kart-img-ph{height:160px;background:linear-gradient(135deg,<?php echo esc_attr($hdr_renk1); ?>,<?php echo esc_attr($hdr_renk2); ?>);display:flex;align-items:center;justify-content:center;font-size:3rem;opacity:.3}
.ansi-kart-body{padding:16px}
.ansi-kart-baslik{font-family:var(--fh);font-size:15px;font-weight:700;color:var(--dk);margin-bottom:6px;line-height:1.3}
.ansi-kart-desc{font-size:11.5px;color:var(--yz3);margin-bottom:8px;font-style:italic}
.ansi-kart-exc{font-size:12.5px;color:var(--yz2);line-height:1.6;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.ansi-kart-footer{display:flex;justify-content:flex-end;margin-top:10px}
.ansi-kart-link{font-family:var(--fh);font-size:10.5px;font-weight:600;color:<?php echo esc_attr($hdr_renk1); ?>;text-transform:uppercase;letter-spacing:.5px}
.ansi-bos{text-align:center;padding:60px 20px;color:var(--yz3)}
.ansi-bos h3{font-family:var(--fh);font-size:1.2rem;color:var(--yz2);margin-bottom:8px}
/* ── Responsive ── */
@media(max-width:960px){.ansi-sonuc-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:600px){.ansi-sonuc-grid{grid-template-columns:1fr}.ansi-hero{padding:36px 16px 28px}.ansi-search-box input{padding:12px 14px}}
</style>
<!-- HERO -->
<div class="ansi-hero">
  <div class="ansi-hero-inner">
    <h1><?php echo esc_html($hdr_baslik); ?></h1>
    <p><?php echo esc_html($hdr_altyazi); ?></p>
    <div class="ansi-search-box">
      <input type="text" id="ansiSearchInput" placeholder="Araştırmak istediğiniz konuyu yazın..." onkeydown="if(event.key==='Enter')ansiAra()">
      <button onclick="ansiAra()">Ara 🔍</button>
    </div>
    <?php if (!empty($konular_arr)): ?>
    <div class="ansi-chips-wrap">
      <div class="ansi-chips-label">— ÖNERİLEN KONULAR —</div>
      <div class="ansi-chips">
        <?php foreach ($konular_arr as $konu): ?>
        <button class="ansi-chip" onclick="ansiKonuSec('<?php echo esc_js($konu); ?>')"><?php echo esc_html($konu); ?></button>
        <?php endforeach; ?>
      </div>
    </div>
    <?php endif; ?>
  </div>
</div>
<!-- SONUÇLAR -->
<div class="ansi-main">
  <div id="ansiResults">
    <div class="ansi-bos">
      <div style="font-size:3rem;margin-bottom:12px">📚</div>
      <h3>Bir konu arayın</h3>
      <p>Türk tarihi, kültürü ve medeniyeti hakkında Wikipedia'dan kapsamlı bilgiye ulaşın.</p>
    </div>
  </div>
</div>
<script>
(function(){
  var dil = '<?php echo esc_js($ansi_dil); ?>';
  var ajaxUrl = '<?php echo esc_js(admin_url('admin-ajax.php')); ?>';
  var aktifKonu = null;
  window.ansiAra = function() {
    var q = document.getElementById('ansiSearchInput').value.trim();
    if (!q) return;
    ansiYukle(q);
  };
  window.ansiKonuSec = function(konu) {
    aktifKonu = konu;
    document.getElementById('ansiSearchInput').value = konu;
    document.querySelectorAll('.ansi-chip').forEach(function(c){
      c.classList.toggle('aktif', c.textContent.trim() === konu);
    });
    ansiYukle(konu);
  };
  function ansiYukle(q) {
    var res = document.getElementById('ansiResults');
    res.innerHTML = '<div class="ansi-loading">🔍 Aranıyor: <strong>' + q + '</strong>...</div>';
    var fd = new FormData();
    fd.append('action', 'vkv_wiki_ara');
    fd.append('q', q);
    fd.append('dil', dil);
    fd.append('nonce', '<?php echo wp_create_nonce('vkv_wiki_ara'); ?>');
    fetch(ajaxUrl, {method:'POST', body:fd})
      .then(function(r){ return r.json(); })
      .then(function(data){
        if (!data.success || !data.data || data.data.length === 0) {
          res.innerHTML = '<div class="ansi-bos"><div style="font-size:2.5rem;margin-bottom:10px">🔍</div><h3>"' + q + '" için sonuç bulunamadı</h3><p>Farklı bir arama terimi deneyin.</p></div>';
          return;
        }
        var html = '<div class="ansi-sonuc-grid">';
        data.data.forEach(function(item){
          html += '<a href="' + item.url + '" target="_blank" rel="noopener" class="ansi-sonuc-kart">';
          if (item.thumbnail) {
            html += '<img class="ansi-kart-img" src="' + item.thumbnail + '" alt="' + item.title + '" loading="lazy">';
          } else {
            html += '<div class="ansi-kart-img-ph">📖</div>';
          }
          html += '<div class="ansi-kart-body">';
          html += '<div class="ansi-kart-baslik">' + item.title + '</div>';
          if (item.description) html += '<div class="ansi-kart-desc">' + item.description + '</div>';
          if (item.extract) html += '<div class="ansi-kart-exc">' + item.extract + '</div>';
          html += '<div class="ansi-kart-footer"><span class="ansi-kart-link">Wikipedia\'da Oku →</span></div>';
          html += '</div></a>';
        });
        html += '</div>';
        res.innerHTML = html;
      })
      .catch(function(){
        res.innerHTML = '<div class="ansi-bos"><h3>Bağlantı hatası</h3><p>Lütfen tekrar deneyin.</p></div>';
      });
  }
})();
</script>
<?php get_footer();
