<?php
/**
 * AnkaraHaber — Ana Sayfa (Tüm Bölümler)
 * Bölümler: Manşet | Spor 3×2 | Gastro | YouTube | Aktüel | Son Eklenenler
 *            Dinamik Kategori Blokları | Popüler | Reklam Alanları
 */
defined('ROOT') or die();
Theme::partial('header');

// Reklam alanları
$rek_baslik_alti    = DB::setting('reklam_baslik_alti', '');
$rek_manset_alti    = DB::setting('reklam_manset_alti', '');
$rek_bolumler_arasi = DB::setting('reklam_bolumler_arasi', '');
$rek_footer_ustu    = DB::setting('reklam_footer_ustu', '');
$rek_sk_sol         = DB::setting('reklam_skyscraper_sol', '');
$rek_sk_sag         = DB::setting('reklam_skyscraper_sag', '');

// Kategori slugları (tema ayarlarından)
$kat_sluglar     = array_filter(array_map('trim', explode(',', DB::setting('navbar_kategori_sluglari', 'gundem,ekonomi,spor,magazin'))));
$spor_slug       = DB::setting('anasayfa_spor_slug', 'spor');
$gastro_slug     = DB::setting('anasayfa_gastro_slug', 'yasam');
$aktuel_slug     = DB::setting('anasayfa_aktuel_slug', 'gundem');

// Manşet haberleri
$mansetCount    = max(3, min(7, (int)DB::setting('theme_manset_count', 5)));
$surmansetCount = max(2, min(6, (int)DB::setting('theme_surmanset_count', 4)));
$mansetHaberler = [];
try {
    $mansetHaberler = PostType::getPosts(['post_type'=>'news','status'=>'published','is_breaking'=>1,'limit'=>$mansetCount+$surmansetCount,'order_by'=>'published_at']);
    if (count($mansetHaberler) < $mansetCount) {
        $mansetHaberler = PostType::getPosts(['post_type'=>'news','status'=>'published','limit'=>$mansetCount+$surmansetCount,'order_by'=>'published_at']);
    }
} catch (\Throwable) {}
$mansetler    = array_slice($mansetHaberler, 0, $mansetCount);
$surmansetler = array_slice($mansetHaberler, $mansetCount, $surmansetCount);

// Kategori rengi helper
function ahk_renk(int $catId): string {
    static $cache = [];
    if (isset($cache[$catId])) return $cache[$catId];
    try { $r = DB::queryRow("SELECT color FROM `{p}categories` WHERE id=?", [$catId]); }
    catch (\Throwable) { $r = null; }
    return $cache[$catId] = $r['color'] ?? '#CC0000';
}

// Kategoriden haber getir
function ahk_kathaberleri(string $slug, int $limit = 6): array {
    static $katCache = [];
    if (isset($katCache[$slug])) return $katCache[$slug];
    try {
        $cat = DB::queryRow("SELECT * FROM `{p}categories` WHERE slug=?", [$slug]);
        if (!$cat) return [];
        $haberler = PostType::getPosts(['post_type'=>'news','status'=>'published','category_id'=>(int)$cat['id'],'limit'=>$limit]);
        return $katCache[$slug] = [$cat, $haberler];
    } catch (\Throwable) { return []; }
}

// Bölüm başlığı helper
function ahk_bolum_baslik(string $baslik1, string $baslik2, string $link_url='', string $renk='#CC0000'): void {
?>
<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;border-bottom:3px solid <?= e($renk) ?>;padding-bottom:12px">
  <div style="width:5px;height:30px;background:<?= e($renk) ?>;border-radius:3px;flex-shrink:0"></div>
  <h2 style="font-size:18px;font-weight:900;color:#1a1a1a;margin:0">
    <span style="color:<?= e($renk) ?>"><?= e($baslik1) ?></span><?php if($baslik2): ?> <span><?= e($baslik2) ?></span><?php endif; ?>
  </h2>
  <?php if($link_url): ?>
  <a href="<?= e($link_url) ?>" style="margin-left:auto;font-size:12px;color:<?= e($renk) ?>;font-weight:700">Tümü <i class="fa fa-arrow-right"></i></a>
  <?php endif; ?>
</div>
<?php
}

