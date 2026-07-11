<?php
/**
 * AnkaraHaber — Kategori Arşivi
 * Özellikler: 18 haber/sayfa | Infinity Scroll | Orantılı bloklar
 */
defined('ROOT') or die();
Theme::partial('header');

$category = Theme::var('category');
$page     = max(1, (int)($_GET['p'] ?? 1));
$perPage  = 18;
$renk     = $category['color'] ?? '#CC0000';

$haberler = [];
$total    = 0;
if ($category) {
    try {
        $total    = (int)DB::queryValue("SELECT COUNT(*) FROM `{p}posts` WHERE post_type='news' AND status='published' AND category_id=?", [$category['id']]);
        $haberler = PostType::getPosts(['post_type'=>'news','status'=>'published','category_id'=>(int)$category['id'],'limit'=>$perPage,'offset'=>($page-1)*$perPage]);
    } catch (\Throwable) {}
}
$siteUrl = ap_url();
$hasMore = ($page * $perPage) < $total;
?>
<main class="site-main">
  <div class="container" style="padding-top:20px">

    <!-- Kategori Başlık -->
    <div style="background:#fff;border-radius:10px;padding:20px 24px;margin-bottom:22px;box-shadow:0 2px 8px rgba(0,0,0,.07);display:flex;align-items:center;gap:14px">
      <div style="width:6px;height:44px;background:<?= e($renk) ?>;border-radius:4px;flex-shrink:0"></div>
      <div>
        <h1 style="font-size:22px;font-weight:900;color:#1a1a1a;margin:0 0 4px"><?= e($category['name'] ?? 'Kategori') ?></h1>
        <?php if (!empty($category['description'])): ?>
        <p style="font-size:13px;color:#666;margin:0"><?= e($category['description']) ?></p>
        <?php endif; ?>
        <div style="font-size:12px;color:#999;margin-top:4px"><?= number_format($total) ?> haber bulundu</div>
      </div>
    </div>

    <div class="icerik-sidebar-sarici">
      <div class="ana-icerik">
        <?php if (!empty($haberler)): ?>

        <!-- Haber Grid (18 haber, 3 kolon) -->
        <div id="haberGrid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
          <?php foreach ($haberler as $h): ?>
          <article class="kat-kart">
            <a href="<?= e(ap_url($h['slug'])) ?>">
              <div class="kat-kart-resim" style="background-image:url('<?= e(ap_thumb_url($h['cover_image'])) ?>')">
                <?php if ($h['is_breaking']): ?>
                <span class="kat-sd-rozet" style="background:<?= e($renk) ?>">⚡ SON DAKİKA</span>
                <?php endif; ?>
              </div>
              <div class="kat-kart-icerik">
                <h3 class="kat-kart-baslik"><?= e($h['title']) ?></h3>
                <div class="kat-kart-meta"><i class="fa fa-clock"></i> <?= ap_time_ago($h['published_at']??$h['created_at']) ?></div>
              </div>
            </a>
          </article>
          <?php endforeach; ?>
        </div>

        <!-- Infinity Scroll Alanı -->
        <div id="infinityAlani" style="text-align:center;padding:30px 0">
          <?php if ($hasMore): ?>
          <div id="scrollSentinel"></div>
          <div id="yuklemeSpin" style="display:none">
            <div style="display:inline-block;width:32px;height:32px;border:3px solid #e5e7eb;border-top-color:<?= e($renk) ?>;border-radius:50%;animation:spin-cat .7s linear infinite"></div>
            <div style="font-size:13px;color:#888;margin-top:8px">Yükleniyor…</div>
          </div>
          <button id="dahafazlaBtn" onclick="dahafazlaYukle()"
            style="background:<?= e($renk) ?>;color:#fff;border:none;border-radius:8px;padding:12px 32px;font-size:14px;font-weight:700;cursor:pointer;display:none">
            <i class="fa fa-angle-double-down"></i> Daha Fazla Haber
          </button>
          <?php else: ?>
          <div style="font-size:12px;color:#bbb;padding:10px;border-top:1px solid #f0f0f0;margin-top:10px">
            Tüm haberler gösterildi
          </div>
          <?php endif; ?>
        </div>

        <?php else: ?>
        <div style="background:#fff;border-radius:10px;padding:60px;text-align:center;color:#888">
          <div style="font-size:48px;margin-bottom:12px">📭</div>
          <p>Bu kategoride henüz haber yok.</p>
          <a href="<?= $siteUrl ?>" style="color:<?= e($renk) ?>;font-weight:700">Ana Sayfaya Dön →</a>
        </div>
        <?php endif; ?>
      </div>

      <aside class="sidebar">
        <div class="widget">
          <h3 class="widget-title"><i class="fa fa-clock"></i> Son Haberler</h3>
          <div class="sidebar-haber-listesi">
            <?php
            try { $sidebarH = PostType::getPosts(['post_type'=>'news','status'=>'published','limit'=>8]); }
            catch (\Throwable) { $sidebarH = []; }
            foreach ($sidebarH as $sh): ?>
            <div class="sidebar-haber-item">
              <a href="<?= e(ap_url($sh['slug'])) ?>" class="sidebar-haber-link">
                <div class="shaber-resim"><img src="<?= e(ap_thumb_url($sh['cover_image'])) ?>" alt="" loading="lazy"></div>
                <div class="shaber-icerik">
                  <span class="shaber-baslik"><?= e(mb_substr($sh['title'],0,60)) ?></span>
                  <span class="shaber-tarih"><?= ap_time_ago($sh['published_at']??$sh['created_at']) ?></span>
                </div>
              </a>
            </div>
            <?php endforeach; ?>
          </div>
        </div>
        <!-- Popüler bu kategori -->
        <div class="widget" style="margin-top:16px">
          <h3 class="widget-title"><i class="fa fa-fire"></i> En Çok Okunan</h3>
          <div class="sidebar-haber-listesi">
            <?php
            try {
              $popH = PostType::getPosts(['post_type'=>'news','status'=>'published','category_id'=>(int)($category['id']??0),'limit'=>5,'order_by'=>'view_count']);
            } catch (\Throwable) { $popH = []; }
            foreach ($popH as $i => $sh): ?>
            <div class="sidebar-haber-item" style="border-bottom:1px solid #f5f5f5;padding-bottom:8px;margin-bottom:8px">
              <a href="<?= e(ap_url($sh['slug'])) ?>" class="sidebar-haber-link">
                <div class="shaber-resim" style="position:relative">
                  <img src="<?= e(ap_thumb_url($sh['cover_image'])) ?>" alt="" loading="lazy">
                  <span style="position:absolute;top:2px;left:2px;width:18px;height:18px;background:<?= e($renk) ?>;color:#fff;font-size:9px;font-weight:900;border-radius:50%;display:flex;align-items:center;justify-content:center"><?= $i+1 ?></span>
                </div>
                <div class="shaber-icerik">
                  <span class="shaber-baslik"><?= e(mb_substr($sh['title'],0,55)) ?></span>
                  <span class="shaber-tarih"><i class="fa fa-eye"></i> <?= number_format((int)$sh['view_count']) ?></span>
                </div>
              </a>
            </div>
            <?php endforeach; ?>
          </div>
        </div>
        <?php Widget::area('sidebar'); ?>
      </aside>
    </div>

  </div>
