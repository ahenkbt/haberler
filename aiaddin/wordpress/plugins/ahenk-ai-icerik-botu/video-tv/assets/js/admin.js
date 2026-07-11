/* Video TV - Admin JS v1.0 */
jQuery(document).ready(function($){
  var ajax  = VTV_A.ajax;
  var nonce = VTV_A.nonce;

  function msg(sel, text, type){
    var bg  = type === 'ok' ? '#F0FDF4' : '#FEF2F2';
    var col = type === 'ok' ? '#15803D' : '#B91C1C';
    $(sel).css({ background:bg, color:col, display:'block' }).text(text);
    if (type === 'ok') { setTimeout(function(){ $(sel).fadeOut(); }, 4000); }
  }

  /* Tip değişince label güncelle */
  $('#vt-tip').on('change', function(){
    var t = $(this).val();
    var p = $('#vt-platform').val();
    var hints = {
      kanal:    { yt: '@KanalAdi veya UCxxxxxx veya tam URL', dm: 'Kullanici adi veya profil URL' },
      playlist: { yt: 'Playlist URL veya PLxxxxxx ID', dm: 'Playlist URL veya ID' },
      video:    { yt: 'YouTube URL veya 11 haneli video ID', dm: 'Dailymotion URL veya video ID' },
    };
    var labels = { kanal:'Kanal URL / @handle', playlist:'Playlist URL / ID', video:'Video URL / ID' };
    var h = (hints[t] && hints[t][p]) ? hints[t][p] : 'URL veya ID girin';
    $('#vt-deger-lbl').text(labels[t] || 'Deger');
    $('#vt-deger').attr('placeholder', h);
    $('#vt-hint').text(h);
  });

  $('#vt-platform').on('change', function(){
    $('#vt-tip').trigger('change');
  });

  /* Kaynak Ekle */
  $('#vt-add-btn').on('click', function(){
    var $b     = $(this);
    var tip    = $('#vt-tip').val();
    var plat   = $('#vt-platform').val();
    var isim   = $.trim($('#vt-isim').val());
    var deger  = $.trim($('#vt-deger').val());
    var kat_id = $('#vt-kat').val();
    var pop    = $('#vt-populer').is(':checked') ? 1 : 0;
    var acik   = $.trim($('#vt-aciklama').val());
    if ( ! isim || ! deger ) { msg('#vt-add-msg','Isim ve deger zorunludur.','err'); return; }
    $b.prop('disabled',true).text('Cekiliyor...');
    $.post(ajax, { action:'vtv_add_kaynak', nonce:nonce, tip:tip, platform:plat, isim:isim, deger:deger, kategori_id:kat_id, populer:pop, aciklama:acik },
      function(r){
        if (r.success) {
          msg('#vt-add-msg', r.data.msg, 'ok');
          $('#vt-isim').val(''); $('#vt-deger').val(''); $('#vt-aciklama').val(''); $('#vt-populer').prop('checked',false);
          setTimeout(function(){ location.reload(); }, 1800);
        } else {
          msg('#vt-add-msg', r.data || 'Hata olustu.', 'err');
          $b.prop('disabled',false).text('Ekle & Cek');
        }
      }
    ).fail(function(){ msg('#vt-add-msg','Sunucu hatasi.','err'); $b.prop('disabled',false).text('Ekle & Cek'); });
  });

  /* Yenile */
  $(document).on('click', '.vtv-refresh', function(){
    var $b = $(this); var id = $b.data('id');
    $b.prop('disabled',true).text('Yukleniyor...');
    $.post(ajax, { action:'vtv_refresh_kaynak', nonce:nonce, kaynak_id:id },
      function(r){
        if (r.success) { alert(r.data.count + ' video yuklendi.'); location.reload(); }
        else { alert(r.data || 'Video cekilemedi. YouTube/DM erisim sorunu olabilir. Birka dakika bekleyip tekrar deneyin.'); }
      }
    ).always(function(){ $b.prop('disabled',false).text('↺ Yenile'); });
  });

  /* Kaynak Sil */
  $(document).on('click', '.vtv-del-k', function(){
    var id = $(this).data('id'); var isim = $(this).data('isim');
    if ( ! confirm('"' + isim + '" ve tum videolari silinsin mi?') ) { return; }
    var $row = $(this).closest('tr');
    $.post(ajax, { action:'vtv_delete_kaynak', nonce:nonce, kaynak_id:id }, function(r){ if (r.success) { $row.fadeOut(250,function(){$(this).remove();}); } });
  });

  /* Toggle Aktif */
  $(document).on('click', '.vtv-toggle', function(){
    var $b = $(this); var id = $b.data('id');
    $.post(ajax, { action:'vtv_toggle_kaynak', nonce:nonce, kaynak_id:id }, function(r){
      if (r.success) { $b.toggleClass('vtv-aktif', !!r.data.aktif).toggleClass('vtv-pasif', !r.data.aktif).text(r.data.aktif ? 'Aktif' : 'Pasif'); }
    });
  });

  /* Tekil Video Form Toggle */
  $(document).on('click', '#vtv-sv-toggle', function(){ $('#vtv-sv-form').slideToggle(200); });

  /* Tekil Video Ekle */
  $(document).on('click', '#vtv-sv-add', function(){
    var $b = $(this); var kid = $b.data('kid');
    var url  = $.trim($('#vtv-sv-url').val());
    var plat = $('#vtv-sv-plat').val();
    if ( ! url ) { return; }
    $b.prop('disabled',true).text('Ekleniyor...');
    $.post(ajax, { action:'vtv_add_video', nonce:nonce, kaynak_id:kid, video_url:url, platform:plat },
      function(r){
        if (r.success) { msg('#vtv-sv-msg','Video eklendi: ' + r.data.baslik,'ok'); $('#vtv-sv-url').val(''); setTimeout(function(){ location.reload(); },1200); }
        else { msg('#vtv-sv-msg',r.data||'Hata.','err'); $b.prop('disabled',false).text('Ekle'); }
      }
    ).fail(function(){ msg('#vtv-sv-msg','Sunucu hatasi.','err'); $b.prop('disabled',false).text('Ekle'); });
  });

  /* Video Sil */
  $(document).on('click', '.vtv-del-v', function(){
    if ( ! confirm('Bu video kaldirilsin mi?') ) { return; }
    var $c = $(this).closest('.vtv-vc'); var id = $(this).data('id');
    $.post(ajax, { action:'vtv_delete_video', nonce:nonce, video_id:id }, function(r){ if (r.success) { $c.fadeOut(250,function(){$(this).remove();}); } });
  });

  /* Öne Çıkan Toggle */
  $(document).on('click', '.vtv-star', function(){
    var $b = $(this); var id = $b.data('id'); var val = $b.data('val');
    $.post(ajax, { action:'vtv_toggle_one_cikan', nonce:nonce, video_id:id, val:val },
      function(r){
        if (r.success) {
          $b.toggleClass('on', !!val);
          $b.data('val', val ? 0 : 1);
          $b.html( val ? '&#9733; One Cikar' : '&#9734; One Cikar' );
        }
      }
    );
  });

  /* Manşet Toggle — video anasayfa manşet slider'ına alınır/çıkarılır */
  $(document).on('click', '.vtv-flag-man', function(){
    var $b = $(this); var id = $b.data('id'); var val = $b.data('val');
    $b.prop('disabled', true);
    $.post(ajax, { action:'vtv_toggle_manset', nonce:nonce, video_id:id, val:val },
      function(r){
        $b.prop('disabled', false);
        if (r.success) {
          $b.toggleClass('on', !!val);
          $b.data('val', val ? 0 : 1);
          $b.html('&#128240; Man&#351;et');
        }
      }
    ).fail(function(){ $b.prop('disabled', false); });
  });

  /* Hikaye Toggle — video hikaye baloncuklarına alınır/çıkarılır */
  $(document).on('click', '.vtv-flag-hik', function(){
    var $b = $(this); var id = $b.data('id'); var val = $b.data('val');
    $b.prop('disabled', true);
    $.post(ajax, { action:'vtv_toggle_hikaye', nonce:nonce, video_id:id, val:val },
      function(r){
        $b.prop('disabled', false);
        if (r.success) {
          $b.toggleClass('on', !!val);
          $b.data('val', val ? 0 : 1);
          $b.html('&#9899; Hikaye');
        }
      }
    ).fail(function(){ $b.prop('disabled', false); });
  });

  /* Kategori Ekle */
  $(document).on('click', '#vtv-kat-add', function(){
    var isim = $.trim($('#vtv-kat-isim').val());
    var ikon = $.trim($('#vtv-kat-ikon').val());
    var renk = $('#vtv-kat-renk').val();
    if ( ! isim ) { msg('#vtv-kat-msg','Isim zorunlu.','err'); return; }
    $.post(ajax, { action:'vtv_add_kategori', nonce:nonce, isim:isim, ikon:ikon, renk:renk },
      function(r){
        if (r.success) { msg('#vtv-kat-msg','Kategori eklendi.','ok'); $('#vtv-kat-isim').val(''); $('#vtv-kat-ikon').val(''); setTimeout(function(){ location.reload(); },1200); }
        else { msg('#vtv-kat-msg',r.data||'Hata.','err'); }
      }
    );
  });

  /* Kategori Sil */
  $(document).on('click', '.vtv-del-cat', function(){
    var id = $(this).data('id'); var isim = $(this).data('isim');
    if ( ! confirm('"' + isim + '" kategorisi silinsin mi?') ) { return; }
    var $row = $(this).closest('tr');
    $.post(ajax, { action:'vtv_delete_kategori', nonce:nonce, kategori_id:id }, function(r){ if (r.success) { $row.fadeOut(250,function(){$(this).remove();}); } });
  });

  /* Ayarlar Kaydet */
  $(document).on('click', '#vta-save', function(){
    var $b = $(this);
    $b.prop('disabled',true).text('Kaydediliyor...');
    $.post(ajax, {
      action: 'vtv_save_ayarlar', nonce: nonce,
      site_basligi:    $('#vta-baslik').val(),
      populer_limit:   $('#vta-pop').val(),
      kategori_limit:  $('#vta-kat').val(),
      one_cikan_limit: $('#vta-oc').val(),
      banner_video_id: $('#vta-ban-vid').val(),
      banner_platform: $('#vta-ban-plat').val(),
    }, function(r){
      if (r.success) { msg('#vta-msg','Ayarlar kaydedildi.','ok'); }
      else { msg('#vta-msg','Hata olustu.','err'); }
    }).always(function(){ $b.prop('disabled',false).text('Ayarlari Kaydet'); });
  });

});

  /* ---- Düzenle butonuna tıkla ---- */
  $(document).on('click', '.vtv-edit-btn', function(){
    var raw = $(this).data('info');
    var info = (typeof raw === 'string') ? JSON.parse(raw) : raw;
    if (!info) { return; }

    $('#vtv-edit-id').val(info.id);
    $('#vtv-edit-isim').val(info.isim || '');
    $('#vtv-edit-deger').val(info.deger || '');
    $('#vtv-edit-kat').val(info.kategori_id || 0);
    $('#vtv-edit-aktif').val(info.aktif ? 1 : 0);
    $('#vtv-edit-aciklama').val(info.aciklama || '');
    $('#vtv-edit-populer').prop('checked', info.populer == 1);
    $('#vtv-edit-msg').hide();

    var $m = $('#vtv-edit-modal');
    $m.css('display','flex');
  });

  /* ESC ile modal kapat */
  $(document).on('keydown', function(e){
    if (e.key === 'Escape') { $('#vtv-edit-modal').hide(); }
  });

  /* Modal dışına tıkla kapat */
  $(document).on('click', '#vtv-edit-modal', function(e){
    if ($(e.target).is('#vtv-edit-modal')) { $(this).hide(); }
  });

  /* ---- Kaydet (edit) ---- */
  $(document).on('click', '#vtv-edit-save', function(){
    var $b    = $(this);
    var id    = $('#vtv-edit-id').val();
    var isim  = $.trim($('#vtv-edit-isim').val());
    if (!isim) { msg('#vtv-edit-msg','İsim zorunludur.','err'); return; }
    $b.prop('disabled',true).text('Kaydediliyor...');
    $.post(ajax, {
      action:      'vtv_update_kaynak',
      nonce:       nonce,
      id:          id,
      isim:        isim,
      deger:       $.trim($('#vtv-edit-deger').val()),
      kategori_id: $('#vtv-edit-kat').val(),
      aktif:       $('#vtv-edit-aktif').val(),
      aciklama:    $.trim($('#vtv-edit-aciklama').val()),
      populer:     $('#vtv-edit-populer').is(':checked') ? 1 : 0,
    }, function(r){
      if (r.success) {
        msg('#vtv-edit-msg','Kaydedildi.','ok');
        setTimeout(function(){ $('#vtv-edit-modal').hide(); location.reload(); }, 1000);
      } else {
        msg('#vtv-edit-msg', r.data || 'Hata.', 'err');
        $b.prop('disabled',false).text('Kaydet');
      }
    }).fail(function(){ msg('#vtv-edit-msg','Sunucu hatası.','err'); $b.prop('disabled',false).text('Kaydet'); });
  });


  /* ---- Otomatik Kanal Ekleme ---- */
  $(document).on('click', '#vtv-preset-btn', function(){
    var $b      = $(this);
    var kat     = $('#vtv-preset-kat').val();
    var doFetch = $('#vtv-preset-fetch').is(':checked') ? 1 : 0;
    var katLabel= $('#vtv-preset-kat option:selected').text();

    var confirmMsg = katLabel + ' kanalları eklensin mi?';
    if (doFetch) { confirmMsg += '\n\nVideoları da çekeceği için bu işlem birkaç dakika sürebilir. Sayfa donabilir — bu normaldir.'; }
    if ( ! confirm(confirmMsg) ) { return; }

    $b.prop('disabled', true).html('⏳ Ekleniyor...');
    $('#vtv-preset-log')
      .html('<span style="color:#6B7280">⏳ İşlem sürüyor, lütfen bekleyin... Sayfayı kapatmayın.</span>')
      .show();

    $.ajax({
      url:     ajax,
      type:    'POST',
      data:    { action:'vtv_import_preset', nonce:nonce, kategori_slug:kat, fetch_videos:doFetch },
      timeout: 300000, // 5 dakika
      success: function(r){
        if (r.success) {
          var html = '<strong style="color:#15803D">✅ Tamamlandı: '
            + r.data.added + ' kanal eklendi'
            + (r.data.skipped ? ', ' + r.data.skipped + ' atlandı (zaten mevcut)' : '')
            + (r.data.errors  ? ', ' + r.data.errors  + ' hata' : '')
            + '</strong><br><br>';
          if (r.data.results && r.data.results.length) {
            r.data.results.forEach(function(item){
              var icon   = item.status === 'ok' ? '✅' : (item.status === 'skip' ? '⏭' : '❌');
              var detail = item.status === 'ok'
                ? (doFetch ? ' → ' + (item.videos||0) + ' video' : ' → eklendi')
                : (item.status === 'skip' ? ' → zaten mevcut' : ' → ' + (item.msg||'hata'));
              html += icon + ' ' + (item.isim||'') + detail + '<br>';
            });
          }
          $('#vtv-preset-log').html(html);
          if (r.data.added > 0) {
            setTimeout(function(){ location.reload(); }, 3000);
          } else {
            $b.prop('disabled', false).html('▶ Kanalları Ekle');
          }
        } else {
          var errMsg = (typeof r.data === 'string') ? r.data : JSON.stringify(r.data);
          $('#vtv-preset-log').html('<span style="color:#dc2626">❌ Hata: ' + errMsg + '</span>');
          $b.prop('disabled', false).html('▶ Kanalları Ekle');
        }
      },
      error: function(xhr, status, err){
        var detail = status === 'timeout' ? 'İşlem zaman aşımına uğradı. Videoları çekmeden ekleyip, sonra Yenile butonu ile çekin.' : ('Sunucu hatası: ' + err);
        $('#vtv-preset-log').html('<span style="color:#dc2626">❌ ' + detail + '</span>');
        $b.prop('disabled', false).html('▶ Kanalları Ekle');
      }
    });
  });


  /* ---- Playlist Tür değişince Sezon alanını göster/gizle ---- */
  $(document).on('change', '#vtv-pl-tip', function(){
    $('#vtv-pl-sezon-wrap').toggle($(this).val() === 'dizi');
  });
  // Başlangıçta gizle
  $(document).ready(function(){
    if ($('#vtv-pl-tip').length) {
      $('#vtv-pl-sezon-wrap').toggle($('#vtv-pl-tip').val() === 'dizi');
    }
  });

  /* ---- Playlist Ekle ---- */
  $(document).on('click', '#vtv-pl-add', function(){
    var $b  = $(this);
    var kid = $b.data('kid');
    var url = $.trim($('#vtv-pl-url').val());
    var nm  = $.trim($('#vtv-pl-isim').val());
    var tip = $('#vtv-pl-tip').val();
    var sea = $('#vtv-pl-sezon').val();
    if (!url) { msg('#vtv-pl-msg','Playlist URL veya ID zorunludur.','err'); return; }
    $b.prop('disabled',true).text('Çekiliyor...');
    $.ajax({
      url: ajax, type:'POST', timeout: 180000,
      data: { action:'vtv_add_playlist', nonce:nonce, kaynak_id:kid, playlist_url:url, isim:nm, tip:tip, sezon:sea },
      success: function(r){
        if (r.success) {
          msg('#vtv-pl-msg', '✅ ' + r.data.isim + ' eklendi (' + r.data.count + ' video)', 'ok');
          $('#vtv-pl-url').val(''); $('#vtv-pl-isim').val('');
          setTimeout(function(){ location.reload(); }, 1500);
        } else {
          msg('#vtv-pl-msg', '❌ ' + (r.data||'Hata'), 'err');
          $b.prop('disabled',false).text('Ekle & Çek');
        }
      },
      error: function(){ msg('#vtv-pl-msg','Sunucu hatası.','err'); $b.prop('disabled',false).text('Ekle & Çek'); }
    });
  });

  /* ---- Playlist Yenile ---- */
  $(document).on('click', '.vtv-pl-refresh', function(){
    var $b = $(this); var id = $b.data('id');
    $b.prop('disabled',true).text('...');
    $.ajax({
      url:ajax, type:'POST', timeout:180000,
      data:{ action:'vtv_refresh_playlist', nonce:nonce, playlist_id_db:id },
      success:function(r){
        if(r.success){ alert(r.data.count + ' video güncellendi.'); location.reload(); }
        else { alert('Hata: ' + (r.data||'Bilinmiyor')); $b.prop('disabled',false).text('↺'); }
      },
      error:function(){ alert('Sunucu hatası'); $b.prop('disabled',false).text('↺'); }
    });
  });

  /* ---- Playlist Sil ---- */
  $(document).on('click', '.vtv-pl-del', function(){
    var id = $(this).data('id'); var isim = $(this).data('isim');
    if(!confirm('"' + isim + '" silinsin mi?')){ return; }
    var $row = $(this).closest('tr');
    $.post(ajax, {action:'vtv_delete_playlist', nonce:nonce, playlist_id_db:id}, function(r){
      if(r.success){ $row.fadeOut(250, function(){ $(this).remove(); }); }
    });
  });

