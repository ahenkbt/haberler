<?php
/**
 * Template Name: Ana Sayfa (VKV)
 * Modüler yapı — Sayfa Yönetici eklentisiyle sıra & görünürlük yönetimi
 */
get_header();
$_site_tipi   = get_option('vkv_site_tipi', 'vakif');
$_org_adi     = get_option('vkv_org_adi', get_bloginfo('name'));
/* ─── DSV ─────────────────────────────────────────────── */
if ($_site_tipi === 'dsv'):
    vkv_fp_blok_dsv_anasayfa();
/* ─── TÜKAV ───────────────────────────────────────────── */
elseif ($_site_tipi === 'tukav'):
    vkv_fp_blok_tukav_anasayfa();
/* ─── VKV / VKD / varsayılan ──────────────────────────── */
else:
    $default_order   = array('slider','haberler','turk_savaslari','milli_gunler',
                             'kahraman_band','hizmetler','hizli_erisim',
                             'ataturk_bandi','soz_band','bagis');
    $modul_sira      = get_option('vkv_modul_sirasi', $default_order);
    $modul_gorsel    = get_option('vkv_modul_gorunurluk', array());
    if (!is_array($modul_sira)) $modul_sira = $default_order;
    foreach ($modul_sira as $modul):
        if (!is_string($modul)) continue;
        if (isset($modul_gorsel[$modul]) && !$modul_gorsel[$modul]) continue;
        $fn = 'vkv_fp_' . $modul;
        if (function_exists($fn)) call_user_func($fn);
    endforeach;
