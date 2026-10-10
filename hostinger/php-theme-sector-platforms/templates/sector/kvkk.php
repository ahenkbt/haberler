<?php
/* sector 2026-10-10: /kvkk-aydinlatma */
declare(strict_types=1);

use Yenisafak\Html;
use Yenisafak\Sector;

$n = Html::e($site->name);
$mail = Html::e((string) ($site->contact['email'] ?? Sector::$def['email']));
$okul = Sector::key() === 'okul';
?>
<section class="yn-phero"><div class="yn-wrap yn-wrap-n">
  <p class="yn-eyebrow"><span class="yn-dot"></span>6698 sayılı KVKK</p>
  <h1 class="yn-page-h">KVKK Aydınlatma <em>Metni</em></h1>
  <div class="ys-static ys-legal sc-legal">
    <p><strong>Veri sorumlusu:</strong> Tükav Gaziler Eğitim Kültür Hizmetleri Ltd. Şti. (<?= $n ?> yayıncısı), Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara. İletişim: <a href="mailto:<?= $mail ?>"><?= $mail ?></a>.</p>
    <h2>İşlenen veriler</h2>
    <p>Üyelik/rehber başvurularında ad soyad, e-posta, (isteğe bağlı) telefon, kurum adı, il/ilçe/mahalle bilgisi ve başvuru notu; talep formlarında ad soyad, e-posta, (isteğe bağlı) telefon, konum seçimi, konu ve mesaj metni. Teknik olarak IP adresi tek yönlü şifrelenerek (özet olarak) kötüye kullanımı önleme amacıyla saklanır; açık IP adresi tutulmaz.</p>
    <h2>İşleme amaçları ve hukuki sebepler</h2>
    <ul>
      <li>Başvurunun incelenmesi, onaylanması ve onaylanan rehber kaydının yayımlanması (açık rıza; bir hakkın tesisi ve kullanılması).</li>
      <li>Talebin değerlendirilmesi, ilgili birime/muhtarlığa iletilmesi ve takibi (açık rıza; meşru menfaat).</li>
      <li>Güvenlik, kötüye kullanımın önlenmesi ve yasal yükümlülüklerin yerine getirilmesi.</li>
    </ul>
    <h2>Paylaşım</h2>
    <p>Rehber kayıtlarında yalnızca başvuruda “rehberde görünecek” olarak belirtilen kurum adı, konum, web adresi ve kısa tanıtım yayımlanır; e-posta ve telefon yayımlanmaz. Talepler yalnızca ilgili muhtarlığa/kuruma iletilmek üzere yayın masası tarafından işlenir. Veriler reklam amacıyla satılmaz ve paylaşılmaz. Altyapı hizmeti sağlayıcıları (Ahenk Bilgi Teknolojileri) veri işleyen olarak yer alır.</p>
    <h2>Saklama</h2>
    <p>Veriler amaç için gerekli süre boyunca; yasal saklama yükümlülükleri saklıdır. Başvurusu reddedilen kayıtlar yayımlanmaz.</p>
<?php if ($okul): ?>
    <h2>Çocukların verileri</h2>
    <p>Platform 18 yaşından küçüklerin kişisel verilerini toplamaz. Öğrenci adı, fotoğrafı ve okul bilgisi velinin yazılı izni olmadan yayımlanmaz. Başvurular yetişkin okul yöneticisi, öğretmen ya da veli/vasi tarafından yapılır.</p>
<?php endif; ?>
    <h2>Haklarınız</h2>
    <p>KVKK m.11 uyarınca verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, düzeltme, silme, işlemeye itiraz ve zararın giderilmesini isteme haklarına sahipsiniz. Başvurularınızı <a href="mailto:<?= $mail ?>"><?= $mail ?></a> adresine iletebilirsiniz.</p>
    <p class="yn-note">Ayrıntılar için <a href="/gizlilik-politikasi">Gizlilik Politikası</a> ve <a href="/hizmet-sartlari">Hizmet Şartları</a> sayfalarına bakın.</p>
  </div>
</div></section>
