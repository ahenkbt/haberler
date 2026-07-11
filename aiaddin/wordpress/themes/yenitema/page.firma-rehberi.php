<?php get_header(); ?>
<?php
/**
 * Firma Rehberi Sayfası
 * Şehrin esnaf ve firmalarını listeler.
 */
// Arama & filtre parametreleri
$arama   = isset($_GET['s'])   ? sanitize_text_field($_GET['s'])   : '';
$kat_id  = isset($_GET['kat']) ? intval($_GET['kat'])               : 0;
$sayfa   = max(1, intval(get_query_var('paged')));
$per_page = 12;
// Query
$args = array(
    'post_type'      => 'firma_rehberi',
    'post_status'    => 'publish',
    'posts_per_page' => $per_page,
    'paged'          => $sayfa,
    'orderby'        => 'title',
    'order'          => 'ASC',
);
if ($arama) {
    $args['s'] = $arama;
}
if ($kat_id) {
    $args['tax_query'] = array(array('taxonomy'=>'firma_kategorisi','field'=>'term_id','terms'=>$kat_id));
}
$firmalar = new WP_Query($args);
// Kategoriler (filtre için)
$kategoriler = get_terms(array('taxonomy'=>'firma_kategorisi','hide_empty'=>false));
?>
<style>
/* ── Rehber Layout ── */
.vkv-rehber-wrap{max-width:1440px;margin:0 auto;padding:32px 20px}
.vkv-rehber-hero{background:linear-gradient(135deg,var(--cr2) 0%,var(--dk2) 100%);padding:52px 40px;text-align:center;margin-bottom:32px;border-radius:4px;position:relative;overflow:hidden}
.vkv-rehber-hero::before{content:'';position:absolute;inset:0;background:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")}
.vkv-rehber-hero h1{font-family:var(--fh);font-size:2.2rem;font-weight:800;color:#fff;margin:0 0 12px;position:relative}
.vkv-rehber-hero p{font-size:14px;color:rgba(255,255,255,.6);margin:0 0 24px;position:relative}
/* Arama çubuğu */
.vkv-rehber-arama{display:flex;gap:0;max-width:540px;margin:0 auto;position:relative}
.vkv-rehber-arama input{flex:1;padding:13px 18px;border:none;font-size:14px;border-radius:3px 0 0 3px;outline:none}
.vkv-rehber-arama button{background:var(--altin);color:#fff;border:none;padding:13px 22px;font-family:var(--fh);font-size:13px;font-weight:700;cursor:pointer;border-radius:0 3px 3px 0;transition:background .2s}
.vkv-rehber-arama button:hover{background:var(--altin2)}
/* Filtre sekmeler */
.vkv-rehber-filtre{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px;align-items:center}
.vkv-rehber-filtre a{padding:7px 16px;border:1px solid var(--sin);border-radius:20px;font-size:12px;font-weight:600;color:var(--yz2);text-decoration:none;transition:all .18s;background:#fff}
.vkv-rehber-filtre a:hover,.vkv-rehber-filtre a.aktif{background:var(--cr);border-color:var(--cr);color:#fff}
.vkv-rehber-filtre .say{background:var(--bg);color:var(--yz3);padding:1px 7px;border-radius:10px;font-size:10px;margin-left:4px}
/* Firma kart ızgarası */
.vkv-rehber-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
@media(max-width:900px){.vkv-rehber-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:560px){.vkv-rehber-grid{grid-template-columns:1fr}}
/* Firma kart */
.vkv-firma-kart{background:#fff;border:1px solid var(--sin);border-radius:6px;overflow:hidden;transition:all .2s;display:flex;flex-direction:column}
.vkv-firma-kart:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,.1);border-color:var(--cr3)}
.vkv-firma-kart-img{height:160px;background:var(--bg);overflow:hidden;position:relative;flex-shrink:0}
.vkv-firma-kart-img img{width:100%;height:100%;object-fit:cover;transition:transform .3s}
.vkv-firma-kart:hover .vkv-firma-kart-img img{transform:scale(1.05)}
.vkv-firma-kart-img-placeholder{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--bg) 0%,var(--sin) 100%)}
.vkv-firma-kart-img-placeholder span{font-size:2.5rem;opacity:.4}
.vkv-firma-kart-kat{position:absolute;top:10px;left:10px;background:var(--cr);color:#fff;font-size:10px;font-weight:700;padding:3px 9px;border-radius:3px;text-transform:uppercase;letter-spacing:.5px}
.vkv-firma-kart-body{padding:16px;flex:1;display:flex;flex-direction:column}
.vkv-firma-kart-baslik{font-family:var(--fh);font-size:15px;font-weight:700;color:var(--dk);margin-bottom:6px;line-height:1.3}
.vkv-firma-kart-aciklama{font-size:12px;color:var(--yz2);line-height:1.6;margin-bottom:12px;flex:1}
.vkv-firma-kart-info{display:flex;flex-direction:column;gap:5px;font-size:11.5px;color:var(--yz3)}
.vkv-firma-kart-info a{color:var(--cr);font-weight:600;text-decoration:none}
.vkv-firma-kart-info a:hover{text-decoration:underline}
.vkv-firma-kart-footer{padding:10px 16px;border-top:1px solid var(--sin);display:flex;gap:8px;background:var(--bg)}
.vkv-firma-kart-footer a{flex:1;text-align:center;padding:7px;border-radius:3px;font-size:11.5px;font-weight:700;text-decoration:none;transition:all .15s}
.vkv-firma-kart-footer .btn-tel{background:var(--cr);color:#fff}
.vkv-firma-kart-footer .btn-web{background:#fff;border:1px solid var(--sin);color:var(--yz2)}
.vkv-firma-kart-footer .btn-tel:hover{background:var(--cr2)}
.vkv-firma-kart-footer .btn-web:hover{border-color:var(--cr);color:var(--cr)}
/* Boş durum */
.vkv-rehber-bos{text-align:center;padding:60px 20px;color:var(--yz3)}
.vkv-rehber-bos .icon{font-size:3rem;margin-bottom:12px}
</style>
<div class="vkv-rehber-wrap">
  <!-- HERO -->
  <div class="vkv-rehber-hero">
    <h1>🏢 Firma Rehberi</h1>
    <p>Yerel esnaf ve firmaları keşfedin, iletişime geçin</p>
    <form method="get" action="" class="vkv-rehber-arama">
      <input type="text" name="s" value="<?php echo esc_attr($arama); ?>" placeholder="Firma adı, sektör veya hizmet ara...">
      <?php if ($kat_id): ?><input type="hidden" name="kat" value="<?php echo intval($kat_id); ?>"><?php endif; ?>
      <button type="submit">🔍 Ara</button>
    </form>
  </div>
  <!-- FİLTRE -->
  <?php if (!empty($kategoriler) && !is_wp_error($kategoriler)): ?>
  <div class="vkv-rehber-filtre">
    <a href="?<?php echo $arama ? 's='.urlencode($arama) : ''; ?>"
       class="<?php echo !$kat_id ? 'aktif' : ''; ?>">
      🏪 Tüm Kategoriler
    </a>
    <?php foreach ($kategoriler as $kat): ?>
    <a href="?kat=<?php echo intval($kat->term_id); ?><?php echo $arama ? '&s='.urlencode($arama) : ''; ?>"
       class="<?php echo $kat_id === $kat->term_id ? 'aktif' : ''; ?>">
      <?php echo esc_html($kat->name); ?>
      <span class="say"><?php echo intval($kat->count); ?></span>
    </a>
    <?php endforeach; ?>
  </div>
  <?php endif; ?>
  <!-- SONUÇ SAYISI -->
  <?php if ($firmalar->found_posts > 0): ?>
  <div style="font-size:12px;color:var(--yz3);margin-bottom:16px">
    <strong><?php echo intval($firmalar->found_posts); ?></strong> firma bulundu
    <?php if ($arama): ?> — "<em><?php echo esc_html($arama); ?></em>" araması<?php endif; ?>
  </div>
  <?php endif; ?>
  <!-- FİRMA IZGARASI -->
  <?php if ($firmalar->have_posts()): ?>
  <div class="vkv-rehber-grid">
    <?php while ($firmalar->have_posts()): $firmalar->the_post();
      $adres  = get_post_meta(get_the_ID(),'firma_adres',  true);
      $tel    = get_post_meta(get_the_ID(),'firma_telefon',true);
      $web    = get_post_meta(get_the_ID(),'firma_website',true);
      $harita = get_post_meta(get_the_ID(),'firma_harita', true);
      $kats   = get_the_terms(get_the_ID(),'firma_kategorisi');
      $kat_adi = (!empty($kats) && !is_wp_error($kats)) ? $kats[0]->name : '';
    ?>
    <div class="vkv-firma-kart">
      <div class="vkv-firma-kart-img">
        <?php if (has_post_thumbnail()): ?>
          <img src="<?php echo esc_url(get_the_post_thumbnail_url(null,'medium')); ?>" alt="<?php the_title_attribute(); ?>">
        <?php else: ?>
          <div class="vkv-firma-kart-img-placeholder"><span>🏢</span></div>
        <?php endif; ?>
        <?php if ($kat_adi): ?>
        <span class="vkv-firma-kart-kat"><?php echo esc_html($kat_adi); ?></span>
        <?php endif; ?>
      </div>
      <div class="vkv-firma-kart-body">
        <div class="vkv-firma-kart-baslik"><?php the_title(); ?></div>
        <?php if (has_excerpt()): ?>
        <div class="vkv-firma-kart-aciklama"><?php echo esc_html(wp_trim_words(get_the_excerpt(), 15, '...')); ?></div>
        <?php endif; ?>
        <div class="vkv-firma-kart-info">
          <?php if ($adres): ?><div>📍 <?php echo esc_html($adres); ?></div><?php endif; ?>
          <?php if ($tel): ?><div>📞 <a href="tel:<?php echo esc_attr(preg_replace('/\s/','',$tel)); ?>"><?php echo esc_html($tel); ?></a></div><?php endif; ?>
          <?php if ($web): ?>
          <div>🌐 <a href="<?php echo esc_url($web); ?>" target="_blank" rel="noopener">
            <?php echo esc_html(parse_url($web, PHP_URL_HOST) ?: $web); ?>
          </a></div>
          <?php endif; ?>
        </div>
      </div>
      <?php if ($tel || $web || $harita): ?>
      <div class="vkv-firma-kart-footer">
        <?php if ($tel): ?>
        <a href="tel:<?php echo esc_attr(preg_replace('/\s/','',$tel)); ?>" class="btn-tel">📞 Ara</a>
        <?php endif; ?>
        <?php if ($web): ?>
        <a href="<?php echo esc_url($web); ?>" target="_blank" rel="noopener" class="btn-web">🌐 Web</a>
        <?php endif; ?>
        <?php if ($harita): ?>
        <a href="<?php echo esc_url($harita); ?>" target="_blank" rel="noopener" class="btn-web">🗺️ Harita</a>
        <?php endif; ?>
      </div>
      <?php endif; ?>
    </div>
    <?php endwhile; wp_reset_postdata(); ?>
  </div>
  <!-- PAGINATION -->
  <?php if ($firmalar->max_num_pages > 1): ?>
  <div style="margin-top:28px;text-align:center">
    <?php
    echo paginate_links(array(
        'total'     => $firmalar->max_num_pages,
        'current'   => $sayfa,
        'prev_text' => '← Önceki',
        'next_text' => 'Sonraki →',
        'mid_size'  => 2,
        'add_args'  => array_filter(array('s'=>$arama?:null,'kat'=>$kat_id?:null)),
    ));
    ?>
  </div>
  <?php endif; ?>
  <?php else: ?>
  <div class="vkv-rehber-bos">
    <div class="icon">🏢</div>
    <h3>Firma Bulunamadı</h3>
    <p>
      <?php if ($arama): ?>
        "<strong><?php echo esc_html($arama); ?></strong>" için sonuç yok. Farklı bir arama deneyin.
        <br><a href="?" style="color:var(--cr);font-weight:700">Tüm firmaları göster</a>
      <?php else: ?>
        Henüz firma eklenmemiş. Yönetim panelinden firma ekleyebilirsiniz.
      <?php endif; ?>
    </p>
  </div>
  <?php endif; ?>
</div>
<?php get_footer(); ?>