endif;
get_footer();
/* ════════════════════════════════════════════════════════
   MODÜL FONKSİYONLARI
════════════════════════════════════════════════════════ */
/* ── Slider ──────────────────────────────────────────── */
function vkv_fp_slider() {
    $raw    = get_option('vkv_slider_slides', array());
    if (!is_array($raw)) $raw = array();
    $slides = array_values(array_filter($raw, 'vkv_fp_slide_dolu'));
    if (empty($slides)) {
        echo '<div style="height:220px;display:flex;align-items:center;justify-content:center;background:var(--dk);color:rgba(255,255,255,.3);font-family:var(--fh);font-size:13px">
            <a href="' . esc_url(admin_url('admin.php?page=vkv-slider')) . '" style="color:var(--altin2);text-decoration:none">&#9654; Slider yönetiminden slayt ekleyin</a>
            </div>';
        return;
    }
    ?>
<style>
.vkv-hero{position:relative;height:520px;overflow:hidden;background:var(--dk)}
.vkv-slide{position:absolute;inset:0;opacity:0;transition:opacity .8s;display:flex;flex-direction:column;justify-content:flex-end}
.vkv-slide.active{opacity:1}
.vkv-slide-img{position:absolute;inset:0;background-size:cover;background-position:center}
.vkv-slide-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.82) 0%,rgba(0,0,0,.3) 55%,rgba(0,0,0,.1) 100%)}
.vkv-slide-body{position:relative;z-index:2;padding:32px 40px;max-width:800px}
.vkv-slide-tag{font-family:var(--fh);font-size:10px;letter-spacing:2.5px;font-weight:700;text-transform:uppercase;color:var(--altin2);margin-bottom:8px}
.vkv-slide-title{font-family:var(--fh);font-size:clamp(1.7rem,4vw,3rem);font-weight:700;color:#fff;line-height:1.1;margin-bottom:12px}
.vkv-slide-exc{font-size:13px;color:rgba(255,255,255,.65);margin-bottom:18px;line-height:1.7;max-width:600px}
.vkv-slide-btn{display:inline-flex;align-items:center;gap:8px;background:var(--cr);color:#fff;font-family:var(--fh);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;padding:10px 22px;text-decoration:none;transition:background .2s}
.vkv-slide-btn:hover{background:var(--cr2)}
.vkv-hero-dots{position:absolute;bottom:18px;right:20px;z-index:10;display:flex;gap:6px}
.vkv-dot{width:8px;height:8px;background:rgba(255,255,255,.3);border-radius:50%;cursor:pointer;transition:all .2s}
.vkv-dot.active{background:var(--cr);transform:scale(1.3)}
.vkv-hero-prev,.vkv-hero-next{position:absolute;top:50%;transform:translateY(-50%);z-index:10;background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.2);color:#fff;width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;transition:all .2s}
.vkv-hero-prev{left:14px}.vkv-hero-next{right:14px}
.vkv-hero-prev:hover,.vkv-hero-next:hover{background:var(--cr)}
@media(max-width:600px){.vkv-slide-body{padding:20px 16px}.vkv-hero{height:420px}}
</style>
<div class="vkv-hero" id="vkvHero">
  <?php foreach ($slides as $idx => $s): ?>
  <div class="vkv-slide<?php echo $idx===0?' active':''; ?>">
    <?php if (!empty($s['image'])): ?>
    <div class="vkv-slide-img" style="background-image:url('<?php echo esc_url($s['image']); ?>')"></div>
    <?php else: ?>
    <div class="vkv-slide-img" style="background:var(--cr2)"></div>
    <?php endif; ?>
    <div class="vkv-slide-overlay"></div>
    <div class="vkv-slide-body">
      <?php if (!empty($s['tag'])): ?><div class="vkv-slide-tag"><?php echo esc_html($s['tag']); ?></div><?php endif; ?>
      <?php if (!empty($s['title'])): ?><h2 class="vkv-slide-title"><?php echo esc_html($s['title']); ?></h2><?php endif; ?>
      <?php if (!empty($s['excerpt'])): ?><p class="vkv-slide-exc"><?php echo esc_html($s['excerpt']); ?></p><?php endif; ?>
      <?php if (!empty($s['url'])): ?><a href="<?php echo esc_url($s['url']); ?>" class="vkv-slide-btn">Devamını Oku &#8250;</a><?php endif; ?>
    </div>
  </div>
  <?php endforeach; ?>
  <?php if (count($slides) > 1): ?>
  <button class="vkv-hero-prev" id="vkvPrev" aria-label="Önceki">&#8249;</button>
  <button class="vkv-hero-next" id="vkvNext" aria-label="Sonraki">&#8250;</button>
  <?php endif; ?>
  <div class="vkv-hero-dots" id="vkvDots"></div>
</div>
<script>(function(){
  var s=document.querySelectorAll('#vkvHero .vkv-slide'),
      d=document.getElementById('vkvDots'),
      pr=document.getElementById('vkvPrev'),
      nx=document.getElementById('vkvNext'),
      c=0,t;
  if(!s.length)return;
  s.forEach(function(_,i){var b=document.createElement('div');b.className='vkv-dot'+(i===0?' active':'');b.onclick=function(){g(i);};d.appendChild(b);});
  function g(n){s[c].classList.remove('active');d.children[c]&&d.children[c].classList.remove('active');c=(n+s.length)%s.length;s[c].classList.add('active');d.children[c]&&d.children[c].classList.add('active');clearInterval(t);t=setInterval(function(){g(c+1);},5500);}
  if(pr)pr.onclick=function(){g(c-1);};
  if(nx)nx.onclick=function(){g(c+1);};
  t=setInterval(function(){g(c+1);},5500);
})();</script>
    <?php
}
function vkv_fp_slide_dolu($s) {
    return !empty($s['title']) || !empty($s['image']);
}
/* ════════════════════════════════════════════════════════
   MANŞET (HABERLER) SİSTEMİ
════════════════════════════════════════════════════════ */
function vkv_manseta_kategoriler() {
    $cats = get_categories(array('hide_empty' => false, 'number' => 20));
    $sonuc = array(array('id'=>0,'name'=>'Tümü','slug'=>'tumumu'));
    foreach ($cats as $cat) {
        $sonuc[] = array('id' => (int)$cat->term_id, 'name' => $cat->name, 'slug' => $cat->slug);
    }
    return $sonuc;
}
function vkv_manseta_sabitli_ids() {
    $sabitler_raw = get_option('vkv_sabitli_haberler', '');
    if (empty($sabitler_raw)) return array();
    $ids = array_map('intval', explode(',', $sabitler_raw));
    return array_filter($ids);
}
function vkv_manseta_posts_cek($cat_id = 0, $limit = 5) {
    $sabitli = vkv_manseta_sabitli_ids();
    $args = array('post_status' => 'publish', 'posts_per_page' => $limit,
                  'ignore_sticky_posts' => 1);
    if ($cat_id > 0) $args['cat'] = $cat_id;
    if (!empty($sabitli)) {
        $args['orderby'] = 'post__in';
        $args['post__in'] = $sabitli;
        $args['posts_per_page'] = count($sabitli) + $limit;
    }
    $q = new WP_Query($args);
    $posts = array();
    if ($q->have_posts()) {
        while ($q->have_posts()) {
            $q->the_post();
            $thumb = '';
            if (has_post_thumbnail()) {
                $thumb = get_the_post_thumbnail_url(get_the_ID(), 'medium_large');
            }
            $cats = get_the_category();
            $posts[] = array(
                'id'      => get_the_ID(),
                'title'   => get_the_title(),
                'excerpt' => wp_trim_words(get_the_excerpt(), 18),
                'url'     => get_permalink(),
                'thumb'   => $thumb,
                'date'    => get_the_date('j M Y'),
                'cat'     => !empty($cats) ? $cats[0]->name : '',
                'pinned'  => in_array(get_the_ID(), $sabitli),
            );
        }
        wp_reset_postdata();
    }
    return array_slice($posts, 0, $limit);
}
function vkv_manseta_grid_html($posts) {
    if (empty($posts)) {
        return '<div style="padding:40px;text-align:center;color:var(--yz3)">Henüz haber yok.</div>';
    }
    $ana  = $posts[0];
    $yan  = array_slice($posts, 1);
    $html = '<div class="vkv-news-grid">';
    $thumb_html = $ana['thumb']
        ? '<img src="' . esc_url($ana['thumb']) . '" alt="' . esc_attr($ana['title']) . '" loading="lazy">'
        : '<div class="vkv-no-img-ph">&#127906;</div>';
    $html .= '<a href="' . esc_url($ana['url']) . '" class="vkv-news-main-card">'
           . $thumb_html
           . '<div class="vkv-news-main-overlay"></div>'
           . '<div class="vkv-news-main-body">'
           . '<div class="vkv-nmb-top">'
           . ($ana['cat'] ? '<span class="vkv-news-main-cat">' . esc_html($ana['cat']) . '</span>' : '')
           . ($ana['pinned'] ? '<span class="vkv-manseta-pin">&#128204; Öne Çıkan</span>' : '')
           . '</div>'
           . '<h3 class="vkv-news-main-title">' . esc_html($ana['title']) . '</h3>'
           . '<p class="vkv-news-main-exc">' . esc_html($ana['excerpt']) . '</p>'
           . '<span class="vkv-news-main-date">' . esc_html($ana['date']) . '</span>'
           . '</div></a>';
    if (!empty($yan)) {
        $html .= '<div class="vkv-news-side">';
        foreach ($yan as $p) {
            $th = $p['thumb']
                ? '<img src="' . esc_url($p['thumb']) . '" alt="' . esc_attr($p['title']) . '" loading="lazy">'
                : '<div class="vkv-nsc-no-img">&#127906;</div>';
            $html .= '<a href="' . esc_url($p['url']) . '" class="vkv-news-side-card">'
                   . '<div class="vkv-nsc-img">' . $th . '</div>'
                   . '<div class="vkv-nsc-body">'
                   . ($p['cat'] ? '<span class="vkv-nsc-cat">' . esc_html($p['cat']) . '</span>' : '')
                   . '<h4 class="vkv-nsc-title">' . esc_html($p['title']) . '</h4>'
                   . '<span class="vkv-nsc-date">' . esc_html($p['date']) . '</span>'
                   . '</div></a>';
        }
        $html .= '</div>';
    }
    $html .= '</div>';
    return $html;
}
/* ── Haberler modülü ─────────────────────────────────── */
function vkv_fp_haberler() {
    $kategoriler = vkv_manseta_kategoriler();
    $posts       = vkv_manseta_posts_cek(0, 5);
    $grid_html   = vkv_manseta_grid_html($posts);
    ?>
<style>
.vkv-main{max-width:1440px;margin:0 auto;padding:32px 20px}
.vkv-section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:0;flex-wrap:wrap;gap:10px}
.vkv-section-title{font-family:var(--fh);font-size:1.1rem;font-weight:700;color:var(--dk);display:flex;align-items:center;gap:10px}
.vkv-section-title::before{content:'';display:block;width:4px;height:20px;background:var(--cr)}
.vkv-more-link{font-family:var(--fh);font-size:10.5px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--cr);text-decoration:none;transition:color .2s}
.vkv-more-link:hover{color:var(--cr2)}
.vkv-manseta-tabs{display:flex;align-items:center;gap:4px;overflow-x:auto;scrollbar-width:none;padding:14px 0 0;flex-wrap:nowrap}
.vkv-manseta-tabs::-webkit-scrollbar{display:none}
.vkv-mtab{display:inline-flex;align-items:center;gap:5px;padding:7px 16px;font-family:var(--fh);font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--yz2);background:transparent;border:1.5px solid transparent;border-bottom:2px solid var(--sin);cursor:pointer;white-space:nowrap;transition:all .2s;text-decoration:none;border-radius:2px 2px 0 0}
.vkv-mtab:hover{color:var(--cr);border-bottom-color:var(--cr3)}
.vkv-mtab.aktif{color:var(--cr);background:#fff;border-color:var(--sin) var(--sin) #fff;border-bottom:2px solid var(--cr);position:relative;z-index:1}
.vkv-manseta-tabs-wrap{border-bottom:1px solid var(--sin);margin-bottom:20px;margin-top:0}
.vkv-news-grid{display:grid;grid-template-columns:2fr 1fr;gap:20px;transition:opacity .25s}
.vkv-news-grid.yukleniyor{opacity:.5;pointer-events:none}
.vkv-news-main-card{position:relative;display:block;text-decoration:none;overflow:hidden;aspect-ratio:16/8;background:var(--dk2);border-radius:3px}
.vkv-news-main-card img{width:100%;height:100%;object-fit:cover;transition:transform .5s;display:block}
.vkv-news-main-card:hover img{transform:scale(1.04)}
.vkv-no-img-ph{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--dk2),var(--cr2));color:rgba(255,255,255,.2);font-size:3rem}
.vkv-news-main-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.72) 0%,rgba(0,0,0,.22) 45%,rgba(0,0,0,.0) 75%)}
.vkv-news-main-body{position:absolute;bottom:0;left:0;right:0;padding:22px 24px}
.vkv-nmb-top{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.vkv-news-main-cat{font-family:var(--fh);font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;background:var(--cr);color:#fff;padding:3px 10px;display:inline-block}
.vkv-manseta-pin{font-family:var(--fh);font-size:9px;font-weight:700;letter-spacing:1px;color:var(--altin2);background:rgba(180,83,9,.18);border:1px solid rgba(180,83,9,.3);padding:2px 8px;display:inline-block}
.vkv-news-main-title{font-family:var(--fh);font-size:1.25rem;font-weight:700;color:#fff;line-height:1.2;margin-bottom:6px}
.vkv-news-main-exc{font-size:12.5px;color:rgba(255,255,255,.65);line-height:1.65;margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.vkv-news-main-date{font-size:10.5px;color:rgba(255,255,255,.45)}
.vkv-news-side{display:flex;flex-direction:column;gap:10px}
.vkv-news-side-card{display:flex;gap:12px;text-decoration:none;background:#fff;border:1px solid var(--sin);padding:10px;transition:all .2s;border-radius:2px}
.vkv-news-side-card:hover{border-color:var(--cr3);box-shadow:0 4px 14px rgba(139,26,26,.09);transform:translateX(2px)}
.vkv-nsc-img{width:92px;height:72px;flex-shrink:0;overflow:hidden;background:var(--dk2)}
.vkv-nsc-img img{width:100%;height:100%;object-fit:cover;transition:transform .35s;display:block}
.vkv-nsc-no-img{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--dk2),var(--cr2));color:rgba(255,255,255,.25);font-size:1.2rem}
.vkv-news-side-card:hover .vkv-nsc-img img{transform:scale(1.06)}
.vkv-nsc-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;justify-content:center}
.vkv-nsc-cat{font-family:var(--fh);font-size:8.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--cr);display:block}
.vkv-nsc-title{font-family:var(--fh);font-size:13px;font-weight:600;color:var(--dk);line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin:0}
.vkv-news-side-card:hover .vkv-nsc-title{color:var(--cr)}
.vkv-nsc-date{font-size:10px;color:var(--yz3)}
@media(max-width:900px){.vkv-news-grid{grid-template-columns:1fr}}
@media(max-width:600px){.vkv-news-side{display:none}}
</style>
<div class="vkv-main">
  <div class="vkv-section-head">
    <div class="vkv-section-title">Son Haberler</div>
    <a href="<?php echo esc_url(home_url('/haberler')); ?>" class="vkv-more-link">Tüm Haberler &#8250;</a>
  </div>
  <div class="vkv-manseta-tabs-wrap">
    <div class="vkv-manseta-tabs" id="vkvTabs">
      <?php foreach ($kategoriler as $i => $kat): ?>
      <a href="#" class="vkv-mtab<?php echo $i===0?' aktif':''; ?>"
         data-cat="<?php echo (int)$kat['id']; ?>"><?php echo esc_html($kat['name']); ?></a>
      <?php endforeach; ?>
    </div>
  </div>
  <div class="vkv-manseta-content" id="vkvGrid">
    <?php echo $grid_html; ?>
  </div>
</div>
<script>(function(){
  var tabs=document.querySelectorAll('#vkvTabs .vkv-mtab'),
      grid=document.getElementById('vkvGrid'),
      ajaxUrl='<?php echo esc_url(admin_url('admin-ajax.php')); ?>',
      nonce='<?php echo wp_create_nonce('vkv_manseta'); ?>';
  tabs.forEach(function(tab){
    tab.addEventListener('click',function(e){
      e.preventDefault();
      tabs.forEach(function(t){t.classList.remove('aktif');});
      tab.classList.add('aktif');
      var cat=tab.getAttribute('data-cat');
      grid.classList.add('yukleniyor');
      var fd=new FormData();
      fd.append('action','vkv_manseta_ajax');
      fd.append('cat_id',cat);
      fd.append('nonce',nonce);
      fetch(ajaxUrl,{method:'POST',body:fd})
        .then(function(r){return r.json();})
        .then(function(d){grid.innerHTML=d.html||'';grid.classList.remove('yukleniyor');})
        .catch(function(){grid.classList.remove('yukleniyor');});
    });
  });
})();</script>
    <?php
}
/* ── Kahraman Bandı ──────────────────────────────────── */
function vkv_fp_kahraman_band() { ?>
<style>
.vkv-kb{background:linear-gradient(90deg,var(--cr2),var(--cr),var(--cr2));padding:18px 20px;overflow:hidden;position:relative}
.vkv-kb-w{max-width:1440px;margin:0 auto;display:flex;align-items:center;gap:12px;position:relative;z-index:1}
.vkv-kb-icon{font-size:1.6rem;flex-shrink:0}
.vkv-kb-text{font-family:var(--fh);font-size:clamp(1.1rem,2vw,1.5rem);font-weight:700;color:#fff;letter-spacing:.5px}
.vkv-kb-text em{font-style:normal;color:var(--altin2)}
.vkv-kb-link{margin-left:auto;flex-shrink:0;font-family:var(--fh);font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,.7);text-decoration:none;border:1px solid rgba(255,255,255,.3);padding:6px 16px;transition:all .2s}
.vkv-kb-link:hover{background:#fff;color:var(--cr)}
</style>
<div class="vkv-kb">
  <div class="vkv-kb-w">
    <span class="vkv-kb-icon">&#127984;</span>
    <div class="vkv-kb-text">
      <?php echo esc_html(get_option('vkv_kahraman_bandi_yazi',
        'Vatan için canını veren tüm şehitlerimizi ve gazilerimizi saygıyla anıyoruz.')); ?>
    </div>
    <a href="<?php echo esc_url(home_url('/sehitlerimiz')); ?>" class="vkv-kb-link">Şehitlerimiz &#8250;</a>
  </div>
</div>
    <?php
}
/* ── Hızlı Erişim ────────────────────────────────────── */
function vkv_fp_hizli_erisim() {
    $linkler_raw = get_option('vkv_hizli_erisim_linkleri', '');
    if ($linkler_raw) $linkler = json_decode($linkler_raw, true);
    if (empty($linkler) || !is_array($linkler)) {
        $linkler = array(
            array('ikon'=>'&#127916;','baslik'=>'Şehit Hakları',  'url'=>'/sehit-gazi-haklari'),
            array('ikon'=>'&#9878;', 'baslik'=>'Hukuk Desteği',  'url'=>'/hukuk-savunuculuk'),
            array('ikon'=>'&#127891;','baslik'=>'Burs Başvurusu','url'=>'/burs'),
            array('ikon'=>'&#129309;','baslik'=>'İnsani Yardım', 'url'=>'/insani-yardim'),
            array('ikon'=>'&#128197;','baslik'=>'Etkinlikler',   'url'=>'/etkinlikler'),
            array('ikon'=>'&#128197;','baslik'=>'Bize Ulaşın',   'url'=>'/iletisim'),
        );
    }
    ?>
<style>
.vkv-he{background:var(--bg);padding:28px 20px}
.vkv-he-w{max-width:1440px;margin:0 auto}
.vkv-he-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-top:16px}
.vkv-he-kart{display:flex;flex-direction:column;align-items:center;gap:8px;padding:18px 10px;background:#fff;border:1px solid var(--sin);text-decoration:none;transition:all .2s;border-bottom:3px solid transparent}
.vkv-he-kart:hover{border-bottom-color:var(--cr);box-shadow:0 4px 16px rgba(139,26,26,.08);transform:translateY(-2px)}
.vkv-he-ikon{font-size:1.8rem}
.vkv-he-label{font-family:var(--fh);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--dk);text-align:center}
@media(max-width:900px){.vkv-he-grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:500px){.vkv-he-grid{grid-template-columns:repeat(2,1fr)}}
</style>
<div class="vkv-he">
  <div class="vkv-he-w">
    <div class="vkv-section-head">
      <div class="vkv-section-title">Hızlı Erişim</div>
    </div>
    <div class="vkv-he-grid">
      <?php foreach ($linkler as $l): ?>
      <a href="<?php echo esc_url(home_url($l['url'])); ?>" class="vkv-he-kart">
        <span class="vkv-he-ikon"><?php echo $l['ikon']; ?></span>
        <span class="vkv-he-label"><?php echo esc_html($l['baslik']); ?></span>
      </a>
      <?php endforeach; ?>
    </div>
  </div>
</div>
    <?php
}
/* ── Söz Bandı ───────────────────────────────────────── */
function vkv_fp_soz_band() {
    $sozler_raw = get_option('vkv_soz_bandi', '');
    if ($sozler_raw) $sozler = json_decode($sozler_raw, true);
    if (empty($sozler) || !is_array($sozler)) {
        $sozler = array(
            array('soz'=>'Her şey vatan için.', 'kaynak'=>'Atatürk'),
            array('soz'=>'Şehitler ölmez, vatan bölünmez.', 'kaynak'=>'Türk Milleti'),
        );
    }
    $soz = $sozler[array_rand($sozler)];
    ?>
<style>
.vkv-sb{background:var(--dk);padding:44px 20px;text-align:center}
.vkv-sb blockquote{font-family:var(--fh);font-size:clamp(1.1rem,2.5vw,1.6rem);font-style:italic;color:rgba(255,255,255,.82);max-width:800px;margin:0 auto;line-height:1.6}
.vkv-sb cite{display:block;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--altin2);margin-top:12px;font-style:normal}
</style>
<div class="vkv-sb">
  <blockquote>"<?php echo esc_html($soz['soz']); ?>"
    <cite>&#8212; <?php echo esc_html($soz['kaynak']); ?></cite>
  </blockquote>