</main>

<style>
@keyframes spin-cat{to{transform:rotate(360deg)}}

/* Haber Kartı */
.kat-kart a{display:block;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.07);text-decoration:none;transition:.2s}
.kat-kart a:hover{box-shadow:0 6px 20px rgba(0,0,0,.13);transform:translateY(-2px)}
.kat-kart-resim{height:175px;background-size:cover;background-position:center;position:relative;overflow:hidden}
.kat-sd-rozet{position:absolute;top:8px;left:8px;color:#fff;font-size:9px;font-weight:800;padding:3px 8px;border-radius:3px;letter-spacing:.3px}
.kat-kart-icerik{padding:12px 14px 14px}
.kat-kart-baslik{font-size:14px;font-weight:700;color:#1a1a1a;line-height:1.45;margin:0 0 8px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.kat-kart-meta{font-size:11px;color:#9ca3af;display:flex;align-items:center;gap:5px}

/* Responsive */
@media(max-width:900px){#haberGrid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:480px){#haberGrid{grid-template-columns:1fr}}

#scrollSentinel{height:5px}
</style>

<script>
(function(){
  var catId   = '<?= (int)($category['id'] ?? 0) ?>';
  var sayfa   = <?= $page + 1 ?>;
  var topSayfa = Math.ceil(<?= $total ?> / <?= $perPage ?>);
  var perPage = <?= $perPage ?>;
  var renk    = '<?= e($renk) ?>';
  var yukleniyor = false;
  var bitti = <?= ($hasMore ? 'false' : 'true') ?>;
  var grid      = document.getElementById('haberGrid');
  var sentinel  = document.getElementById('scrollSentinel');
  var spin      = document.getElementById('yuklemeSpin');
  var btn       = document.getElementById('dahafazlaBtn');

  function kartiHtml(h) {
    var sd = h.is_breaking ? '<span class="kat-sd-rozet" style="background:' + renk + '">⚡ SON DAKİKA</span>' : '';
    return '<article class="kat-kart"><a href="' + h.url + '">' +
      '<div class="kat-kart-resim" style="background-image:url(\'' + (h.cover_image||'') + '\')">' + sd + '</div>' +
      '<div class="kat-kart-icerik">' +
      '<h3 class="kat-kart-baslik">' + h.title + '</h3>' +
      '<div class="kat-kart-meta"><i class="fa fa-clock"></i> ' + h.time_ago + '</div>' +
      '</div></a></article>';
  }

  window.dahafazlaYukle = function() {
    if (yukleniyor || bitti) return;
    if (sayfa > topSayfa) { bitti = true; if(btn)btn.style.display='none'; return; }
    yukleniyor = true;
    if (spin) spin.style.display = 'block';
    if (sentinel) sentinel.style.display = 'none';
    if (btn) btn.style.display = 'none';

    fetch('/api/?action=category_posts&cat_id=' + catId + '&page=' + sayfa + '&per_page=' + perPage, {
      headers: {'X-Requested-With': 'XMLHttpRequest'}
    }).then(function(r){ return r.json(); }).then(function(data) {
      yukleniyor = false;
      if (spin) spin.style.display = 'none';
      if (!data.success || !data.posts || !data.posts.length) {
        bitti = true;
        if (sentinel) sentinel.style.display = 'none';
        return;
      }
      data.posts.forEach(function(h) {
        var wrap = document.createElement('div');
        wrap.innerHTML = kartiHtml(h);
        grid.appendChild(wrap.firstChild);
      });
      sayfa++;
      if (!data.has_more) { bitti = true; if(sentinel)sentinel.style.display='none'; return; }
      if (sentinel) { sentinel.style.display = 'block'; }
    }).catch(function() {
      yukleniyor = false;
      if (spin) spin.style.display = 'none';
      if (btn) btn.style.display = 'inline-block';
    });
  };

  // IntersectionObserver
  if (sentinel && 'IntersectionObserver' in window && !bitti) {
    var observer = new IntersectionObserver(function(entries) {
      if (entries[0].isIntersecting && !yukleniyor && !bitti) window.dahafazlaYukle();
    }, { rootMargin: '500px' });
    observer.observe(sentinel);
  } else if (!bitti && btn) {
    btn.style.display = 'inline-block';
  }
})();
</script>

<?php Theme::partial('footer'); ?>
