<?php
/* sector 2026-10-10: /araclar — okul platformu araçları (istemci tarafı; veri sunucuya gönderilmez) */
declare(strict_types=1);
?>
<section class="yn-phero"><div class="yn-wrap">
  <p class="yn-eyebrow"><span class="yn-dot"></span>Eğitim araçları</p>
  <h1 class="yn-page-h">Hesapla, <em>planla.</em></h1>
  <p class="yn-page-p">Araçlar tarayıcında çalışır; girdiğin hiçbir bilgi sunucuya gönderilmez. Sonuçlar tahminidir; resmî hesap ve tarihler için ÖSYM, MEB ve e-Okul kaynaklarına bak.</p>
</div></section>
<div class="yn-wrap sc-tools" data-sc-tools>

  <section class="sc-card sc-tool" id="net" data-tool="net">
    <h2>Net hesaplama</h2>
    <p class="yn-note">YKS gibi ÖSYM sınavlarında dört yanlış bir doğruyu, LGS'de üç yanlış bir doğruyu götürür. Net = doğru − yanlış ÷ katsayı. (Kaynaklar: ÖSYM ve MEB sınav kılavuzları.)</p>
    <div class="sc-fields">
      <div class="yn-f"><label>Sınav türü<select data-k="oran"><option value="4">YKS / ÖSYM sınavı (4 yanlış = 1 doğru)</option><option value="3">LGS (3 yanlış = 1 doğru)</option></select></label></div>
      <div class="yn-f"><label>Doğru sayısı<input type="text" inputmode="numeric" data-k="dogru" placeholder="ör. 30"></label></div>
      <div class="yn-f"><label>Yanlış sayısı<input type="text" inputmode="numeric" data-k="yanlis" placeholder="ör. 6"></label></div>
      <div class="yn-f"><label>Testteki soru sayısı <em>(ops.)</em><input type="text" inputmode="numeric" data-k="toplam" placeholder="ör. 40"></label></div>
    </div>
    <button class="yn-btn yn-btn-hot" type="button" data-calc>Hesapla</button>
    <div class="sc-out" data-out aria-live="polite"></div>
  </section>

  <section class="sc-card sc-tool" id="ortalama" data-tool="ortalama">
    <h2>Ağırlıklı not ortalaması</h2>
    <p class="yn-note">Her satıra bir ders yaz: <b>not</b> ve (istersen) <b>haftalık ders saati</b>, boşlukla ayır. Örnek: <code>85 4</code>. Saat yazmazsan 1 sayılır. Okulundaki resmî yıl sonu puanı hesabı için e-Okul ve MEB yönetmeliğine bak.</p>
    <div class="sc-fields">
      <div class="yn-f" style="grid-column:1/-1"><label>Notlar (her satır: not saat)<textarea data-k="satirlar" rows="6" placeholder="85 4&#10;70 3&#10;92 2"></textarea></label></div>
    </div>
    <button class="yn-btn yn-btn-hot" type="button" data-calc>Hesapla</button>
    <div class="sc-out" data-out aria-live="polite"></div>
  </section>

  <section class="sc-card sc-tool" id="geri-sayim" data-tool="geri">
    <h2>Resmî tarihe geri sayım</h2>
    <p class="yn-note">Tarihler MEB 2026-2027 çalışma takvimi ve ÖSYM Sınav Takvimi'nden alınmıştır (10.10.2026 itibarıyla). Kendi tarihini de girebilirsin.</p>
    <div class="sc-fields">
      <div class="yn-f"><label>Hazır tarih<select data-k="hazir">
        <option value="">— seç —</option>
        <option value="2026-10-25">KPSS Ortaöğretim sınavı — 25.10.2026 (ÖSYM)</option>
        <option value="2026-11-16">Birinci dönem ara tatili başlangıcı — 16.11.2026 (MEB)</option>
        <option value="2026-11-22">YDS/2 — 22.11.2026 (ÖSYM)</option>
        <option value="2026-11-29">ALES/3 — 29.11.2026 (ÖSYM)</option>
        <option value="2027-01-22">Birinci dönemin sonu — 22.01.2027 (MEB)</option>
        <option value="2027-01-25">Yarıyıl tatili başlangıcı — 25.01.2027 (MEB)</option>
        <option value="2027-02-08">İkinci dönem başlangıcı — 08.02.2027 (MEB)</option>
        <option value="2027-03-08">İkinci dönem ara tatili başlangıcı — 08.03.2027 (MEB)</option>
        <option value="2027-06-25">Ders yılının sonu — 25.06.2027 (MEB)</option>
      </select></label></div>
      <div class="yn-f"><label>veya kendi tarihin<input type="date" data-k="ozel"></label></div>
    </div>
    <button class="yn-btn yn-btn-hot" type="button" data-calc>Kaç gün kaldı?</button>
    <div class="sc-out" data-out aria-live="polite"></div>
  </section>

  <p class="yn-note">Daha fazlası: <a href="/takvim">Eğitim takvimi</a> · <a href="/sozluk">Eğitim sözlüğü</a> · <a href="/sss">SSS</a> · <a href="/kontrol-listeleri">Kontrol listeleri</a>.</p>
</div>