</div>
    <?php
}
/* ── Bağış Bölümü ────────────────────────────────────── */
function vkv_fp_bagis() { ?>
<style>
.vkv-bagis{background:linear-gradient(135deg,var(--cr2),var(--cr));padding:48px 20px;text-align:center}
.vkv-bagis-w{max-width:700px;margin:0 auto}
.vkv-bagis-eyebrow{font-family:var(--fh);font-size:10px;letter-spacing:3px;font-weight:700;text-transform:uppercase;color:rgba(255,255,255,.6);margin-bottom:12px}
.vkv-bagis-h{font-family:var(--fh);font-size:clamp(1.4rem,3vw,2.2rem);font-weight:700;color:#fff;line-height:1.15;margin-bottom:10px}
.vkv-bagis-p{font-size:14px;color:rgba(255,255,255,.7);line-height:1.7;margin-bottom:24px;max-width:520px;margin-left:auto;margin-right:auto}
.vkv-bagis-btns{display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap}
.vkv-bagis-btn{display:inline-flex;align-items:center;gap:8px;font-family:var(--fh);font-size:12px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;padding:12px 28px;text-decoration:none;transition:all .2s}
.vkv-bagis-btn-main{background:var(--altin);color:#fff}
.vkv-bagis-btn-main:hover{background:var(--altin2)}
.vkv-bagis-btn-sec{background:transparent;color:#fff;border:2px solid rgba(255,255,255,.4)}
.vkv-bagis-btn-sec:hover{background:rgba(255,255,255,.1);border-color:#fff}
.vkv-bagis-iban{margin-top:18px;font-size:11px;color:rgba(255,255,255,.5);font-family:var(--fm)}
</style>
<div class="vkv-bagis">
  <div class="vkv-bagis-w">
    <div class="vkv-bagis-eyebrow">Destek Olun</div>
    <h2 class="vkv-bagis-h">Şehit ve Gazi Ailelerine Destek İçin Bağış Yapın</h2>
    <p class="vkv-bagis-p">Her bağışınız bir şehit ailesine umut, bir gaziye güç oluyor. Desteğiniz için teşekkür ederiz.</p>
    <div class="vkv-bagis-btns">
      <a href="https://donate.stripe.com/14A6oHgabdwQghN8xAb3q07" target="_blank" rel="noopener" class="vkv-bagis-btn vkv-bagis-btn-main">
        &#10003; Online Bağış Yap
      </a>
      <a href="<?php echo esc_url(home_url('/bagis')); ?>" class="vkv-bagis-btn vkv-bagis-btn-sec">
        Tüm Bağış Yolları &#8250;
      </a>
    </div>
    <div class="vkv-bagis-iban">IBAN: TR49 0001 0012 6298 0865 4750 01</div>
  </div>
</div>
    <?php
}
/* ── Türk Savaşları ──────────────────────────────────── */
function vkv_fp_turk_savaslari() {
    $savlar_raw = get_option('vkv_turk_savaslari', '');
    if ($savlar_raw) $savlar = json_decode($savlar_raw, true);
    if (empty($savlar) || !is_array($savlar)) {
        $savlar = array(
            array('yil'=>'1915','ad'=>'Çanakkale Savaşı',         'url'=>'/canakkale-savasi'),
            array('yil'=>'1919','ad'=>'Kurtuluş Savaşı',           'url'=>'/kurtulus-savasi'),
            array('yil'=>'1950','ad'=>'Kore Savaşı',               'url'=>'/kore-savasi'),
            array('yil'=>'1974','ad'=>'Kıbrıs Barış Harekâtı',     'url'=>'/kibris-baris-harekati'),
            array('yil'=>'1984','ad'=>'PKK Terörüyle Mücadele',     'url'=>'/sehitlerimiz'),
            array('yil'=>'2016','ad'=>'15 Temmuz Direniş',          'url'=>'/milli-gunler'),
        );
    }
    ?>
<style>
.vkv-sav{background:var(--dk);padding:36px 20px}
.vkv-sav-w{max-width:1440px;margin:0 auto}
.vkv-sav-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:1px;background:rgba(255,255,255,.06);margin-top:16px}
.vkv-sav-item{background:var(--dk2);padding:20px 16px;text-decoration:none;transition:all .2s;display:block}
.vkv-sav-item:hover{background:var(--cr2)}
.vkv-sav-yil{font-family:var(--fh);font-size:10px;font-weight:700;letter-spacing:2px;color:var(--altin2);margin-bottom:6px}
.vkv-sav-ad{font-family:var(--fh);font-size:13px;font-weight:600;color:#fff;line-height:1.35}
@media(max-width:1100px){.vkv-sav-grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:600px){.vkv-sav-grid{grid-template-columns:repeat(2,1fr)}}
</style>
<div class="vkv-sav">
  <div class="vkv-sav-w">
    <div class="vkv-section-head" style="--sh-c:#fff">
      <div class="vkv-section-title" style="color:#fff;border-color:var(--altin)">Türk Savaş Tarihi</div>
      <a href="<?php echo esc_url(home_url('/turk-savasi')); ?>" class="vkv-more-link" style="color:var(--altin2)">Tümü &#8250;</a>
    </div>
    <div class="vkv-sav-grid">
      <?php foreach ($savlar as $s): ?>
      <a href="<?php echo esc_url(home_url(isset($s['url']) ? $s['url'] : '/')); ?>" class="vkv-sav-item">
        <div class="vkv-sav-yil"><?php echo esc_html($s['yil']); ?></div>
        <div class="vkv-sav-ad"><?php echo esc_html($s['ad']); ?></div>
      </a>
      <?php endforeach; ?>
    </div>
  </div>
</div>
    <?php
}
/* ── Millî Günler ────────────────────────────────────── */
function vkv_fp_milli_gunler() {
    $gunler_raw = get_option('vkv_milli_gunler', '');
    if ($gunler_raw) $gunler = json_decode($gunler_raw, true);
    if (empty($gunler) || !is_array($gunler)) {
        $gunler = array(
            array('tarih'=>'18 Mart', 'baslik'=>'Çanakkale Zaferi ve Şehitleri Anma Günü', 'url'=>'/canakkale-savasi'),
            array('tarih'=>'23 Nisan','baslik'=>'Ulusal Egemenlik ve Çocuk Bayramı',       'url'=>'/milli-gunler'),
            array('tarih'=>'19 Mayıs','baslik'=>'Gençlik ve Spor Bayramı',                 'url'=>'/milli-gunler'),
            array('tarih'=>'15 Temmuz','baslik'=>'Demokrasi ve Millî Birlik Günü',          'url'=>'/milli-gunler'),
            array('tarih'=>'30 Ağustos','baslik'=>'Zafer Bayramı',                          'url'=>'/milli-gunler'),
            array('tarih'=>'29 Ekim',  'baslik'=>'Cumhuriyet Bayramı',                      'url'=>'/milli-gunler'),
            array('tarih'=>'10 Kasım', 'baslik'=>"Atatürk'ü Anma Günü",                    'url'=>'/ataturk'),
            array('tarih'=>'24 Kasım', 'baslik'=>'Öğretmenler Günü',                        'url'=>'/milli-gunler'),
        );
    }
    ?>
<style>
.vkv-milli{background:var(--bg2,#fff5f5);padding:40px 20px}
.vkv-milli-w{max-width:1440px;margin:0 auto}
.vkv-milli-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:20px}
.vkv-milli-kart{background:#fff;border:1px solid var(--sin);padding:18px;text-decoration:none;transition:all .2s;display:block;border-top:3px solid var(--cr)}
.vkv-milli-kart:hover{border-top-color:var(--altin);transform:translateY(-2px);box-shadow:0 4px 16px rgba(139,26,26,.12)}
.vkv-milli-tarih{font-family:var(--fh);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--cr);margin-bottom:8px}
.vkv-milli-baslik{font-family:var(--fh);font-size:13px;font-weight:600;color:var(--dk);line-height:1.4}
.vkv-milli-kart:hover .vkv-milli-baslik{color:var(--cr)}
@media(max-width:1100px){.vkv-milli-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:600px){.vkv-milli-grid{grid-template-columns:1fr}}
</style>
<div class="vkv-milli">
  <div class="vkv-milli-w">
    <div class="vkv-section-head">
      <div class="vkv-section-title">Millî Günler &amp; Anma Törenleri</div>
      <a href="<?php echo esc_url(home_url('/milli-gunler')); ?>" class="vkv-more-link">Tüm Takvim &#8250;</a>
    </div>
    <div class="vkv-milli-grid">
      <?php foreach ($gunler as $g): ?>
      <a href="<?php echo esc_url(home_url(isset($g['url']) ? $g['url'] : '/')); ?>" class="vkv-milli-kart">
        <div class="vkv-milli-tarih"><?php echo esc_html($g['tarih']); ?></div>
        <div class="vkv-milli-baslik"><?php echo esc_html($g['baslik']); ?></div>
      </a>
      <?php endforeach; ?>
    </div>
  </div>
</div>
    <?php
}
/* ── Atatürk Bandı ───────────────────────────────────── */
function vkv_fp_ataturk_bandi() {
    $soz = get_option('vkv_ataturk_bandi_soz', "Ne mutlu Türk'üm diyene!");
    $linkler = array(
        array('&#128367;','Hayatı',   '/ataturk-hayati'),
        array('&#9993;',  'İlkeleri', '/ataturk-ilkeler'),
        array('&#128172;','Sözleri',  '/ataturk-sozleri'),
        array('&#127963;','Köşesi',   '/ataturk'),
    );
    ?>
<style>
.vkv-at-band{background:linear-gradient(135deg,#1a0a0a,var(--dk2));padding:28px 20px;position:relative;overflow:hidden}
.vkv-at-band-w{max-width:1440px;margin:0 auto;display:flex;align-items:center;gap:24px;flex-wrap:wrap;position:relative;z-index:1}
.vkv-at-soz{flex:1;min-width:250px}
.vkv-at-soz blockquote{font-family:var(--fh);font-size:1.3rem;font-style:italic;color:rgba(255,255,255,.8);margin:0;line-height:1.5}
.vkv-at-soz cite{display:block;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--altin2);margin-top:8px;font-style:normal}
.vkv-at-linkler{display:flex;gap:8px;flex-wrap:wrap;flex-shrink:0}
.vkv-at-link{display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 16px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);color:#fff;text-decoration:none;transition:all .2s;min-width:74px}
.vkv-at-link:hover{background:var(--cr);border-color:var(--cr)}
.vkv-at-link-ikon{font-size:1.4rem}
.vkv-at-link-label{font-family:var(--fh);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
</style>
<div class="vkv-at-band">
  <div class="vkv-at-band-w">
    <div class="vkv-at-soz">
      <blockquote>"<?php echo esc_html($soz); ?>"<cite>&#8212; Mustafa Kemal ATATÜRK</cite></blockquote>
    </div>
    <div class="vkv-at-linkler">
      <?php foreach ($linkler as $l): ?>
      <a href="<?php echo esc_url(home_url($l[2])); ?>" class="vkv-at-link">
        <span class="vkv-at-link-ikon"><?php echo $l[0]; ?></span>
        <span class="vkv-at-link-label"><?php echo esc_html($l[1]); ?></span>
      </a>
      <?php endforeach; ?>
    </div>
  </div>
</div>
    <?php
}
/* ── Hizmetler ───────────────────────────────────────── */
function vkv_fp_hizmetler() {
    $hizmetler_raw = get_option('vkv_hizmetler', '');
    if ($hizmetler_raw) $hizmetler = json_decode($hizmetler_raw, true);
    if (empty($hizmetler) || !is_array($hizmetler)) {
        $hizmetler = array(
            array('ikon'=>'&#127894;','baslik'=>'Şehit Gazi Hakları','aciklama'=>'Hukuki danışmanlık.','url'=>'/sehit-gazi-haklari'),
            array('ikon'=>'&#9878;', 'baslik'=>'Hukuk & Savunuculuk','aciklama'=>'Hukuki destek.','url'=>'/hukuk-savunuculuk'),
            array('ikon'=>'&#127891;','baslik'=>'Burs Programı',     'aciklama'=>'Eğitim bursu.',  'url'=>'/burs'),
            array('ikon'=>'&#129309;','baslik'=>'İnsani Yardım',     'aciklama'=>'Temel ihtiyaç.', 'url'=>'/insani-yardim'),
            array('ikon'=>'&#128506;','baslik'=>'Hizmet Bölgeleri',  'aciklama'=>'Tüm Türkiye.',   'url'=>'/hizmet-bolgesi'),
            array('ikon'=>'&#128197;','baslik'=>'Faaliyetler',       'aciklama'=>'Etkinlikler.',   'url'=>'/faaliyetler'),
        );
    }
    ?>
<style>
.vkv-hiz{background:var(--dk);padding:44px 20px}
.vkv-hiz-w{max-width:1440px;margin:0 auto}
.vkv-hiz-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(255,255,255,.07);margin-top:20px}
.vkv-hiz-kart{background:var(--dk2);padding:24px;text-decoration:none;transition:all .2s;display:block}
.vkv-hiz-kart:hover{background:var(--cr2)}
.vkv-hiz-ikon{font-size:2rem;margin-bottom:12px}
.vkv-hiz-baslik{font-family:var(--fh);font-size:14px;font-weight:700;color:#fff;margin-bottom:6px;text-transform:uppercase;letter-spacing:.4px}
.vkv-hiz-aciklama{font-size:12px;color:rgba(255,255,255,.45);line-height:1.6}
.vkv-hiz-kart:hover .vkv-hiz-aciklama{color:rgba(255,255,255,.7)}
@media(max-width:900px){.vkv-hiz-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:600px){.vkv-hiz-grid{grid-template-columns:1fr}}
</style>
<div class="vkv-hiz">
  <div class="vkv-hiz-w">
    <div class="vkv-section-head" style="--sh-c:#fff">
      <div class="vkv-section-title" style="color:#fff;border-color:var(--altin)">Hizmetlerimiz</div>
      <a href="<?php echo esc_url(home_url('/faaliyetler')); ?>" class="vkv-more-link" style="color:var(--altin2)">Tümü &#8250;</a>
    </div>
    <div class="vkv-hiz-grid">
      <?php foreach ($hizmetler as $h): ?>
      <a href="<?php echo esc_url(home_url(isset($h['url']) ? $h['url'] : '/')); ?>" class="vkv-hiz-kart">
        <div class="vkv-hiz-ikon"><?php echo $h['ikon']; ?></div>
        <div class="vkv-hiz-baslik"><?php echo esc_html($h['baslik']); ?></div>
        <div class="vkv-hiz-aciklama"><?php echo esc_html($h['aciklama']); ?></div>
      </a>
      <?php endforeach; ?>
    </div>
  </div>
</div>
    <?php
}
/* ── DSV Anasayfa ────────────────────────────────────── */
function vkv_fp_blok_dsv_anasayfa() {
    if (function_exists('vkv_fp_slider')) vkv_fp_slider();
    /* DSV — Hizmet kategorileri bandı */
    $dsv_hizmetler = array(
        array('ikon'=>'fa-kit-medical',    'baslik'=>'Temel Sağlık',         'url'=>'/saglik-hizmetleri'),
        array('ikon'=>'fa-syringe',        'baslik'=>'Aşı & Bağışıklama',   'url'=>'/saglik-hizmetleri'),
        array('ikon'=>'fa-virus',          'baslik'=>'Bulaşıcı Hastalıklar','url'=>'/saglik-hizmetleri'),
        array('ikon'=>'fa-head-side-mask', 'baslik'=>'Salgın Hastalıklar',  'url'=>'/saglik-hizmetleri'),
        array('ikon'=>'fa-chalkboard-user','baslik'=>'Halk Sağlığı Eğitimi','url'=>'/saglik-hizmetleri'),
        array('ikon'=>'fa-truck-medical',  'baslik'=>'Acil Durum Yardımı',  'url'=>'/saglik-hizmetleri'),
        array('ikon'=>'fa-microscope',     'baslik'=>'Sağlık Araştırmaları','url'=>'/saglik-hizmetleri'),
    );
    ?>
<style>
/* DSV Hizmet Kategorileri Bandı */
.dsv-hizmet-band{background:var(--dk,#0c1a2e);padding:18px 0}
.dsv-hizmet-band-w{max-width:1440px;margin:0 auto;padding:0 20px;display:flex;gap:0;overflow-x:auto;scrollbar-width:none}
.dsv-hizmet-band-w::-webkit-scrollbar{display:none}
.dsv-hizmet-item{flex:1;min-width:120px;display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px 10px;text-decoration:none;color:rgba(255,255,255,.55);border-right:1px solid rgba(255,255,255,.07);transition:all .2s;text-align:center}
.dsv-hizmet-item:last-child{border-right:none}
.dsv-hizmet-item:hover{color:#fff;background:rgba(255,255,255,.05)}
.dsv-hizmet-item i{font-size:20px;color:var(--altin2,#06B6D4)}
.dsv-hizmet-item span{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;line-height:1.3}
/* DSV Haberler bölümü */
.dsv-haberler-ust{background:var(--bg,#f0f9ff);padding:40px 20px}
.dsv-haberler-w{max-width:1440px;margin:0 auto}
.dsv-section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:10px}
.dsv-section-header h2{font-family:var(--fh,'Oswald',sans-serif);font-size:1.4rem;font-weight:700;color:var(--yz,#0c1a2e);margin:0;display:flex;align-items:center;gap:8px}
.dsv-section-header h2::before{content:'';display:block;width:4px;height:22px;background:var(--cr,#0369A1);border-radius:2px}
.dsv-more-link{font-size:12px;font-weight:700;color:var(--cr,#0369A1);text-decoration:none;letter-spacing:.5px;text-transform:uppercase;display:flex;align-items:center;gap:4px}
.dsv-more-link:hover{color:var(--cr2,#075985)}
/* DSV Tehditler bandı */
.dsv-tehdit{background:#fff;padding:32px 20px;border-top:1px solid var(--sin,#BAE6FD)}
.dsv-tehdit-w{max-width:1440px;margin:0 auto}
.dsv-tehdit-item{display:flex;align-items:flex-start;gap:12px;padding:14px 0;border-bottom:1px solid var(--sin,#BAE6FD)}
.dsv-tehdit-item:last-child{border-bottom:none}
.dsv-tehdit-yil{font-family:var(--fh);font-size:11px;font-weight:700;color:var(--cr,#0369A1);min-width:48px}
.dsv-tehdit-baslik{font-size:13.5px;font-weight:600;color:var(--yz,#0c1a2e);text-decoration:none;transition:color .2s}
.dsv-tehdit-baslik:hover{color:var(--cr,#0369A1)}
.dsv-tehdit-exc{font-size:12px;color:var(--yz3,#64748b);line-height:1.6;margin-top:2px}
/* DSV Dünya Sağlık Günleri */
.dsv-gunler{background:var(--bg2,#e0f2fe);padding:40px 20px}
.dsv-gunler-w{max-width:1440px;margin:0 auto}
.dsv-gunler-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:20px}
.dsv-gun-kart{background:#fff;border-radius:6px;padding:18px 16px;text-align:center;border-top:3px solid var(--cr,#0369A1)}
.dsv-gun-tarih{font-family:var(--fh);font-size:1.2rem;font-weight:700;color:var(--cr,#0369A1)}
.dsv-gun-ad{font-size:11px;font-weight:700;color:var(--yz2,#1e3a5f);margin-top:4px;line-height:1.4}
/* DSV Hizmetlerimiz grid */
.dsv-hiz-grid{background:#fff;padding:48px 20px}
.dsv-hiz-w{max-width:1440px;margin:0 auto}
.dsv-hiz-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:28px}
.dsv-hiz-kart{border:1px solid var(--sin,#BAE6FD);border-radius:8px;padding:28px 24px;text-align:center;text-decoration:none;display:block;transition:all .2s;position:relative;overflow:hidden}
.dsv-hiz-kart::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--cr,#0369A1),var(--cr3,#0EA5E9))}
.dsv-hiz-kart:hover{box-shadow:0 8px 24px rgba(3,105,161,.15);transform:translateY(-3px)}
.dsv-hiz-kart i{font-size:2rem;color:var(--cr,#0369A1);margin-bottom:14px;display:block}
.dsv-hiz-kart h3{font-family:var(--fh);font-size:14px;font-weight:700;color:var(--yz,#0c1a2e);margin:0 0 6px}
.dsv-hiz-kart p{font-size:12px;color:var(--yz3,#64748b);margin:0;line-height:1.7}
/* DSV Bağış bölümü */
.dsv-bagis-blok{background:linear-gradient(135deg,var(--dk,#0c1a2e),var(--cr2,#075985));padding:56px 20px}
.dsv-bagis-w{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:1fr 380px;gap:48px;align-items:center}
.dsv-bagis-sol h2{font-family:var(--fh);font-size:clamp(1.5rem,3vw,2.2rem);font-weight:700;color:#fff;margin:0 0 12px}
.dsv-bagis-sol p{font-size:14px;color:rgba(255,255,255,.65);line-height:1.8;max-width:540px}
.dsv-bagis-sayac{display:flex;gap:24px;margin-top:24px}
.dsv-bagis-sayac-item{text-align:center}
.dsv-bagis-sayac-sayi{font-family:var(--fh);font-size:1.8rem;font-weight:800;color:var(--altin2,#06B6D4)}
.dsv-bagis-sayac-label{font-size:10px;color:rgba(255,255,255,.45);text-transform:uppercase;letter-spacing:.8px}
.dsv-bagis-form{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:28px 24px;backdrop-filter:blur(8px)}
.dsv-bagis-form-h{font-family:var(--fh);font-size:13px;font-weight:700;color:rgba(255,255,255,.6);letter-spacing:1px;text-transform:uppercase;margin-bottom:16px}
.dsv-miktar-btns{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
.dsv-miktar-btn{padding:8px 16px;border:1px solid rgba(255,255,255,.2);background:transparent;color:rgba(255,255,255,.7);font-family:var(--fh);font-size:13px;font-weight:600;cursor:pointer;border-radius:4px;transition:all .2s}
.dsv-miktar-btn.aktif,.dsv-miktar-btn:hover{background:var(--cr,#0369A1);border-color:var(--cr,#0369A1);color:#fff}
.dsv-bagis-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-family:var(--fh);font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;padding:14px 20px;text-decoration:none;border-radius:4px;margin-top:8px;transition:all .2s}
.dsv-bagis-btn:hover{background:linear-gradient(135deg,#059669,#047857)}
.dsv-iban-info{margin-top:12px;font-size:11px;color:rgba(255,255,255,.35);text-align:center;line-height:1.6}
@media(max-width:900px){
  .dsv-hizmet-item{min-width:100px}
  .dsv-gunler-grid{grid-template-columns:repeat(2,1fr)}
  .dsv-hiz-cards{grid-template-columns:1fr 1fr}
  .dsv-bagis-w{grid-template-columns:1fr}
  .dsv-bagis-sayac{gap:16px}
}
@media(max-width:600px){
  .dsv-hiz-cards{grid-template-columns:1fr}
  .dsv-gunler-grid{grid-template-columns:repeat(2,1fr)}
}
</style>
<!-- Hizmet Kategorileri Bandı -->
<div class="dsv-hizmet-band">
  <div class="dsv-hizmet-band-w">
    <?php foreach ($dsv_hizmetler as $hiz): ?>
    <a href="<?php echo esc_url(home_url($hiz['url'])); ?>" class="dsv-hizmet-item">
      <i class="fa <?php echo esc_attr($hiz['ikon']); ?>"></i>
      <span><?php echo esc_html($hiz['baslik']); ?></span>
    </a>
    <?php endforeach; ?>
  </div>
</div>
<?php
/* Haberler modülü */
if (function_exists('vkv_fp_haberler')) vkv_fp_haberler();
/* Küresel Sağlık Tehditleri — son yazılar */
$dsv_tehdit_posts = get_posts(array('post_type'=>'post','posts_per_page'=>4,'post_status'=>'publish','orderby'=>'date','order'=>'DESC'));
if (!empty($dsv_tehdit_posts)): ?>
<div class="dsv-tehdit">
  <div class="dsv-tehdit-w">
    <div class="dsv-section-header">
      <h2>🌐 Küresel Sağlık Tehditleri</h2>
      <a href="<?php echo esc_url(home_url('/dsv-haberler')); ?>" class="dsv-more-link">Tüm Haber ve Kayıtlar »</a>
    </div>
    <?php foreach ($dsv_tehdit_posts as $tp): ?>
    <div class="dsv-tehdit-item">
      <span class="dsv-tehdit-yil"><?php echo esc_html(get_the_date('Y',$tp)); ?></span>
      <div>
        <a href="<?php echo esc_url(get_permalink($tp)); ?>" class="dsv-tehdit-baslik"><?php echo esc_html($tp->post_title); ?></a>
        <div class="dsv-tehdit-exc"><?php echo esc_html(wp_trim_words($tp->post_excerpt ?: strip_tags($tp->post_content), 14, '...')); ?></div>
      </div>
    </div>
    <?php endforeach; ?>
  </div>
</div>
<?php endif; ?>
<!-- Dünya Sağlık Günleri -->
<div class="dsv-gunler">
  <div class="dsv-gunler-w">
    <div class="dsv-section-header">
      <h2>📅 Dünya Sağlık Günleri</h2>
    </div>
    <div class="dsv-gunler-grid">
      <?php
      $dsv_gunler = array(
        array('tarih'=>'7 Nisan',    'ad'=>'Dünya Sağlık Günü'),
        array('tarih'=>'31 Mayıs',   'ad'=>'Dünya Tütünsüz Günü'),
        array('tarih'=>'14 Haziran', 'ad'=>'Dünya Kan Bağışçıları Günü'),
        array('tarih'=>'29 Eylül',   'ad'=>'Dünya Kalp Günü'),
        array('tarih'=>'29 Eylül',   'ad'=>'Dünya Kalp Günü'),
        array('tarih'=>'14 Kasım',   'ad'=>'Dünya Diyabet Günü'),
        array('tarih'=>'14 Kasım',   'ad'=>'Dünya Diyabet Günü'),
        array('tarih'=>'1 Aralık',   'ad'=>'Dünya AIDS Günü'),
      );
      /* Benzersiz al */
      $goster = array(); $gorulen = array();
      foreach ($dsv_gunler as $g) { $k=$g['tarih'].$g['ad']; if(!in_array($k,$gorulen)){$goster[]=$g;$gorulen[]=$k;} }
      foreach ($goster as $g): ?>
      <div class="dsv-gun-kart">
        <div class="dsv-gun-tarih"><?php echo esc_html($g['tarih']); ?></div>
        <div class="dsv-gun-ad"><?php echo esc_html($g['ad']); ?></div>
      </div>
      <?php endforeach; ?>
    </div>
  </div>
</div>
<!-- Hizmetlerimiz -->
<?php
$dsv_hiz_cards = array(
  array('fa-syringe',       'Aşılama Hizmetleri',       'Aşılama hizmetlerimizden yararlanın.', '/saglik-hizmetleri'),
  array('fa-droplet',       'Temiz Su Erişimi',          'Temiz su erişimi sağlıyoruz.',         '/saglik-hizmetleri'),
  array('fa-kit-medical',   'Tıbbi Yardım',              'Tıbbi ekibimiz 7/24 yardım için.',     '/saglik-hizmetleri'),
  array('fa-heart-pulse',   'Halk Sağlığı Eğitimi',      'Halk sağlığı eğitimi sunuyoruz.',      '/saglik-hizmetleri'),
  array('fa-microscope',    'Medikal Araştırmalar',      'Medikal araştırmalar yürütüyoruz.',    '/dsv-projeler'),
  array('fa-truck-medical', 'Acil Müdahale',             'Ambulans ve acil ekipman desteği.',    '/saglik-hizmetleri'),
); ?>
<div class="dsv-hiz-grid">
  <div class="dsv-hiz-w">
    <div class="dsv-section-header">
      <h2>🤝 Hizmetlerimiz</h2>
      <a href="<?php echo esc_url(home_url('/saglik-hizmetleri')); ?>" class="dsv-more-link">Tüm Sağlık Hizmetleri için »</a>
    </div>
    <div class="dsv-hiz-cards">
      <?php foreach ($dsv_hiz_cards as $hk): ?>
      <a href="<?php echo esc_url(home_url($hk[3])); ?>" class="dsv-hiz-kart">
        <i class="fa <?php echo esc_attr($hk[0]); ?>"></i>
        <h3><?php echo esc_html($hk[1]); ?></h3>
        <p><?php echo esc_html($hk[2]); ?></p>
      </a>
      <?php endforeach; ?>
    </div>
  </div>
</div>
<!-- Bağış Bölümü -->
<?php
$dsv_bagis_url   = get_theme_mod('vkv_bagis_url', get_theme_mod('tema_bagis_url', 'https://donate.stripe.com/14A6oHgabdwQghN8xAb3q07'));
$dsv_iban        = get_option('vkv_iban_opt', get_theme_mod('tema_iban', 'TR49 0001 0012 6298 0865 4750 01'));
$dsv_banka       = get_option('vkv_banka_adi_opt', get_theme_mod('tema_banka', 'Ziraat Bankası'));
?>
<div class="dsv-bagis-blok">
  <div class="dsv-bagis-w">
    <div class="dsv-bagis-sol">
      <h2>Daha Sağlıklı Bir Gelecek İçin Destek Olun</h2>
      <p>Dünya Sağlık Vakfı olarak herkes için erişilebilir sağlık hizmetlerini destekleyen küresel sağlık projelerine katkı sağlamanızı bekliyoruz.</p>
      <div class="dsv-bagis-sayac">
        <div class="dsv-bagis-sayac-item">
          <div class="dsv-bagis-sayac-sayi"><?php echo esc_html(get_option('vkv_istatistik_1','10TL')); ?></div>
          <div class="dsv-bagis-sayac-label"><?php echo esc_html(get_option('vkv_istatistik_1_label','En Az')); ?></div>
        </div>
        <div class="dsv-bagis-sayac-item">
          <div class="dsv-bagis-sayac-sayi"><?php echo esc_html(get_option('vkv_istatistik_2','25TL')); ?></div>
          <div class="dsv-bagis-sayac-label"><?php echo esc_html(get_option('vkv_istatistik_2_label','Günlük Etki')); ?></div>
        </div>
        <div class="dsv-bagis-sayac-item">
          <div class="dsv-bagis-sayac-sayi"><?php echo esc_html(get_option('vkv_istatistik_3','500+')); ?></div>
          <div class="dsv-bagis-sayac-label"><?php echo esc_html(get_option('vkv_istatistik_3_label','Bağışçı')); ?></div>
        </div>
      </div>
    </div>
    <div class="dsv-bagis-form">
      <div class="dsv-bagis-form-h">&#x1F4B5; Sağlık Etki İçin</div>
      <div class="dsv-miktar-btns">
        <button type="button" class="dsv-miktar-btn">10TL</button>
        <button type="button" class="dsv-miktar-btn aktif">25TL</button>
        <button type="button" class="dsv-miktar-btn">100TL</button>
      </div>
      <a href="<?php echo esc_url($dsv_bagis_url); ?>" target="_blank" rel="noopener" class="dsv-bagis-btn">
        &#x2705; Güvenli Bağış Yap
      </a>
      <div class="dsv-iban-info">
        <?php echo esc_html($dsv_banka); ?><br>
        IBAN: <?php echo esc_html($dsv_iban); ?>
      </div>
    </div>
  </div>
</div>
<script>
/* DSV bağış miktar seçici */
document.querySelectorAll('.dsv-miktar-btn').forEach(function(btn){
  btn.addEventListener('click',function(){
    document.querySelectorAll('.dsv-miktar-btn').forEach(function(b){b.classList.remove('aktif');});
    this.classList.add('aktif');
  });
});
</script>
    <?php
    if (function_exists('vkv_fp_makaleler_tabs')) vkv_fp_makaleler_tabs();
    if (function_exists('vkv_fp_soz_band')) vkv_fp_soz_band();
}

function vkv_fp_blok_tukav_anasayfa() {
    if (function_exists('vkv_fp_slider')) vkv_fp_slider();
    if (function_exists('vkv_fp_haberler')) vkv_fp_haberler();
    ?>
<style>
.tk-about{max-width:1280px;margin:0 auto;padding:56px 20px;display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
.tk-eyebrow{font-family:var(--fh);font-size:10px;letter-spacing:3px;font-weight:700;text-transform:uppercase;color:var(--altin2);margin-bottom:10px}
.tk-h{font-family:var(--fh);font-size:clamp(1.6rem,3vw,2.4rem);font-weight:700;color:var(--yz);line-height:1.15;margin-bottom:8px}
.tk-p{font-size:14px;color:var(--yz3,#9A7070);line-height:1.8;max-width:620px}
.tk-btn{display:inline-flex;align-items:center;gap:8px;background:var(--cr);color:#fff;font-family:var(--fh);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;padding:11px 26px;text-decoration:none;margin-top:20px;transition:all .2s}
.tk-btn:hover{background:var(--cr2)}
.tk-stat{background:var(--dk);padding:36px 20px}
.tk-stat-w{max-width:1280px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:rgba(255,255,255,.06)}
.tk-stat-item{background:var(--dk2);padding:28px 20px;text-align:center}
.tk-stat-sayi{font-family:var(--fh);font-size:2.2rem;font-weight:700;color:var(--altin2);line-height:1}
.tk-stat-label{font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,.45);margin-top:8px}
@media(max-width:900px){.tk-about{grid-template-columns:1fr}.tk-stat-w{grid-template-columns:repeat(2,1fr)}}
</style>
<section style="background:var(--bg)">
  <div class="tk-about">
    <div>
      <div class="tk-eyebrow">Hakkımızda</div>
      <h2 class="tk-h"><?php echo esc_html(get_option('vkv_org_adi', get_bloginfo('name'))); ?></h2>
      <p class="tk-p"><?php echo esc_html(get_option('vkv_org_aciklama',
        'Türk kültürünü araştırıyor, tanıtıyor ve gelecek nesillere aktarıyoruz.')); ?></p>
      <a href="<?php echo esc_url(home_url('/hakkimizda')); ?>" class="tk-btn">Daha Fazla &#8250;</a>
    </div>
    <div>
      <div class="tk-stat-w" style="background:transparent">
        <div class="tk-stat-item" style="background:var(--bg);border:1px solid var(--sin)">
          <div class="tk-stat-sayi" style="color:var(--cr)"><?php echo esc_html(get_option('vkv_istatistik_1','50+')); ?></div>
          <div class="tk-stat-label" style="color:var(--yz3,#9A7070)"><?php echo esc_html(get_option('vkv_istatistik_1_label','Yıllık Deneyim')); ?></div>
        </div>
        <div class="tk-stat-item" style="background:var(--bg);border:1px solid var(--sin)">
          <div class="tk-stat-sayi" style="color:var(--cr)"><?php echo esc_html(get_option('vkv_istatistik_2','1000+')); ?></div>
          <div class="tk-stat-label" style="color:var(--yz3,#9A7070)"><?php echo esc_html(get_option('vkv_istatistik_2_label','Tamamlanan Proje')); ?></div>
        </div>
      </div>
    </div>
  </div>
</section>
<div class="tk-stat">
  <div class="tk-stat-w">
    <div class="tk-stat-item"><div class="tk-stat-sayi"><?php echo esc_html(get_option('vkv_istatistik_1','50+')); ?></div><div class="tk-stat-label">Yıllık Deneyim</div></div>
    <div class="tk-stat-item"><div class="tk-stat-sayi"><?php echo esc_html(get_option('vkv_istatistik_2','1K+')); ?></div><div class="tk-stat-label">Proje</div></div>
    <div class="tk-stat-item"><div class="tk-stat-sayi"><?php echo esc_html(get_option('vkv_istatistik_3','81')); ?></div><div class="tk-stat-label">İl</div></div>
    <div class="tk-stat-item"><div class="tk-stat-sayi"><?php echo esc_html(get_option('vkv_istatistik_4','10K+')); ?></div><div class="tk-stat-label">Üye</div></div>
  </div>
</div>
    <?php
    if (function_exists('vkv_fp_milli_gunler')) vkv_fp_milli_gunler();
    if (function_exists('vkv_fp_soz_band'))     vkv_fp_soz_band();
    if (function_exists('vkv_fp_bagis'))         vkv_fp_bagis();
}
/* ── Etkinlikler (opsiyonel modül) ──────────────────── */
function vkv_fp_etkinlikler() {
    $etkinlikler_raw = get_option('vkv_etkinlikler', '');
    if ($etkinlikler_raw) $et = json_decode($etkinlikler_raw, true);
    if (empty($et) || !is_array($et)) {
        $et = array(
            array('tarih'=>'15 Nisan 2026','baslik'=>'Şehit Aileleri Buluşması','yer'=>'Ankara'),
            array('tarih'=>'19 Mayıs 2026','baslik'=>'Gençlik Bayramı Töreni',  'yer'=>'İstanbul'),
            array('tarih'=>'30 Ağustos 2026','baslik'=>'Zafer Bayramı Anması',   'yer'=>'İzmir'),
        );
    }
    ?>
<style>
.vkv-etk{background:var(--bg);padding:40px 20px}
.vkv-etk-w{max-width:1440px;margin:0 auto}
.vkv-etk-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:20px}
.vkv-etk-kart{background:#fff;border:1px solid var(--sin);border-left:4px solid var(--cr);padding:20px;text-decoration:none;display:block;transition:all .2s}
.vkv-etk-kart:hover{box-shadow:0 4px 16px rgba(139,26,26,.1);transform:translateY(-2px)}
.vkv-etk-tarih{font-family:var(--fh);font-size:10px;font-weight:700;letter-spacing:2px;color:var(--cr);text-transform:uppercase;margin-bottom:6px}
.vkv-etk-h{font-family:var(--fh);font-size:14px;font-weight:600;color:var(--dk);line-height:1.4;margin-bottom:4px}
.vkv-etk-yer{font-size:11px;color:var(--yz3,#9A7070)}
@media(max-width:900px){.vkv-etk-grid{grid-template-columns:1fr}}
</style>
<div class="vkv-etk">
  <div class="vkv-etk-w">
    <div class="vkv-section-head">
      <div class="vkv-section-title">Yaklaşan Etkinlikler</div>
      <a href="<?php echo esc_url(home_url('/etkinlikler')); ?>" class="vkv-more-link">Tümü &#8250;</a>
    </div>
    <div class="vkv-etk-grid">
      <?php foreach ($et as $e): ?>
      <div class="vkv-etk-kart">
        <div class="vkv-etk-tarih"><?php echo esc_html($e['tarih']); ?></div>
        <div class="vkv-etk-h"><?php echo esc_html($e['baslik']); ?></div>
        <div class="vkv-etk-yer"><?php echo esc_html($e['yer']); ?></div>
      </div>
      <?php endforeach; ?>
    </div>
  </div>
</div>
    <?php
}
/* ── Duyurular (opsiyonel modül) ─────────────────────── */
function vkv_fp_duyurular() {
    $args = array('post_type'=>'post','posts_per_page'=>4,'post_status'=>'publish',
                  'category_name'=>'duyuru');
    $q = new WP_Query($args);
    if (!$q->have_posts()) return;
    ?>
<style>
.vkv-duy{background:var(--dk);padding:36px 20px}
.vkv-duy-w{max-width:1440px;margin:0 auto}
.vkv-duy-list{display:flex;flex-direction:column;gap:8px;margin-top:16px}
.vkv-duy-item{display:flex;align-items:center;gap:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);padding:14px 18px;text-decoration:none;transition:all .2s}
.vkv-duy-item:hover{background:rgba(255,255,255,.08);border-color:var(--cr3)}
.vkv-duy-tarih{font-family:var(--fh);font-size:10px;font-weight:700;letter-spacing:1px;color:var(--altin2);flex-shrink:0;min-width:80px}
.vkv-duy-title{font-family:var(--fh);font-size:13px;font-weight:600;color:#fff;flex:1}
</style>
<div class="vkv-duy">
  <div class="vkv-duy-w">
    <div class="vkv-section-head">
      <div class="vkv-section-title" style="color:#fff;border-color:var(--altin)">Duyurular</div>
    </div>
    <div class="vkv-duy-list">
      <?php while ($q->have_posts()) { $q->the_post(); ?>
      <a href="<?php the_permalink(); ?>" class="vkv-duy-item">
        <span class="vkv-duy-tarih"><?php echo get_the_date('j M Y'); ?></span>
        <span class="vkv-duy-title"><?php the_title(); ?></span>
      </a>
      <?php } wp_reset_postdata(); ?>
    </div>
  </div>
</div>
    <?php
}

/* ── Makaleler 8-Tab Bölümü (DSV + VKD anasayfa) ────── */
function vkv_fp_makaleler_tabs() {
    /* 8 tab — sağlık kategorileri */
    $tabs = array(
        array('slug'=>'',                    'etiket'=>'Son Makaleler',    'emoji'=>'📋'),
        array('slug'=>'ansiklopedi',          'etiket'=>'Ansiklopedi',      'emoji'=>'📖'),
        array('slug'=>'kuresel-saglik',       'etiket'=>'Küresel Sağlık',  'emoji'=>'🌍'),
        array('slug'=>'bulasici-hastaliklar', 'etiket'=>'Bulaşıcı Hast.',  'emoji'=>'🦠'),
        array('slug'=>'ruh-sagligi',          'etiket'=>'Ruh Sağlığı',     'emoji'=>'🧠'),
        array('slug'=>'beslenme',             'etiket'=>'Beslenme',        'emoji'=>'🥦'),
        array('slug'=>'cocuk-sagligi',        'etiket'=>'Çocuk Sağlığı',   'emoji'=>'👶'),
        array('slug'=>'cevre-sagligi',        'etiket'=>'Çevre & Sağlık',  'emoji'=>'🌿'),
    );

    /* Makaleler sayfası URL */
    $mak_page = get_page_by_path('makaleler');
    $mak_url  = $mak_page ? get_permalink($mak_page->ID) : home_url('/makaleler');
    ?>
<style>
.fp-mak{background:var(--bg,#f0f9ff);padding:48px 0}
.fp-mak-w{max-width:1440px;margin:0 auto;padding:0 20px}
.fp-mak-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px}
.fp-mak-head h2{font-family:var(--fh);font-size:1.4rem;font-weight:700;color:var(--yz,#0c1a2e);margin:0;display:flex;align-items:center;gap:8px}
.fp-mak-head h2::before{content:'';display:block;width:4px;height:22px;background:var(--cr,#0369a1);border-radius:2px;flex-shrink:0}
.fp-mak-more{font-size:12px;font-weight:700;color:var(--cr,#0369a1);text-decoration:none;text-transform:uppercase;letter-spacing:.5px;display:flex;align-items:center;gap:4px}
.fp-mak-more:hover{color:var(--cr2,#075985)}
/* Tabs */
.fp-mak-tabs{display:flex;gap:0;border-bottom:2px solid var(--sin,#BAE6FD);margin-bottom:24px;overflow-x:auto;scrollbar-width:none}
.fp-mak-tabs::-webkit-scrollbar{display:none}
.fp-mak-tab{padding:10px 16px;font-family:var(--fh);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--yz3,#64748b);cursor:pointer;border-bottom:3px solid transparent;white-space:nowrap;transition:all .2s;background:none;border-top:none;border-left:none;border-right:none;display:flex;align-items:center;gap:4px}
.fp-mak-tab:hover{color:var(--cr,#0369a1)}
.fp-mak-tab.aktif{color:var(--cr,#0369a1);border-bottom-color:var(--cr,#0369a1)}
/* Cards */
.fp-mak-panel{display:none}.fp-mak-panel.aktif{display:block}
.fp-mak-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.fp-mk{background:#fff;border:1px solid var(--sin,#BAE6FD);border-radius:6px;overflow:hidden;text-decoration:none;display:block;transition:all .2s;position:relative}
.fp-mk::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--cr,#0369a1),var(--altin2,#06B6D4))}
.fp-mk:hover{box-shadow:0 6px 20px rgba(3,105,161,.12);transform:translateY(-2px)}
.fp-mk-img{height:130px;background:linear-gradient(135deg,var(--cr2,#075985),var(--cr,#0369a1));overflow:hidden;display:flex;align-items:center;justify-content:center}
.fp-mk-img img{width:100%;height:100%;object-fit:cover}
.fp-mk-img-ph{font-size:2rem;opacity:.5;color:#fff}
.fp-mk-body{padding:14px}
.fp-mk-cat{font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--cr,#0369a1);margin-bottom:5px}
.fp-mk-title{font-family:var(--fh);font-size:13px;font-weight:700;color:var(--yz,#0c1a2e);line-height:1.4;margin-bottom:6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.fp-mk-exc{font-size:11.5px;color:var(--yz2,#1e3a5f);line-height:1.6;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.fp-mk-meta{font-size:10px;color:var(--yz3,#64748b);margin-top:8px;display:flex;align-items:center;gap:6px}
/* Loading */
.fp-mak-loading{text-align:center;padding:40px;color:var(--yz3)}
@media(max-width:1100px){.fp-mak-grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:760px){.fp-mak-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:480px){.fp-mak-grid{grid-template-columns:1fr}}
</style>
<section class="fp-mak">
  <div class="fp-mak-w">
    <div class="fp-mak-head">
      <h2>Sağlık Makaleleri</h2>
      <a href="<?php echo esc_url($mak_url); ?>" class="fp-mak-more">Tüm Makaleler →</a>
    </div>

    <!-- 8 Tab başlıkları -->
    <div class="fp-mak-tabs" id="fpMakTabs">
      <?php foreach ($tabs as $i => $t): ?>
      <button type="button" class="fp-mak-tab <?php echo $i===0?'aktif':''; ?>"
              data-tab="<?php echo esc_attr($i); ?>"
              data-slug="<?php echo esc_attr($t['slug']); ?>">
        <?php echo $t['emoji']; ?> <?php echo esc_html($t['etiket']); ?>
      </button>
      <?php endforeach; ?>
    </div>

    <!-- Panel container — AJAX ile doldurulur -->
    <div id="fpMakPanels">
      <!-- İlk tab statik olarak yüklenir -->
      <div class="fp-mak-panel aktif" data-panel="0">
        <?php
        $init_args = array(
            'post_type'      => 'post',
            'post_status'    => 'publish',
            'posts_per_page' => 8,
            'orderby'        => 'date',
            'order'          => 'DESC',
        );
        $init_q = new WP_Query($init_args);
        if ($init_q->have_posts()): ?>
        <div class="fp-mak-grid">
          <?php while ($init_q->have_posts()): $init_q->the_post();
            $cats   = get_the_category();
            $cat_nm = !empty($cats) ? $cats[0]->name : '';
            $thumb  = function_exists('tukav_get_thumb') ? tukav_get_thumb(get_the_ID(), 'medium') : get_the_post_thumbnail_url(get_the_ID(), 'medium');
            $exc    = wp_trim_words(get_the_excerpt() ?: strip_tags(get_the_content()), 14, '…');
          ?>
          <a href="<?php the_permalink(); ?>" class="fp-mk">
            <div class="fp-mk-img">
              <?php if ($thumb): ?><img src="<?php echo esc_url($thumb); ?>" alt="<?php echo esc_attr(get_the_title()); ?>" loading="lazy">
              <?php else: ?><div class="fp-mk-img-ph">🏥</div><?php endif; ?>
            </div>
            <div class="fp-mk-body">
              <?php if ($cat_nm): ?><div class="fp-mk-cat"><?php echo esc_html($cat_nm); ?></div><?php endif; ?>
              <div class="fp-mk-title"><?php the_title(); ?></div>
              <div class="fp-mk-exc"><?php echo esc_html($exc); ?></div>
              <div class="fp-mk-meta">📅 <?php echo get_the_date('d M Y'); ?></div>
            </div>
          </a>
          <?php endwhile; wp_reset_postdata(); ?>
        </div>
        <?php else: ?>
        <p style="text-align:center;color:var(--yz3);padding:30px">Henüz makale eklenmemiş.</p>
        <?php endif; ?>
      </div>
      <!-- Diğer panel'ler AJAX ile yüklenir -->
      <?php for ($pi = 1; $pi < count($tabs); $pi++): ?>
      <div class="fp-mak-panel" data-panel="<?php echo $pi; ?>"></div>
      <?php endfor; ?>
    </div>

  </div>
</section>
<script>
(function(){
  var tabs     = document.querySelectorAll('.fp-mak-tab');
  var panels   = document.querySelectorAll('.fp-mak-panel');
  var loaded   = {'0': true};
  var ajaxUrl  = '<?php echo esc_url(admin_url('admin-ajax.php')); ?>';
  var nonce    = '<?php echo wp_create_nonce('vkv_ajax'); ?>';
  var makUrl   = '<?php echo esc_url($mak_url); ?>';
  var tabSlugs = <?php echo json_encode(array_column($tabs, 'slug')); ?>;

  tabs.forEach(function(tab){
    tab.addEventListener('click', function(){
      var idx  = parseInt(this.dataset.tab);
      var slug = this.dataset.slug;

      /* Tab aktifleştir */
      tabs.forEach(function(t){t.classList.remove('aktif');});
      panels.forEach(function(p){p.classList.remove('aktif');});
      this.classList.add('aktif');
      var panel = document.querySelector('[data-panel="'+idx+'"]');
      if (panel) panel.classList.add('aktif');

      /* AJAX ile yükle */
      if (!loaded[idx] && panel) {
        loaded[idx] = true;
        panel.innerHTML = '<div class="fp-mak-loading">⏳ Yükleniyor…</div>';
        var formData = new FormData();
        formData.append('action', 'vkv_fp_mak_tab');
        formData.append('nonce',  nonce);
        formData.append('cat_slug', slug);
        fetch(ajaxUrl, { method:'POST', body: formData })
          .then(function(r){ return r.json(); })
          .then(function(d){
            if (d.success) panel.innerHTML = d.data.html;
            else panel.innerHTML = '<p style="text-align:center;color:var(--yz3);padding:30px">İçerik yüklenemedi.</p>';
          })
          .catch(function(){
            panel.innerHTML = '<p style="text-align:center;color:var(--yz3);padding:30px">Bağlantı hatası.</p>';
          });
      }
    });
  });
})();
</script>
    <?php
}

/* ── AJAX handler: Makale Tab İçeriği ──────────────── */
add_action('wp_ajax_vkv_fp_mak_tab',        'vkv_fp_mak_tab_ajax');
add_action('wp_ajax_nopriv_vkv_fp_mak_tab', 'vkv_fp_mak_tab_ajax');
function vkv_fp_mak_tab_ajax() {
    check_ajax_referer('vkv_ajax', 'nonce');
    if (function_exists('tema_ajax_rate_limit')) tema_ajax_rate_limit('fp_mak_tab', 60, 60);

    $cat_slug = sanitize_title($_POST['cat_slug'] ?? '');

    $args = array(
        'post_type'      => 'post',
        'post_status'    => 'publish',
        'posts_per_page' => 8,
        'orderby'        => 'date',
        'order'          => 'DESC',
        'no_found_rows'  => true,
    );
    if ($cat_slug) $args['category_name'] = $cat_slug;

    $q = new WP_Query($args);
    ob_start();
    if ($q->have_posts()):
    echo '<div class="fp-mak-grid">';
    while ($q->have_posts()): $q->the_post();
        $cats   = get_the_category();
        $cat_nm = !empty($cats) ? $cats[0]->name : '';
        $thumb  = function_exists('tukav_get_thumb') ? tukav_get_thumb(get_the_ID(), 'medium') : get_the_post_thumbnail_url(get_the_ID(), 'medium');
        $exc    = esc_html(wp_trim_words(get_the_excerpt() ?: strip_tags(get_the_content()), 14, '…'));
        $url    = esc_url(get_permalink());
        $title  = esc_html(get_the_title());
        $date   = esc_html(get_the_date('d M Y'));
        echo '<a href="'.$url.'" class="fp-mk">';
        echo '<div class="fp-mk-img">';
        if ($thumb) echo '<img src="'.esc_url($thumb).'" alt="'.$title.'" loading="lazy">';
        else echo '<div class="fp-mk-img-ph">🏥</div>';
        echo '</div>';
        echo '<div class="fp-mk-body">';
        if ($cat_nm) echo '<div class="fp-mk-cat">'.esc_html($cat_nm).'</div>';
        echo '<div class="fp-mk-title">'.$title.'</div>';
        echo '<div class="fp-mk-exc">'.$exc.'</div>';
        echo '<div class="fp-mk-meta">📅 '.$date.'</div>';
        echo '</div></a>';
    endwhile;
    echo '</div>';
    wp_reset_postdata();
    else:
    echo '<p style="text-align:center;color:var(--yz3,#64748b);padding:40px 20px">Bu kategoride henüz makale yok.</p>';
    endif;
    wp_send_json_success(array('html' => ob_get_clean()));
}