$siteUrl = ap_url();
?>

<!-- Başlık Altı Reklam -->
<?php if ($rek_baslik_alti): ?><div style="text-align:center;padding:10px 0;background:#f8f9fa;border-bottom:1px solid #e5e7eb"><div class="container"><?= $rek_baslik_alti ?></div></div><?php endif; ?>

<main class="site-main">
  <div class="container" style="position:relative">

    <!-- Skyscraper Reklam Alanları -->
    <?php if ($rek_sk_sol): ?>
    <div class="skyscraper-sol" style="position:fixed;left:calc((100vw - 1200px)/2 - 180px);top:50%;transform:translateY(-50%);width:160px;z-index:100"><?= $rek_sk_sol ?></div>
    <?php endif; ?>
    <?php if ($rek_sk_sag): ?>
    <div class="skyscraper-sag" style="position:fixed;right:calc((100vw - 1200px)/2 - 180px);top:50%;transform:translateY(-50%);width:160px;z-index:100"><?= $rek_sk_sag ?></div>
    <?php endif; ?>

    <!-- ══════════════════════════════════════════
         1. MANŞET BLOĞU
    ══════════════════════════════════════════ -->
    <?php if (!empty($mansetler)): ?>
    <section class="mansetsarac" style="margin-bottom:32px">
      <div class="manset-ana-grid">
        <!-- Büyük Manşet -->
        <?php $ana = $mansetler[0]; $anaRenk = ahk_renk((int)$ana['category_id']); ?>
        <article class="ana-manset">
          <a href="<?= e(ap_url($ana['slug'])) ?>" class="ana-manset-link">
            <div class="ana-manset-resim" style="background-image:url('<?= e(ap_thumb_url($ana['cover_image'])) ?>')">
              <div class="manset-karanlik"></div>
              <?php if ($ana['is_breaking']): ?>
              <span class="manset-son-dakika" style="background:<?= e($anaRenk) ?>">⚡ SON DAKİKA</span>
              <?php endif; ?>
              <?php if (!empty($ana['cat_name'])): ?>
              <span class="manset-kat-etiketi" style="background:<?= e($anaRenk) ?>"><?= e($ana['cat_name']) ?></span>
              <?php endif; ?>
            </div>
            <div class="ana-manset-alt">
              <h2 class="manset-baslik"><?= e($ana['title']) ?></h2>
              <?php if ($ana['excerpt']): ?>
              <p class="manset-spot"><?= e(mb_substr($ana['excerpt'],0,120)) ?>…</p>
              <?php endif; ?>
              <div class="manset-meta"><i class="fa fa-clock"></i> <?= ap_time_ago($ana['published_at']??$ana['created_at']) ?></div>
            </div>
          </a>
        </article>

        <!-- Yan Manşetler -->
        <?php if (count($mansetler) > 1): ?>
        <div class="yan-mansetler">
          <?php foreach (array_slice($mansetler, 1, 4) as $ym): $ymRenk = ahk_renk((int)$ym['category_id']); ?>
          <article class="yan-manset-item">
            <a href="<?= e(ap_url($ym['slug'])) ?>">
              <div class="yan-manset-resim" style="background-image:url('<?= e(ap_thumb_url($ym['cover_image'])) ?>')">
                <div class="manset-karanlik" style="opacity:.5"></div>
                <?php if (!empty($ym['cat_name'])): ?>
                <span class="manset-kat-etiketi sm" style="background:<?= e($ymRenk) ?>"><?= e($ym['cat_name']) ?></span>
                <?php endif; ?>
              </div>
              <h3 class="yan-manset-baslik"><?= e(mb_substr($ym['title'],0,80)) ?></h3>
              <div style="font-size:11px;color:#888;margin-top:3px"><i class="fa fa-clock"></i> <?= ap_time_ago($ym['published_at']??$ym['created_at']) ?></div>
            </a>
          </article>
          <?php endforeach; ?>
        </div>
        <?php endif; ?>

        <!-- Sürmantşetler -->
        <?php if (!empty($surmansetler)): ?>
        <div class="surmanset-sira">
          <?php foreach ($surmansetler as $sm): ?>
          <article class="surmanset-item">
            <a href="<?= e(ap_url($sm['slug'])) ?>">
              <div class="surmanset-resim" style="background-image:url('<?= e(ap_thumb_url($sm['cover_image'])) ?>')"></div>
              <h4 class="surmanset-baslik"><?= e(mb_substr($sm['title'],0,70)) ?></h4>
            </a>
          </article>
          <?php endforeach; ?>
        </div>
        <?php endif; ?>
      </div>
    </section>
    <?php endif; ?>

    <!-- Manşet Altı Reklam -->
    <?php if ($rek_manset_alti): ?><div class="reklam-blok"><?= $rek_manset_alti ?></div><?php endif; ?>

    <!-- ══════════════════════════════════════════
         2. SPOR BÖLÜMÜ (3×2 grid)
    ══════════════════════════════════════════ -->
    <?php
    $spor_veri = ahk_kathaberleri($spor_slug, 6);
    if (!empty($spor_veri) && !empty($spor_veri[1])):
        $spor_cat    = $spor_veri[0];
        $spor_habers = $spor_veri[1];
        $spor_renk   = $spor_cat['color'] ?? '#e84c3d';
    ?>
    <section class="spor-bolumu" style="margin-bottom:32px">
      <?php ahk_bolum_baslik('SPOR', '', ap_url($spor_slug), $spor_renk); ?>
      <div class="spor-3x2-grid">
        <?php foreach (array_slice($spor_habers, 0, 6) as $sh): ?>
        <article class="spor-kart">
          <a href="<?= e(ap_url($sh['slug'])) ?>">
            <div class="spor-kart-resim" style="background-image:url('<?= e(ap_thumb_url($sh['cover_image'])) ?>')">
              <div class="manset-karanlik"></div>
              <?php if ($sh['is_breaking']): ?>
              <span class="manset-son-dakika xsm" style="background:<?= e($spor_renk) ?>">⚡ SON DAKİKA</span>
              <?php endif; ?>
            </div>
            <h3 class="spor-kart-baslik"><?= e(mb_substr($sh['title'],0,70)) ?></h3>
            <div class="spor-kart-meta"><i class="fa fa-clock"></i> <?= ap_time_ago($sh['published_at']??$sh['created_at']) ?></div>
          </a>
        </article>
        <?php endforeach; ?>
      </div>
    </section>
    <?php endif; ?>

    <!-- Bölümler Arası Reklam 1 -->
    <?php if ($rek_bolumler_arasi): ?><div class="reklam-blok"><?= $rek_bolumler_arasi ?></div><?php endif; ?>

    <!-- ══════════════════════════════════════════
         3. GASTRO/YAŞAM BÖLÜMÜ (2 büyük + 4 mini)
    ══════════════════════════════════════════ -->
    <?php
    $gastro_veri = ahk_kathaberleri($gastro_slug, 6);
    if (!empty($gastro_veri) && !empty($gastro_veri[1])):
        $gastro_cat    = $gastro_veri[0];
        $gastro_habers = $gastro_veri[1];
        $gastro_renk   = $gastro_cat['color'] ?? '#8b5cf6';
        $gastro_ad     = strtoupper($gastro_cat['name'] ?? 'YAŞAM');
    ?>
    <section class="gastro-bolumu" style="margin-bottom:32px">
      <?php ahk_bolum_baslik($gastro_ad, '', ap_url($gastro_slug), $gastro_renk); ?>
      <div class="gastro-grid">
        <!-- 2 büyük kart -->
        <?php foreach (array_slice($gastro_habers, 0, 2) as $gh): ?>
        <article class="gastro-buyuk-kart">
          <a href="<?= e(ap_url($gh['slug'])) ?>">
            <div class="gastro-buyuk-resim" style="background-image:url('<?= e(ap_thumb_url($gh['cover_image'])) ?>')">
              <div class="manset-karanlik"></div>
              <div class="gastro-buyuk-alt">
                <span class="manset-kat-etiketi" style="background:<?= e($gastro_renk) ?>"><?= e($gastro_cat['name']) ?></span>
                <h3 class="gastro-buyuk-baslik"><?= e(mb_substr($gh['title'],0,80)) ?></h3>
                <div style="font-size:11px;color:rgba(255,255,255,.7)"><i class="fa fa-clock"></i> <?= ap_time_ago($gh['published_at']??$gh['created_at']) ?></div>
              </div>
            </div>
          </a>
        </article>
        <?php endforeach; ?>
        <!-- 4 mini kart -->
        <div class="gastro-mini-kolonlar">
          <?php foreach (array_slice($gastro_habers, 2, 4) as $gm): ?>
          <article class="gastro-mini-kart">
            <a href="<?= e(ap_url($gm['slug'])) ?>">
              <div class="gastro-mini-resim" style="background-image:url('<?= e(ap_thumb_url($gm['cover_image'])) ?>')"></div>
              <div class="gastro-mini-icerik">
                <h4 class="gastro-mini-baslik"><?= e(mb_substr($gm['title'],0,60)) ?></h4>
                <div style="font-size:11px;color:#888"><i class="fa fa-clock"></i> <?= ap_time_ago($gm['published_at']??$gm['created_at']) ?></div>
              </div>
            </a>
          </article>
          <?php endforeach; ?>
        </div>
      </div>
    </section>
    <?php endif; ?>

    <!-- ══════════════════════════════════════════
         4. YOUTUBE VİDEOLAR BÖLÜMÜ (4'lü şerit)
    ══════════════════════════════════════════ -->
    <?php
    $videolar = [];
    try { $videolar = DB::query("SELECT * FROM `{p}videos` WHERE published=1 ORDER BY id DESC LIMIT 8") ?: []; }
    catch (\Throwable) {}
    if (!empty($videolar)):
    ?>
    <section class="youtube-bolumu" style="margin-bottom:32px">
      <?php ahk_bolum_baslik('VİDEO', 'TV', ap_url('video-tv'), '#e94560'); ?>
      <div class="youtube-4li-grid">
        <?php foreach (array_slice($videolar, 0, 4) as $vid):
            $thumb = $vid['thumbnail'] ?: 'https://img.youtube.com/vi/' . e($vid['video_id']) . '/hqdefault.jpg';
            $ytUrl = 'https://www.youtube.com/watch?v=' . $vid['video_id'];
        ?>
        <article class="youtube-kart">
          <a href="<?= e($ytUrl) ?>" target="_blank" rel="noopener noreferrer">
            <div class="youtube-thumb" style="background-image:url('<?= e($thumb) ?>')">
              <div class="youtube-oynat-btn"><i class="fa fa-play"></i></div>
            </div>
            <h4 class="youtube-kart-baslik"><?= e(mb_substr($vid['title'],0,60)) ?></h4>
            <?php if ($vid['category']): ?><div style="font-size:11px;color:#e94560;font-weight:600"><?= e($vid['category']) ?></div><?php endif; ?>
          </a>
        </article>
        <?php endforeach; ?>
      </div>
    </section>
    <?php endif; ?>

    <!-- Bölümler Arası Reklam 2 -->
    <?php if ($rek_bolumler_arasi): ?><div class="reklam-blok"><?= $rek_bolumler_arasi ?></div><?php endif; ?>

    <!-- ══════════════════════════════════════════
         5. AKTÜEL BÖLÜMÜ (4'lü kolon)
    ══════════════════════════════════════════ -->
    <?php
    $aktuel_veri = ahk_kathaberleri($aktuel_slug, 8);
    if (!empty($aktuel_veri) && !empty($aktuel_veri[1])):
        $aktuel_cat    = $aktuel_veri[0];
        $aktuel_habers = $aktuel_veri[1];
        $aktuel_renk   = $aktuel_cat['color'] ?? '#CC0000';
        $aktuel_ad     = strtoupper($aktuel_cat['name'] ?? 'AKTÜEL');
    ?>
    <section class="aktuel-bolumu" style="margin-bottom:32px">
      <?php ahk_bolum_baslik($aktuel_ad, '', ap_url($aktuel_slug), $aktuel_renk); ?>
      <div class="dort-li-grid">
        <?php foreach (array_slice($aktuel_habers, 0, 4) as $ah): ?>
        <article class="oda-kart">
          <a href="<?= e(ap_url($ah['slug'])) ?>">
            <div class="oda-kart-resim" style="background-image:url('<?= e(ap_thumb_url($ah['cover_image'])) ?>')">
              <?php if ($ah['is_breaking']): ?>
              <span class="manset-son-dakika xsm" style="background:<?= e($aktuel_renk) ?>">⚡</span>
              <?php endif; ?>
            </div>
            <h3 class="oda-kart-baslik"><?= e(mb_substr($ah['title'],0,80)) ?></h3>
            <div class="oda-kart-meta"><i class="fa fa-clock"></i> <?= ap_time_ago($ah['published_at']??$ah['created_at']) ?></div>
          </a>
        </article>
        <?php endforeach; ?>
      </div>
    </section>
    <?php endif; ?>

    <!-- ══════════════════════════════════════════
         6. SON EKLENENLER BÖLÜMÜ (4'lü kolon, 8 haber)
    ══════════════════════════════════════════ -->
    <?php
    $son_haberler = [];
    try { $son_haberler = PostType::getPosts(['post_type'=>'news','status'=>'published','limit'=>8,'order_by'=>'created_at']); }
    catch (\Throwable) {}
    if (!empty($son_haberler)):
    ?>
    <section class="son-eklenenler-bolumu" style="margin-bottom:32px">
      <?php ahk_bolum_baslik('SON', 'EKLENENLER', ap_url('son-haberler'), '#1a1a2e'); ?>
      <div class="dort-li-grid">
        <?php foreach (array_slice($son_haberler, 0, 4) as $se): ?>
        <article class="oda-kart">
          <a href="<?= e(ap_url($se['slug'])) ?>">
            <div class="oda-kart-resim" style="background-image:url('<?= e(ap_thumb_url($se['cover_image'])) ?>')">
              <span class="yeni-etiket">YENİ</span>
            </div>
            <h3 class="oda-kart-baslik"><?= e(mb_substr($se['title'],0,80)) ?></h3>
            <div class="oda-kart-meta"><i class="fa fa-clock"></i> <?= ap_time_ago($se['published_at']??$se['created_at']) ?></div>
          </a>
        </article>
        <?php endforeach; ?>
      </div>
      <!-- İkinci satır -->
      <div class="dort-li-grid" style="margin-top:14px">
        <?php foreach (array_slice($son_haberler, 4, 4) as $se): ?>
        <article class="oda-kart">
          <a href="<?= e(ap_url($se['slug'])) ?>">
            <div class="oda-kart-resim" style="background-image:url('<?= e(ap_thumb_url($se['cover_image'])) ?>')"></div>
            <h3 class="oda-kart-baslik"><?= e(mb_substr($se['title'],0,80)) ?></h3>
            <div class="oda-kart-meta"><i class="fa fa-clock"></i> <?= ap_time_ago($se['published_at']??$se['created_at']) ?></div>
          </a>
        </article>
        <?php endforeach; ?>
      </div>
    </section>
    <?php endif; ?>

    <!-- ══════════════════════════════════════════
         7. DİNAMİK KATEGORİ BLOKLARI
            (Admin panelden eklenenler — Anasayfa Modülleri)
    ══════════════════════════════════════════ -->
    <?php
    $moduller = [];
    try { $moduller = DB::query("SELECT * FROM `{p}settings` WHERE `key` LIKE 'modul_kat_%' ORDER BY `key` ASC") ?: []; }
    catch (\Throwable) {}
    foreach ($moduller as $m) {
        $slug = trim($m['value'] ?? '');
        if (!$slug) continue;
        $mdveri = ahk_kathaberleri($slug, 7);
        if (empty($mdveri) || empty($mdveri[1])) continue;
        $md_cat    = $mdveri[0];
        $md_habers = $mdveri[1];
        $md_renk   = $md_cat['color'] ?? '#CC0000';
        $md_ad     = strtoupper($md_cat['name']);
        $md_ana    = $md_habers[0];
        $md_diger  = array_slice($md_habers, 1, 4);
    ?>
    <section class="dinamik-kat-blok" style="margin-bottom:32px">
      <?php ahk_bolum_baslik($md_ad, '', ap_url($slug), $md_renk); ?>
      <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:14px">
        <article>
          <a href="<?= e(ap_url($md_ana['slug'])) ?>">
            <div style="height:220px;background-image:url('<?= e(ap_thumb_url($md_ana['cover_image'])) ?>');background-size:cover;background-position:center;border-radius:8px;position:relative;overflow:hidden">
              <div class="manset-karanlik"></div>
              <span class="manset-kat-etiketi" style="background:<?= e($md_renk) ?>"><?= e($md_cat['name']) ?></span>
            </div>
            <h3 style="font-size:15px;font-weight:800;color:#1a1a1a;line-height:1.4;margin:10px 0 4px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden"><?= e($md_ana['title']) ?></h3>
            <div style="font-size:11px;color:#888"><i class="fa fa-clock"></i> <?= ap_time_ago($md_ana['published_at']??$md_ana['created_at']) ?></div>
          </a>
        </article>
        <?php foreach ($md_diger as $mh): ?>
        <article>
          <a href="<?= e(ap_url($mh['slug'])) ?>">
            <div style="height:120px;background-image:url('<?= e(ap_thumb_url($mh['cover_image'])) ?>');background-size:cover;background-position:center;border-radius:8px"></div>
            <h4 style="font-size:13px;font-weight:700;color:#1a1a1a;line-height:1.4;margin:8px 0 3px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden"><?= e($mh['title']) ?></h4>
            <div style="font-size:11px;color:#888"><i class="fa fa-clock"></i> <?= ap_time_ago($mh['published_at']??$mh['created_at']) ?></div>
          </a>
        </article>
        <?php endforeach; ?>
      </div>
    </section>
    <?php } ?>

    <!-- ══════════════════════════════════════════
         8. POPÜLER HABERLER (yorum sayısına göre, 10 haber, 2 kolonlu)
    ══════════════════════════════════════════ -->
    <?php
    $populer = [];
    try {
        $populer = DB::query("SELECT p.*, c.name as cat_name, c.slug as cat_slug, c.color as cat_renk FROM `{p}posts` p LEFT JOIN `{p}categories` c ON c.id=p.category_id WHERE p.status='published' AND p.post_type='news' ORDER BY p.views DESC, p.id DESC LIMIT 10") ?: [];
    } catch (\Throwable) {}
    if (!empty($populer)):
    ?>
    <section class="populer-haberler" style="margin-bottom:32px">
      <?php ahk_bolum_baslik('POPÜLER', 'HABERLER', '', '#f59e0b'); ?>
      <div class="populer-2-kolon">
        <?php foreach ($populer as $i => $ph): ?>
        <article class="populer-item">
          <div class="populer-no" style="<?= $i < 3 ? 'background:#e94560;color:#fff' : '' ?>"><?= $i + 1 ?></div>
          <div class="populer-icerik">
            <a href="<?= e(ap_url($ph['slug'])) ?>" class="populer-baslik"><?= e(mb_substr($ph['title'],0,80)) ?></a>
            <div class="populer-meta">
              <?php if ($ph['cat_name']): ?>
              <a href="<?= e(ap_url($ph['cat_slug'])) ?>" style="color:<?= e($ph['cat_renk'] ?? '#CC0000') ?>;font-size:11px;font-weight:700"><?= e($ph['cat_name']) ?></a> &bull;
              <?php endif; ?>
              <span><i class="fa fa-eye"></i> <?= number_format((int)$ph['views']) ?></span> &bull;
              <span><?= ap_time_ago($ph['published_at']??$ph['created_at']) ?></span>
            </div>
          </div>
          <div class="populer-resim" style="background-image:url('<?= e(ap_thumb_url($ph['cover_image'])) ?>')"></div>
        </article>
        <?php endforeach; ?>
      </div>
    </section>
    <?php endif; ?>

    <!-- Footer Üstü Reklam -->
    <?php if ($rek_footer_ustu): ?><div class="reklam-blok" style="text-align:center;margin-bottom:24px"><?= $rek_footer_ustu ?></div><?php endif; ?>

  </div><!-- .container -->
</main>

<style>
/* ── GENEL ─────────────────────────── */
.reklam-blok{text-align:center;margin:20px 0;padding:10px 0}
.manset-karanlik{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.75) 0,transparent 60%)}
.manset-son-dakika{position:absolute;top:10px;left:10px;color:#fff;font-size:10px;font-weight:800;padding:3px 9px;border-radius:3px;letter-spacing:.4px}
.manset-son-dakika.xsm{font-size:9px;padding:2px 6px;top:7px;left:7px}
.manset-son-dakika.sm{font-size:9px;padding:2px 6px}
.manset-kat-etiketi{position:absolute;bottom:10px;left:10px;color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:3px}
.manset-kat-etiketi.sm{font-size:9px;padding:2px 6px}

/* ── MANŞET ─────────────────────────── */
.manset-ana-grid{display:grid;grid-template-columns:2fr 1fr;grid-template-rows:auto auto;gap:14px}
.ana-manset{grid-row:1/2}
.yan-mansetler{display:grid;grid-template-rows:repeat(2,1fr);gap:10px}
.surmanset-sira{grid-column:1/-1;display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
@media(max-width:768px){.manset-ana-grid{grid-template-columns:1fr}.yan-mansetler{grid-template-rows:1fr 1fr}.surmanset-sira{grid-template-columns:repeat(2,1fr)}}
.ana-manset-link{display:block;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}
.ana-manset-resim{height:360px;background-size:cover;background-position:center;position:relative}
.ana-manset-alt{padding:18px}
.manset-baslik{font-size:22px;font-weight:900;color:#1a1a1a;line-height:1.3;margin:0 0 10px}
.manset-spot{font-size:13px;color:#555;line-height:1.6;margin:0 0 8px}
.manset-meta{font-size:12px;color:#888}
.yan-manset-item a{display:block;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06)}
.yan-manset-resim{height:130px;background-size:cover;background-position:center;position:relative}
.yan-manset-baslik{font-size:13px;font-weight:700;color:#1a1a1a;line-height:1.4;padding:10px 12px 6px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.surmanset-item a{display:block;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06)}
.surmanset-resim{height:100px;background-size:cover;background-position:center}
.surmanset-baslik{font-size:12px;font-weight:700;color:#1a1a1a;line-height:1.4;padding:8px 10px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}

/* ── SPOR 3×2 ─────────────────────── */
.spor-3x2-grid{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(2,1fr);gap:12px}
@media(max-width:768px){.spor-3x2-grid{grid-template-columns:repeat(2,1fr)}}
.spor-kart a{display:block;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,.07)}
.spor-kart-resim{height:160px;background-size:cover;background-position:center;position:relative;overflow:hidden}
.spor-kart-baslik{font-size:13px;font-weight:700;color:#1a1a1a;line-height:1.4;padding:10px 12px 6px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.spor-kart-meta{font-size:11px;color:#888;padding:0 12px 10px}

/* ── GASTRO ─────────────────────────── */
.gastro-grid{display:grid;grid-template-columns:1fr 1fr auto;gap:14px}
@media(max-width:900px){.gastro-grid{grid-template-columns:1fr 1fr}}
.gastro-buyuk-kart a{display:block}
.gastro-buyuk-resim{height:260px;background-size:cover;background-position:center;border-radius:10px;position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end}
.gastro-buyuk-alt{padding:14px;position:relative;z-index:1}
.gastro-buyuk-baslik{font-size:15px;font-weight:800;color:#fff;line-height:1.4;margin:6px 0;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.gastro-mini-kolonlar{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:10px;min-width:300px}
.gastro-mini-kart a{display:block;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,.07)}
.gastro-mini-resim{height:100px;background-size:cover;background-position:center}
.gastro-mini-icerik{padding:8px 10px}
.gastro-mini-baslik{font-size:12px;font-weight:700;color:#1a1a1a;line-height:1.4;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}

/* ── YOUTUBE ─────────────────────────── */
.youtube-4li-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
@media(max-width:900px){.youtube-4li-grid{grid-template-columns:repeat(2,1fr)}}
.youtube-kart a{display:block;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,.07);transition:.2s}
.youtube-kart a:hover{box-shadow:0 4px 16px rgba(0,0,0,.12);transform:translateY(-2px)}
.youtube-thumb{height:150px;background-size:cover;background-position:center;position:relative;display:flex;align-items:center;justify-content:center}
.youtube-oynat-btn{width:44px;height:44px;background:rgba(233,69,96,.9);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;transition:.2s}
.youtube-kart a:hover .youtube-oynat-btn{background:#e94560;transform:scale(1.1)}
.youtube-kart-baslik{font-size:13px;font-weight:700;color:#1a1a1a;line-height:1.4;padding:10px 12px 6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}

/* ── 4'lü grid ─────────────────────── */
.dort-li-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
@media(max-width:900px){.dort-li-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:480px){.dort-li-grid{grid-template-columns:1fr}}
.oda-kart a{display:block;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,.07);position:relative}
.oda-kart-resim{height:160px;background-size:cover;background-position:center;position:relative}
.oda-kart-baslik{font-size:14px;font-weight:700;color:#1a1a1a;line-height:1.4;padding:10px 12px 6px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.oda-kart-meta{font-size:11px;color:#888;padding:0 12px 10px}
.yeni-etiket{position:absolute;top:8px;right:8px;background:#22c55e;color:#fff;font-size:9px;font-weight:800;padding:2px 7px;border-radius:3px;letter-spacing:.5px}

/* ── POPÜLER ─────────────────────────── */
.populer-2-kolon{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
@media(max-width:768px){.populer-2-kolon{grid-template-columns:1fr}}
.populer-item{display:flex;align-items:center;gap:10px;background:#fff;border-radius:8px;padding:10px;box-shadow:0 2px 6px rgba(0,0,0,.06)}
.populer-no{width:28px;height:28px;border-radius:50%;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:#374151;flex-shrink:0}
.populer-icerik{flex:1;min-width:0}
.populer-baslik{font-size:13px;font-weight:700;color:#1a1a1a;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;text-decoration:none}
.populer-baslik:hover{color:#CC0000}
.populer-meta{font-size:11px;color:#888;margin-top:4px}
.populer-resim{width:70px;height:60px;background-size:cover;background-position:center;border-radius:6px;flex-shrink:0}
</style>

<?php Theme::partial('footer'); ?>
