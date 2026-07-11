<?php
/**
 * Template Name: Video Galerisi
 * Template Post Type: page
 */
 get_header();  
/* Video kategorisindeki yazıları çek, YouTube ID'sini içerikten al */
$vid_query = new WP_Query(array(
    'post_type'      => 'post',
    'post_status'    => 'publish',
    'posts_per_page' => 24,
    'category_name'  => 'video-galerisi',
    'orderby'        => 'date',
    'order'          => 'DESC',
));
/* YouTube ID extractor */
function _tukav_yt_id($content) {
    if (preg_match('/(?:youtube\.com\/(?:embed\/|watch\?[^"]*v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/', $content, $m))
        return $m[1];
    if (preg_match('/[?&]v=([a-zA-Z0-9_-]{11})/', $content, $m))
        return $m[1];
    return '';
}
$videos = array();
while ($vid_query->have_posts()) {
    $vid_query->the_post();
    $vid_id = _tukav_yt_id(get_the_content());
    $videos[] = array(
        'id'      => get_the_ID(),
        'title'   => get_the_title(),
        'url'     => get_permalink(),
        'excerpt' => wp_trim_words(get_the_excerpt(), 14, '...'),
        'date'    => get_the_date('d M Y'),
        'thumb'   => tukav_get_thumb(get_the_ID(), 'medium'),
        'yt_id'   => $vid_id,
    );
}
wp_reset_postdata();
$page_url = get_permalink();
$page_title = get_the_title();
?>
<style>
:root{--tq:#0e7490;--tq2:#155e75;--tq3:#06b6d4;--altin:#b8962e;--altin2:#d4af55;--dk:#0f1d22;--dk2:#162535;--bg:#f0f9fb;--sin:#b2e0e8;--yz:#1e293b;--yz2:#475569;--yz3:#94a3b8;--fh:'Oswald',sans-serif;--fm:'Open Sans',system-ui,sans-serif}
/* Video Grid */
.vg-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;max-width:1180px;margin:0 auto;padding:32px 20px}
.vg-card{background:#fff;border:1px solid var(--sin);cursor:pointer;transition:all .25s;position:relative;text-decoration:none;display:block}
.vg-card:hover{transform:translateY(-3px);box-shadow:0 8px 28px rgba(14,116,144,.15);border-color:var(--tq)}
.vg-thumb{position:relative;aspect-ratio:16/9;overflow:hidden;background:var(--dk2)}
.vg-thumb img{width:100%;height:100%;object-fit:cover;transition:transform .35s}
.vg-card:hover .vg-thumb img{transform:scale(1.05)}
.vg-play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.3);transition:background .25s}
.vg-card:hover .vg-play{background:rgba(14,116,144,.5)}
.vg-play-icon{width:50px;height:50px;background:rgba(255,255,255,.92);border-radius:50%;display:flex;align-items:center;justify-content:center;transition:transform .2s}
.vg-card:hover .vg-play-icon{transform:scale(1.12)}
.vg-play-icon i{color:var(--tq);font-size:18px;margin-left:3px}
.vg-no-yt .vg-play{display:none}
.vg-body{padding:12px 14px 14px}
.vg-kat{font-family:var(--fh);font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--tq);margin-bottom:5px}
.vg-title{font-family:var(--fh);font-size:13px;font-weight:600;color:var(--dk);line-height:1.3;margin-bottom:4px}
.vg-date{font-size:10px;color:var(--yz3)}
.vg-yt-badge{position:absolute;top:8px;right:8px;background:#ff0000;color:#fff;font-family:var(--fh);font-size:8.5px;font-weight:700;padding:2px 7px;letter-spacing:.5px;display:flex;align-items:center;gap:4px}
/* Modal */
#vg-modal{display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.88);align-items:center;justify-content:center;padding:16px}
#vg-modal.open{display:flex}
.vg-modal-box{background:#0f1d22;width:100%;max-width:900px;position:relative;border:1px solid rgba(255,255,255,.1);max-height:90vh;overflow-y:auto}
.vg-modal-close{position:absolute;top:10px;right:10px;z-index:2;background:rgba(255,255,255,.1);border:none;color:#fff;width:36px;height:36px;font-size:16px;cursor:pointer;transition:background .2s}
.vg-modal-close:hover{background:rgba(255,255,255,.2)}
.vg-embed-wrap{position:relative;aspect-ratio:16/9;background:#000}
.vg-embed-wrap iframe{width:100%;height:100%;border:none;display:block}
.vg-modal-info{padding:18px 20px}
.vg-modal-title{font-family:var(--fh);font-size:1.2rem;font-weight:700;color:#fff;margin-bottom:6px}
.vg-modal-date{font-size:11px;color:rgba(255,255,255,.4);margin-bottom:14px}
.vg-modal-excerpt{font-size:13px;color:rgba(255,255,255,.6);line-height:1.7;margin-bottom:16px}
/* Share bar */
.tukav-share-bar{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.tsb-label{font-family:var(--fh);font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,.35);margin-right:4px}
.tsb-btn{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border:1.5px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:rgba(255,255,255,.6);font-size:13px;text-decoration:none;cursor:pointer;transition:all .2s}
.tsb-btn:hover{background:rgba(14,116,144,.4);border-color:var(--tq3);color:#fff}
.tsb-cp:hover{background:rgba(14,116,144,.4);border-color:var(--tq3);color:#fff}
/* No-JS link view */
.vg-fulllink{display:block;margin-top:12px;font-size:11px;color:rgba(255,255,255,.4);text-align:center;text-decoration:none}
.vg-fulllink:hover{color:var(--tq3)}
@media(max-width:1100px){.vg-grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:760px){.vg-grid{grid-template-columns:repeat(2,1fr);padding:20px 12px}}
@media(max-width:480px){.vg-grid{grid-template-columns:1fr}}
</style>
<div style="font-family:'Open Sans',system-ui,sans-serif;color:#1e293b">
<div class="tp-hero">
  <div class="tp-hero-w">
    <div>
      <div class="tp-eyebrow"><i class="fa fa-film" style="color:var(--altin2)"></i> TürkAta Vakfı</div>
      <h1 class="tp-h1">Video Galerisi <em>Belgesel ve Arşiv</em></h1>
      <p class="tp-hdesc">Kültürel etkinlikler, tarihi belgeseller ve arşiv görüntülerinden oluşan video koleksiyonu.</p>
    </div>
    <div class="tp-hero-stats">
      <div class="tp-stat"><div class="tp-stat-n"><?php echo count($videos); ?></div><div class="tp-stat-l">Video</div></div>
      <div class="tp-stat"><div class="tp-stat-n">Belgesel</div><div class="tp-stat-l">Kültürel</div></div>
    </div>
  </div>
</div>
<div class="tp-bc"><div class="tp-bc-w"><a href="<?php echo esc_url(home_url('/')); ?>">Ana Sayfa</a><span class="sep">›</span><span>Video Galerisi</span></div></div>
<!-- Video Grid -->
<?php if (!empty($videos)): ?>
<div class="vg-grid" id="vg-grid">
  <?php foreach($videos as $v): ?>
  <?php $has_yt = !empty($v['yt_id']); ?>
  <div class="vg-card <?php echo $has_yt ? '' : 'vg-no-yt'; ?>"
       data-yt="<?php echo esc_attr($v['yt_id']); ?>"
       data-title="<?php echo esc_attr($v['title']); ?>"
       data-url="<?php echo esc_url($v['url']); ?>"
       data-date="<?php echo esc_attr($v['date']); ?>"
       data-excerpt="<?php echo esc_attr($v['excerpt']); ?>"
       onclick="<?php echo $has_yt ? 'vgOpen(this)' : 'window.location=this.dataset.url'; ?>"
       role="<?php echo $has_yt ? 'button' : 'link'; ?>">
    <div class="vg-thumb">
      <?php if ($v['thumb']): ?>
        <img src="<?php echo esc_url($v['thumb']); ?>" alt="<?php echo esc_attr($v['title']); ?>" loading="lazy">
      <?php elseif ($has_yt): ?>
        <img src="https://img.youtube.com/vi/<?php echo esc_attr($v['yt_id']); ?>/mqdefault.jpg" alt="<?php echo esc_attr($v['title']); ?>" loading="lazy">
      <?php endif; ?>
      <?php if ($has_yt): ?>
      <div class="vg-play">
        <div class="vg-play-icon"><i class="fa fa-play"></i></div>
      </div>
      <div class="vg-yt-badge"><i class="fa-brands fa-youtube"></i> YouTube</div>
      <?php endif; ?>
    </div>
    <div class="vg-body">
      <div class="vg-kat">Video <?php echo $has_yt ? '· YouTube' : ''; ?></div>
      <div class="vg-title"><?php echo esc_html(wp_trim_words($v['title'],10)); ?></div>
      <div class="vg-date"><?php echo esc_html($v['date']); ?></div>
    </div>
  </div>
  <?php endforeach; ?>
</div>
<?php else: ?>
<div style="max-width:1180px;margin:40px auto;padding:0 20px">
  <div style="background:#fff;border:1px solid var(--sin2);padding:60px;text-align:center;color:var(--yz3)">
    <i class="fa fa-film" style="font-size:3rem;display:block;margin-bottom:16px"></i>
    <h3 style="font-family:var(--fh);font-size:1.1rem;color:var(--dk);margin-bottom:8px">Henüz video yok</h3>
    <p style="font-size:13px">WordPress Yönetim Paneli'nden "video-galerisi" kategorisinde yazı ekleyin.</p>
  </div>
</div>
<?php endif; ?>
</div>
<!-- Video Modal -->
<div id="vg-modal" role="dialog" aria-modal="true" aria-label="Video oynatıcı">
  <div class="vg-modal-box" id="vg-modal-box">
    <button class="vg-modal-close" onclick="vgClose()" aria-label="Kapat"><i class="fa fa-times"></i></button>
    <div class="vg-embed-wrap" id="vg-embed-wrap"></div>
    <div class="vg-modal-info">
      <div class="vg-modal-title" id="vg-modal-title"></div>
      <div class="vg-modal-date" id="vg-modal-date"></div>
      <div class="vg-modal-excerpt" id="vg-modal-excerpt"></div>
      <!-- Paylaşım -->
      <div class="tukav-share-bar" id="vg-share-bar">
        <span class="tsb-label"><i class="fa fa-share-alt"></i> Paylaş</span>
        <a id="tsb-tw" class="tsb-btn" target="_blank" rel="noopener" title="X (Twitter)'da Paylaş"><i class="fa-brands fa-x-twitter"></i></a>
        <a id="tsb-fb" class="tsb-btn" target="_blank" rel="noopener" title="Facebook'ta Paylaş"><i class="fa-brands fa-facebook-f"></i></a>
        <a id="tsb-wa" class="tsb-btn" target="_blank" rel="noopener" title="WhatsApp'ta Paylaş"><i class="fa-brands fa-whatsapp"></i></a>
        <a id="tsb-li" class="tsb-btn" target="_blank" rel="noopener" title="LinkedIn'de Paylaş"><i class="fa-brands fa-linkedin-in"></i></a>
        <button id="tsb-cp" class="tsb-btn tsb-cp" title="Linki Kopyala" onclick="vgCopyLink()"><i class="fa fa-link"></i></button>
        <a id="vg-post-link" class="vg-fulllink" target="_blank" rel="noopener"><i class="fa fa-external-link-alt"></i> Yazının tamamını görüntüle</a>
      </div>
    </div>
  </div>
</div>
<?php get_footer(); ?>
<script>
var _vgBaseUrl = '<?php echo esc_js(get_permalink(get_the_ID())); ?>';
var _vgCurrentUrl = '';
function vgOpen(card) {
    var ytId    = card.dataset.yt;
    var title   = card.dataset.title;
    var postUrl = card.dataset.url;
    var date    = card.dataset.date;
    var excerpt = card.dataset.excerpt;
    if (!ytId) return;
    /* URL deep link */
    var newUrl = _vgBaseUrl + ((_vgBaseUrl.indexOf('?') > -1) ? '&' : '?') + 'v=' + ytId;
    window.history.pushState({yt: ytId, title: title, url: postUrl}, title, newUrl);
    _vgCurrentUrl = newUrl;
    /* Embed */
    document.getElementById('vg-embed-wrap').innerHTML =
        '<iframe src="https://www.youtube.com/embed/' + ytId + '?autoplay=1&rel=0&modestbranding=1" allowfullscreen allow="autoplay; encrypted-media"></iframe>';
    /* Info */
    document.getElementById('vg-modal-title').textContent   = title;
    document.getElementById('vg-modal-date').textContent    = date;
    document.getElementById('vg-modal-excerpt').textContent = excerpt;
    document.getElementById('vg-post-link').href = postUrl;
    /* Paylaşım linkleri */
    var enc = encodeURIComponent(newUrl);
    var encT = encodeURIComponent(title);
    document.getElementById('tsb-tw').href = 'https://twitter.com/intent/tweet?url=' + enc + '&text=' + encT;
    document.getElementById('tsb-fb').href = 'https://www.facebook.com/sharer/sharer.php?u=' + enc;
    document.getElementById('tsb-wa').href = 'https://wa.me/?text=' + encT + '%20' + enc;
    document.getElementById('tsb-li').href = 'https://linkedin.com/sharing/share-offsite/?url=' + enc;
    document.getElementById('vg-modal').classList.add('open');
    document.body.style.overflow = 'hidden';
}
function vgClose() {
    document.getElementById('vg-modal').classList.remove('open');
    document.getElementById('vg-embed-wrap').innerHTML = '';
    document.body.style.overflow = '';
    /* URL'i temizle */
    window.history.pushState({}, document.title, _vgBaseUrl);
}
function vgCopyLink() {
    var btn = document.getElementById('tsb-cp');
    navigator.clipboard.writeText(_vgCurrentUrl || _vgBaseUrl).then(function(){
        btn.innerHTML = '<i class="fa fa-check"></i>';
        btn.style.background='rgba(16,185,129,.3)';
        btn.style.borderColor='#10b981';
        btn.style.color='#10b981';
        setTimeout(function(){
            btn.innerHTML='<i class="fa fa-link"></i>';
            btn.style.background='';btn.style.borderColor='';btn.style.color='';
        }, 2000);
    });
}
/* ESC ile kapat */
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') vgClose();
});
/* Modal dışına tıkla kapat */
document.getElementById('vg-modal').addEventListener('click', function(e) {
    if (e.target === this) vgClose();
});
/* Sayfa yüklenince URL'deki ?v= parametresini kontrol et */
(function(){
    var params = new URLSearchParams(window.location.search);
    var v = params.get('v');
    if (v) {
        var card = document.querySelector('.vg-card[data-yt="' + v + '"]');
        if (card) {
            setTimeout(function(){ vgOpen(card); }, 300);
        } else {
            /* Kart yoksa doğrudan aç */
            var fakeCard = {dataset:{yt:v,title:'Video',url:window.location.href,date:'',excerpt:''}};
            setTimeout(function(){ vgOpen(fakeCard); }, 300);
        }
    }
})();
/* popstate (geri tuşu) */
window.addEventListener('popstate', function(e) {
    if (e.state && e.state.yt) {
        var card = document.querySelector('.vg-card[data-yt="' + e.state.yt + '"]');
        if (card) vgOpen(card);
    } else {
        vgClose();
    }
});
</script>
