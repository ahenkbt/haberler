/**
 * Ahenk Haber v2 - Ana JavaScript
 */
(function ($) {
  'use strict';

  /* ── SWIPER MANŞET ─────────────────────────────── */
  function initSwiper() {
    if (!document.getElementById('mansetSwiper')) return;
    new Swiper('#mansetSwiper', {
      loop: true,
      autoplay: { delay: 5000, disableOnInteraction: false, pauseOnMouseEnter: true },
      speed: 600,
      pagination: { el: '.manset-pagination', clickable: true },
      navigation: { prevEl: '.manset-prev', nextEl: '.manset-next' },
      keyboard: { enabled: true },
    });
  }

  /* ── ARAMA OVERLAY ─────────────────────────────── */
  function initArama() {
    var btn = $('#aramaBtn'), overlay = $('#aramaOverlay'), kapat = $('#aramaKapat');
    if (!btn.length) return;
    btn.on('click', function () { overlay.addClass('aktif').attr('aria-hidden','false'); setTimeout(function(){overlay.find('.search-input').focus();},100); });
    kapat.on('click', function () { overlay.removeClass('aktif').attr('aria-hidden','true'); });
    $(document).on('keydown', function (e) { if (e.key==='Escape') overlay.removeClass('aktif'); });
  }

  /* ── MEGA MENÜ ─────────────────────────────────── */
  function initMegaMenu() {
    var btn = $('#hamburgerBtn'), menu = $('#megaMenuOverlay'), kapat = $('#megaKapat'), perde = $('#overlayPerde');
    function ac() { menu.addClass('aktif').attr('aria-hidden','false'); perde.addClass('aktif'); $('body').css('overflow','hidden'); }
    function kapa() { menu.removeClass('aktif').attr('aria-hidden','true'); perde.removeClass('aktif'); $('body').css('overflow',''); }
    btn.on('click', ac); kapat.on('click', kapa); perde.on('click', kapa);
    $(document).on('keydown', function(e){ if(e.key==='Escape') kapa(); });
  }

  /* ── MOBİL DRAWER ──────────────────────────────── */
  function initMobilDrawer() {
    var btn = $('#mobilMenuBtn'), drawer = $('#mobilDrawer'), kapat = $('#mobilDrawerKapat'), perde = $('#overlayPerde');
    function ac() { drawer.addClass('aktif'); perde.addClass('aktif'); $('body').css('overflow','hidden'); }
    function kapa() { drawer.removeClass('aktif'); perde.removeClass('aktif'); $('body').css('overflow',''); }
    btn.on('click', ac);
    kapat.on('click', kapa);
    perde.on('click', kapa);
    // ESC ile kapat
    $(document).on('keydown', function(e) { if(e.key==='Escape') kapa(); });
  }

  /* ── SON DAKİKA BANT ───────────────────────────── */
  function initSonDakika() {
    var icerik = document.getElementById('sdIcerik');
    if (!icerik) return;
    icerik.innerHTML = icerik.innerHTML + icerik.innerHTML; // Sonsuz kaydırma için
    // AJAX ile 2 dakikada bir güncelle
    if (typeof ahenkData !== 'undefined') {
      setInterval(function () {
        $.post(ahenkData.ajaxurl, { action:'ahenk_son_dakika', nonce: ahenkData.nonce }, function (r) {
          if (r.success && r.data && r.data.length > 0) {
            var html = '';
            r.data.forEach(function (item) {
              html += '<a href="'+item.url+'" class="sd-item">'+item.baslik+'</a><span class="sd-ay">&#9679;</span>';
            });
            icerik.innerHTML = html + html;
          }
        });
      }, 120000);
    }
    // İleri/Geri butonları
    var sarici = icerik.parentElement;
    $('#sd-prev, .sd-prev').on('click', function(){ sarici.scrollLeft -= 300; });
    $('#sd-next, .sd-next').on('click', function(){ sarici.scrollLeft += 300; });
  }

  /* ── TCMB FİNANS VERİLERİ ──────────────────────── */
  function initFinans() {
    // Ücretsiz alternativ: exchangerate API
    var cache = sessionStorage.getItem('ahenkFinans');
    if (cache) { try { gosterFinans(JSON.parse(cache)); return; } catch(e){} }

    $.ajax({
      url: 'https://api.exchangerate-api.com/v4/latest/USD',
      type: 'GET',
      timeout: 8000,
      success: function(data) {
        if (!data || !data.rates) return;
        var try_rate = data.rates.TRY || 0;
        var eur_try  = try_rate / (data.rates.EUR || 1);
        var veriler  = {
          usd: { deger: try_rate.toFixed(2), degisim: '' },
          eur: { deger: eur_try.toFixed(2), degisim: '' },
        };
        sessionStorage.setItem('ahenkFinans', JSON.stringify(veriler));
        gosterFinans(veriler);
      },
      error: function() {
        // API yoksa -- göster, hata mesajı gösterme
      }
    });
  }

  function gosterFinans(v) {
    if (v.usd) { $('#fusd').text(v.usd.deger + ' ₺'); }
    if (v.eur) { $('#feur').text(v.eur.deger + ' ₺'); }
    if (v.bist) {
      $('#fbist').text(v.bist.deger);
      var cls = parseFloat(v.bist.degisim) >= 0 ? 'up' : 'down';
      $('#fbist_c').text((parseFloat(v.bist.degisim)>=0?'+':'')+v.bist.degisim+'%').addClass('finans-chg '+cls);
    }
  }

  /* ── HAVA DURUMU (AJAX → PHP proxy) ────────────── */
  function initHavaDurumu() {
    if (typeof ahenkData === 'undefined' || !ahenkData.hava_api) return;
    var cache_key = 'ahenkHava_' + ahenkData.hava_sehir;
    var cache = sessionStorage.getItem(cache_key);
    if (cache) { try { gosterHava(JSON.parse(cache)); return; } catch(e){} }

    $.post(ahenkData.ajaxurl, { action:'ahenk_hava', nonce: ahenkData.nonce, sehir: ahenkData.hava_sehir }, function(r) {
      if (r.success && r.data) {
        sessionStorage.setItem(cache_key, JSON.stringify(r.data));
        gosterHava(r.data);
      }
    });
  }

  function gosterHava(data) {
    // Finans bandı hava
    $('#havaDeger').text(data.sicaklik + '°C');
    $('#havaSehir').text(data.sehir);
    var ikon_kod = data.ikon || '01d';
    var ikon_map = {'01d':'fa-sun','02d':'fa-cloud-sun','03d':'fa-cloud','04d':'fa-cloud','09d':'fa-cloud-rain','10d':'fa-cloud-showers-heavy','11d':'fa-bolt','13d':'fa-snowflake','50d':'fa-smog','01n':'fa-moon','02n':'fa-cloud-moon'};
    var fa_ikon  = ikon_map[ikon_kod] || 'fa-cloud';
    $('#havaIkon').attr('class', 'fas ' + fa_ikon);
    $('#finansHava').show().addClass('finans-hava').css('display','flex');
    // Sidebar hava widget
    if ($('#hwSicaklik').length) {
      $('#hwIkon').attr('src', 'https://openweathermap.org/img/wn/'+data.ikon+'@2x.png');
      $('#hwSicaklik').text(data.sicaklik + '°C');
      $('#hwDurum').text(data.durum);
      $('#hwSehir').text(data.sehir);
      $('#hwNem').text(data.nem + '%');
      $('#hwHissedilen').text(data.hissedilen + '°C');
    }
  }

  /* ── NAMAZ VAKİTLERİ (Aladhan.com) ─────────────── */
  function initNamaz() {
    if (!$('#namazIcerik').length) return;
    var cache = sessionStorage.getItem('ahenkNamaz');
    if (cache) { try { gosterNamaz(JSON.parse(cache)); return; } catch(e){} }
    var sehir = (ahenkData && ahenkData.hava_sehir) ? ahenkData.hava_sehir : 'Ankara';
    $.ajax({
      url: 'https://api.aladhan.com/v1/timingsByCity?city='+encodeURIComponent(sehir)+'&country=Turkey&method=13',
      type: 'GET', timeout: 8000,
      success: function(r) {
        if (r && r.data && r.data.timings) {
          sessionStorage.setItem('ahenkNamaz', JSON.stringify(r.data.timings));
          gosterNamaz(r.data.timings);
        }
      }
    });
  }

  function gosterNamaz(timings) {
    var vakitler = [
      { adi:'İmsak', key:'Fajr' },
      { adi:'Güneş', key:'Sunrise' },
      { adi:'Öğle',  key:'Dhuhr' },
      { adi:'İkindi',key:'Asr' },
      { adi:'Akşam', key:'Maghrib' },
      { adi:'Yatsı', key:'Isha' }
    ];
    var now = new Date();
    var now_min = now.getHours()*60 + now.getMinutes();
    var html = '';
    vakitler.forEach(function(v) {
      var zaman = timings[v.key] ? timings[v.key].substring(0,5) : '--:--';
      var parts = zaman.split(':');
      var vakit_min = (parseInt(parts[0])||0)*60 + (parseInt(parts[1])||0);
      var aktif = Math.abs(vakit_min - now_min) < 60;
      html += '<div class="namaz-vakit'+(aktif?' aktif-vakit':'')+'">';
      html += '<span class="namaz-vakit-adi">'+v.adi+'</span>';
      html += '<span>'+zaman+'</span></div>';
    });
    $('#namazIcerik').html(html);
  }

  /* ── BAŞA DÖN ───────────────────────────────────── */
  function initBasaDon() {
    var btn = $('#basaDonBtn');
    if (!btn.length) return;
    $(window).on('scroll', function () { btn.toggleClass('goster', $(window).scrollTop() > 400); });
    btn.on('click', function () { $('html,body').animate({scrollTop:0},400); });
  }

  /* ── PAYLAŞIM KOPYALA ───────────────────────────── */
  function initKopyala() {
    $(document).on('click', '.paylasim-kopyala', function () {
      var url = $(this).data('url') || window.location.href;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(function () {
          showToast('Bağlantı kopyalandı!');
        });
      }
    });
  }

  function showToast(msg) {
    var t = $('<div class="ahenk-toast">'+msg+'</div>').appendTo('body');
    setTimeout(function(){ t.addClass('show'); }, 10);
    setTimeout(function(){ t.removeClass('show'); setTimeout(function(){ t.remove(); }, 300); }, 2500);
  }

  /* ── INIT ───────────────────────────────────────── */
  $(document).ready(function () {
    initSwiper();
    initArama();
    initMegaMenu();
    initMobilDrawer();
    initSonDakika();
    initFinans();
    initHavaDurumu();
    initNamaz();
    initBasaDon();
    initKopyala();
  });

})(jQuery);

