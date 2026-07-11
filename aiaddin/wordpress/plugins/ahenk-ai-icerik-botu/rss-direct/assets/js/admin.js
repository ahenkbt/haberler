/**
 * Ahenk Haber Botu - Admin JavaScript
 */
(function ($) {
    'use strict';

    /* ── Kampanya Manuel Calistir ─────────────────────────── */
    $(document).on('click', '.ahb-isle-btn', function () {
        var $btn = $(this);
        var kid  = $btn.data('id');
        var $out = $('#sonuc-' + kid);

        $btn.prop('disabled', true).text('⏳ İşleniyor...');
        $out.removeClass('basari hata').addClass('goster').text('Besleme kaynakları işleniyor, lütfen bekleyin...');

        $.ajax({
            url:  ahbrssData.ajaxurl,
            type: 'POST',
            data: { action: 'ahbrss_kampanya_isle', kampanya_id: kid, nonce: ahbrssData.nonce },
            timeout: 120000,
            success: function (r) {
                if (r.success) {
                    $out.addClass('basari').text('✅ ' + r.data.mesaj);
                    // Eklenen sayacini guncelle
                    var $rozet = $btn.closest('tr').find('.ahb-sayi-rozet');
                    if ($rozet.length && r.data.eklenen > 0) {
                        var mevcut = parseInt($rozet.text().replace(/\D/g,'')) || 0;
                        $rozet.text((mevcut + r.data.eklenen).toLocaleString('tr-TR'));
                    }
                } else {
                    $out.addClass('hata').text('❌ ' + r.data);
                }
            },
            error: function (xhr, status) {
                $out.addClass('hata').text('❌ Sunucu hatası: ' + status + '. Zaman aşımı olmuş olabilir, logları kontrol edin.');
            },
            complete: function () {
                $btn.prop('disabled', false).text('▶ Çalıştır');
            }
        });
    });

    /* ── Durum Toggle (Aktif/Pasif) ───────────────────────── */
    $(document).on('click', '.ahb-toggle-durum', function () {
        var $btn     = $(this);
        var kid      = $btn.data('id');
        var mevcutDurum = parseInt($btn.data('durum'));
        var yeniDurum   = mevcutDurum === 1 ? 0 : 1;

        $btn.prop('disabled', true);

        $.ajax({
            url:  ahbrssData.ajaxurl,
            type: 'POST',
            data: { action: 'ahbrss_durum_degistir', kampanya_id: kid, durum: yeniDurum, nonce: ahbrssData.nonce },
            success: function (r) {
                if (r.success) {
                    $btn.data('durum', yeniDurum);
                    if (yeniDurum === 1) {
                        $btn.removeClass('ahb-pasif').addClass('ahb-aktif').text('✅ Aktif').attr('title','Pasife Al');
                        $btn.closest('tr').removeClass('ahb-tr-pasif').addClass('ahb-tr-aktif');
                    } else {
                        $btn.removeClass('ahb-aktif').addClass('ahb-pasif').text('⏸ Pasif').attr('title','Aktif Et');
                        $btn.closest('tr').removeClass('ahb-tr-aktif').addClass('ahb-tr-pasif');
                    }
                }
            },
            complete: function () { $btn.prop('disabled', false); }
        });
    });

    /* ── Islenen Linkleri Sifirla ─────────────────────────── */
    $(document).on('click', '.ahb-sifirla-btn', function () {
        var kid = $(this).data('id');
        $.ajax({
            url:  ahbrssData.ajaxurl,
            type: 'POST',
            data: { action: 'ahbrss_sifirla', kampanya_id: kid, nonce: ahbrssData.nonce },
            success: function (r) {
                if (r.success) {
                    alert('✅ Islenen link gecmisi sifirland. Bir sonraki calistirmada tum haberler tekrar islenecek.');
                }
            }
        });
    });

    /* ── Log Temizle ──────────────────────────────────────── */
    $(document).on('click', '.ahb-log-temizle-btn', function () {
        var kid  = $(this).data('id');
        var $out = $('#ahb-log-temizle-sonuc');
        $.ajax({
            url:  ahbrssData.ajaxurl,
            type: 'POST',
            data: { action: 'ahbrss_log_temizle', kampanya_id: kid, nonce: ahbrssData.nonce },
            success: function (r) {
                if (r.success) {
                    $out.html('<div class="ahb-notice ahb-notice--basari">✅ Loglar temizlendi. Sayfayi yenileyin.</div>');
                }
            }
        });
    });

    /* ── Hazir Kaynak Havuzu: URL Ekle ───────────────────── */
    $(document).on('click', '.ahb-kaynak-btn', function () {
        var url     = $(this).data('url');
        var $alan   = $('textarea[name="ahb_beslemeler"]');
        var mevcut  = $alan.val().trim();
        // Zaten eklenmis mi?
        if (mevcut.indexOf(url) !== -1) {
            $(this).css({ background: '#ffebee', color: '#CC0000' });
            setTimeout(() => $(this).css({ background: '', color: '' }), 1000);
            return;
        }
        $alan.val(mevcut ? mevcut + '\n' + url : url);
        $(this).css({ background: '#e8f5e9', color: '#2E7D32', borderColor: '#A5D6A7' });
        setTimeout(() => $(this).css({ background: '', color: '', borderColor: '' }), 1500);
    });

    /* ── Ceviri Toggle: Alan Aktif/Pasif ──────────────────── */
    $('#ahbCeviriAc').on('change', function () {
        $('.ahb-ceviri-alanlari').css('opacity', $(this).is(':checked') ? '1' : '0.5');
    });

    /* ── Tum Kampanyalari Calistir (Dashboard Widget) ─────── */
    $(document).on('click', '#ahb-hepsini-isle', function () {
        var $btn = $(this);
        $btn.prop('disabled', true).text('⏳ Isleniyor...');
        // Tum kampanyalari sirali isle
        var $butonlar = $('.ahb-isle-btn');
        var i = 0;
        function sonraki() {
            if (i >= $butonlar.length) {
                $btn.prop('disabled', false).text('▶ Tum Kampanyalari Calistir');
                return;
            }
            $butonlar.eq(i).trigger('click');
            i++;
            setTimeout(sonraki, 3000);
        }
        sonraki();
    });

})(jQuery);
