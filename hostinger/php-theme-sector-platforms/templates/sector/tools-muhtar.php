<?php
/* sector 2026-10-10: /araclar — muhtar platformu araçları (istemci tarafı; veri sunucuya gönderilmez) */
declare(strict_types=1);
?>
<section class="yn-phero"><div class="yn-wrap">
  <p class="yn-eyebrow"><span class="yn-dot"></span>Mahalle araçları</p>
  <h1 class="yn-page-h">Yaz, <em>hesapla.</em></h1>
  <p class="yn-page-p">Araçlar tarayıcında çalışır; girdiğin hiçbir bilgi sunucuya gönderilmez. Kimlik numarası gibi gereksiz kişisel verileri yazma.</p>
</div></section>
<div class="yn-wrap sc-tools" data-sc-tools>

  <section class="sc-card sc-tool" id="dilekce" data-tool="dilekce">
    <h2>Dilekçe / talep metni oluşturucu</h2>
    <p class="yn-note">Mahalle sorununu ya da talebini düzenli bir metne dönüştürür. Metni kopyalayıp ilgili kuruma iletebilir, platformdaki <a href="/talep">talep formuna</a> yapıştırabilirsin. Çözüm yetkisi ilgili kuruma aittir.</p>
    <div class="sc-fields">
      <div class="yn-f"><label>Muhatap<select data-k="kurum"><option>Muhtarlığına</option><option>Belediye Başkanlığına</option><option>Kaymakamlığına</option><option>Valiliğine</option></select></label></div>
      <div class="yn-f"><label>Adın soyadın<input type="text" data-k="ad" autocomplete="off"></label></div>
      <div class="yn-f"><label>Mahalle / ilçe / il<input type="text" data-k="yer" placeholder="ör. Örnek Mah. / Merkez / Ankara"></label></div>
      <div class="yn-f"><label>Konu<input type="text" data-k="konu" placeholder="ör. Sokak aydınlatması"></label></div>
      <div class="yn-f" style="grid-column:1/-1"><label>Açıklama (sorun nedir, nerede, ne zamandır var?)<textarea data-k="aciklama" rows="5"></textarea></label></div>
    </div>
    <button class="yn-btn yn-btn-hot" type="button" data-calc>Metni oluştur</button>
    <div class="sc-out" data-out aria-live="polite"></div>
  </section>

  <section class="sc-card sc-tool" id="adres-suresi" data-tool="adres">
    <h2>Adres bildirim süresi (20 iş günü)</h2>
    <p class="yn-note">Nüfus ve Vatandaşlık İşleri Genel Müdürlüğü'ne göre adres değişikliği 20 iş günü içinde bildirilmelidir. Araç, taşındığın günden sonraki iş günlerini sayar; hafta sonlarını ve Ekim 2026 – Ekim 2027 arasındaki resmî tatilleri (bkz. <a href="/takvim">takvim</a>) atlar. Tahminidir; kesin süre için nüfus müdürlüğüne danış.</p>
    <div class="sc-fields">
      <div class="yn-f"><label>Taşınma tarihi<input type="date" data-k="tarih" min="2026-10-01" max="2027-09-30"></label></div>
    </div>
    <button class="yn-btn yn-btn-hot" type="button" data-calc>Son günü bul</button>
    <div class="sc-out" data-out aria-live="polite"></div>
  </section>

  <p class="yn-note">Daha fazlası: <a href="/gorev-yetki">Görev ve yetki rehberi</a> · <a href="/e-devlet-talep-rehberi">e-Devlet ve talep rehberi</a> · <a href="/sss">SSS</a> · <a href="/kontrol-listeleri">Kontrol listeleri</a>.</p>
</div>
