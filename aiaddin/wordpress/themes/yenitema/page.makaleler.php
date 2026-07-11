<?php
/**
 * Template Name: Makaleler
 * Template Post Type: page
 * DSV — Sağlık makaleleri / ansiklopedi arşivi
 * URL hem /makaleler hem /ansiklopedi category'sini gösterir
 */
get_header();

/* Sayfalama */
$paged = get_query_var('paged') ? get_query_var('paged') : 1;

/* Ansiklopedi kategorisinden ya da tüm yazılardan çek */
$cat_obj = get_category_by_slug('ansiklopedi');
$cat_id  = $cat_obj ? $cat_obj->term_id : 0;

/* Sekme kategorileri — sağlık alanları */
$dsv_kategori_tabs = array(
    ''                  => array('etiket'=>'Tümü',              'emoji'=>'📋'),
    'ansiklopedi'       => array('etiket'=>'Ansiklopedi',        'emoji'=>'📖'),
    'kuresel-saglik'    => array('etiket'=>'Küresel Sağlık',     'emoji'=>'🌍'),
    'bulasici-hastaliklar'=> array('etiket'=>'Bulaşıcı Hast.',  'emoji'=>'🦠'),
    'ruh-sagligi'       => array('etiket'=>'Ruh Sağlığı',        'emoji'=>'🧠'),
    'beslenme'          => array('etiket'=>'Beslenme',           'emoji'=>'🥦'),
    'cocuk-sagligi'     => array('etiket'=>'Çocuk Sağlığı',      'emoji'=>'👶'),
    'cevre-sagligi'     => array('etiket'=>'Çevre & Sağlık',     'emoji'=>'🌿'),
);

$aktif_tab = sanitize_title($_GET['kategori'] ?? '');

