<?php
/**
 * AnkaraHaber — Footer Partial
 */
defined('ROOT') or die();

$siteName  = DB::setting('site_name', 'Ankara Haber');
$logoText1 = DB::setting('logo_text1', 'ANKARA');
$logoText2 = DB::setting('logo_text2', 'HABER');
$logoImg   = DB::setting('logo_img', '');
$siteUrl   = ap_url();
$footerAck = DB::setting('footer_aciklama', DB::setting('site_desc',''));

$sosyalLinks = [
    'facebook'  => ['fa-facebook-f',  DB::setting('sosyal_facebook','')],
    'twitter'   => ['fa-x-twitter',   DB::setting('sosyal_twitter','')],
    'instagram' => ['fa-instagram',   DB::setting('sosyal_instagram','')],
    'youtube'   => ['fa-youtube',     DB::setting('sosyal_youtube','')],
    'telegram'  => ['fa-telegram',    DB::setting('sosyal_telegram','')],
];

// Footer menü kategorileri
$footerKats = [];
try {
    $footerKats = DB::query("SELECT id,name,slug FROM `{p}categories` WHERE active=1 ORDER BY sort_order LIMIT 10");
} catch (\Throwable) {}

// Son haberler
$footerHaberler = [];
try {
    $footerHaberler = PostType::getPosts(['post_type'=>'news','status'=>'published','limit'=>5]);
} catch (\Throwable) {}

$iletisimAdres = DB::setting('iletisim_adres','');
$iletisimTel   = DB::setting('iletisim_tel','');
$iletisimEmail = DB::setting('iletisim_email','');
?>

<?php $footerRek = DB::setting('theme_reklam_footer',''); if ($footerRek): ?>
<div class="footer-reklam-band"><div class="container" style="text-align:center"><?= $footerRek ?></div></div>
<?php endif; ?>

<footer class="site-footer" role="contentinfo">
  <div class="footer-ust">
    <div class="container">
      <div class="footer-grid">

        <!-- Hakkında -->
        <div class="footer-kol footer-kol--hakkinda">
          <div class="footer-logo">
            <?php if ($logoImg): ?>
              <img src="<?= e(ap_thumb_url($logoImg)) ?>" alt="<?= e($siteName) ?>" style="max-height:50px;filter:brightness(0) invert(1)">
            <?php else: ?>
              <div class="metin-logo metin-logo--footer">
                <span class="logo-ana"><?= e($logoText1) ?></span>
                <span class="logo-aksan"><?= e($logoText2) ?></span>
              </div>
            <?php endif; ?>
          </div>
          <?php if ($footerAck): ?>
          <div class="footer-aciklama"><?= nl2br(e($footerAck)) ?></div>
          <?php endif; ?>

          <div class="footer-sosyal">
            <?php foreach ($sosyalLinks as $platform => [$icon, $url]): if (!$url) continue; ?>
            <a href="<?= e($url) ?>" class="sosyal-btn sosyal-btn--<?= e($platform) ?>" target="_blank" rel="noopener noreferrer" aria-label="<?= e($platform) ?>">
              <i class="fab <?= e($icon) ?>"></i>
            </a>
            <?php endforeach; ?>
          </div>

          <!-- Mobil linkler -->
          <div class="footer-mobil-linkler">
            <a href="<?= e(ap_url('kunye')) ?>"><i class="fa fa-id-card"></i> Künye</a>
            <a href="<?= e(ap_url('iletisim')) ?>"><i class="fa fa-envelope"></i> İletişim</a>
            <a href="<?= e(ap_url('yazarlar')) ?>"><i class="fa fa-pen-nib"></i> Yazarlar</a>
          </div>
        </div>

        <!-- Kategoriler -->
        <div class="footer-kol">
          <h3 class="footer-baslik">Kategoriler</h3>
          <ul class="footer-liste">
            <?php foreach ($footerKats as $fk): ?>
            <li><a href="<?= e(ap_url($fk['slug'])) ?>"><i class="fa fa-chevron-right"></i> <?= e($fk['name']) ?></a></li>
            <?php endforeach; ?>
          </ul>
        </div>

        <!-- Son Haberler -->
        <div class="footer-kol">
          <h3 class="footer-baslik">Son Haberler</h3>
          <ul class="footer-liste">
            <?php foreach ($footerHaberler as $fh): ?>
            <li><a href="<?= e(ap_url($fh['slug'])) ?>"><i class="fa fa-chevron-right"></i> <?= e(mb_substr($fh['title'],0,55)) ?>...</a></li>
            <?php endforeach; ?>
          </ul>
        </div>

        <!-- İletişim -->
        <div class="footer-kol">
          <h3 class="footer-baslik">İletişim</h3>
          <ul class="footer-iletisim-liste">
            <?php if ($iletisimAdres): ?><li><i class="fa fa-map-marker-alt"></i> <?= e($iletisimAdres) ?></li><?php endif; ?>
            <?php if ($iletisimTel): ?><li><i class="fa fa-phone"></i> <a href="tel:<?= e($iletisimTel) ?>"><?= e($iletisimTel) ?></a></li><?php endif; ?>
            <?php if ($iletisimEmail): ?><li><i class="fa fa-envelope"></i> <a href="mailto:<?= e($iletisimEmail) ?>"><?= e($iletisimEmail) ?></a></li><?php endif; ?>
            <?php if (!$iletisimAdres && !$iletisimTel && !$iletisimEmail): ?>
            <li style="color:rgba(255,255,255,.4)">İletişim bilgileri tema ayarlarından eklenebilir.</li>
            <?php endif; ?>
          </ul>
          <?php Widget::area('footer-3'); ?>
        </div>

      </div><!-- .footer-grid -->
    </div>
  </div>

  <div class="footer-alt">
    <div class="container">
      <div class="footer-alt-ic">
        <span class="footer-telif">
          &copy; <?= date('Y') ?> <?= e($siteName) ?>. Tüm hakları saklıdır.
        </span>
        <div class="footer-alt-linkler">
          <a href="<?= e(ap_url('gizlilik-politikasi')) ?>">Gizlilik Politikası</a>
          <a href="<?= e(ap_url('kullanim-kosullari')) ?>">Kullanım Koşulları</a>
          <a href="<?= e(ap_url('kunye')) ?>">Künye</a>
          <a href="<?= e(ap_url('iletisim')) ?>">İletişim</a>
        </div>
      </div>
    </div>
  </div>
</footer>

<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>
<script src="<?= Theme::url() ?>/assets/js/main.js"></script>
