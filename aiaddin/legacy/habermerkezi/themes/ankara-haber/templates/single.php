<?php
/**
 * AnkaraHaber — Tekil Haber Detay
 * Özellikler: Son Dakika rozeti | Kategori etiketi | Köşe yazarı kartı | Spot | Okuma süresi
 *             Ekmek kırıntısı | Sosyal paylaşım (5 platform) | Sonsuz yükleme | Yazarın diğer yazıları
 *             JSON-LD NewsArticle schema
 */
defined('ROOT') or die();
Theme::partial('header');

$post = Theme::var('post');
if (!$post) { http_response_code(404); include Theme::path('templates/404.php'); exit; }

$catId   = (int)($post['category_id'] ?? 0);
$catName = $post['cat_name'] ?? '';
$catSlug = $post['cat_slug'] ?? '';
$renk    = '#CC0000';
if ($catId) {
    try { $r = DB::queryRow("SELECT color FROM `{p}categories` WHERE id=?", [$catId]); if ($r) $renk = $r['color']; }
    catch (\Throwable) {}
}

// Köşe yazarı
$columnist = null;
if (!empty($post['columnist_id'])) {
    try { $columnist = DB::queryRow("SELECT * FROM `{p}columnists` WHERE id=?", [$post['columnist_id']]); } catch (\Throwable) {}
}

// Okuma süresi (meta override yoksa içerikten hesapla)
$icerik_txt = strip_tags($post['content'] ?? '');
$kelime_say = str_word_count($icerik_txt) + mb_substr_count($icerik_txt, ' ');
$okuma_dk   = max(1, (int)ceil($kelime_say / 200));
if (!empty($post['read_time']) && (int)$post['read_time'] > 0) $okuma_dk = (int)$post['read_time'];

// Spot metin
$spot = $post['excerpt'] ?? '';

// Sosyal paylaşım
$siteUrl    = ap_url();
$postUrl    = ap_url($post['slug']);
$shareTitle = rawurlencode($post['title']);
$shareUrl   = rawurlencode($postUrl);

// JSON-LD
$jsonld = [
    '@context'       => 'https://schema.org',
    '@type'          => 'NewsArticle',
    'headline'       => $post['title'],
    'description'    => $spot,
    'datePublished'  => date('c', strtotime($post['published_at'] ?? $post['created_at'])),
    'dateModified'   => date('c', strtotime($post['updated_at'] ?? $post['created_at'])),
    'url'            => $postUrl,
    'publisher'      => ['@type'=>'Organization','name'=>DB::setting('site_name','AhenkPress'),'url'=>$siteUrl],
    'inLanguage'     => 'tr',
];
if ($post['cover_image']) $jsonld['image'] = ap_thumb_url($post['cover_image']);
if (!empty($post['author_name'])) $jsonld['author'] = ['@type'=>'Person','name'=>$post['author_name']];

// Reklam alanları
$rek_ici_ust = DB::setting('reklam_haber_ici_ust','');
$rek_ici_alt = DB::setting('reklam_haber_ici_alt','');
$rek_sb_ust  = DB::setting('reklam_sidebar_ust','');
$rek_sb_alt  = DB::setting('reklam_sidebar_alt','');
?>

<!-- JSON-LD Schema -->
<script type="application/ld+json"><?= json_encode($jsonld, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES) ?></script>