/* Query */
$args = array(
    'post_type'      => 'post',
    'post_status'    => 'publish',
    'posts_per_page' => 12,
    'paged'          => $paged,
    'orderby'        => 'date',
    'order'          => 'DESC',
);
if ($aktif_tab && $aktif_tab !== '') {
    $args['category_name'] = $aktif_tab;
} elseif ($cat_id) {
    /* Varsayılan: ansiklopedi kategorisi + tüm yazılar */
    /* Sadece tüm tab'da tüm yazılar gösterilir */
}
$query = new WP_Query($args);
?>
<style>
.mak-hero{background:linear-gradient(135deg,#0c1a2e,#0369a1);padding:52px 20px;color:#fff;text-align:center}
.mak-hero h1{font-family:var(--fh);font-size:clamp(1.6rem,3vw,2.4rem);font-weight:800;color:#fff;margin:0 0 10px}
.mak-hero p{font-size:14px;color:rgba(255,255,255,.7);max-width:560px;margin:0 auto 20px}
.mak-ara{display:flex;max-width:480px;margin:0 auto;gap:0}
.mak-ara input{flex:1;padding:11px 16px;border:none;font-size:14px;font-family:var(--fm);outline:none}
.mak-ara button{background:var(--altin2,#06B6D4);color:#fff;border:none;padding:11px 18px;font-family:var(--fh);font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap}
/* Tabs */
.mak-tabs{background:#fff;border-bottom:2px solid var(--sin);position:sticky;top:64px;z-index:100}
.mak-tabs-w{max-width:1280px;margin:0 auto;padding:0 20px;display:flex;gap:0;overflow-x:auto;scrollbar-width:none}
.mak-tabs-w::-webkit-scrollbar{display:none}
.mak-tab{padding:14px 18px;font-family:var(--fh);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--yz3,#9A7070);text-decoration:none;border-bottom:3px solid transparent;white-space:nowrap;transition:all .2s;display:flex;align-items:center;gap:5px}
.mak-tab:hover{color:var(--cr);border-bottom-color:var(--sin)}
.mak-tab.aktif{color:var(--cr);border-bottom-color:var(--cr)}
/* Grid */
.mak-grid-w{max-width:1280px;margin:0 auto;padding:40px 20px}
.mak-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}
.mak-kart{background:#fff;border:1px solid var(--sin);border-radius:8px;overflow:hidden;text-decoration:none;display:block;transition:all .2s;position:relative}
.mak-kart:hover{box-shadow:0 6px 24px rgba(3,105,161,.12);transform:translateY(-3px)}
.mak-kart::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--cr,#0369a1),var(--altin2,#06B6D4))}
.mak-img{height:160px;overflow:hidden;background:linear-gradient(135deg,var(--cr2,#075985),var(--cr,#0369a1));display:flex;align-items:center;justify-content:center}
.mak-img img{width:100%;height:100%;object-fit:cover}
.mak-img-ph{font-size:2.4rem;opacity:.6}
.mak-body{padding:16px}
.mak-cat{font-size:9.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--cr,#0369a1);margin-bottom:6px}
.mak-baslik{font-family:var(--fh);font-size:14px;font-weight:700;color:var(--yz,#0c1a2e);line-height:1.4;margin-bottom:8px}
.mak-exc{font-size:12px;color:var(--yz2,#1e3a5f);line-height:1.6;margin-bottom:10px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.mak-meta{font-size:10.5px;color:var(--yz3,#64748b);display:flex;align-items:center;gap:8px}
.mak-devam{font-size:11px;font-weight:700;color:var(--cr,#0369a1);display:inline-flex;align-items:center;gap:4px;margin-top:8px}
/* Boş durum */
.mak-bos{text-align:center;padding:60px 20px;color:var(--yz3)}
.mak-bos-em{font-size:3rem;margin-bottom:12px}
/* Sayfalama */
.mak-sayfa{display:flex;gap:8px;justify-content:center;margin-top:36px;flex-wrap:wrap}
.mak-sayfa a,.mak-sayfa span{padding:8px 14px;border:1px solid var(--sin);font-size:13px;text-decoration:none;color:var(--yz2);transition:all .2s;border-radius:3px}
.mak-sayfa a:hover,.mak-sayfa .current{background:var(--cr);border-color:var(--cr);color:#fff}
@media(max-width:1100px){.mak-grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:760px){.mak-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:480px){.mak-grid{grid-template-columns:1fr}}
</style>

<!-- HERO -->
<div class="mak-hero">
  <div style="font-family:var(--fh);font-size:10px;letter-spacing:2.5px;font-weight:700;text-transform:uppercase;color:rgba(255,255,255,.55);margin-bottom:8px">📚 Dünya Sağlık Vakfı</div>
  <h1>Sağlık Makaleleri & Ansiklopedi</h1>
  <p>WHO rehberlerine dayanan, uzman gözden geçirmesinden geçirilmiş güncel sağlık bilgisi.</p>
  <form class="mak-ara" method="get" action="<?php echo esc_url(home_url('/')); ?>">
    <input type="search" name="s" placeholder="Makale ara… (örn: diyabet, aşı, kanser)" value="<?php echo esc_attr(get_search_query()); ?>">
    <button type="submit">🔍 Ara</button>
  </form>
</div>

<!-- TABS -->
<div class="mak-tabs">
  <div class="mak-tabs-w">
    <?php foreach ($dsv_kategori_tabs as $slug => $tab): 
      $url = $slug === '' 
        ? get_permalink() 
        : add_query_arg('kategori', $slug, get_permalink());
    ?>
    <a href="<?php echo esc_url($url); ?>" class="mak-tab <?php echo $aktif_tab === $slug ? 'aktif' : ''; ?>">
      <?php echo $tab['emoji']; ?> <?php echo esc_html($tab['etiket']); ?>
    </a>
    <?php endforeach; ?>
  </div>
</div>

<!-- MAKALE GRİD -->
<div class="mak-grid-w">

  <?php if ($query->have_posts()): ?>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:10px">
    <div style="font-size:13px;color:var(--yz2)">
      <strong style="color:var(--cr)"><?php echo $query->found_posts; ?></strong> makale bulundu
      <?php if ($aktif_tab && isset($dsv_kategori_tabs[$aktif_tab])): ?>
       — <em><?php echo esc_html($dsv_kategori_tabs[$aktif_tab]['etiket']); ?></em> kategorisinde
      <?php endif; ?>
    </div>
    <div style="font-size:12px;color:var(--yz3)">Sayfa <?php echo $paged; ?> / <?php echo $query->max_num_pages; ?></div>
  </div>

  <div class="mak-grid">
    <?php while ($query->have_posts()): $query->the_post(); 
      $cats   = get_the_category();
      $cat_nm = !empty($cats) ? $cats[0]->name : '';
      $thumb  = function_exists('tukav_get_thumb') ? tukav_get_thumb(get_the_ID(), 'medium') : get_the_post_thumbnail_url(get_the_ID(), 'medium');
      $exc    = wp_trim_words(get_the_excerpt() ?: strip_tags(get_the_content()), 18, '…');
    ?>
    <a href="<?php the_permalink(); ?>" class="mak-kart">
      <div class="mak-img">
        <?php if ($thumb): ?>
        <img src="<?php echo esc_url($thumb); ?>" alt="<?php echo esc_attr(get_the_title()); ?>" loading="lazy">
        <?php else: ?>
        <div class="mak-img-ph">🏥</div>
        <?php endif; ?>
      </div>
      <div class="mak-body">
        <?php if ($cat_nm): ?><div class="mak-cat"><?php echo esc_html($cat_nm); ?></div><?php endif; ?>
        <div class="mak-baslik"><?php the_title(); ?></div>
        <div class="mak-exc"><?php echo esc_html($exc); ?></div>
        <div class="mak-meta">
          <span>📅 <?php echo get_the_date('d M Y'); ?></span>
          <span>⏱ <?php
            $wc = str_word_count(strip_tags(get_the_content()));
            echo ceil($wc / 200);
          ?> dk</span>
        </div>
        <div class="mak-devam">Devamını Oku →</div>
      </div>
    </a>
    <?php endwhile; wp_reset_postdata(); ?>
  </div>

  <!-- Sayfalama -->
  <?php if ($query->max_num_pages > 1):
    $base_url = get_permalink();
    if ($aktif_tab) $base_url = add_query_arg('kategori', $aktif_tab, $base_url);
  ?>
  <div class="mak-sayfa">
    <?php if ($paged > 1): ?><a href="<?php echo esc_url(add_query_arg('paged', $paged-1, $base_url)); ?>">← Önceki</a><?php endif; ?>
    <?php for ($i = 1; $i <= $query->max_num_pages; $i++): ?>
    <?php if ($i === $paged): ?><span class="current"><?php echo $i; ?></span>
    <?php else: ?><a href="<?php echo esc_url(add_query_arg('paged', $i, $base_url)); ?>"><?php echo $i; ?></a><?php endif; ?>
    <?php endfor; ?>
    <?php if ($paged < $query->max_num_pages): ?><a href="<?php echo esc_url(add_query_arg('paged', $paged+1, $base_url)); ?>">Sonraki →</a><?php endif; ?>
  </div>
  <?php endif; ?>

  <?php else: ?>
  <div class="mak-bos">
    <div class="mak-bos-em">📭</div>
    <h3 style="font-family:var(--fh);color:var(--yz2)">Bu kategoride henüz makale yok</h3>
    <p style="font-size:13px">Yakında içerik eklenecek. Diğer kategorilere göz atabilirsiniz.</p>
    <a href="<?php echo esc_url(get_permalink()); ?>" style="display:inline-block;margin-top:16px;background:var(--cr);color:#fff;padding:10px 24px;font-family:var(--fh);font-size:12px;font-weight:700;text-decoration:none;text-transform:uppercase;letter-spacing:.8px;border-radius:3px">Tüm Makaleleri Gör</a>
  </div>
  <?php endif; ?>

</div>
<?php get_footer(); ?>
