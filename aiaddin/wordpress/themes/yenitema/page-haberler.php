<?php
/**
 * Template Name: Haberler
 * VKV Haberler — Kategori filtresi + Sonsuz kaydırma
 */
 get_header();  
$kategoriler = get_categories(array('orderby'=>'count','order'=>'DESC','number'=>20,'hide_empty'=>false));
$bagis_url   = get_theme_mod('vkv_bagis_url','https://donate.stripe.com/14A6oHgabdwQghN8xAb3q07');
$nonce       = wp_create_nonce('tukav_infinite');
?>
<style>
/* Hero */
.hab-hero{background:linear-gradient(135deg,var(--dk) 0%,var(--cr2) 100%);padding:36px 20px;position:relative;overflow:hidden}
.hab-hero::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(45deg,rgba(255,255,255,.01) 0px,rgba(255,255,255,.01) 1px,transparent 1px,transparent 40px)}
.hab-hero-w{max-width:1180px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap;position:relative;z-index:1}
.hab-eyebrow{font-family:var(--fh);font-size:10px;font-weight:700;letter-spacing:2.5px;color:var(--altin2);text-transform:uppercase;margin-bottom:6px}
.hab-h1{font-family:var(--fh);font-size:clamp(1.8rem,4vw,2.6rem);font-weight:700;color:#fff;line-height:1.1;margin-bottom:8px}
.hab-h1 span{color:var(--altin2)}
.hab-desc{font-size:12.5px;color:rgba(255,255,255,.5);margin:0;max-width:460px;line-height:1.7}
.hab-hero-stat{text-align:center;flex-shrink:0}
.hab-hero-stat .n{font-family:var(--fh);font-size:2rem;font-weight:700;color:var(--altin2);line-height:1}
.hab-hero-stat .l{font-size:10px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:1px;margin-top:3px}
/* Breadcrumb */
.hab-bc{background:var(--dk2);padding:8px 0;border-bottom:1px solid rgba(197,48,48,.15)}
.hab-bc-w{max-width:1180px;margin:0 auto;padding:0 20px;display:flex;align-items:center;gap:6px;font-size:11px;color:rgba(255,255,255,.4);font-family:var(--fh)}
.hab-bc-w a{color:rgba(255,255,255,.4);text-decoration:none}.hab-bc-w a:hover{color:var(--altin2)}
.hab-bc-w .sep{color:rgba(255,255,255,.2)}
/* Toolbar */
.hab-toolbar{background:#fff;border-bottom:1px solid var(--sin);padding:14px 0;position:sticky;top:64px;z-index:90}
.hab-toolbar-w{max-width:1180px;margin:0 auto;padding:0 20px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.hab-chips{display:flex;flex-wrap:wrap;gap:6px;flex:1}
.hab-chip{padding:5px 14px;border:1.5px solid var(--sin);font-family:var(--fh);font-size:11px;font-weight:700;letter-spacing:.3px;text-transform:uppercase;cursor:pointer;background:#fff;color:var(--yz2);transition:all .18s}
.hab-chip.akt{background:var(--cr);border-color:var(--cr);color:#fff}
.hab-chip:hover:not(.akt){border-color:var(--cr3);color:var(--cr)}
.hab-srch{display:flex;align-items:center;gap:7px;background:#fff;border:1.5px solid var(--sin);padding:0 12px;height:34px;flex-shrink:0;width:220px;transition:border-color .2s}
.hab-srch:focus-within{border-color:var(--cr3)}
.hab-srch input{border:none;outline:none;font-size:12px;width:100%;color:var(--yz)}
.hab-srch i{color:var(--yz3);font-size:11px}
/* Grid */
.hab-main{max-width:1180px;margin:0 auto;padding:24px 20px}
.hab-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.hab-card{background:#fff;border:1px solid var(--sin);display:block;text-decoration:none;transition:all .2s;animation:habFadeIn .4s ease}
@keyframes habFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.hab-card:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(139,26,26,.1);border-color:var(--cr3)}
.hab-img{aspect-ratio:16/9;overflow:hidden;background:var(--dk2)}
.hab-img img{width:100%;height:100%;object-fit:cover;transition:transform .35s}
.hab-card:hover .hab-img img{transform:scale(1.06)}
.hab-body{padding:12px 14px 8px}
.hab-cat{font-family:var(--fh);font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--cr);margin-bottom:5px}
.hab-title{font-family:var(--fh);font-size:13px;font-weight:600;color:var(--dk);line-height:1.35;margin-bottom:5px}
.hab-card:hover .hab-title{color:var(--cr)}
.hab-exc{font-size:11px;color:var(--yz2);line-height:1.6}
.hab-foot{padding:8px 14px 10px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid rgba(254,202,202,.5)}
.hab-date{font-size:9.5px;color:var(--yz3)}
.hab-read{font-family:var(--fh);font-size:9.5px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--cr)}
.hab-more-wrap{text-align:center;padding:28px 0}
.hab-more-btn{display:inline-flex;align-items:center;gap:8px;padding:11px 28px;background:#fff;border:2px solid var(--cr);color:var(--cr);font-family:var(--fh);font-size:12.5px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;cursor:pointer;transition:all .2s}
.hab-more-btn:hover{background:var(--cr);color:#fff}
.hab-empty{text-align:center;padding:60px 0;grid-column:1/-1}
.hab-empty i{font-size:3rem;color:var(--sin);margin-bottom:16px}
.hab-empty p{color:var(--yz3);font-size:13.5px}
@media(max-width:1080px){.hab-grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:760px){.hab-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:480px){.hab-grid{grid-template-columns:1fr}}
</style>
<!-- HERO -->
<div class="hab-hero">
  <div class="hab-hero-w">
    <div>
      <div class="hab-eyebrow">— Vatan Kahramanları Vakfı</div>
      <h1 class="hab-h1">Son <span>Haberler</span></h1>
      <p class="hab-desc">Güncel duyurular, etkinlikler ve vakfımızın faaliyetlerine dair haberler.</p>
    </div>
    <div class="hab-hero-stat">
      <div class="n"><?php echo wp_count_posts()->publish ?: '∞'; ?></div>
      <div class="l">Toplam Haber</div>
    </div>
  </div>
</div>
<!-- BREADCRUMB -->
<div class="hab-bc">
  <div class="hab-bc-w">
    <a href="<?php echo esc_url(home_url('/')); ?>">Ana Sayfa</a>
    <span class="sep">›</span>
    <span>Haberler</span>
  </div>
</div>
<!-- TOOLBAR -->
<div class="hab-toolbar">
  <div class="hab-toolbar-w">
    <div class="hab-chips">
      <button class="hab-chip akt" data-cid="0" onclick="habCatSec(this,0)">Tümü</button>
      <?php foreach ($kategoriler as $kk): ?>
      <button class="hab-chip" data-cid="<?php echo esc_attr($kk->term_id); ?>" onclick="habCatSec(this,<?php echo $kk->term_id; ?>)"><?php echo esc_html($kk->name); ?></button>
      <?php endforeach; ?>
    </div>
    <div class="hab-srch">
      <i class="fa fa-search"></i>
      <input type="text" id="habSrch" placeholder="Haber ara…" onkeyup="habSrchDebounce()">
    </div>
  </div>
</div>
<!-- GRID -->
<div class="hab-main">
  <div class="hab-grid" id="habGrid">
    <?php
    $habq = new WP_Query(array('post_type'=>'post','post_status'=>'publish','posts_per_page'=>12,'orderby'=>'date','order'=>'DESC'));
    while ($habq->have_posts()): $habq->the_post();
      $hcats  = get_the_category();
      $hcat   = !empty($hcats) ? $hcats[0] : null;
      $hthumb = tukav_get_thumb(get_the_ID(),'medium');
    ?>
    <a href="<?php the_permalink(); ?>" class="hab-card">
      <div class="hab-img"><?php if($hthumb): ?><img src="<?php echo esc_url($hthumb); ?>" alt="<?php echo esc_attr(get_the_title()); ?>" loading="lazy"><?php endif; ?></div>
      <div class="hab-body">
        <?php if($hcat): ?><div class="hab-cat"><?php echo esc_html($hcat->name); ?></div><?php endif; ?>
        <div class="hab-title"><?php the_title(); ?></div>
        <div class="hab-exc"><?php echo wp_trim_words(get_the_excerpt(),14,'...'); ?></div>
      </div>
      <div class="hab-foot">
        <span class="hab-date"><?php echo get_the_date('d M Y'); ?></span>
        <span class="hab-read">HABERE GİT →</span>
      </div>
    </a>
    <?php endwhile; wp_reset_postdata(); ?>
  </div>
  <div class="hab-more-wrap">
    <button class="hab-more-btn" id="habMoreBtn" onclick="habDahaCek()">
      <i class="fa fa-sync-alt" id="habMoreIco"></i>
      <span id="habMoreTxt">Daha Fazla Yükle</span>
    </button>
  </div>
</div>
<script>
var _habPage=2, _habCatId=0, _habSearch='', _habLoading=false, _habDone=false;
function habCatSec(btn, cid){
    document.querySelectorAll('.hab-chip').forEach(function(c){c.classList.remove('akt');});
    btn.classList.add('akt');
    _habCatId=cid; _habPage=1; _habDone=false;
    document.getElementById('habGrid').innerHTML='';
    habDahaCek();
}
var _habSrchTimer;
function habSrchDebounce(){
    clearTimeout(_habSrchTimer);
    _habSrchTimer=setTimeout(function(){
        _habSearch=document.getElementById('habSrch').value;
        _habPage=1; _habDone=false;
        document.getElementById('habGrid').innerHTML='';
        habDahaCek();
    },380);
}
function habDahaCek(){
    if(_habLoading||_habDone) return;
    _habLoading=true;
    var ico=document.getElementById('habMoreIco'),txt=document.getElementById('habMoreTxt'),btn=document.getElementById('habMoreBtn');
    ico.className='fa fa-spinner fa-spin'; txt.textContent='Yükleniyor…'; btn.disabled=true;
    var fd=new FormData();
    fd.append('action','tukav_infinite_posts');
    fd.append('nonce','<?php echo esc_js($nonce); ?>');
    fd.append('page',_habPage);
    fd.append('cat_id',_habCatId);
    fd.append('s',_habSearch);
    fetch('<?php echo esc_url(admin_url('admin-ajax.php')); ?>',{method:'POST',body:fd})
    .then(function(r){return r.json();})
    .then(function(d){
        var grid=document.getElementById('habGrid');
        if(d.posts&&d.posts.length){
            d.posts.forEach(function(p){
                var card=document.createElement('a');
                card.href=p.url; card.className='hab-card';
                var img=p.thumb?'<div class="hab-img"><img src="'+p.thumb+'" alt="" loading="lazy"></div>':'';
                var cat=p.cat_name?'<div class="hab-cat">'+p.cat_name+'</div>':'';
                card.innerHTML=img+'<div class="hab-body">'+cat+'<div class="hab-title">'+p.title+'</div><div class="hab-exc">'+p.excerpt+'</div></div><div class="hab-foot"><span class="hab-date">'+p.date+'</span><span class="hab-read">HABERE GİT →</span></div>';
                grid.appendChild(card);
            });
            _habPage++;
        }
        if(!d.has_more){
            _habDone=true;
            document.getElementById('hab-more-wrap')?document.getElementById('habMoreBtn').closest('.hab-more-wrap').style.display='none':btn.closest('.hab-more-wrap').style.display='none';
        }
    })
    .catch(function(){})
    .finally(function(){
        _habLoading=false; ico.className='fa fa-sync-alt'; txt.textContent='Daha Fazla Yükle'; btn.disabled=false;
    });
}
/* Sonsuz kaydırma */
window.addEventListener('scroll',function(){
    if(window.innerHeight+window.scrollY>=document.body.offsetHeight-400) habDahaCek();
},{ passive:true });
</script>
<?php get_footer(); ?>
