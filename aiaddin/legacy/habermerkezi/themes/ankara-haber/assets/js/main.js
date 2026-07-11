/**
 * AnkaraHaber — Ana JavaScript (Swiper + UI)
 * DÜZELTİLDİ: initSwiper kaldırıldı (her şablon kendi başlatıyor)
 *              ahenkData WordPress kalıpları temizlendi
 */
(function ($) {
  'use strict';

  /* ── ARAMA OVERLAY ── */
  function initArama() {
    var btn = $('#aramaBtn2, #aramaBtnMob'), overlay = $('#aramaOverlay'), kapat = $('#aramaKapat');
    if (!btn.length) return;
    btn.on('click', function () {
      overlay.addClass('aktif');
      setTimeout(function(){ overlay.find('input').focus(); }, 100);
    });
    kapat.on('click', function () { overlay.removeClass('aktif'); });
    $(document).on('keydown', function (e) { if (e.key === 'Escape') overlay.removeClass('aktif'); });
  }

  /* ── MOBİL DRAWER ── */
  function initMobilDrawer() {
    var btn = $('#hamburgerBtn, #mobilMenuBtn'),
        drawer = $('#mobilDrawer'),
        kapat  = $('#mobilDrawerKapat'),
        perde  = $('#overlayPerde');
    if (!btn.length) return;
    function ac()  { drawer.addClass('aktif'); perde.addClass('aktif'); $('body').css('overflow','hidden'); }
    function kapa(){ drawer.removeClass('aktif'); perde.removeClass('aktif'); $('body').css('overflow',''); }
    btn.on('click', ac);
    kapat.on('click', kapa);
    perde.on('click', kapa);
    $(document).on('keydown', function(e){ if(e.key==='Escape') kapa(); });
  }

  /* ── SON DAKİKA BANT ── */
  function initSonDakika() {
    var icerik = document.getElementById('sdIcerik');
    if (!icerik) return;
    var sarici = icerik.parentElement;
    $('.sd-prev').on('click', function(){ sarici.scrollLeft -= 300; });
    $('.sd-next').on('click', function(){ sarici.scrollLeft += 300; });
  }

  /* ── FİNANS VERİLERİ ── */
  function initFinans() {
    if (!$('#fusd').length && !$('#feur').length) return;
    var cache = sessionStorage.getItem('ahenkFinans');
    if (cache) { try { gosterFinans(JSON.parse(cache)); return; } catch(e){} }
    $.ajax({
      url: 'https://api.exchangerate-api.com/v4/latest/USD',
      type: 'GET', timeout: 8000,
      success: function(data) {
        if (!data || !data.rates) return;
        var tryRate = data.rates.TRY || 0;
        var eurTry  = tryRate / (data.rates.EUR || 1);
        var veriler = {
          usd: { deger: tryRate.toFixed(2) },
          eur: { deger: eurTry.toFixed(2)  },
        };
        sessionStorage.setItem('ahenkFinans', JSON.stringify(veriler));
        gosterFinans(veriler);
      }
    });
  }

  function gosterFinans(v) {
    if (v.usd) $('#fusd').text(v.usd.deger + ' ₺');
    if (v.eur) $('#feur').text(v.eur.deger + ' ₺');
  }

  /* ── NAMAZ VAKİTLERİ ── */
  function initNamaz() {
    if (!$('#namazIcerik').length) return;
    var cache = sessionStorage.getItem('ahenkNamaz');
    if (cache) { try { gosterNamaz(JSON.parse(cache)); return; } catch(e){} }
    $.ajax({
      url: 'https://api.aladhan.com/v1/timingsByCity?city=Ankara&country=Turkey&method=13',
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
      { adi:'İmsak', key:'Fajr' }, { adi:'Güneş', key:'Sunrise' },
      { adi:'Öğle',  key:'Dhuhr' }, { adi:'İkindi',key:'Asr' },
      { adi:'Akşam', key:'Maghrib' }, { adi:'Yatsı', key:'Isha' }
    ];
    var nowMin = new Date().getHours()*60 + new Date().getMinutes();
    var html = '';
    vakitler.forEach(function(v) {
      var zaman = timings[v.key] ? timings[v.key].substring(0,5) : '--:--';
      var parts = zaman.split(':');
      var vakitMin = (parseInt(parts[0])||0)*60 + (parseInt(parts[1])||0);
      var aktif = Math.abs(vakitMin - nowMin) < 60;
      html += '<div class="namaz-vakit'+(aktif?' aktif-vakit':'')+'"><span class="namaz-vakit-adi">'+v.adi+'</span><span>'+zaman+'</span></div>';
    });
    $('#namazIcerik').html(html);
  }

  /* ── BAŞA DÖN ── */
  function initBasaDon() {
    var btn = $('#basaDonBtn');
    if (!btn.length) return;
    $(window).on('scroll', function () { btn.toggleClass('goster', $(window).scrollTop() > 400); });
    btn.on('click', function () { $('html,body').animate({scrollTop:0}, 400); });
  }

  /* ── PAYLAŞIM KOPYALA ── */
  function initKopyala() {
    $(document).on('click', '.paylasim-kopyala', function () {
      var url = $(this).data('url') || window.location.href;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(function () { showToast('Bağlantı kopyalandı!'); });
      }
    });
  }

  function showToast(msg) {
    var t = $('<div class="ahenk-toast">'+msg+'</div>').appendTo('body');
    setTimeout(function(){ t.addClass('show'); }, 10);
    setTimeout(function(){ t.removeClass('show'); setTimeout(function(){ t.remove(); }, 300); }, 2500);
  }

  /* ── INIT ── */
  $(document).ready(function () {
    initArama();
    initMobilDrawer();
    initSonDakika();
    initFinans();
    initNamaz();
    initBasaDon();
    initKopyala();
  });

})(jQuery);

/* ── MEGA DROPDOWN ── */
(function() {
  function kapatTumDropdownlar() {
    document.querySelectorAll('.mega-dropdown.acik').forEach(function(dd) { dd.classList.remove('acik'); });
  }
  var timer = null;
  document.querySelectorAll('.menu-item--dropdown').forEach(function(item) {
    var dd = item.querySelector('.mega-dropdown');
    if (!dd) return;
    item.addEventListener('mouseenter', function() { clearTimeout(timer); kapatTumDropdownlar(); dd.classList.add('acik'); });
    item.addEventListener('mouseleave', function() { timer = setTimeout(function() { dd.classList.remove('acik'); }, 150); });
    dd.addEventListener('mouseenter', function() { clearTimeout(timer); });
    dd.addEventListener('mouseleave', function() { timer = setTimeout(function() { dd.classList.remove('acik'); }, 150); });
  });
  document.addEventListener('click', function(e) { if (!e.target.closest('.menu-item--dropdown')) kapatTumDropdownlar(); });
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') kapatTumDropdownlar(); });
})();
