/* sektör platformu — küçük arayüz yardımcıları (sector 2026-10-10). Bağımlılık yok. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* hızlı il seçici (ana sayfa) */
  var q = $('[data-sc-province]');
  if (q) {
    q.addEventListener('submit', function (e) {
      var v = $('select', q).value;
      if (v) { e.preventDefault(); location.href = v; }
    });
  }

  /* il -> ilçe -> mahalle */
  function fill(sel, items, pre, ph) {
    sel.innerHTML = '';
    var o = document.createElement('option'); o.value = ''; o.textContent = ph; sel.appendChild(o);
    items.forEach(function (it) {
      var op = document.createElement('option'); op.value = it.id; op.textContent = it.name;
      if (String(pre) === String(it.id)) op.selected = true;
      sel.appendChild(op);
    });
    sel.disabled = false;
  }
  function get(url, cb) {
    var x = new XMLHttpRequest(); x.open('GET', url); x.onload = function () { try { cb(JSON.parse(x.responseText).items || []); } catch (e) { cb([]); } }; x.onerror = function () { cb([]); }; x.send();
  }
  $$('[data-sc-geo]').forEach(function (g) {
    var il = $('[data-sc-il]', g), ilce = $('[data-sc-ilce]', g), mah = $('[data-sc-mah]', g);
    function loadIlce(pre) {
      if (!il.value) { ilce.disabled = true; ilce.innerHTML = '<option value="">Önce il seç</option>'; if (mah) { mah.disabled = true; mah.innerHTML = '<option value="">Önce ilçe seç</option>'; } return; }
      get('/sektor/api/ilce?il=' + encodeURIComponent(il.value), function (items) { fill(ilce, items, pre, 'İlçe seç'); if (mah) { if (pre) loadMah(mah.getAttribute('data-pre')); else { mah.disabled = true; mah.innerHTML = '<option value="">Önce ilçe seç</option>'; } } });
    }
    function loadMah(pre) {
      if (!mah) return;
      if (!ilce.value) { mah.disabled = true; mah.innerHTML = '<option value="">Önce ilçe seç</option>'; return; }
      get('/sektor/api/mahalle?ilce=' + encodeURIComponent(ilce.value), function (items) { fill(mah, items, pre, 'Mahalle seç'); });
    }
    il.addEventListener('change', function () { loadIlce(0); });
    ilce.addEventListener('change', function () { loadMah(0); });
    if (il.value) loadIlce(ilce.getAttribute('data-pre'));
  });

  /* üyelik formu: rol seçimine göre alanlar */
  var rolesEl = $('#sc-roles'), roles = {};
  try { roles = rolesEl ? JSON.parse(rolesEl.textContent) : {}; } catch (e) {}
  $$('form[data-sc-form]').forEach(function (f) {
    var radios = $$('input[name=role]', f);
    if (!radios.length) return;
    function sync() {
      var r = radios.filter(function (x) { return x.checked; })[0];
      if (!r) return;
      var listed = r.getAttribute('data-listed') === '1', geo = r.getAttribute('data-geo') === '1';
      $$('[data-sc-listed]', f).forEach(function (el) {
        var isGeo = el.hasAttribute('data-sc-geowrap');
        el.hidden = !(listed && (!isGeo || geo));
        $$('input,select', el).forEach(function (i) { if (i.name === 'org') i.required = listed; });
      });
      var d = $('[data-sc-roledesc]', f); if (d) d.textContent = roles[r.value] || '';
      var mah = $('[data-sc-mah]', f); if (mah) mah.required = listed && geo && r.value === 'muhtar';
      var il = $('[data-sc-il]', f), ilce = $('[data-sc-ilce]', f);
      if (il && ilce) { il.required = listed && geo; ilce.required = listed && geo; }
    }
    radios.forEach(function (r) { r.addEventListener('change', sync); });
    sync();
  });
  $$('form[data-sc-form]').forEach(function (f) {
    f.addEventListener('submit', function () { var b = $('button[type=submit]', f); if (b) { b.disabled = true; b.textContent = 'Gönderiliyor…'; } });
  });

  /* mahalle listesi filtresi */
  $$('[data-sc-filter]').forEach(function (inp) {
    var list = $(inp.getAttribute('data-sc-filter'));
    if (!list) return;
    var lis = $$('li', list);
    inp.addEventListener('input', function () {
      var v = inp.value.toLocaleLowerCase('tr').trim();
      lis.forEach(function (li) { li.hidden = v !== '' && li.getAttribute('data-n').indexOf(v) < 0; });
    });
  });

  /* hesaplama araçları */
  var tools = $('[data-sc-tools]');
  if (tools) {
    var num = function (v) { v = String(v || '').trim().replace(/\s/g, ''); if (v === '') return NaN; if (/,/.test(v)) v = v.replace(/\./g, '').replace(',', '.'); return parseFloat(v); };
    var tl = function (n) { return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺'; };
    var d = function (v) { return v ? new Date(v + 'T00:00:00') : null; };
    var days = function (a, b) { return Math.round((b - a) / 86400000); };
    function span(a, b) { // tam yıl, ay, gün
      var y = b.getFullYear() - a.getFullYear(), m = b.getMonth() - a.getMonth(), dd = b.getDate() - a.getDate();
      if (dd < 0) { m--; dd += new Date(b.getFullYear(), b.getMonth(), 0).getDate(); }
      if (m < 0) { y--; m += 12; }
      return { y: y, m: m, d: dd, total: days(a, b) + 1 };
    }
    var box = function (html) { return '<div class="sc-res-box">' + html + '</div>'; };
    var err = function (t) { return box('<p class="err">' + t + '</p>'); };
    var calc = {
      kidem: function (v) {
        var a = d(v.giris), b = d(v.cikis), brut = num(v.brut), yan = num(v.yan) || 0, tavan = num(v.tavan);
        if (!a || !b || b < a || !(brut > 0)) return err('Giriş ve çıkış tarihlerini ve brüt ücreti doğru gir.');
        var s = span(a, b), yil = s.y + (s.m * 30 + s.d) / 365, esas = brut + yan, capped = false;
        if (tavan > 0 && esas > tavan) { esas = tavan; capped = true; }
        var gross = esas * yil, damga = gross * 0.00759;
        return box('<b>' + tl(gross - damga) + ' net (tahmini)</b><p>Brüt: ' + tl(gross) + ' · Damga vergisi (binde 7,59): ' + tl(damga) + '</p><p>Çalışma süresi: ' + s.y + ' yıl ' + s.m + ' ay ' + s.d + ' gün' + (capped ? ' · Tavan uygulandı' : '') + '</p><p>Kıdem tazminatı için genellikle aynı işyerinde en az 1 yıl çalışmış olmak ve işten ayrılışın yasal şartlara uyması gerekir.</p>');
      },
      ihbar: function (v) {
        var a = d(v.giris), b = d(v.cikis), brut = num(v.brut), yan = num(v.yan) || 0;
        if (!a || !b || b < a || !(brut > 0)) return err('Giriş ve çıkış tarihlerini ve brüt ücreti doğru gir.');
        var s = span(a, b), months = s.y * 12 + s.m + s.d / 30, hafta = months < 6 ? 2 : months < 18 ? 4 : months < 36 ? 6 : 8;
        var gross = (brut + yan) / 30 * 7 * hafta;
        return box('<b>' + tl(gross) + ' brüt (tahmini)</b><p>İhbar süresi: ' + hafta + ' hafta · Çalışma süresi: ' + s.y + ' yıl ' + s.m + ' ay ' + s.d + ' gün</p><p>Gelir vergisi ve damga vergisi kesintileri ayrıca yapılır.</p>');
      },
      izin: function (v) {
        var a = d(v.giris), yas = num(v.yas), now = new Date();
        if (!a || a > now) return err('Geçerli bir işe giriş tarihi gir.');
        var s = span(a, now), yil = s.y + s.m / 12 + s.d / 365;
        if (yil < 1) return box('<b>Henüz hak edilmedi</b><p>Yıllık izin hakkı, işyerinde en az bir yıl çalıştıktan sonra doğar. Çalışma süren: ' + s.y + ' yıl ' + s.m + ' ay ' + s.d + ' gün.</p>');
        var g = yil <= 5 ? 14 : yil < 15 ? 20 : 26;
        if ((yas > 0 && yas < 18) || yas >= 50) g = Math.max(g, 20);
        return box('<b>' + g + ' iş günü</b><p>Çalışma süren: ' + s.y + ' yıl ' + s.m + ' ay ' + s.d + ' gün. Ulusal bayram, hafta tatili ve genel tatil günleri izin süresine eklenir; iş sözleşmesi ya da toplu iş sözleşmesi daha uzun süre öngörebilir.</p>');
      },
      mesai: function (v) {
        var brut = num(v.brut), saat = num(v.saat) || 225, fm = num(v.fm);
        if (!(brut > 0) || !(fm > 0)) return err('Brüt ücreti ve fazla çalışma saatini gir.');
        var saatlik = brut / saat, ucret = saatlik * 1.5 * fm;
        return box('<b>' + tl(ucret) + ' brüt (tahmini)</b><p>Saat ücreti: ' + tl(saatlik) + ' · Fazla çalışma saat ücreti (×1,5): ' + tl(saatlik * 1.5) + '</p><p>Fazla çalışma onayı ve sınırlar için iş sözleşmeni ve 4857 sayılı İş Kanunu hükümlerini kontrol et.</p>');
      },
      net: function (v) {
        var k = num(v.oran) || 4, dg = num(v.dogru), yl = num(v.yanlis), t = num(v.toplam);
        if (isNaN(dg) || isNaN(yl) || dg < 0 || yl < 0) return err('Doğru ve yanlış sayılarını gir.');
        if (t > 0 && dg + yl > t) return err('Doğru ve yanlış toplamı soru sayısını aşamaz.');
        var net = dg - yl / k, h = '<b>' + net.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + ' net</b><p>Doğru: ' + dg + ' · Yanlış: ' + yl + ' · Katsayı: ' + yl + '/' + k + ' = ' + (yl / k).toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + ' doğru eksilir</p>';
        if (t > 0) h += '<p>Boş: ' + (t - dg - yl) + '</p>';
        return box(h + '<p>Puan hesabı sınavın katsayılarına ve ağırlıklarına bağlıdır; resmî hesap için ÖSYM/MEB kılavuzuna bak.</p>');
      },
      ortalama: function (v) {
        var lines = String(v.satirlar || '').split(/\n/), sn = 0, ss = 0, n = 0;
        lines.forEach(function (l) {
          var p = l.trim().split(/[\s;,]+/).filter(Boolean); if (!p.length) return;
          var nt = num(p[0]), sa = p.length > 1 ? num(p[1]) : 1; if (isNaN(sa) || sa <= 0) sa = 1;
          if (!isNaN(nt) && nt >= 0 && nt <= 100) { sn += nt * sa; ss += sa; n++; }
        });
        if (!n) return err('En az bir satıra 0-100 arası not yaz (ör. 85 4).');
        var avg = sn / ss, simple = 0, c = 0;
        lines.forEach(function (l) { var p = l.trim().split(/[\s;,]+/).filter(Boolean); var nt = num(p[0]); if (!isNaN(nt) && nt >= 0 && nt <= 100) { simple += nt; c++; } });
        return box('<b>' + avg.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + ' (ağırlıklı)</b><p>' + n + ' ders · toplam ' + ss + ' saat · Basit ortalama: ' + (simple / c).toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + '</p>');
      },
      geri: function (v) {
        var s = v.ozel || v.hazir; if (!s) return err('Hazır bir tarih seç ya da kendi tarihini gir.');
        var hedef = new Date(s + 'T00:00:00'), now = new Date(); now.setHours(0, 0, 0, 0);
        var g = Math.round((hedef - now) / 86400000);
        if (g < 0) return box('<b>Bu tarih geçti</b><p>' + Math.abs(g) + ' gün önce.</p>');
        if (g === 0) return box('<b>Bugün!</b>');
        return box('<b>' + g + ' gün kaldı</b><p>Yaklaşık ' + Math.floor(g / 7) + ' hafta ' + (g % 7) + ' gün · Hedef: ' + hedef.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' }) + '</p>');
      },
      dilekce: function (v) {
        var ad = (v.ad || '').trim(), yer = (v.yer || '').trim(), konu = (v.konu || '').trim(), ac = (v.aciklama || '').trim();
        if (!ad || !konu || !ac) return err('Adını, konuyu ve açıklamayı yaz.');
        var esc = function (x) { var d = document.createElement('div'); d.textContent = x; return d.innerHTML; };
        var today = new Date().toLocaleDateString('tr-TR');
        var t = (yer ? yer + ' ' : '') + v.kurum.toLocaleUpperCase('tr') + '\n\nKonu: ' + konu + '\n\nSayın Yetkili,\n\n' + ac + '\n\nYukarıda belirttiğim konunun incelenerek gereğinin yapılmasını ve sonuç hakkında bilgi verilmesini arz ederim.\n\n' + today + '\n' + ad + '\n(İmza)';
        return box('<pre style="white-space:pre-wrap;font:inherit;margin:0" id="sc-dilekce-t">' + esc(t) + '</pre><p><button type="button" class="yn-btn yn-btn-ghost" onclick="var e=document.getElementById(\'sc-dilekce-t\');navigator.clipboard&&navigator.clipboard.writeText(e.textContent);this.textContent=\'Kopyalandı\'">Kopyala</button></p>');
      },
      adres: function (v) {
        if (!v.tarih) return err('Taşınma tarihini seç.');
        var hol = ['2026-10-29', '2027-01-01', '2027-03-09', '2027-03-10', '2027-03-11', '2027-04-23', '2027-05-17', '2027-05-18', '2027-05-19', '2027-07-15', '2027-08-30', '2027-10-29'];
        var dte = new Date(v.tarih + 'T12:00:00'), n = 0, iso = function (x) { return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
        if (dte < new Date('2026-10-01T00:00:00')) return err('Araç Ekim 2026 – Ekim 2027 resmî tatil tablosunu kullanır; bu aralıkta bir tarih seç.');
        while (n < 20) { dte.setDate(dte.getDate() + 1); var wd = dte.getDay(); if (wd !== 0 && wd !== 6 && hol.indexOf(iso(dte)) < 0) n++; if (dte.getFullYear() > 2027 && dte.getMonth() > 10) break; }
        return box('<b>' + dte.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' }) + '</b><p>Taşınma tarihinden itibaren 20 iş günü (hafta sonu ve resmî tatiller hariç) bu tarihte dolar. Bildirim e-Devlet Kapısı\'ndaki Adres Değişikliği Bildirimi hizmetiyle de yapılabilir.</p>');
      },
      zam: function (v) {
        var eski = num(v.eski), z = num(v.zam), e = num(v.enf);
        if (!(eski > 0) || isNaN(z)) return err('Mevcut maaşı ve zam oranını gir.');
        var yeni = eski * (1 + z / 100), h = '<b>' + tl(yeni) + '</b><p>Artış: ' + tl(yeni - eski) + ' (%' + z.toLocaleString('tr-TR') + ')</p>';
        if (!isNaN(e)) { var reel = ((1 + z / 100) / (1 + e / 100) - 1) * 100; h += '<p>Reel değişim: %' + reel.toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + (reel < 0 ? ' (satın alma gücü azaldı)' : ' (satın alma gücü arttı)') + '</p>'; }
        return box(h);
      }
    };
    $$('.sc-tool', tools).forEach(function (t) {
      var fn = calc[t.getAttribute('data-tool')], out = $('[data-out]', t);
      $('[data-calc]', t).addEventListener('click', function () {
        var v = {}; $$('[data-k]', t).forEach(function (i) { v[i.getAttribute('data-k')] = i.value; });
        out.innerHTML = fn(v);
      });
    });
  }
})();

/* sector 2026-10-10: "Ara" — muhtar GSM numarası HTML'de yok; jeton + XHR ile alınır, tel: açılır */
(function () {
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('.sc-tel');
    if (!b || b.disabled) return;
    var note = b.parentNode.querySelector('.sc-tel-note');
    b.disabled = true;
    fetch('/sektor/api/tel?id=' + encodeURIComponent(b.dataset.id) + '&t=' + encodeURIComponent(b.dataset.t), { headers: { 'X-Requested-With': 'sc' }, credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (j) { b.disabled = false; if (j.tel) { window.location.href = 'tel:' + j.tel; } })
      .catch(function (st) { b.disabled = false; if (note) note.textContent = st === 429 ? 'Çok fazla deneme; bir süre sonra tekrar deneyin.' : 'Numara şu an alınamadı; birkaç saniye sonra deneyin.'; });
  });
})();