/* ── MEGA DROPDOWN - Class tabanlı, !important uyumlu ── */
(function() {
  function kapatTumDropdownlar() {
    document.querySelectorAll('.mega-dropdown.acik').forEach(function(dd) {
      dd.classList.remove('acik');
    });
  }

  var timer = null;

  document.querySelectorAll('.menu-item--dropdown').forEach(function(item) {
    var dd = item.querySelector('.mega-dropdown');
    if (!dd) return;

    item.addEventListener('mouseenter', function() {
      clearTimeout(timer);
      kapatTumDropdownlar();
      dd.classList.add('acik');
    });

    item.addEventListener('mouseleave', function() {
      timer = setTimeout(function() {
        dd.classList.remove('acik');
      }, 150);
    });

    dd.addEventListener('mouseenter', function() { clearTimeout(timer); });
    dd.addEventListener('mouseleave', function() {
      timer = setTimeout(function() {
        dd.classList.remove('acik');
      }, 150);
    });
  });

  document.addEventListener('click', function(e) {
    if (!e.target.closest('.menu-item--dropdown')) {
      kapatTumDropdownlar();
    }
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') kapatTumDropdownlar();
  });
})();

/* ═══════════════════════════════════════════════════════
   AHENK HABER v3 — BİRPORTAL ÖZELLİKLERİ JS
   ═══════════════════════════════════════════════════════ */

