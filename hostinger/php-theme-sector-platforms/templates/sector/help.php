<?php
/* sector 2026-10-10: /yardim — Nasıl kullanılır / yardım (halka açık + editör rehberi) */
declare(strict_types=1);

use Yenisafak\Html;
use Yenisafak\Sector;

/** @var \Yenisafak\Site $site */
$def = Sector::$def; $key = Sector::key();
$reqTitle = (string) ($def['request']['title'] ?? 'Talep');
?>
<section class="yn-phero"><div class="yn-wrap">
  <p class="yn-eyebrow"><span class="yn-dot"></span>Yardım</p>
  <h1 class="yn-page-h">Nasıl <em>kullanılır?</em></h1>
  <p class="yn-page-p"><?= Html::e($site->name) ?> sitesinde neler yapabileceğini adım adım anlatıyoruz. Sadece sitede gerçekten bulunan özellikler anlatılır.</p>
</div></section>
<div class="yn-wrap sc-help sc-helpwrap">
  <nav class="sc-helpnav" aria-label="Yardım başlıkları"><a href="#oku">Haber ve bölümler</a> <a href="#rehber">Rehber</a> <a href="#uye">Üye ol</a> <a href="#talep">Talep gönder</a> <a href="#ozel">Bu siteye özel</a> <a href="#editor">Editörler için</a> <a href="#sss">SSS</a></nav>

  <h2 id="oku" class="yn-h2">Haber ve bölümleri okumak</h2>
  <ol>
    <li>Ana sayfada öne çıkan yazıları görürsün. Üstteki menüden bir bölüme gir ya da <a href="/bolumler">Bölümler</a> sayfasında hepsini gör.</li>
    <li>Bir yazıya tıklayınca tam metni açılır. Kaynaklı yazıların sonunda kaynak bağlantısı bulunur.</li>
    <li>Yeni yazıları takip etmek için <a href="/rss.xml">RSS</a> bağlantısını okuyucuna ekleyebilirsin.</li>
  </ol>

  <h2 id="rehber" class="yn-h2">Rehberi kullanmak</h2>
  <ol>
    <li><a href="/rehber">Rehber</a> sayfasından bir tür seç (<?= Html::e(implode(', ', array_map(static fn ($k) => (string) $k['one'], (array) ($def['kinds'] ?? [])))) ?>).</li>
    <li>Listede il, ilçe seçerek ya da arama kutusuna ad yazarak filtrele, sonra “ara/filtrele” düğmesine bas.</li>
    <li>Bir kayda tıklayınca ayrıntı sayfası açılır. Telefon numaraları bot kullanımına karşı korunur: “Ara” düğmesine basınca numara gösterilir.</li>
  </ol>

  <h2 id="uye" class="yn-h2">Üye ol / Başvur</h2>
  <ol>
    <li><a href="/uye-ol">Üye ol / Başvur</a> sayfasında rolünü seç.</li>
    <li>Adını, e-postanı ve konumunu yaz; KVKK aydınlatma metnini oku ve onay kutusunu işaretle.</li>
    <li>Gönder'e bas. Başvurun editör tarafından incelenir; onaylanırsa ilgili rol için rehberde yer alabilirsin. Başvuruyla ilgili e-posta ile dönüş yapılır.</li>
  </ol>

  <h2 id="talep" class="yn-h2"><?= Html::e($reqTitle) ?>nu nasıl gönderirim?</h2>
  <ol>
    <li><a href="/talep"><?= Html::e($reqTitle) ?></a> sayfasını aç.</li>
    <li>Adını, e-postanı, konuyu ve mesajını yaz<?= $key === 'muhtar' ? '; il, ilçe ve mahalleni seç' : '' ?>.</li>
    <li>Gönderince ekranda bir <b>takip kodu</b> görürsün. Kodu not al.</li>
    <li>Talebinin durumunu <a href="/sektor/takip">Talep takibi</a> sayfasından, adresin sonuna <code>?ref=KODUN</code> ekleyerek ya da gönderim sonrası ekrandaki bağlantıyla görebilirsin.</li>
  </ol>
  <p class="yn-note">Kısa sürede çok sayıda talep gönderilirse sistem geçici olarak bekletir; biraz sonra tekrar dene.</p>

  <h2 id="ozel" class="yn-h2">Bu siteye özel</h2>