/* sector 2026-10-10: interaktif çoktan seçmeli test (.sc-quiz[data-quiz]) — veriler sunucuya gönderilmez */
(function () {
  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  document.querySelectorAll('.sc-quiz[data-quiz]').forEach(function (box) {
    var qs; try { qs = JSON.parse(box.getAttribute('data-quiz')); } catch (e) { return; }
    if (!qs || !qs.length) return;
    var i = 0, score = 0;
    function show() {
      if (i >= qs.length) {
        var pct = Math.round(score * 100 / qs.length);
        box.innerHTML = '<div class="sc-q-res"><b>' + score + ' / ' + qs.length + ' doğru (%' + pct + ')</b><p>' + (pct >= 80 ? 'Harika gidiyorsun!' : pct >= 50 ? 'İyi bir başlangıç; yanlışlarını gözden geçir.' : 'Konuyu tekrar edip yeniden dene.') + '</p><button type="button" class="yn-btn yn-btn-hot" data-r>Yeniden başla</button></div>';
        box.querySelector('[data-r]').onclick = function () { i = 0; score = 0; show(); };
        return;
      }
      var q = qs[i], h = '<p class="sc-q-n">Soru ' + (i + 1) + ' / ' + qs.length + '</p><p class="sc-q-t">' + esc(q.q) + '</p><div class="sc-q-o">';
      q.o.forEach(function (o, k) { h += '<button type="button" class="sc-q-b" data-k="' + k + '">' + esc(o) + '</button>'; });
      box.innerHTML = h + '</div><p class="sc-q-e" aria-live="polite"></p>';
      box.querySelectorAll('.sc-q-b').forEach(function (b) {
        b.onclick = function () {
          var k = +b.getAttribute('data-k'), ok = k === q.a; if (ok) score++;
          box.querySelectorAll('.sc-q-b').forEach(function (x) { x.disabled = true; var xk = +x.getAttribute('data-k'); if (xk === q.a) x.classList.add('is-ok'); else if (xk === k) x.classList.add('is-bad'); });
          var e = box.querySelector('.sc-q-e'); e.innerHTML = (ok ? '✔ Doğru. ' : '✘ Yanlış. ') + esc(q.e || '') + ' <button type="button" class="yn-btn yn-btn-ghost" data-n>' + (i + 1 < qs.length ? 'Sonraki' : 'Sonucu gör') + '</button>';
          e.querySelector('[data-n]').onclick = function () { i++; show(); };
        };
      });
    }
    show();
  });
})();