/* Tab Menü */
(function(){
  var tabMenu = document.getElementById('ahenkTabMenu');
  if(!tabMenu) return;
  tabMenu.querySelectorAll('.tab-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      var id = this.dataset.tab;
      tabMenu.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.remove('aktif'); });
      this.classList.add('aktif');
      document.querySelectorAll('.tab-panel').forEach(function(p){ p.classList.remove('aktif'); });
      var panel = document.getElementById(id);
      if(panel) panel.classList.add('aktif');
    });
  });
})();

/* Finans Bandı — Döviz (TCMB JSON proxy) */
(function(){
  try {
    fetch('https://api.exchangerate-api.com/v4/latest/USD',{cache:'default'})
      .then(function(r){return r.json();})
      .then(function(d){
        var usd = (1).toFixed(2);
        var eur = d.rates && d.rates.TRY && d.rates.EUR ? (d.rates.TRY/d.rates.EUR).toFixed(2) : '--';
        var try_usd = d.rates && d.rates.TRY ? d.rates.TRY.toFixed(2) : '--';
        var try_eur = eur !== '--' ? eur : '--';
        var elU = document.getElementById('fusd'); if(elU) elU.textContent = try_usd + ' ₺';
        var elE = document.getElementById('feur'); if(elE) elE.textContent = try_eur + ' ₺';
      }).catch(function(){});
  } catch(e){}
})();

/* Altın fiyatı (Anlık API mevcut değilse placeholder) */
(function(){
  var elA = document.getElementById('faltin');
  if(elA) elA.textContent = '-- ₺';
})();

/* Trend İlerleme Çubukları Animasyon */
(function(){
  var bars = document.querySelectorAll('.trend-progress-bar');
  if(!bars.length) return;
  var observer = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){
        e.target.style.transition = 'width 0.8s ease';
      }
    });
  },{threshold:0.3});
  bars.forEach(function(b){ observer.observe(b); });
})();

/* Sayaç Animasyonu */
(function(){
  var counters = document.querySelectorAll('.sayac-deger[data-target]');
  if(!counters.length) return;
  var observed = false;
  var observer = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting && !observed){
        observed = true;
        counters.forEach(function(el){
          var target = el.dataset.target || '';
          var num = parseInt(target.replace(/\D/g,''),10);
          if(isNaN(num)){ el.textContent = target; return; }
          var suffix = target.replace(/[\d]/g,'');
          var dur = 1500, step = Math.ceil(num/60), cur = 0;
          var timer = setInterval(function(){
            cur = Math.min(cur + step, num);
            el.textContent = cur.toLocaleString('tr-TR') + suffix;
            if(cur >= num) clearInterval(timer);
          }, dur/60);
        });
      }
    });
  },{threshold:0.3});
  counters.forEach(function(c){ observer.observe(c); });
})();