<?php if ($key === 'muhtar'): ?>
  <ul>
    <li><a href="/mahallemi-bul">Mahallemi Bul</a>: il → ilçe → mahalle seçerek mahalle sayfasına ulaşırsın; orada mahalleyle ilgili bilgiler ve talep bağlantısı bulunur.</li>
    <li><a href="/rehber/muhtar">Muhtarlar</a> rehberinde il/ilçe filtresiyle muhtarlıkları bulursun. Telefon, “Ara” düğmesiyle gösterilir.</li>
    <li>Muhtarlar “Üye ol / Başvur” ile başvurup rehber sayfasını ve kartvizitini (QR kodlu) kullanabilir.</li>
  </ul>
<?php elseif ($key === 'sendika'): ?>
  <ul>
    <li><a href="/araclar">Hesaplama Araçları</a>: kıdem ve ihbar tazminatı, yıllık izin, fazla mesai ve zam hesaplayıcıları. Sonuçlar <b>tahminidir</b>, hukuki veya mali tavsiye değildir.</li>
    <li><a href="/rehber/sendika">Sendika rehberi</a>: sendika ve konfederasyonları görürsün; ayrıntı sayfasında tanıtım bilgisi bulunur.</li>
    <li>“Hakkını Bil” ve TİS rehberi yazılarına menüdeki ilgili bölümlerden ulaşırsın.</li>
  </ul>
<?php else: ?>
  <ul>
    <li><a href="/rehber/okul">Okul rehberi</a>, özel kurumlar, kurum dışı kurumlar ve yurtlar için il/ilçe filtresi ve arama vardır.</li>
    <li><a href="/kategori/ok-sinavlar">Sınavlar ve Takvim</a>: tarihler resmî kaynaktan alınır ve kaynağı yazılır; bağlayıcı bilgi için kaynağa bak.</li>
    <li><a href="/kategori/ok-testler">Testler</a>: bir teste gir, şıklardan birini seç; doğru/yanlış ve kısa açıklama hemen görünür. Cevapların kaydedilmez, sunucuya gönderilmez.</li>
    <li><a href="/kategori/ok-meb-duyurulari">MEB Duyuruları</a>: Millî Eğitim Bakanlığı birim sitelerindeki duyurular özetlenerek ve kaynak bağlantısıyla verilir.</li>
    <li>Okul yöneticileri “Üye ol / Başvur” ile başvurup rehber sayfasını güncelleyebilir.</li>
  </ul>
<?php endif; ?>

  <h2 id="editor" class="yn-h2">Editörler için: panel kullanımı</h2>
  <p>Editör paneline <a href="/sektor/panel">/sektor/panel</a> adresinden girilir. Giriş yapılmadan panel içeriği görünmez.</p>
<?php require __DIR__ . '/_help_editor.php'; ?>

  <h2 id="sss" class="yn-h2">Sık sorulan sorular</h2>
  <dl class="sc-help">
    <dt>Üyelik ücretli mi?</dt><dd>Hayır. Bu sitede ödeme, bağış veya abonelik yoktur.</dd>
    <dt>Bilgilerim kimlerle paylaşılır?</dt><dd>Form bilgilerin yalnızca site editörüne ulaşır. Ayrıntı için <a href="/kvkk-aydinlatma">KVKK Aydınlatma</a> metnine bak.</dd>
    <dt>Rehberdeki bir bilgi yanlış, ne yapmalıyım?</dt><dd><a href="/talep"><?= Html::e($reqTitle) ?></a> ile yaz; editör inceler.</dd>
    <dt>Yazılar kim tarafından hazırlanıyor?</dt><dd>İçerikler yayın masası ve yapay zekâ destekli editörlük ile hazırlanır; kaynaklı yazılarda kaynak bağlantısı verilir.</dd>
    <dt>Bize ulaşmak için?</dt><dd><a href="/iletisim">İletişim</a> sayfasını kullan.</dd>
  </dl>
</div>