<main class="site-main haber-detay-main">
  <div class="container">
    <div class="icerik-sidebar-sarici">

      <!-- MAKALE -->
      <article class="haber-detay-icerik" id="haber-icerik" itemscope itemtype="https://schema.org/NewsArticle">

        <!-- Ekmek Kırıntısı -->
        <nav class="ekmek-kirintisi" aria-label="Konum bilgisi">
          <a href="<?= $siteUrl ?>"><i class="fa fa-home"></i> Ana Sayfa</a>
          <?php if ($catSlug): ?><span>›</span><a href="<?= e(ap_url($catSlug)) ?>" style="color:<?= e($renk) ?>"><?= e($catName) ?></a><?php endif; ?>
          <span>›</span><span class="son"><?= e(mb_substr($post['title'],0,60)) ?>…</span>
        </nav>

        <!-- BAŞLIK ALANI -->
        <header class="haber-baslik-alani">

          <!-- Son Dakika Rozeti -->
          <?php if ($post['is_breaking']): ?>
          <div class="son-dakika-rozet" style="background:<?= e($renk) ?>">
            <span class="son-dakika-anten">📡</span> <strong>SON DAKİKA</strong>
          </div>
          <?php endif; ?>

          <!-- Kategori Etiketi -->
          <?php if ($catName): ?>
          <a href="<?= e(ap_url($catSlug)) ?>" class="kat-etiket" style="color:<?= e($renk) ?>;border-color:<?= e($renk) ?>">
            <?= e($catName) ?>
          </a>
          <?php endif; ?>

          <!-- Köşe Yazarı Üst Kartı (başlık ÜSTÜNDE) -->
          <?php if ($columnist): ?>
          <div class="yazar-ust-kart">
            <img src="<?= e(ap_thumb_url($columnist['avatar'])) ?>" alt="<?= e($columnist['name']) ?>" class="yazar-ust-foto">
            <div>
              <a href="<?= e(ap_url('yazar/'.$columnist['slug'])) ?>" class="yazar-ust-isim"><?= e($columnist['name']) ?></a>
              <?php if (!empty($columnist['title'])): ?>
              <div class="yazar-ust-unvan"><?= e($columnist['title']) ?></div>
              <?php endif; ?>
            </div>
          </div>
          <?php endif; ?>

          <!-- Başlık -->
          <h1 class="haber-baslik" itemprop="headline"><?= e($post['title']) ?></h1>

          <!-- Spot -->
          <?php if ($spot): ?>
          <p class="haber-spot" style="border-left-color:<?= e($renk) ?>"><?= e($spot) ?></p>
          <?php endif; ?>

          <!-- Meta bilgiler (okuma süresi dahil) -->
          <div class="haber-meta-satir">
            <?php if (!empty($post['author_name'])): ?>
            <span><i class="fa fa-user"></i> <?= e($post['author_name']) ?></span>
            <?php endif; ?>
            <span><i class="fa fa-clock"></i> <?= ap_date($post['published_at'] ?? $post['created_at'], 'd M Y H:i') ?></span>
            <span class="okuma-suresi"><i class="fa fa-book-open"></i> <?= $okuma_dk ?> dk okuma</span>
            <span><i class="fa fa-eye"></i> <?= number_format((int)($post['view_count'] ?? 0)) ?></span>
          </div>

          <!-- Sosyal Paylaşım (5 platform) -->
          <div class="paylasim-sira">
            <span class="paylasim-lbl"><i class="fa fa-share-alt"></i> Paylaş:</span>
            <a href="https://www.facebook.com/sharer/sharer.php?u=<?= $shareUrl ?>" target="_blank" rel="noopener" class="paylasim-btn paylasim-fb" title="Facebook'ta Paylaş"><i class="fab fa-facebook-f"></i> <span>Facebook</span></a>
            <a href="https://twitter.com/intent/tweet?text=<?= $shareTitle ?>&url=<?= $shareUrl ?>" target="_blank" rel="noopener" class="paylasim-btn paylasim-tw" title="X'te Paylaş"><i class="fab fa-x-twitter"></i> <span>X</span></a>
            <a href="https://wa.me/?text=<?= $shareTitle ?>%20<?= $shareUrl ?>" target="_blank" rel="noopener" class="paylasim-btn paylasim-wa" title="WhatsApp'ta Paylaş"><i class="fab fa-whatsapp"></i> <span>WhatsApp</span></a>
            <a href="https://t.me/share/url?url=<?= $shareUrl ?>&text=<?= $shareTitle ?>" target="_blank" rel="noopener" class="paylasim-btn paylasim-tg" title="Telegram'da Paylaş"><i class="fab fa-telegram"></i> <span>Telegram</span></a>
            <a href="https://www.linkedin.com/shareArticle?mini=true&url=<?= $shareUrl ?>&title=<?= $shareTitle ?>" target="_blank" rel="noopener" class="paylasim-btn paylasim-li" title="LinkedIn'de Paylaş"><i class="fab fa-linkedin-in"></i> <span>LinkedIn</span></a>
          </div>
        </header>

        <!-- Kapak Görseli -->
        <?php if ($post['cover_image']): ?>
        <figure class="haber-kapak-sarici">
          <img src="<?= e(ap_thumb_url($post['cover_image'])) ?>" alt="<?= e($post['title']) ?>"
               class="haber-kapak-resim" loading="lazy" itemprop="image">
        </figure>
        <?php endif; ?>

        <!-- Haber İçi Reklam (üst) -->
        <?php if ($rek_ici_ust): ?><div class="reklam-ici-ust"><?= $rek_ici_ust ?></div><?php endif; ?>

        <!-- Haber İçeriği -->
        <div class="haber-icerik tek-icerik" itemprop="articleBody">
          <?= $post['content'] ?>
        </div>

        <!-- Haber İçi Reklam (alt) -->
        <?php if ($rek_ici_alt): ?><div class="reklam-ici-alt"><?= $rek_ici_alt ?></div><?php endif; ?>

        <!-- Etiketler -->
        <?php if ($post['tags']): ?>
        <div class="haber-etiketler">
          <span><i class="fa fa-tag"></i></span>
          <?php foreach (array_filter(array_map('trim', explode(',', $post['tags']))) as $tag): ?>
          <a href="<?= e(ap_url('etiket/'.Security::slug($tag))) ?>" class="etiket-pill"><?= e($tag) ?></a>
          <?php endforeach; ?>
        </div>
        <?php endif; ?>

        <!-- Alt Sosyal Paylaşım (tekrar) -->
        <div class="paylasim-sira paylasim-alt">
          <span class="paylasim-lbl"><i class="fa fa-share-alt"></i> Bu haberi paylaş:</span>
          <a href="https://www.facebook.com/sharer/sharer.php?u=<?= $shareUrl ?>" target="_blank" rel="noopener" class="paylasim-btn paylasim-fb"><i class="fab fa-facebook-f"></i> <span>Facebook</span></a>
          <a href="https://twitter.com/intent/tweet?text=<?= $shareTitle ?>&url=<?= $shareUrl ?>" target="_blank" rel="noopener" class="paylasim-btn paylasim-tw"><i class="fab fa-x-twitter"></i> <span>X</span></a>
          <a href="https://wa.me/?text=<?= $shareTitle ?>%20<?= $shareUrl ?>" target="_blank" rel="noopener" class="paylasim-btn paylasim-wa"><i class="fab fa-whatsapp"></i> <span>WhatsApp</span></a>
          <a href="https://t.me/share/url?url=<?= $shareUrl ?>&text=<?= $shareTitle ?>" target="_blank" rel="noopener" class="paylasim-btn paylasim-tg"><i class="fab fa-telegram"></i> <span>Telegram</span></a>
          <a href="https://www.linkedin.com/shareArticle?mini=true&url=<?= $shareUrl ?>&title=<?= $shareTitle ?>" target="_blank" rel="noopener" class="paylasim-btn paylasim-li"><i class="fab fa-linkedin-in"></i> <span>LinkedIn</span></a>
        </div>

        <!-- Köşe Yazarının Diğer Yazıları -->
        <?php if ($columnist): ?>
        <div class="yazar-diger-yazilar" id="yazarDigerYazilar">
          <div class="yazar-diger-baslik">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
              <img src="<?= e(ap_thumb_url($columnist['avatar'])) ?>" alt="<?= e($columnist['name']) ?>" style="width:48px;height:48px;border-radius:50%;object-fit:cover;border:3px solid <?= e($renk) ?>">
              <div>
                <div style="font-size:16px;font-weight:800;color:#1a1a1a"><?= e($columnist['name']) ?></div>
                <div style="font-size:12px;color:#888">Tüm Yazıları</div>
              </div>
              <a href="<?= e(ap_url('yazarlar')) ?>" style="margin-left:auto;font-size:12px;color:<?= e($renk) ?>;font-weight:700">Tüm Yazarlar →</a>
            </div>
            <h3 style="font-size:15px;font-weight:800;color:#1a1a1a;border-left:4px solid <?= e($renk) ?>;padding-left:10px;margin-bottom:14px">Yazarın Diğer Yazıları</h3>
          </div>
          <?php
          try {
            $yazar_yazilar = PostType::getPosts(['post_type'=>'columnist','status'=>'published','columnist_id'=>(int)$columnist['id'],'limit'=>6]);
            $yazar_yazilar = array_values(array_filter($yazar_yazilar, fn($p) => $p['id'] !== $post['id']));
          } catch (\Throwable) { $yazar_yazilar = []; }
          ?>
          <div class="yazar-yazi-grid" id="yazarYaziGrid">
            <?php foreach ($yazar_yazilar as $yz): ?>
            <article class="yazar-yazi-kart">
              <a href="<?= e(ap_url($yz['slug'])) ?>">
                <div class="yyz-resim" style="background-image:url('<?= e(ap_thumb_url($yz['cover_image'])) ?>')"></div>
                <h4 class="yyz-baslik"><?= e(mb_substr($yz['title'],0,70)) ?></h4>
                <div class="yyz-tarih"><i class="fa fa-clock"></i> <?= ap_time_ago($yz['published_at']??$yz['created_at']) ?></div>
              </a>
            </article>
            <?php endforeach; ?>
          </div>
          <?php
          $yazar_toplam = (int)DB::queryValue("SELECT COUNT(*) FROM `{p}posts` WHERE post_type='columnist' AND status='published' AND columnist_id=? AND id!=?", [$columnist['id'], $post['id']]);
          if ($yazar_toplam > 6): ?>
          <div style="text-align:center;margin-top:16px">
            <button id="dahaFazlaYazi" class="daha-fazla-btn"
                    data-yazar="<?= (int)$columnist['id'] ?>" data-sayfa="2" data-mevcut-id="<?= (int)$post['id'] ?>">
              Daha Fazla Yazı Yükle
            </button>
          </div>
          <?php endif; ?>
        </div>
        <?php endif; ?>

        <!-- Sonsuz Haber Yükleme -->
        <div id="sonrakiHaberKonteyner"></div>
        <div id="haberYuklemeAlani" style="text-align:center;padding:30px">
          <button id="sonrakiHaberBtn" class="sonraki-haber-btn"
                  data-kat-id="<?= $catId ?>" data-mevcut-id="<?= $post['id'] ?>">
            <i class="fa fa-angle-double-down"></i> Sıradaki Habere Git
          </button>
        </div>

      </article>

      <!-- SIDEBAR -->
      <aside class="sidebar">
        <?php if ($rek_sb_ust): ?><div class="reklam-sidebar-ust"><?= $rek_sb_ust ?></div><?php endif; ?>
        <?php Widget::area('sidebar'); ?>
        <div class="widget">
          <h3 class="widget-title"><i class="fa fa-fire"></i> Son Haberler</h3>
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
        <?php if ($rek_sb_alt): ?><div class="reklam-sidebar-alt"><?= $rek_sb_alt ?></div><?php endif; ?>
      </aside>

    </div>
  </div>
