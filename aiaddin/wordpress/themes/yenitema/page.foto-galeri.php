<?php get_header(); ?>
<?php
/**
 * Foto Galeri Sayfası
 * Albümler ızgara olarak gösterilir; tıklanınca lightbox açılır.
 */
$paged = max(1, intval(get_query_var('paged')));
$albumler = new WP_Query(array(
    'post_type'      => 'foto_galeri',
    'post_status'    => 'publish',
    'posts_per_page' => 12,
    'paged'          => $paged,
    'orderby'        => 'date',
    'order'          => 'DESC',
));
?>
<style>
.vkv-galeri-wrap{max-width:1440px;margin:0 auto;padding:32px 20px}
.vkv-galeri-hero{text-align:center;padding:48px 20px 32px;border-bottom:1px solid var(--sin);margin-bottom:32px}
.vkv-galeri-hero h1{font-family:var(--fh);font-size:2rem;font-weight:800;color:var(--dk);margin-bottom:8px}
.vkv-galeri-hero p{font-size:14px;color:var(--yz2)}
/* Albüm ızgarası */
.vkv-galeri-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
@media(max-width:900px){.vkv-galeri-grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:560px){.vkv-galeri-grid{grid-template-columns:repeat(2,1fr)}}
.vkv-album-kart{position:relative;overflow:hidden;border-radius:4px;cursor:pointer;aspect-ratio:4/3;background:var(--bg)}
.vkv-album-kart img{width:100%;height:100%;object-fit:cover;transition:transform .35s}
.vkv-album-kart:hover img{transform:scale(1.08)}
.vkv-album-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.75) 0%,rgba(0,0,0,0) 50%);opacity:0;transition:opacity .3s;display:flex;flex-direction:column;justify-content:flex-end;padding:14px}
.vkv-album-kart:hover .vkv-album-overlay{opacity:1}
.vkv-album-baslik{font-family:var(--fh);font-size:13px;font-weight:700;color:#fff;line-height:1.3}
.vkv-album-tarih{font-size:10.5px;color:rgba(255,255,255,.6);margin-top:3px}
.vkv-album-placeholder{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:2.5rem;color:var(--yz3)}
/* Lightbox */
.vkv-lightbox{display:none;position:fixed;inset:0;background:rgba(0,0,0,.95);z-index:99999;align-items:center;justify-content:center}
.vkv-lightbox.acik{display:flex}
.vkv-lightbox-img{max-width:92vw;max-height:90vh;object-fit:contain;border-radius:2px;box-shadow:0 20px 60px rgba(0,0,0,.5)}
.vkv-lightbox-kapat{position:fixed;top:20px;right:24px;color:#fff;font-size:2rem;cursor:pointer;line-height:1;font-weight:300;opacity:.7;transition:opacity .2s}
.vkv-lightbox-kapat:hover{opacity:1}
.vkv-lightbox-prev,.vkv-lightbox-next{position:fixed;top:50%;transform:translateY(-50%);color:#fff;font-size:2rem;cursor:pointer;opacity:.6;transition:opacity .2s;padding:10px;user-select:none}
.vkv-lightbox-prev{left:16px}.vkv-lightbox-next{right:16px}
.vkv-lightbox-prev:hover,.vkv-lightbox-next:hover{opacity:1}
.vkv-lightbox-info{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);color:#fff;text-align:center;font-size:13px;opacity:.7}
</style>
<div class="vkv-galeri-wrap">
  <!-- HERO -->
  <div class="vkv-galeri-hero">
    <h1>📷 Foto Galeri</h1>
    <p>Vakıf etkinlikleri ve faaliyetlerinden kareler</p>
  </div>
  <!-- ALBÜM IZGARASI -->
  <?php if ($albumler->have_posts()): ?>
  <div class="vkv-galeri-grid" id="vkvGaleriGrid">
    <?php while ($albumler->have_posts()): $albumler->the_post();
      $kapak = get_the_post_thumbnail_url(null, 'large');
      $tam   = get_the_post_thumbnail_url(null, 'full');
    ?>
    <div class="vkv-album-kart" data-tam="<?php echo esc_attr($tam ?: $kapak); ?>" data-baslik="<?php the_title_attribute(); ?>">
      <?php if ($kapak): ?>
        <img src="<?php echo esc_url($kapak); ?>" alt="<?php the_title_attribute(); ?>" loading="lazy">
      <?php else: ?>
        <div class="vkv-album-placeholder"><span>📷</span><small style="font-size:11px;margin-top:8px;font-family:var(--fh)"><?php the_title(); ?></small></div>
      <?php endif; ?>
      <div class="vkv-album-overlay">
        <div class="vkv-album-baslik"><?php the_title(); ?></div>
        <div class="vkv-album-tarih"><?php echo get_the_date('d F Y'); ?></div>
      </div>
    </div>
    <?php endwhile; wp_reset_postdata(); ?>
  </div>
  <!-- PAGINATION -->
  <?php if ($albumler->max_num_pages > 1): ?>
  <div style="margin-top:28px;text-align:center">
    <?php echo paginate_links(array('total'=>$albumler->max_num_pages,'current'=>$paged,'prev_text'=>'← Önceki','next_text'=>'Sonraki →','mid_size'=>2)); ?>
  </div>
  <?php endif; ?>
  <?php else: ?>
  <div style="text-align:center;padding:60px;color:var(--yz3)">
    <div style="font-size:3rem;margin-bottom:12px">📷</div>
    <p>Henüz fotoğraf albümü eklenmemiş.</p>
  </div>
  <?php endif; ?>
</div>
<!-- LİGHTBOX -->
<div class="vkv-lightbox" id="vkvLightbox">
  <span class="vkv-lightbox-kapat" id="vkvLbKapat">✕</span>
  <span class="vkv-lightbox-prev" id="vkvLbPrev">&#8592;</span>
  <img src="" alt="" class="vkv-lightbox-img" id="vkvLbImg">
  <span class="vkv-lightbox-next" id="vkvLbNext">&#8594;</span>
  <div class="vkv-lightbox-info" id="vkvLbInfo"></div>
</div>
<script>
(function(){
  var kartlar = document.querySelectorAll('.vkv-album-kart[data-tam]');
  if (!kartlar.length) return;
  var lb = document.getElementById('vkvLightbox');
  var lbImg = document.getElementById('vkvLbImg');
  var lbInfo = document.getElementById('vkvLbInfo');
  var cur = 0;
  function show(idx) {
    cur = idx;
    var k = kartlar[idx];
    lbImg.src = k.dataset.tam;
    lbImg.alt = k.dataset.baslik || '';
    lbInfo.textContent = k.dataset.baslik + '  (' + (idx+1) + ' / ' + kartlar.length + ')';
    lb.classList.add('acik');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    lb.classList.remove('acik');
    document.body.style.overflow = '';
  }
  kartlar.forEach(function(k, i){ k.addEventListener('click', function(){ show(i); }); });
  document.getElementById('vkvLbKapat').addEventListener('click', close);
  document.getElementById('vkvLbPrev').addEventListener('click', function(){ show((cur - 1 + kartlar.length) % kartlar.length); });
  document.getElementById('vkvLbNext').addEventListener('click', function(){ show((cur + 1) % kartlar.length); });
  lb.addEventListener('click', function(e){ if (e.target === lb) close(); });
  document.addEventListener('keydown', function(e){
    if (!lb.classList.contains('acik')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show((cur - 1 + kartlar.length) % kartlar.length);
    if (e.key === 'ArrowRight') show((cur + 1) % kartlar.length);
  });
})();
</script>
<?php get_footer(); ?>
