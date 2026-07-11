<?php
$_ftr_site = get_option('vkv_site_tipi', 'vakif');
$_ftr_name = get_theme_mod('vkv_logo_name', 'Vatan Kahramanları Vakfı');
$_ftr_tag  = get_theme_mod('vkv_logo_tag',  'VATANI İÇİN ÖDEYEN KAHRAMANLAR');
$_ftr_desc_def = 'Şehitlerimizin hatırasını yüceltmek, gazilerimizin haklarını korumak ve vatan sevgisini gelecek nesillere aktarmak için.';
if ($_ftr_site === 'dsv')   $_ftr_desc_def = 'Sağlıklı bir dünya için sağlık hizmetleri, projeler ve burs programlarıyla topluma değer katıyoruz.';
if ($_ftr_site === 'tukav') $_ftr_desc_def = 'Türk medeniyetinin köklü mirasını korumak, araştırmak ve gelecek nesillere aktarmak için çalışıyoruz.';
$_ftr_desc = get_theme_mod('vkv_footer_desc', $_ftr_desc_def);
$_ftr_bagis_txt = get_theme_mod('vkv_bagis_text', '🛡️ Destek Ol');
$_ftr_bagis_url = get_theme_mod('vkv_bagis_url',  'https://donate.stripe.com/14A6oHgabdwQghN8xAb3q07');
?>
<style>
#footer{background:var(--dk,#0D0B0B)}
.ftr-sec-h{font-family:'Oswald',sans-serif;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:var(--altin,#B45309);margin-bottom:14px;padding-bottom:6px;border-bottom:1px solid rgba(180,83,9,.2)}
.ftr-a{font-size:12px;color:rgba(255,255,255,.35);text-decoration:none;transition:color .2s;display:flex;align-items:center;gap:6px}
.ftr-a:hover{color:var(--cr3,#C53030)}
.ftr-icon{color:var(--cr,#8B1A1A);font-size:10px}
.ftr-soc{width:28px;height:28px;border:1px solid rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.3);font-size:10px;text-decoration:none;transition:all .2s}
.ftr-soc:hover{border-color:var(--cr3,#C53030);color:var(--cr3,#C53030)}
.ftr-bottom-a{color:rgba(255,255,255,.2);text-decoration:none;transition:color .2s}
.ftr-bottom-a:hover{color:var(--cr3,#C53030)}
</style>
<footer id="footer">
  <div style="max-width:1440px;margin:0 auto;padding:36px 20px 28px;display:grid;grid-template-columns:280px 1fr 1fr 1fr;gap:40px;border-bottom:1px solid rgba(255,255,255,.06)">
    <!-- Marka -->
    <div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
        <div style="width:34px;height:34px;background:var(--cr,#8B1A1A);display:grid;place-items:center;flex-shrink:0;clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)">
          <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:#fff"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4.18L19 8.3V11c0 4.52-3.1 8.77-7 10.14C8.1 19.77 5 15.52 5 11V8.3l7-3.12z"/></svg>
        </div>
        <div>
          <div style="font-family:'Oswald',sans-serif;font-size:13px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.4px"><?php echo esc_html($_ftr_name); ?></div>
          <div style="font-size:9px;letter-spacing:1.5px;color:rgba(255,255,255,.3);text-transform:uppercase"><?php echo esc_html($_ftr_tag); ?></div>
        </div>
      </div>
      <p style="font-size:12px;color:rgba(255,255,255,.35);line-height:1.8;margin-bottom:16px"><?php echo esc_html($_ftr_desc); ?></p>
      <div style="display:flex;gap:6px">
        <?php foreach(['twitter'=>'fa-brands fa-x-twitter','instagram'=>'fa-brands fa-instagram','facebook'=>'fa-brands fa-facebook-f','youtube'=>'fa-brands fa-youtube'] as $k=>$ic):
          $u=get_theme_mod("vkv_$k"); if($u): ?>
        <a href="<?php echo esc_url($u); ?>" target="_blank" rel="noopener" class="ftr-soc">
          <i class="<?php echo esc_attr($ic); ?>"></i>
        </a>
        <?php endif; endforeach; ?>
      </div>
    </div>
    <!-- Bağlantılar 1 -->
    <?php
    $_ftr_cols = get_option('vkv_footer_links', array());
    if (empty($_ftr_cols)) {
        if ($_ftr_site === 'dsv') {
            $_ftr_cols = array(
                array('baslik'=>'Vakıf',              'linkler'=>array('Hakkımızda'=>'/dsv-hakkimizda','Tarihçe'=>'/dsv-tarihce','Yönetim Kurulu'=>'/dsv-yonetim','Misyon & Vizyon'=>'/dsv-misyon')),
                array('baslik'=>'Sağlık Hizmetleri',  'linkler'=>array('Sağlık Taramaları'=>'/saglik-taramalari','Psikolojik Destek'=>'/psikolojik-destek','Evde Sağlık'=>'/evde-saglik','Diş Sağlığı'=>'/dis-sagligi')),
                array('baslik'=>'Programlar',          'linkler'=>array('Burs & Eğitim'=>'/dsv-burs','Tıp Bursları'=>'/tip-burslari','Sağlık Akademisi'=>'/saglik-akademisi','Bağış Yapın'=>'/dsv-bagis')),
            );
        } elseif ($_ftr_site === 'tukav') {
            $_ftr_cols = array(
                array('baslik'=>'Vakıf',   'linkler'=>array('Hakkımızda'=>'/hakkimizda','Faaliyetler'=>'/faaliyetler','Tarihçe'=>'/tarihce','Yönetim Kurulu'=>'/yonetim-kurulu')),
                array('baslik'=>'İçerik',  'linkler'=>array('Ansiklopedi'=>'/ansiklopedi','Makaleler'=>'/makaleler','Haberler'=>'/haberler','Etkinlikler'=>'/etkinlikler')),
                array('baslik'=>'Destek',  'linkler'=>array('Bağış Yapın'=>'/bagis','İletişim'=>'/iletisim','Gizlilik'=>'/gizlilik-politikasi')),
            );
        } else {
            $_ftr_cols = array(
                array('baslik'=>'Vakıf/Dernek','linkler'=>array('Hakkımızda'=>'/hakkimizda','Faaliyetler'=>'/faaliyetler','Tarihçe'=>'/tarihce','Yönetim Kurulu'=>'/yonetim-kurulu','Bağış Yapın'=>'/bagis')),
                array('baslik'=>'Kahramanlar', 'linkler'=>array('Şehitlerimiz'=>'/sehitlerimiz','Gazilerimiz'=>'/gazilerimiz','Türk Büyükleri'=>'/turk-buyukleri','Kurtuluş Savaşı'=>'/kurtulus-savasi','Çanakkale'=>'/canakkale-savasi')),
                array('baslik'=>'İçerik',      'linkler'=>array('Ansiklopedi'=>'/ansiklopedi','Haberler'=>'/haberler','Etkinlikler'=>'/etkinlikler','Atatürk'=>'/ataturk','Millî Günler'=>'/milli-gunler')),
            );
        }
    }
    foreach ($_ftr_cols as $_fc): ?>
    <div>
      <h5 class="ftr-sec-h"><?php echo esc_html($_fc['baslik']); ?></h5>
      <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px">
        <?php foreach($_fc['linkler'] as $l=>$u): ?>
        <li><a href="<?php echo esc_url(home_url($u)); ?>" class="ftr-a">› <?php echo esc_html($l); ?></a></li>
        <?php endforeach; ?>
      </ul>
    </div>
    <?php endforeach; ?>
  </div>
  <div style="max-width:1440px;margin:0 auto;padding:12px 20px;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:rgba(255,255,255,.2);flex-wrap:wrap;gap:8px">
    <span><?php echo esc_html(get_theme_mod('vkv_copyright','© '.date('Y').' '.esc_html($_ftr_name).' · Tüm hakları saklıdır.')); ?></span>
    <div style="display:flex;gap:16px">
      <a href="<?php echo esc_url(home_url('/gizlilik-politikasi')); ?>" class="ftr-bottom-a">Gizlilik Politikası</a>
      <a href="<?php echo esc_url(home_url('/kullanim-kosullari')); ?>" class="ftr-bottom-a">Kullanım Koşulları</a>
      <a href="<?php echo esc_url(home_url('/iletisim')); ?>" class="ftr-bottom-a">İletişim</a>
    </div>
  </div>
</footer>
<?php wp_footer(); ?>
<?php
/* ══════════════════════════════════════════════════════
   MOBİL ALT NAVBAR — 5 ikonlu sabit alt bar
══════════════════════════════════════════════════════ */
$_bn_items = get_option('vkv_bottom_nav_items', array());
if (empty($_bn_items)) {
    /* Site tipine göre varsayılan bottom nav */
    $_bn_site = get_option('vkv_site_tipi', 'vakif');
    $_bn_defaults = array(
        'dernek' => array(
            array('ikon'=>'&#127968;','etiket'=>'Ana Sayfa',  'url'=>'/',              'bagis'=>false),
            array('ikon'=>'&#127963;','etiket'=>'Atatürk',    'url'=>'/ataturk',       'bagis'=>false),
            array('ikon'=>'&#10084;', 'etiket'=>'Bağış',      'url'=>'/bagis',         'bagis'=>true),
            array('ikon'=>'&#128197;','etiket'=>'Faaliyetler','url'=>'/faaliyetler',   'bagis'=>false),
            array('ikon'=>'&#128231;','etiket'=>'İletişim',   'url'=>'/iletisim',      'bagis'=>false),
        ),
        'vakif' => array(
            array('ikon'=>'&#127968;','etiket'=>'Ana Sayfa',  'url'=>'/',              'bagis'=>false),
            array('ikon'=>'&#127755;','etiket'=>'Kahramanlar','url'=>'/kahramanlar',   'bagis'=>false),
            array('ikon'=>'&#10084;', 'etiket'=>'Bağış',      'url'=>'/bagis',         'bagis'=>true),
            array('ikon'=>'&#128240;','etiket'=>'Haberler',   'url'=>'/haberler',      'bagis'=>false),
            array('ikon'=>'&#128231;','etiket'=>'İletişim',   'url'=>'/iletisim',      'bagis'=>false),
        ),
        'tukav' => array(
            array('ikon'=>'&#127968;','etiket'=>'Ana Sayfa',  'url'=>'/',              'bagis'=>false),
            array('ikon'=>'&#128218;','etiket'=>'Makaleler',  'url'=>'/makaleler',     'bagis'=>false),
            array('ikon'=>'&#10084;', 'etiket'=>'Bağış',      'url'=>'/bagis',         'bagis'=>true),
            array('ikon'=>'&#128240;','etiket'=>'Haberler',   'url'=>'/haberler',      'bagis'=>false),
            array('ikon'=>'&#128231;','etiket'=>'İletişim',   'url'=>'/iletisim',      'bagis'=>false),
        ),
        'dsv' => array(
            array('ikon'=>'&#127968;','etiket'=>'Ana Sayfa',  'url'=>'/',                  'bagis'=>false),
            array('ikon'=>'&#127973;','etiket'=>'Sağlık',     'url'=>'/saglik-hizmetleri', 'bagis'=>false),
            array('ikon'=>'&#10084;', 'etiket'=>'Bağış',      'url'=>'/dsv-bagis',         'bagis'=>true),
            array('ikon'=>'&#128240;','etiket'=>'Haberler',   'url'=>'/dsv-haberler',      'bagis'=>false),
            array('ikon'=>'&#128231;','etiket'=>'İletişim',   'url'=>'/dsv-iletisim',      'bagis'=>false),
        ),
    );
    $_bn_items = isset($_bn_defaults[$_bn_site]) ? $_bn_defaults[$_bn_site] : $_bn_defaults['vakif'];
}
if (!empty($_bn_items)):
?>
<style>
#vkv-bottom-nav{display:none;position:fixed;bottom:0;left:0;right:0;z-index:7000;background:var(--dk,#0D0B0B);border-top:1px solid rgba(255,255,255,.1);padding:0;height:58px;box-shadow:0 -4px 20px rgba(0,0,0,.4)}
#vkv-bottom-nav .bn-w{display:flex;height:100%}
.bn-item{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;text-decoration:none;color:rgba(255,255,255,.45);font-size:9.5px;letter-spacing:.3px;font-family:var(--fm,'Open Sans',sans-serif);padding:6px 2px;transition:all .2s;border-top:2px solid transparent;position:relative}
.bn-item:hover,.bn-item.aktif{color:#fff;border-top-color:var(--cr,#8B1A1A)}
.bn-item.bagis-btn{color:var(--cr3,#C53030)}
.bn-item.bagis-btn:hover{color:#fff;border-top-color:var(--cr3,#C53030)}
.bn-ikon{font-size:17px;line-height:1}
.bn-etiket{font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;white-space:nowrap}
/* Sadece mobilde göster */
@media(min-width:901px){#vkv-bottom-nav{display:none!important}}
@media(max-width:900px){#vkv-bottom-nav{display:block}}
/* Footer'ın alt botomda ezilmemesi için */
@media(max-width:900px){body{padding-bottom:58px}}
</style>
<nav id="vkv-bottom-nav" aria-label="Mobil Alt Menü">
  <div class="bn-w">
    <?php foreach ($_bn_items as $_bni):
      $bn_url   = !empty($_bni['url']) ? $_bni['url'] : '/';
      $bn_bagis = !empty($_bni['bagis']);
      /* Harici URL kontrolü */
      $bn_href  = (strpos($bn_url, 'http') === 0) ? esc_url($bn_url) : esc_url(home_url($bn_url));
      $bn_cur   = (parse_url($bn_href, PHP_URL_PATH) === parse_url(home_url(add_query_arg(array(),$_SERVER['REQUEST_URI']??'/')), PHP_URL_PATH));
    ?>
    <a href="<?php echo $bn_href; ?>"
       class="bn-item<?php echo $bn_bagis ? ' bagis-btn' : ''; ?><?php echo $bn_cur ? ' aktif' : ''; ?>"
       <?php echo (strpos($bn_url,'http')===0) ? 'target="_blank" rel="noopener"' : ''; ?>>
      <span class="bn-ikon"><?php echo $_bni['ikon']; ?></span>
      <span class="bn-etiket"><?php echo esc_html($_bni['etiket']); ?></span>
    </a>
    <?php endforeach; ?>
  </div>
</nav>
<script>
/* Bottom nav aktif sayfa vurgulama */
(function(){
  var cur = window.location.pathname.replace(/\/+$/,'') || '/';
  document.querySelectorAll('.bn-item').forEach(function(a){
    var hp = a.getAttribute('href');
    try { hp = new URL(hp).pathname.replace(/\/+$/,'') || '/'; } catch(e){}
    if (hp && hp !== '/' && cur.indexOf(hp) === 0) { a.classList.add('aktif'); }
    else if (hp === '/' && cur === '/') { a.classList.add('aktif'); }
  });
})();
</script>
<?php endif; ?>
</body>
</html>
