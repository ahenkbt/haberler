<?php
/* sector 2026-10-10: editör paneli kullanım rehberi (panel ekranındaki başlıklarla birebir) */
declare(strict_types=1);
?>
<div class="sc-help">
  <h3>Panel ekranları ve ne işe yaradıkları</h3>
  <ol>
    <li><b>Giriş:</b> <a href="/sektor/panel">/sektor/panel</a> adresinde e-posta ve parola ile girilir. Giriş bilgisi site yönetiminden alınır. İşin bitince <b>Çıkış</b> düğmesine bas.</li>
    <li><b>Üyelik / rehber başvuruları:</b> Sitedeki “Üye ol / Başvur” formundan gelenler burada listelenir. Satırdaki bilgileri kontrol et; uygunsa <b>Onayla</b>, değilse <b>Reddet</b>. Rehberde yer almak isteyen rol onaylanınca rehbere eklenir.</li>
    <li><b>Talepler:</b> Talep formundan gelen mesajlar takip koduyla listelenir; yeni talep geldiğinde editör e-postasına bildirim de gider. Sağdaki listeden durumu seç (Yeni, İletildi, Yanıtlandı, Kapalı), istersen “Takip sayfasında görünecek not” yaz ve <b>Kaydet</b>'e bas. Not ve durum, talep sahibinin takip sayfasında görünür; kişisel bilgi yazma.</li>
    <li><b>Yayın: haber / duyuru yayımla:</b> Bölümü seç, başlık ve metni yaz (paragrafları boş satırla ayır), <b>Yayımla</b>'ya bas. Yazı hemen ilgili bölümde görünür. Kısa özet ve kaynak alanları isteğe bağlıdır.</li>
    <li><b>Rehber kayıtları:</b> “Kayıt ara” kutusuna ad veya mahalle yaz. Bir kaydı listeden kaldırmak için <b>Gizle</b>, geri getirmek için <b>Yayınla</b> kullan (kayıt silinmez). “Tanıtım sayfasını düzenle” ile kısa açıklama, tanıtım metni, web adresi ve telefon güncellenir; telefon boş bırakılırsa eski numara değişmez.</li>
    <li><b>Rehbere kayıt ekle:</b> Tür, ad, kısa açıklama, web ve konumu doldurup <b>Ekle</b>'ye bas.</li>
    <li><b>Haber editörü:</b> Görselli ve ayrıntılı haber yönetimi için panelin üstündeki “Haber editörü” bağlantısı (/editor) kullanılır.</li>
  </ol>
  <h3>Yapay zekâ editörü hakkında</h3>
  <p>Bu sitenin yapay zekâ editörü arka planda zamanlanmış çalışır: kendi bölümleri için özgün içerik üretir, resmî kaynaklardan gelen duyuruları kendi cümleleriyle özetler ve kaynak linkini ekler. Panelde yapay zekâ ile sohbet ekranı <b>yoktur</b>. Yanlış ya da uygunsuz bir içerik görürsen haber editöründen (/editor) gizleyebilirsin.</p>
  <h3>Sık sorulanlar</h3>
  <dl>
    <dt>Yanlışlıkla Reddet'e bastım?</dt><dd>Başvuru bilgilerini yeniden gönderdirmek gerekir; durumu panelden geri almak için site yönetimine haber ver.</dd>
    <dt>Talep e-postası gelmedi?</dt><dd>Talep yine de panelde görünür; önce “Talepler” listesine bak. E-posta geç gelebilir, spam klasörünü de kontrol et.</dd>
    <dt>Yayımladığım yazıyı kaldırabilir miyim?</dt><dd>Haber editöründen (/editor) gizlenir; içerikler silinmez.</dd>
    <dt>Oturum kapandı?</dt><dd>Güvenlik için oturum süresi sınırlıdır; yeniden giriş yap.</dd>
  </dl>
</div>
