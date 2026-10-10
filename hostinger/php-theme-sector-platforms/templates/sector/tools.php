<?php
/* sector 2026-10-10: /araclar — Türkiye Sendika Platformu hesaplama araçları (istemci tarafı, veri sunucuya gönderilmez) */
declare(strict_types=1);

use Yenisafak\Html;
?>
<section class="yn-phero"><div class="yn-wrap">
  <p class="yn-eyebrow"><span class="yn-dot"></span>Hesaplama araçları</p>
  <h1 class="yn-page-h">Hakkını <em>hesapla.</em></h1>
  <p class="yn-page-p">Aşağıdaki araçlar tahmini sonuç verir ve tarayıcında çalışır; girdiğin hiçbir bilgi sunucuya gönderilmez. Sonuçlar hukuki ya da mali tavsiye değildir; kesin hesap için işverenine, SGK'ya, bir iş hukuku avukatına ya da sendikana danış.</p>
</div></section>
<div class="yn-wrap sc-tools" data-sc-tools>

  <section class="sc-card sc-tool" id="kidem" data-tool="kidem">
    <h2>Kıdem tazminatı <small>(tahmini, brüt)</small></h2>
    <p class="yn-note">Tam yıl başına 30 günlük brüt ücret; artakalan süre oranlanır. Aylık tavan altı aylık dönemler için yeniden belirlenir: 1 Temmuz – 31 Aralık 2026 için 73.729,87 ₺'dir (Hazine ve Maliye Bakanlığı Mali ve Sosyal Haklar Genelgesi, Sıra No: 5, 02.07.2026). Alan bu tutarla doldurulmuştur; yeni dönemde güncel tutarı yaz, tavan istemiyorsan alanı boşalt. Hesapta damga vergisi (binde 7,59) düşülür; kıdem tazminatının gelir vergisi istisnası dönem tavanı içindir.</p>
    <div class="sc-fields">
      <div class="yn-f"><label>İşe giriş tarihi<input type="date" data-k="giris"></label></div>
      <div class="yn-f"><label>İşten çıkış tarihi<input type="date" data-k="cikis"></label></div>
      <div class="yn-f"><label>Aylık brüt ücret (₺)<input type="text" inputmode="decimal" data-k="brut" placeholder="ör. 30000"></label></div>
      <div class="yn-f"><label>Aylık brüt yan haklar (₺) <em>(yemek, yol vb.; ops.)</em><input type="text" inputmode="decimal" data-k="yan" placeholder="0"></label></div>
      <div class="yn-f"><label>Kıdem tazminatı tavanı (₺) <em>(ops.)</em><input type="text" inputmode="decimal" data-k="tavan" value="73729.87" placeholder="güncel tavan"></label></div>
    </div>
    <button class="yn-btn yn-btn-hot" type="button" data-calc>Hesapla</button>
    <div class="sc-out" data-out aria-live="polite"></div>
  </section>

  <section class="sc-card sc-tool" id="ihbar" data-tool="ihbar">
    <h2>İhbar tazminatı <small>(tahmini, brüt)</small></h2>
    <p class="yn-note">İhbar süresi çalışma süresine göre 2, 4, 6 veya 8 haftadır. Sonuç brüttür; gelir ve damga vergisi kesintileri ayrıca yapılır.</p>
    <div class="sc-fields">
      <div class="yn-f"><label>İşe giriş tarihi<input type="date" data-k="giris"></label></div>
      <div class="yn-f"><label>İşten çıkış tarihi<input type="date" data-k="cikis"></label></div>
      <div class="yn-f"><label>Aylık brüt ücret (₺)<input type="text" inputmode="decimal" data-k="brut"></label></div>
      <div class="yn-f"><label>Aylık brüt yan haklar (₺) <em>(ops.)</em><input type="text" inputmode="decimal" data-k="yan" placeholder="0"></label></div>
    </div>
    <button class="yn-btn yn-btn-hot" type="button" data-calc>Hesapla</button>
    <div class="sc-out" data-out aria-live="polite"></div>
  </section>

  <section class="sc-card sc-tool" id="izin" data-tool="izin">
    <h2>Yıllık ücretli izin süresi</h2>
    <p class="yn-note">Hizmet süresi 1–5 yıl (5 dahil) için 14, 5 yıldan fazla 15 yıldan az için 20, 15 yıl ve üzeri için 26 iş günüdür. 18 yaşından küçük ve 50 yaşından büyük işçilere en az 20 gün verilir. Yeraltı işlerinde süreler farklıdır.</p>
    <div class="sc-fields">
      <div class="yn-f"><label>İşe giriş tarihi<input type="date" data-k="giris"></label></div>
      <div class="yn-f"><label>Yaşın<input type="text" inputmode="numeric" data-k="yas" placeholder="ör. 34"></label></div>
    </div>
    <button class="yn-btn yn-btn-hot" type="button" data-calc>Hesapla</button>
    <div class="sc-out" data-out aria-live="polite"></div>
  </section>

  <section class="sc-card sc-tool" id="mesai" data-tool="mesai">
    <h2>Fazla mesai ücreti <small>(brüt)</small></h2>
    <p class="yn-note">Haftalık 45 saati aşan çalışma fazla çalışmadır ve saat ücretinin %50 fazlasıyla ödenir. Fazla çalışma için işçinin onayı gerekir; yönetmeliğe göre yıllık fazla çalışma üst sınırı 270 saattir. Aylık normal çalışma saati haftalık 45 saat için genellikle 225 kabul edilir; iş sözleşmene göre değiştirebilirsin. (Kaynak: 4857 sayılı İş Kanunu md. 41, Fazla Çalışma ve Fazla Sürelerle Çalışma Yönetmeliği.)</p>
    <div class="sc-fields">
      <div class="yn-f"><label>Aylık brüt ücret (₺)<input type="text" inputmode="decimal" data-k="brut"></label></div>
      <div class="yn-f"><label>Aylık normal çalışma saati<input type="text" inputmode="decimal" data-k="saat" value="225"></label></div>
      <div class="yn-f"><label>Fazla çalışma saati (ay)<input type="text" inputmode="decimal" data-k="fm" placeholder="ör. 20"></label></div>
    </div>
    <button class="yn-btn yn-btn-hot" type="button" data-calc>Hesapla</button>
    <div class="sc-out" data-out aria-live="polite"></div>
  </section>

  <section class="sc-card sc-tool" id="zam" data-tool="zam">
    <h2>Zam ve reel değişim</h2>
    <p class="yn-note">Maaşına yapılan zammın tutarını ve (enflasyon oranını girersen) satın alma gücündeki reel değişimi hesaplar.</p>
    <div class="sc-fields">
      <div class="yn-f"><label>Mevcut maaş (₺)<input type="text" inputmode="decimal" data-k="eski"></label></div>
      <div class="yn-f"><label>Zam oranı (%)<input type="text" inputmode="decimal" data-k="zam" placeholder="ör. 25"></label></div>
      <div class="yn-f"><label>Dönem enflasyonu (%) <em>(ops.)</em><input type="text" inputmode="decimal" data-k="enf" placeholder="ör. 30"></label></div>
    </div>
    <button class="yn-btn yn-btn-hot" type="button" data-calc>Hesapla</button>
    <div class="sc-out" data-out aria-live="polite"></div>
  </section>

  <p class="yn-note">Mevzuat ve tutarlar değişebilir. Güncel bilgi için <a href="https://www.csgb.gov.tr" target="_blank" rel="noopener nofollow">ÇSGB</a>, <a href="https://www.sgk.gov.tr" target="_blank" rel="noopener nofollow">SGK</a> ve <a href="https://www.mevzuat.gov.tr" target="_blank" rel="noopener nofollow">Mevzuat Bilgi Sistemi</a> kaynaklarına bakın. Daha fazlası için <a href="/kategori/sn-hakkini-bil">Hakkını Bil</a> rehberi.</p>
</div>
