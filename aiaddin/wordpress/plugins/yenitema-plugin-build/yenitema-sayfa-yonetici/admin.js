/* VKV Sayfa Yönetici Admin JS */
(function($) {
    'use strict';

    var nonce    = VKVSYData.nonce;
    var ajaxUrl  = VKVSYData.ajax_url;

    /* ── Yardımcı ── */
    function showMsg(el, msg, tip) {
        el.text(msg).removeClass('basari hata').addClass(tip);
        setTimeout(function() { el.text(''); }, 3500);
    }

    /* ══════════════════════════════
       RENK YÖNETİMİ
    ══════════════════════════════ */
    // WP Color Picker başlat
    $('.vkvsy-color-picker').wpColorPicker({
        change: function(event, ui) {
            var hex = ui.color.toString();
            $(this).closest('.vkvsy-renk-kart').find('.vkvsy-renk-onizleme').css('background', hex);
        }
    });

    // Hazır Palet uygula
    $(document).on('click', '.vkvsy-palet-btn', function() {
        var vals = JSON.parse($(this).attr('data-palet'));
        var keys = ['birincil','ikincil','ucuncul','altin','altin2','koyu','koyu2','arka','arka2','sinir','yazi','yazi2'];
        keys.forEach(function(k, i) {
            if (vals[i]) {
                var input = $('[name="' + k + '"]');
                input.val(vals[i]).trigger('change');
                input.closest('.vkvsy-renk-kart').find('.vkvsy-renk-onizleme').css('background', vals[i]);
                // WP Color Picker güncelle
                if (input.hasClass('wp-color-picker') || input.siblings('.wp-color-result').length) {
                    input.wpColorPicker('color', vals[i]);
                }
            }
        });
    });

    // Renk kaydet
    $('#vkvsy-renk-kaydet').on('click', function() {
        var $btn = $(this).prop('disabled', true).text('Kaydediliyor…');
        var data = { action: 'vkvsy_kaydet_renk', nonce: nonce };
        var keys = ['birincil','ikincil','ucuncul','altin','altin2','koyu','koyu2','arka','arka2','sinir','yazi','yazi2'];
        keys.forEach(function(k) { data[k] = $('[name="' + k + '"]').val(); });
        $.post(ajaxUrl, data, function(r) {
            $btn.prop('disabled', false).text('💾 Renkleri Kaydet');
            showMsg($('#vkvsy-renk-msg'), r.success ? '✓ ' + r.data : '✗ ' + r.data, r.success ? 'basari' : 'hata');
        });
    });

    /* ══════════════════════════════
       MODÜL SIRALAMA
    ══════════════════════════════ */
    if ($('#vkvsy-modul-liste').length) {
        $('#vkvsy-modul-liste').sortable({
            handle: '.vkvsy-modul-handle',
            axis: 'y',
            placeholder: 'vkvsy-modul-placeholder',
            update: function() {}
        });
    }

    // Toggle göster/gizle
    $(document).on('click', '.vkvsy-toggle-btn', function() {
        var $item  = $(this).closest('.vkvsy-modul-item');
        var gizli  = $item.hasClass('gizli');   // true = şu an gizli
        $item.toggleClass('gizli', !gizli);     // gizliyse görünür yap, görünürse gizle
        $(this).toggleClass('aktif', gizli)     // gizliydi → şimdi görünür → aktif
               .text(gizli ? '👁️ Görünür' : '🚫 Gizli')
               .attr('title', gizli ? 'Gizle' : 'Göster');
    });

    // Modül kaydet
    $('#vkvsy-modul-kaydet').on('click', function() {
        var $btn = $(this).prop('disabled', true).text('Kaydediliyor…');
        var sira   = [];
        var gorsel = {};
        $('#vkvsy-modul-liste .vkvsy-modul-item').each(function() {
            var key = $(this).data('key');
            sira.push(key);
            gorsel[key] = !$(this).hasClass('gizli') ? 1 : 0;
        });
        $.post(ajaxUrl, {
            action: 'vkvsy_kaydet_modul',
            nonce: nonce,
            sira: sira,
            gorsel: gorsel
        }, function(r) {
            $btn.prop('disabled', false).text('💾 Sıra & Görünürlüğü Kaydet');
            showMsg($('#vkvsy-modul-msg'), r.success ? '✓ ' + r.data : '✗ ' + r.data, r.success ? 'basari' : 'hata');
        });
    });

    /* ══════════════════════════════
       ŞABLON DÜZENLE (CodeMirror)
    ══════════════════════════════ */
    var cm = null;
    if (typeof wp !== 'undefined' && wp.codeEditor && $('#vkvsy-editor').length) {
        var cmSettings = wp.codeEditor.defaultSettings ? _.clone(wp.codeEditor.defaultSettings) : {};
        cmSettings.codemirror = _.extend({}, cmSettings.codemirror || {}, {
            mode: 'application/x-httpd-php',
            lineNumbers: true,
            lineWrapping: true,
            matchBrackets: true,
            indentWithTabs: true,
            indentUnit: 4
        });
        var editor = wp.codeEditor.initialize($('#vkvsy-editor'), cmSettings);
        if (editor && editor.codemirror) cm = editor.codemirror;
    }

    $('#vkvsy-sablon-kaydet').on('click', function() {
        var $btn = $(this).prop('disabled', true).text('Kaydediliyor…');
        var dosya  = $(this).data('dosya');
        var icerik = cm ? cm.getValue() : $('#vkvsy-editor').val();
        $.post(ajaxUrl, {
            action: 'vkvsy_kaydet_sablon',
            nonce: nonce,
            dosya: dosya,
            icerik: icerik
        }, function(r) {
            $btn.prop('disabled', false).text('💾 Kaydet');
            showMsg($('#vkvsy-sablon-msg'), r.success ? '✓ ' + r.data : '✗ ' + r.data, r.success ? 'basari' : 'hata');
        });
    });

    /* ══════════════════════════════
       YENİ ŞABLON OLUŞTUR
    ══════════════════════════════ */
    // Dosya adını otomatik oluştur
    $('#vy-sablon-adi').on('input', function() {
        var val = $(this).val()
            .toLowerCase()
            .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
            .replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').trim();
        $('#vy-dosya-adi').val(val);
    });

    $('#vkvsy-sablon-olustur').on('click', function() {
        var sAdi    = $('#vy-sablon-adi').val().trim();
        var dAdi    = $('#vy-dosya-adi').val().trim();
        var hBaslik = $('#vy-hero-baslik').val().trim() || sAdi;
        var hAcik   = $('#vy-hero-aciklama').val().trim();
        if (!sAdi || !dAdi) {
            showMsg($('#vkvsy-yeni-msg'), '✗ Şablon adı ve dosya adı zorunlu', 'hata');
            return;
        }
        var bloklar = [];
        $('input[name="blok[]"]:checked').each(function() { bloklar.push($(this).val()); });

        var $btn = $(this).prop('disabled', true).text('Oluşturuluyor…');
        $.post(ajaxUrl, {
            action: 'vkvsy_olustur_sablon',
            nonce: nonce,
            sablon_adi: sAdi,
            dosya_adi: dAdi,
            hero_baslik: hBaslik,
            hero_aciklama: hAcik,
            bloklar: bloklar
        }, function(r) {
            $btn.prop('disabled', false).text('⚡ Şablonu Oluştur ve Kaydet');
            if (r.success) {
                showMsg($('#vkvsy-yeni-msg'), '✓ ' + r.data.dosya + ' oluşturuldu!', 'basari');
                $('#vkvsy-yeni-kod').val(r.data.kod);
                $('#vkvsy-yeni-onizleme').show();
            } else {
                showMsg($('#vkvsy-yeni-msg'), '✗ ' + r.data, 'hata');
            }
        });
    });

    /* ══════════════════════════════
       HIZLI ERİŞİM DÜZENLE
    ══════════════════════════════ */
    if ($('#vkvsy-hizli-liste').length) {
        $('#vkvsy-hizli-liste').sortable({ handle: '.vkvsy-modul-handle', axis: 'y' });
    }

    // Yeni satır ekle
    $('#vkvsy-hizli-ekle').on('click', function() {
        var $row = $('<div class="vkvsy-modul-item vkvsy-hizli-item">' +
            '<div class="vkvsy-modul-handle">⠿</div>' +
            '<input type="text" class="vkvsy-hizli-ikon" value="⭐" placeholder="Emoji" style="width:50px;text-align:center;font-size:16px">' +
            '<input type="text" class="vkvsy-hizli-etiket" value="" placeholder="Etiket" style="flex:1">' +
            '<input type="text" class="vkvsy-hizli-url" value="/" placeholder="/slug" style="width:200px">' +
            '<button type="button" class="vkvsy-sil-btn button" title="Sil">🗑️</button>' +
            '</div>');
        $('#vkvsy-hizli-liste').append($row);
    });

    // Satır sil
    $(document).on('click', '.vkvsy-sil-btn', function() {
        $(this).closest('.vkvsy-modul-item').remove();
    });

    // Hızlı erişim + içerik kaydet
    $('#vkvsy-hizli-kaydet').on('click', function() {
        var $btn = $(this).prop('disabled', true).text('Kaydediliyor…');
        var items = [];
        $('#vkvsy-hizli-liste .vkvsy-hizli-item').each(function() {
            items.push([
                $(this).find('.vkvsy-hizli-ikon').val(),
                $(this).find('.vkvsy-hizli-etiket').val(),
                $(this).find('.vkvsy-hizli-url').val()
            ]);
        });
        $.post(ajaxUrl, {
            action: 'vkvsy_kaydet_hizli',
            nonce: nonce,
            items: items,
            kahraman_band_baslik:   $('#vkvsy-kb-baslik').val(),
            kahraman_band_aciklama: $('#vkvsy-kb-aciklama').val(),
            soz_band_metin:         $('#vkvsy-soz-metin').val(),
            soz_band_kaynak:        $('#vkvsy-soz-kaynak').val(),
            bagis_baslik:           $('#vkvsy-bagis-baslik').val(),
            bagis_aciklama:         $('#vkvsy-bagis-aciklama').val()
        }, function(r) {
            $btn.prop('disabled', false).text('💾 Tüm İçerikleri Kaydet');
            showMsg($('#vkvsy-hizli-msg'), r.success ? '✓ ' + r.data : '✗ ' + r.data, r.success ? 'basari' : 'hata');
        });
    });

})(jQuery);