</main>

<style>
/* Ekmek Kırıntısı */
.ekmek-kirintisi{font-size:12px;color:#888;margin-bottom:16px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.ekmek-kirintisi a{color:#888;transition:.15s}.ekmek-kirintisi a:hover{color:#CC0000}
.ekmek-kirintisi .son{color:#333}

/* Başlık alanı */
.haber-baslik-alani{background:#fff;padding:24px;border-radius:10px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,.07)}

/* Son Dakika */
.son-dakika-rozet{display:inline-flex;align-items:center;gap:6px;color:#fff;font-size:12px;font-weight:800;padding:4px 12px;border-radius:4px;margin-bottom:10px;letter-spacing:.5px;animation:blink-border 1.2s ease infinite}
@keyframes blink-border{0%,100%{opacity:1}50%{opacity:.7}}
.son-dakika-anten{font-size:14px;animation:pulse-ant .8s ease infinite}
@keyframes pulse-ant{0%,100%{transform:scale(1)}50%{transform:scale(1.2)}}

/* Kategori etiketi */
.kat-etiket{display:inline-block;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.7px;padding:3px 10px;border:1.5px solid;border-radius:3px;margin-bottom:10px;transition:.15s}
.kat-etiket:hover{background-color:currentColor;color:#fff}

/* Köşe yazarı üst kartı */
.yazar-ust-kart{display:flex;align-items:center;gap:12px;padding:10px 14px;background:#f8f9fa;border-radius:8px;margin-bottom:14px;border-left:3px solid var(--ap-ana,#CC0000)}
.yazar-ust-foto{width:46px;height:46px;border-radius:50%;object-fit:cover;border:2px solid #ddd}
.yazar-ust-isim{font-size:14px;font-weight:800;color:#1a1a1a}
.yazar-ust-unvan{font-size:11px;color:#888;margin-top:2px}

/* Başlık */
.haber-baslik{font-size:26px;font-weight:900;color:#1a1a1a;line-height:1.35;margin:0 0 14px}

/* Spot */
.haber-spot{font-size:16px;color:#444;line-height:1.7;border-left:4px solid #CC0000;padding-left:16px;margin:0 0 14px;font-style:italic}

/* Meta satır */
.haber-meta-satir{display:flex;align-items:center;gap:16px;flex-wrap:wrap;font-size:12px;color:#888;margin-bottom:16px}
.haber-meta-satir span{display:flex;align-items:center;gap:4px}
.okuma-suresi{background:#f0f0f0;padding:2px 8px;border-radius:10px;color:#555;font-weight:600}

/* Sosyal paylaşım */
.paylasim-sira{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:4px}
.paylasim-lbl{font-size:12px;color:#888;font-weight:600;margin-right:4px}
.paylasim-btn{display:inline-flex;align-items:center;gap:5px;padding:7px 12px;border-radius:5px;font-size:12px;font-weight:700;color:#fff!important;text-decoration:none;transition:.2s}
.paylasim-btn:hover{opacity:.85;transform:translateY(-1px)}
.paylasim-btn span{display:inline}
@media(max-width:600px){.paylasim-btn span{display:none}}
.paylasim-fb{background:#1877F2}.paylasim-tw{background:#000}.paylasim-wa{background:#25D366}
.paylasim-tg{background:#0088CC}.paylasim-li{background:#0A66C2}
.paylasim-alt{margin-top:20px;padding-top:20px;border-top:1px solid #eee}

/* Kapak resim */
.haber-kapak-sarici{margin:0 0 18px;border-radius:10px;overflow:hidden}
.haber-kapak-resim{width:100%;max-height:520px;object-fit:cover;display:block}

/* Haber içeriği */
.tek-icerik{font-size:16px;line-height:1.8;color:#222}
.tek-icerik p{margin:0 0 16px}
.tek-icerik img{max-width:100%;border-radius:8px;height:auto}
.tek-icerik h2{font-size:20px;font-weight:800;color:#1a1a1a;margin:24px 0 12px}
.tek-icerik h3{font-size:18px;font-weight:700;color:#1a1a1a;margin:20px 0 10px}
.tek-icerik blockquote{border-left:4px solid #CC0000;margin:16px 0;padding:10px 16px;background:#fafafa;font-style:italic;color:#444}

/* Reklam alanları */
.reklam-ici-ust,.reklam-ici-alt{margin:20px 0;text-align:center}
.reklam-sidebar-ust,.reklam-sidebar-alt{margin-bottom:16px}

/* Etiketler */
.haber-etiketler{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:20px;padding-top:16px;border-top:1px solid #eee}
.etiket-pill{background:#f0f0f0;color:#555;font-size:11px;padding:4px 10px;border-radius:20px;transition:.2s;text-decoration:none}
.etiket-pill:hover{background:#CC0000;color:#fff}

/* Yazarın diğer yazıları */
.yazar-diger-yazilar{background:#fff;border-radius:10px;padding:22px;margin-top:28px;box-shadow:0 2px 8px rgba(0,0,0,.07)}
.yazar-yazi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
@media(max-width:600px){.yazar-yazi-grid{grid-template-columns:1fr 1fr}}
.yazar-yazi-kart a{display:block;text-decoration:none;color:inherit}
.yyz-resim{height:120px;background-size:cover;background-position:center;border-radius:8px;background-color:#f3f4f6}
.yyz-baslik{font-size:13px;font-weight:700;color:#1a1a1a;line-height:1.4;margin:8px 0 4px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.yyz-tarih{font-size:11px;color:#888}

/* Daha fazla butonu */
.daha-fazla-btn{background:#f0f0f0;border:none;border-radius:6px;padding:10px 24px;font-size:14px;font-weight:600;cursor:pointer;color:#374151;transition:.2s}
.daha-fazla-btn:hover{background:#CC0000;color:#fff}
.daha-fazla-btn:disabled{opacity:.6;cursor:wait}

/* Sonsuz yükleme */
.sonraki-haber-btn{background:#CC0000;color:#fff;border:none;border-radius:8px;padding:12px 32px;font-size:15px;font-weight:700;cursor:pointer;transition:.2s;display:inline-flex;align-items:center;gap:8px}
.sonraki-haber-btn:hover{background:#a80000;transform:translateY(-1px)}
.sonraki-haber-btn:disabled{opacity:.6;cursor:wait}
.sonraki-haber-ayirici{text-align:center;margin:30px 0;position:relative}
.sonraki-haber-ayirici::before{content:'';position:absolute;top:50%;left:0;right:0;height:1px;background:#e5e7eb}
.sonraki-haber-ayirici span{background:#f3f4f6;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:600;color:#CC0000;position:relative;border:1px solid #e5e7eb}
.yukleniyor-spinner{display:inline-block;width:20px;height:20px;border:3px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
</style>

<script>
(function(){
  var katId  = '<?= $catId ?>';
  var mvcId  = '<?= $post['id'] ?>';
  var sayfa  = 1;
  var yukleniyor = false;
  var bitti  = false;
  var hataSay= 0;
  var btn    = document.getElementById('sonrakiHaberBtn');
  var konteyner = document.getElementById('sonrakiHaberKonteyner');

  function sonrakiHaberiYukle() {
    if (yukleniyor || bitti || hataSay >= 3) return;
    yukleniyor = true;
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="yukleniyor-spinner"></span> Yükleniyor...'; }

    fetch('/api/?action=next_article&cat_id=' + katId + '&current_id=' + mvcId + '&page=' + sayfa, {
      headers: {'X-Requested-With': 'XMLHttpRequest'}
    }).then(function(r){ return r.json(); }).then(function(data) {
      yukleniyor = false;
      if (!data.success || !data.html) {
        hataSay++;
        if (hataSay >= 3 || !data.html) {
          bitti = true;
          if (btn) { btn.textContent = 'Başa Dön'; btn.disabled = false; btn.onclick = function(){ window.scrollTo({top:0,behavior:'smooth'}); }; }
          return;
        }
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa fa-angle-double-down"></i> Sıradaki Habere Git'; }
        return;
      }
      hataSay = 0;
      sayfa++;
      mvcId = data.post_id;

      // Ayırıcı
      var ayirici = document.createElement('div');
      ayirici.className = 'sonraki-haber-ayirici';
      ayirici.innerHTML = '<span>⚡ Sıradaki Haber</span>';
      konteyner.appendChild(ayirici);

      // İçerik
      var div = document.createElement('div');
      div.className = 'sonraki-haber-wrap';
      div.innerHTML = data.html;
      konteyner.appendChild(div);

      // URL güncelle
      if (data.url && data.title && window.history && window.history.pushState) {
        window.history.pushState({url: data.url}, data.title, data.url);
        document.title = data.title + ' - ' + document.title.split(' - ').pop();
      }

      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa fa-angle-double-down"></i> Daha Fazla Haber'; }
    }).catch(function(e) {
      yukleniyor = false;
      hataSay++;
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa fa-angle-double-down"></i> Tekrar Dene'; }
    });
  }

  // Buton tıklama
  if (btn) btn.addEventListener('click', sonrakiHaberiYukle);

  // IntersectionObserver - sayfa sonuna gelince otomatik yükle
  var sentinel = document.getElementById('haberYuklemeAlani');
  if (sentinel && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function(entries) {
      if (entries[0].isIntersecting && !yukleniyor && !bitti) sonrakiHaberiYukle();
    }, { rootMargin: '300px' });
    observer.observe(sentinel);
  }

  // Yazarın diğer yazıları — daha fazla yükle
  var dahaFazlaBtn = document.getElementById('dahaFazlaYazi');
  if (dahaFazlaBtn) {
    dahaFazlaBtn.addEventListener('click', function(){
      var yazarId = this.dataset.yazar;
      var sayfaNo = parseInt(this.dataset.sayfa);
      var mvcYaziId = '<?= $post['id'] ?>';
      this.disabled = true; this.textContent = 'Yükleniyor...';
      var self = this;

      fetch('/api/?action=yazar_yazilari&yazar_id=' + yazarId + '&page=' + sayfaNo + '&current_id=' + mvcYaziId, {
        headers: {'X-Requested-With': 'XMLHttpRequest'}
      }).then(r=>r.json()).then(function(data) {
        self.disabled = false;
        if (data.success && data.html) {
          var grid = document.getElementById('yazarYaziGrid');
          if (grid) grid.insertAdjacentHTML('beforeend', data.html);
          self.dataset.sayfa = sayfaNo + 1;
          self.textContent = 'Daha Fazla Yazı Yükle';
          if (!data.has_more) { self.style.display = 'none'; }
        } else {
          self.style.display = 'none';
        }
      }).catch(function(){ self.disabled=false; self.textContent='Tekrar Dene'; });
    });
  }
})();
</script>

<?php Theme::partial('footer'); ?>
