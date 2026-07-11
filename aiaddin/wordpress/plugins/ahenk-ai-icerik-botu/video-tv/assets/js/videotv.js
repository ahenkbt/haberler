/* Video TV - Ana Frontend JS */
(function($){
  'use strict';

  var AJAX    = VTV.ajax;
  var PAGE_URL= VTV.page_url || window.location.href.split('?')[0];
  var nonce   = typeof VTV_A !== 'undefined' ? VTV_A.nonce : '';

  /* ── Helpers ── */
  function esc(s){ return $('<div>').text(s||'').html(); }
  function jse(s){ return (s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'\\"').replace(/\n/g,'\\n'); }
  function setContent(id, html){ $('#'+id+'-content').html(html); }
  function showSpinner(id){ setContent(id,'<div class="vtv-spinner"><div class="vtv-spin"></div></div>'); }
  function setActiveSb(id, key){
    $('#'+id+'-sidebar .vtv-sb-link').removeClass('vtv-sb-active');
    $('#'+id+'-sidebar .vtv-sb-link[data-key="'+key+'"]').addClass('vtv-sb-active');
  }

  /* ── Slug oluştur ── */
  function makeSlug(s){
    return (s||'').toLowerCase()
      .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
      .replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
      .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  }

  /* ── URL oluştur ── */
  function buildVideoUrl(vid, plat, kid, title){
    var slug = title ? makeSlug(title) : vid;
    return PAGE_URL + '?video=' + encodeURIComponent(vid)
      + '&platform=' + encodeURIComponent(plat||'youtube')
      + (kid ? '&kanal=' + kid : '')
      + '&s=' + encodeURIComponent(slug);
  }
  function buildKanalUrl(kid, isim){
    var slug = isim ? makeSlug(isim) : kid;
    return PAGE_URL + '?kanal=' + kid + '&slug=' + encodeURIComponent(slug);
  }

  /* ── Navigation ── */
  window.vtvGo = function(page, id, param){
    setActiveSb(id, page);
    switch(page){
      case 'home':         vtvLoadHome(id); break;
      case 'kanallar':     vtvLoadKanallar(id); break;
      case 'kanal':        vtvLoadKanal(id, param); break;
      case 'one-cikanlar': vtvLoadOneCikanlar(id); break;
      case 'tum-liste':    vtvLoadTumListe(id); break;
      case 'kategori':     vtvLoadKategori(id, param); break;
      default:             vtvLoadHome(id);
    }
  };

  window.vtvToggleSidebar = function(id){
    $('#'+id+'-sidebar').toggleClass('vtv-sb-open');
  };

  /* ════════════════════════════════════
   * ANA SAYFA
   * ════════════════════════════════════ */
  function vtvLoadHome(id){
    showSpinner(id);
    $.post(AJAX, {action:'vtv_get_anasayfa'}, function(r){
      if(!r.success){setContent(id,'<div class="vtv-empty">İçerik yüklenemedi.</div>');return;}
      var d = r.data;
      vtvRenderSbPopuler(id, d.populer_kanallar);
      vtvRenderSbKategoriler(id, d.kategoriler);

      // Window data set et
      var appData=[];
      (d.kaynaklar||[]).forEach(function(k){ appData.push({id:k.id,isim:k.isim,tip:k.tip,videos:[]}); });
      var allVids=(d.karma||[]).concat(d.bugun||[]).concat(d.one_cikanlar||[]);
      allVids.forEach(function(v){
        if(!v.kaynak_id) return;
        for(var i=0;i<appData.length;i++){
          if(parseInt(appData[i].id)===parseInt(v.kaynak_id)){
            var dup=appData[i].videos.some(function(x){return x.video_id===v.video_id;});
            if(!dup) appData[i].videos.push(v);
            break;
          }
        }
      });
      window[id+'_d']=appData;

      var html='';
      // "Öne Çıkanlar" anasayfada gösterilmez — üst menüdeki ⭐ Öne Çıkanlar sekmesinden erişilir
      html+=vtvWelcomeSectionHtml(id, d.populer_kanallar, d.kaynaklar, d.one_cikanlar);
      if(d.bugun&&d.bugun.length) html+=vtvSectionHtml(id,'📅 Son Eklenenler','bugun',d.bugun,'vtv-vcard','');
      if(d.kategoriler&&d.kategoriler.length) html+=vtvKatSatirHtml(id,d.kategoriler);
      if(d.karma&&d.karma.length){
        html+='<div class="vtv-section"><div class="vtv-section-hdr"><div class="vtv-section-title">🎬 Karma Videolar</div></div></div>';
        html+='<div class="vtv-grid">';
        d.karma.forEach(function(v){html+=vtvVCardHtml(id,v,'');});
        html+='</div>';
      }
      setContent(id, html);
    });
  }

  /* ════════════════════════════════════
   * KANALLAR (Kategori tabları + logo)
   * ════════════════════════════════════ */
  function vtvLoadKanallar(id){
    showSpinner(id);
    $.post(AJAX,{action:'vtv_get_anasayfa'},function(r){
      if(!r.success) return;
      var kaynaklar = r.data.kaynaklar||[];
      var kategoriler= r.data.kategoriler||[];

      // Kategoriye göre grupla
      var groups = {'__all__': []};
      kategoriler.forEach(function(k){ groups[k.id]=[]; });
      kaynaklar.forEach(function(k){
        groups['__all__'].push(k);
        if(k.kategori_id && groups[k.kategori_id]) groups[k.kategori_id].push(k);
      });

      var html='<div class="vtv-kanallar-page">';
      html+='<div class="vtv-kanallar-hdr"><h2>📺 Tüm Kanallar</h2></div>';

      // Kategori tab bar
      html+='<div class="vtv-kat-tabs" id="'+id+'-kat-tabs">';
      html+='<button class="vtv-kat-tab on" data-kat="__all__" onclick="vtvKanalTab(\''+id+'\',\'__all__\')">Tümü <span class="vtv-kat-cnt">'+kaynaklar.length+'</span></button>';
      kategoriler.forEach(function(k){
        var cnt=(groups[k.id]||[]).length;
        if(!cnt) return;
        html+='<button class="vtv-kat-tab" data-kat="'+k.id+'" onclick="vtvKanalTab(\''+id+'\',\''+k.id+'\')" style="--kat-renk:'+esc(k.renk)+'">';
        if(k.ikon) html+='<span>'+esc(k.ikon)+'</span> ';
        html+=esc(k.isim)+' <span class="vtv-kat-cnt">'+cnt+'</span></button>';
      });
      html+='</div>';

      // Her kategori için grid
      html+='<div class="vtv-kat-panels">';
      // __all__ panel
      html+='<div class="vtv-kat-panel on" id="'+id+'-panel-__all__">';
      html+=renderKanalGrid(id, kaynaklar);
      html+='</div>';
      kategoriler.forEach(function(k){
        var list=groups[k.id]||[];
        html+='<div class="vtv-kat-panel" id="'+id+'-panel-'+k.id+'">';
        html+= list.length ? renderKanalGrid(id, list) : '<div class="vtv-empty">Bu kategoride kanal yok.</div>';
        html+='</div>';
      });
      html+='</div></div>';
      setContent(id, html);
    });
  }

  window.vtvKanalTab = function(id, katId){
    $('#'+id+'-kat-tabs .vtv-kat-tab').removeClass('on');
    $('#'+id+'-kat-tabs .vtv-kat-tab[data-kat="'+katId+'"]').addClass('on');
    $('#'+id+' .vtv-kat-panel').removeClass('on');
    $('#'+id+'-panel-'+katId).addClass('on');
  };

  function renderKanalGrid(id, kaynaklar){
    if(!kaynaklar.length) return '<div class="vtv-empty">Kanal yok.</div>';
    var html='<div class="vtv-kanal-grid">';
    kaynaklar.forEach(function(k){
      var logo     = k.kanal_logo||'';
      var isim     = k.kanal_ismi_gercek||k.isim;
      var initials = isim.substr(0,2).toUpperCase();
      var plat     = k.platform==='dailymotion'?'DM':'YT';
      var platClr  = k.platform==='dailymotion'?'#003CB4':'#FF0000';
      var kurl     = buildKanalUrl(k.id, isim);
      html+='<div class="vtv-kanal-kart" onclick="vtvGo(\'kanal\',\''+id+'\','+k.id+')" data-href="'+esc(kurl)+'">';
      html+='<div class="vtv-kanal-kart-logo">';
      if(logo){
        html+='<img src="'+esc(logo)+'" alt="'+esc(isim)+'" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\'">';
        html+='<span class="vtv-kanal-kart-init" style="display:none">'+esc(initials)+'</span>';
      } else {
        html+='<span class="vtv-kanal-kart-init">'+esc(initials)+'</span>';
      }
      html+='</div>';
      html+='<div class="vtv-kanal-kart-info">';
      html+='<div class="vtv-kanal-kart-isim">'+esc(isim)+'</div>';
      html+='<div class="vtv-kanal-kart-meta">';
      html+='<span class="vtv-kanal-kart-plat" style="background:'+platClr+'">'+plat+'</span>';
      if(k.abone_sayisi) html+='<span>'+esc(k.abone_sayisi)+'</span>';
      html+='</div></div></div>';
    });
    html+='</div>';
    return html;
  }

  /* ════════════════════════════════════
   * KANAL DETAY
   * ════════════════════════════════════ */
  function vtvLoadKanal(id, kaynak_id){
    showSpinner(id);
    $.post(AJAX,{action:'vtv_get_kanal',kaynak_id:kaynak_id},function(r){
      if(!r.success){setContent(id,'<div class="vtv-empty">Kanal bulunamadı.</div>');return;}
      var k=r.data.kaynak;
      var v=r.data.videolar;

      // Window data güncelle
      if(!window[id+'_d']) window[id+'_d']=[];
      var found=false;
      for(var i=0;i<window[id+'_d'].length;i++){
        if(parseInt(window[id+'_d'][i].id)===parseInt(kaynak_id)){
          window[id+'_d'][i].videos=v||[]; found=true; break;
        }
      }
      if(!found) window[id+'_d'].push({id:k.id,isim:k.isim,tip:k.tip,videos:v||[]});

      var bgImg   =(k.kanal_banner||'')||(v&&v.length?(v[0].thumbnail||''):'');
      var logoSrc = k.kanal_logo||'';
      var isim    = k.kanal_ismi_gercek||k.isim||'';
      var initials= isim?isim.substr(0,2).toUpperCase():'TV';
      var aciklama= k.kanal_aciklama||k.aciklama||'';
      var platLabel=(k.platform==='dailymotion')?'Dailymotion':'YouTube';
      var platColor=(k.platform==='dailymotion')?'#003CB4':'#FF0000';
      var kanalUrl=buildKanalUrl(k.id, isim);

      var html='';
      // Hero banner
      html+='<div class="vtv-channel-hero">';
      if(bgImg) html+='<div class="vtv-channel-bg" style="background-image:url('+esc(bgImg)+')"></div>';
      html+='<div class="vtv-channel-grad"></div>';
      html+='<div class="vtv-channel-info">';
      // Logo
      html+='<div class="vtv-channel-logo">';
      if(logoSrc){
        html+='<img src="'+esc(logoSrc)+'" alt="'+esc(isim)+'" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">';
        html+='<span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:32px;font-weight:700;color:var(--t2)">'+esc(initials)+'</span>';
      } else {
        html+='<span>'+esc(initials)+'</span>';
      }
      html+='</div>';
      // Meta
      html+='<div class="vtv-channel-meta">';
      html+='<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">';
      html+='<div class="vtv-channel-name">'+esc(isim)+'</div>';
      html+='<span style="font-size:10px;font-weight:800;background:'+platColor+';color:#fff;padding:2px 8px;border-radius:3px">'+esc(platLabel)+'</span>';
      html+='</div>';
      // Açıklama
      if(aciklama){
        var shortDesc=aciklama.length>200?aciklama.substr(0,200):aciklama;
        var hasMore=aciklama.length>200;
        html+='<div class="vtv-channel-desc" id="'+id+'-ch-desc">';
        html+='<span id="'+id+'-ch-desc-short">'+esc(shortDesc)+(hasMore?'...':'')+'</span>';
        if(hasMore){
          html+='<span id="'+id+'-ch-desc-full" style="display:none">'+esc(aciklama)+'</span>';
          html+=' <button onclick="vtvToggleDesc(\''+id+'\')" id="'+id+'-ch-desc-btn" style="background:none;border:none;color:var(--acc2);font-size:12px;cursor:pointer;font-weight:600">Devamını Oku</button>';
        }
        html+='</div>';
      }
      // Stats
      html+='<div class="vtv-channel-stats">';
      html+='<div class="vtv-channel-stat"><div class="vtv-channel-stat-n">'+(v?v.length:0)+'</div><div class="vtv-channel-stat-l">Video</div></div>';
      if(k.abone_sayisi) html+='<div class="vtv-channel-stat"><div class="vtv-channel-stat-n" style="font-size:15px">'+esc(k.abone_sayisi)+'</div><div class="vtv-channel-stat-l">Abone</div></div>';
      html+='</div>';
      // Butonlar
      html+='<div class="vtv-channel-actions">';
      if(k.kanal_url) html+='<a href="'+esc(k.kanal_url)+'" target="_blank" class="vtv-btn-red" style="text-decoration:none">▶ Kanalı Aç</a>';
      html+='<button class="vtv-btn-ghost" onclick="vtvGo(\'home\',\''+id+'\')">← Geri Dön</button>';
      html+='<button class="vtv-btn-ghost" style="font-size:11px;padding:7px 14px" onclick="vtvRefreshMeta(\''+id+'\','+k.id+')">↻ Meta Güncelle</button>';
      html+='</div>';
      html+='</div></div></div>';

      // Videolar + Playlistler tab
      html+=vtvChannelTabsHtml(id, kaynak_id, v);

      // URL güncelle (kanal link)
      if(window.history&&window.history.pushState){
        window.history.pushState({vtv_kanal:kaynak_id}, isim, kanalUrl);
        document.title=isim+' | '+((VTV&&VTV.site_title)?VTV.site_title:'Video TV');
      }

      setContent(id, html);
      setTimeout(function(){ vtvChTab(id+'-chtabs-'+kaynak_id,'videolar',id,kaynak_id,v); }, 50);
    });
  }

  window.vtvToggleDesc = function(id){
    var $s=$('#'+id+'-ch-desc-short');
    var $f=$('#'+id+'-ch-desc-full');
    var $b=$('#'+id+'-ch-desc-btn');
    var open=$f.is(':visible');
    $s.toggle(open); $f.toggle(!open);
    $b.text(open?'Devamını Oku':'Daha Az Göster');
  };

  window.vtvRefreshMeta = function(id, kaynak_id){
    $.post(AJAX,{action:'vtv_fetch_kanal_meta',kaynak_id:kaynak_id},function(r){
      if(r.success) vtvLoadKanal(id, kaynak_id);
      else alert('Meta güncellenemedi.');
    });
  };

  /* ════════════════════════════════════
   * KANAL SEKME SİSTEMİ
   * ════════════════════════════════════ */
  function vtvChannelTabsHtml(id, kaynak_id, videos){
    var tabId=id+'-chtabs-'+kaynak_id;
    var html='<div class="vtv-ch-tabs-wrap" id="'+tabId+'">';
    html+='<div class="vtv-ch-tabs-nav">';
    html+='<button class="vtv-ch-tab on" data-tab="videolar">🎬 Videolar</button>';
    html+='<button class="vtv-ch-tab" data-tab="playlistler">📋 Playlistler</button>';
    html+='<button class="vtv-ch-tab" data-tab="diziler">🎭 Diziler</button>';
    html+='</div>';
    html+='<div class="vtv-ch-tab-content" id="'+tabId+'-content"><div class="vtv-ch-tab-loading">Yükleniyor...</div></div>';
    html+='</div>';

    // Tab tıklama olayını jQuery ile bağla (inline onclick yerine)
    setTimeout(function(){
      $('#'+tabId+' .vtv-ch-tab').on('click', function(){
        var tab=$(this).data('tab');
        $('#'+tabId+' .vtv-ch-tab').removeClass('on');
        $(this).addClass('on');
        vtvChTab(tabId, tab, id, kaynak_id, null);
      });
    }, 10);
    return html;
  }

  window.vtvChTab = function(tabId, tab, uid, kaynak_id, preloaded){
    var $content=$('#'+tabId+'-content');
    $content.html('<div class="vtv-ch-tab-loading">Yükleniyor...</div>');

    if(tab==='videolar'){
      // Preloaded varsa kullan
      var videos = preloaded || null;
      if(!videos){
        var allData=window[uid+'_d']||[];
        for(var i=0;i<allData.length;i++){
          if(parseInt(allData[i].id)===parseInt(kaynak_id)){videos=allData[i].videos;break;}
        }
      }
      if(videos&&videos.length){
        renderTabVideolar($content, uid, videos);
      } else {
        $.post(AJAX,{action:'vtv_get_kanal',kaynak_id:kaynak_id},function(r){
          if(r.success) renderTabVideolar($content, uid, r.data.videolar||[]);
          else $content.html('<div class="vtv-empty">Video yüklenemedi.</div>');
        });
      }
    } else if(tab==='playlistler'||tab==='diziler'){
      $.post(AJAX,{action:'vtv_get_kanal_playlistler',kaynak_id:kaynak_id},function(r){
        if(!r.success){$content.html('<div class="vtv-empty">Playlist yüklenemedi.</div>');return;}
        var filtered=(r.data.playlistler||[]).filter(function(pl){
          return tab==='diziler'?pl.tip==='dizi':pl.tip!=='dizi';
        });
        if(!filtered.length){
          $content.html('<div class="vtv-ch-tab-empty">'+
            (tab==='diziler'?'Dizi eklenmemiş.':'Playlist eklenmemiş. Admin → Playlistler menüsünden ekleyebilirsiniz.')+
          '</div>');
          return;
        }
        var html=(tab==='diziler')?renderDiziler(uid,filtered):renderPlaylistler(uid,filtered);
        $content.html(html);
      });
    }
  };

  function renderTabVideolar($content, uid, videos){
    if(!videos||!videos.length){$content.html('<div class="vtv-ch-tab-empty">Bu kanalda henüz video yok.</div>');return;}
    // Tarihe göre sırala (yayin_tarihi)
    var sorted = videos.slice().sort(function(a,b){
      var da=a.yayin_tarihi||''; var db=b.yayin_tarihi||'';
      return da<db?1:-1;
    });
    var html='<div class="vtv-ch-video-grid">';
    sorted.forEach(function(v){ html+=vtvVCardHtml(uid,v,''); });
    html+='</div>';
    $content.html(html);
  }

  function renderPlaylistler(uid, listeler){
    var html='<div class="vtv-pl-grid">';
    listeler.forEach(function(pl){
      html+='<div class="vtv-pl-card" onclick="vtvOpenPlaylist(\''+uid+'\','+pl.id+',\''+jse(pl.isim)+'\')">';
      html+='<div class="vtv-pl-thumb">';
      if(pl.thumbnail) html+='<img src="'+esc(pl.thumbnail)+'" alt="" loading="lazy">';
      else html+='<div class="vtv-pl-thumb-ph">📋</div>';
      html+='<div class="vtv-pl-count">'+(pl.video_sayisi||'?')+' video</div>';
      html+='</div>';
      html+='<div class="vtv-pl-info"><div class="vtv-pl-name">'+esc(pl.isim)+'</div></div></div>';
    });
    html+='</div>';
    return html;
  }

  function renderDiziler(uid, listeler){
    var seasons={};
    listeler.forEach(function(pl){
      var s=parseInt(pl.sezon)||1;
      if(!seasons[s]) seasons[s]=[];
      seasons[s].push(pl);
    });
    var html='';
    Object.keys(seasons).sort(function(a,b){return a-b;}).forEach(function(s){
      html+='<div class="vtv-sezon-wrap">';
      html+='<div class="vtv-sezon-hdr"><span class="vtv-sezon-badge">'+s+'. Sezon</span><span class="vtv-sezon-cnt">'+seasons[s].length+' playlist</span></div>';
      html+=renderPlaylistler(uid, seasons[s]);
      html+='</div>';
    });
    return html||'<div class="vtv-ch-tab-empty">Dizi bulunamadı.</div>';
  }

  window.vtvOpenPlaylist = function(uid, pl_db_id, isim){
    var $content=$('.vtv-ch-tab-content:visible').first();
    if(!$content.length) $content=$('#'+uid+' .vtv-ch-tab-content');
    $content.html('<div class="vtv-ch-tab-loading">'+esc(isim)+' yükleniyor...</div>');
    $.post(AJAX,{action:'vtv_get_playlist_videolar',playlist_id_db:pl_db_id},function(r){
      if(!r.success){$content.html('<div class="vtv-empty">Playlist yüklenemedi.</div>');return;}
      var pl=r.data.playlist;
      var vs=r.data.videolar||[];
      var html='<div class="vtv-pl-detail">';
      html+='<div class="vtv-pl-back-row">';
      html+='<button class="vtv-pl-back-btn" onclick="$(this).closest(\'.vtv-ch-tabs-wrap\').find(\'.vtv-ch-tab.on\').trigger(\'click\')">← Geri</button>';
      html+='<div class="vtv-pl-detail-hdr"><span class="vtv-pl-detail-name">'+esc(isim)+'</span><span class="vtv-pl-detail-cnt">'+vs.length+' video</span></div>';
      html+='</div>';
      if(pl.sezon) html+='<div class="vtv-pl-sezon">'+pl.sezon+'. Sezon</div>';
      html+='<div class="vtv-pl-video-list">';
      vs.forEach(function(v,i){
        var kid=v.kaynak_id||pl.kaynak_id||0;
        html+='<div class="vtv-pl-vitem" onclick="vtvPlay(\''+jse(v.video_id)+'\',\''+jse(v.baslik)+'\',\''+jse(v.kanal_ismi||'')+'\',\'youtube\',\''+uid+'\','+kid+')">';
        html+='<div class="vtv-pl-vnum">'+(i+1)+'</div>';
        html+='<div class="vtv-pl-vthumb">';
        html+='<img src="'+esc(v.thumbnail)+'" alt="" loading="lazy">';
        if(v.sure) html+='<span class="vtv-vdur">'+esc(v.sure)+'</span>';
        html+='<div class="vtv-pov"><span>▶</span></div>';
        html+='</div>';
        html+='<div class="vtv-pl-vinfo">';
        html+='<div class="vtv-pl-vtitle">'+esc(v.baslik)+'</div>';
        if(v.bolum) html+='<div class="vtv-pl-vbolum">'+v.bolum+'. Bölüm</div>';
        html+='<div class="vtv-pl-vmeta">'+esc(v.kanal_ismi||'')+(v.yayin_tarihi?' · '+esc(v.yayin_tarihi):'')+(v.sure?' · '+esc(v.sure):'')+'</div>';
        html+='</div></div>';
      });
      html+='</div></div>';
      $content.html(html);
    });
  };

  /* ════════════════════════════════════
   * VİDEO OYNAT - YouTube reklam engelli
   * ════════════════════════════════════ */
  window.vtvPlay = function(vid, title, kanal, platform, id, kaynak_id){
    // youtube-nocookie.com ile reklam engelle
    var embedUrl;
    if(platform==='dailymotion'){
      embedUrl='https://www.dailymotion.com/embed/video/'+vid+'?autoplay=1&mute=0&queue-enable=false';
    } else {
      // youtube-nocookie.com = reklam yok, gizlilik korumalı
      embedUrl='https://www.youtube-nocookie.com/embed/'+vid
        +'?autoplay=1&rel=0&modestbranding=1&controls=1&playsinline=1'
        +'&disablekb=0&fs=1&cc_load_policy=0&iv_load_policy=3'
        +'&origin='+encodeURIComponent(window.location.origin);
    }

    var platLabel=(platform==='dailymotion')?'Dailymotion':'YouTube';
    var platColor=(platform==='dailymotion')?'#003CB4':'#FF0000';
    var $app=$('#'+id);

    // Aynı kanalın videolarını bul
    var allData=window[id+'_d']||[];
    var chVideos=[];
    for(var i=0;i<allData.length;i++){
      var vs=allData[i].videos||[];
      if(kaynak_id&&parseInt(allData[i].id)===parseInt(kaynak_id)){
        vs.forEach(function(v){ if(v.video_id!==vid) chVideos.push(v); });
        break;
      }
    }
    // Tarihe göre sırala
    chVideos.sort(function(a,b){
      var da=a.yayin_tarihi||''; var db=b.yayin_tarihi||'';
      return da<db?1:-1;
    });

    var html='<div class="vtv-player-page" id="'+id+'-pp">';

    // Geri
    html+='<div class="vtv-pp-back">';
    html+='<button class="vtv-pp-back-btn" onclick="vtvGo(\'home\',\''+id+'\')">← Ana Sayfa</button>';
    if(kaynak_id) html+='<button class="vtv-pp-back-btn" onclick="vtvGo(\'kanal\',\''+id+'\','+kaynak_id+')">📺 Kanala Git</button>';
    html+='</div>';

    // Layout
    html+='<div class="vtv-pp-layout">';
    // Sol: Oynatıcı
    html+='<div class="vtv-pp-main">';
    html+='<div class="vtv-pp-frame"><iframe src="'+embedUrl+'" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen frameborder="0"></iframe></div>';
    // Bilgi
    html+='<div class="vtv-pp-info">';
    html+='<div class="vtv-pp-title">'+esc(title)+'</div>';
    html+='<div class="vtv-pp-meta">';
    if(kanal) html+='<span class="vtv-pp-ch">'+esc(kanal)+'</span>';
    html+='<span class="vtv-pp-plat" style="background:'+platColor+'">'+esc(platLabel)+'</span>';
    html+='</div>';
    html+=vtvShareHtml(vid, platform, kaynak_id||0, title);
    html+='<div class="vtv-pp-desc-wrap" id="'+id+'-desc-wrap"><div class="vtv-pp-desc-loading">Açıklama yükleniyor...</div></div>';
    html+='</div>';
    // Kanal sekmeleri (kaynak_id varsa)
    if(kaynak_id) html+=vtvChannelTabsHtml(id, kaynak_id, null);
    html+='</div>'; // .vtv-pp-main

    // Sağ: Sınırsız sidebar
    html+='<div class="vtv-pp-side" id="'+id+'-pp-side">';
    html+='<div class="vtv-pp-side-title">📺 AYNI KANALDAN';
    if(chVideos.length) html+=' <span class="vtv-side-cnt">'+chVideos.length+'</span>';
    html+='</div>';
    if(chVideos.length){
      chVideos.forEach(function(v){ html+=vtvSideCard(id,v,kaynak_id); });
    } else {
      html+='<div class="vtv-side-empty">Kanal videoları yükleniyor...</div>';
      vtvLoadSideVideos(id, vid, kaynak_id);
    }
    html+='</div>';

    html+='</div></div>'; // layout + page

    setContent(id, html);

    // URL güncelle
    var videoUrl=buildVideoUrl(vid, platform, kaynak_id, title);
    if(window.history&&window.history.pushState){
      window.history.pushState({vtv_video:vid,vtv_platform:platform,vtv_kaynak:kaynak_id}, title, videoUrl);
      document.title=title+' | '+((VTV&&VTV.site_title)?VTV.site_title:'Video TV');
    }

    // Açıklamayı lazy yükle
    vtvLoadAciklama(id, vid, platform);

    // Scroll
    var top=$app.offset();
    if(top) $('html,body').animate({scrollTop:top.top-16},280);

    // Sekmeleri başlat
    if(kaynak_id){
      setTimeout(function(){ vtvChTab(id+'-chtabs-'+kaynak_id,'videolar',id,kaynak_id,null); },100);
    }
  };

  /* Açıklamayı yükle */
  function vtvLoadAciklama(id, vid, platform){
    $.post(AJAX,{action:'vtv_get_video_aciklama',video_id:vid,platform:platform||'youtube'},function(r){
      var $w=$('#'+id+'-desc-wrap');
      if(!$w.length) return;
      if(r.success&&r.data.aciklama){
        var desc=r.data.aciklama;
        var short=desc.length>300?desc.substr(0,300):desc;
        var hasMore=desc.length>300;
        var html='<div class="vtv-pp-desc">';
        html+='<div class="vtv-pp-desc-title">📄 Açıklama</div>';
        html+='<div class="vtv-pp-desc-text" id="'+id+'-desc-text">';
        html+='<span id="'+id+'-desc-short">'+esc(short).replace(/\n/g,'<br>')+(hasMore?'...':'')+'</span>';
        if(hasMore){
          html+='<span id="'+id+'-desc-full" style="display:none">'+esc(desc).replace(/\n/g,'<br>')+'</span>';
          html+='<br><button onclick="vtvToggleAciklama(\''+id+'\')" class="vtv-desc-toggle">Devamını Oku ▼</button>';
        }
        html+='</div></div>';
        $w.html(html);
      } else { $w.hide(); }
    });
  }

  window.vtvToggleAciklama = function(id){
    var $s=$('#'+id+'-desc-short'); var $f=$('#'+id+'-desc-full');
    var $b=$('#'+id+'-desc-wrap .vtv-desc-toggle');
    var open=$f.is(':visible');
    $s.toggle(open); $f.toggle(!open);
    $b.html(open?'Devamını Oku ▼':'Daha Az ▲');
  };

  /* Sidebar lazy yükle */
  function vtvLoadSideVideos(id, currentVid, kaynak_id){
    $.post(AJAX,{action:'vtv_get_kanal',kaynak_id:kaynak_id},function(r){
      if(!r.success) return;
      var v=r.data.videolar||[];
      // Window data güncelle
      if(!window[id+'_d']) window[id+'_d']=[];
      var found=false;
      for(var i=0;i<window[id+'_d'].length;i++){
        if(parseInt(window[id+'_d'][i].id)===parseInt(kaynak_id)){window[id+'_d'][i].videos=v;found=true;break;}
      }
      if(!found) window[id+'_d'].push({id:kaynak_id,videos:v});
      var $side=$('#'+id+'-pp-side');
      if(!$side.length) return;
      var chVideos=v.filter(function(x){return x.video_id!==currentVid;});
      chVideos.sort(function(a,b){ return (a.yayin_tarihi||'')<(b.yayin_tarihi||'')?1:-1; });
      var html='<div class="vtv-pp-side-title">📺 AYNI KANALDAN <span class="vtv-side-cnt">'+chVideos.length+'</span></div>';
      chVideos.forEach(function(v){ html+=vtvSideCard(id,v,kaynak_id); });
      $side.html(html);
    });
  }

  function vtvSideCard(id, v, kaynak_id){
    var plat=v.platform||'youtube';
    var pc=(plat==='dailymotion')?'#003CB4':'#FF0000';
    var fn="vtvPlay('"+jse(v.video_id)+"','"+jse(v.baslik)+"','"+jse(v.kanal_ismi||'')+"','"+jse(plat)+"','"+id+"',"+(kaynak_id||0)+")";
    var html='<div class="vtv-side-card" onclick="'+fn+'">';
    html+='<div class="vtv-side-thumb">';
    html+='<img src="'+esc(v.thumbnail)+'" alt="" loading="lazy">';
    if(v.sure) html+='<span class="vtv-vdur">'+esc(v.sure)+'</span>';
    html+='<span class="vtv-vplat" style="background:'+pc+'">'+(plat==='dailymotion'?'DM':'YT')+'</span>';
    html+='<div class="vtv-side-play"><span>▶</span></div>';
    html+='</div>';
    html+='<div class="vtv-side-info">';
    html+='<div class="vtv-side-title">'+esc(v.baslik)+'</div>';
    html+='<div class="vtv-side-meta">'+esc(v.kanal_ismi||'')+(v.yayin_tarihi?' · '+esc(v.yayin_tarihi):'')+'</div>';
    html+='</div></div>';
    return html;
  }

  /* ════════════════════════════════════
   * SHORTS BÖLÜMÜ
   * ════════════════════════════════════ */
  function vtvLoadShorts(id){
    showSpinner(id);
    $.post(AJAX,{action:'vtv_get_anasayfa'},function(r){
      if(!r.success) return;
      var videos=(r.data.karma||[]).filter(function(v){
        // Süre 60 saniyeden az veya başlıkta #Shorts varsa
        var sure=v.sure||'';
        var sec=0;
        var m=sure.match(/(\d+):(\d+)/);
        if(m) sec=parseInt(m[1])*60+parseInt(m[2]);
        else if(sure.match(/^(\d+)$/)) sec=parseInt(sure);
        return sec<=60 && sec>0 || (v.baslik||'').toLowerCase().indexOf('#short')>=0;
      });

      if(!videos.length){
        setContent(id,'<div class="vtv-empty"><div style="font-size:48px">📱</div><div>Henüz Shorts videosu yok.</div><div style="font-size:13px;margin-top:8px;color:var(--t3)">60 saniyeden kısa veya #Shorts etiketli videolar burada görünür.</div></div>');
        return;
      }

      var html='<div class="vtv-shorts-wrap">';
      html+='<div class="vtv-shorts-hdr"><span class="vtv-shorts-icon">📱</span> <span>Shorts</span></div>';
      html+='<div class="vtv-shorts-feed" id="'+id+'-shorts-feed">';
      videos.forEach(function(v,i){
        var plat=v.platform||'youtube';
        var embedUrl=(plat==='dailymotion')
          ?'https://www.dailymotion.com/embed/video/'+v.video_id+'?autoplay='+(i===0?'1':'0')
          :'https://www.youtube-nocookie.com/embed/'+v.video_id+'?autoplay='+(i===0?'1':'0')+'&rel=0&controls=1&playsinline=1';
        html+='<div class="vtv-short-item" id="'+id+'-short-'+v.video_id+'">';
        html+='<div class="vtv-short-frame"><iframe src="'+embedUrl+'" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen frameborder="0"></iframe></div>';
        html+='<div class="vtv-short-info">';
        html+='<div class="vtv-short-title">'+esc(v.baslik)+'</div>';
        html+='<div class="vtv-short-meta">'+esc(v.kanal_ismi||'')+(v.sure?' · '+esc(v.sure):'')+'</div>';
        html+=vtvShareHtml(v.video_id,plat,v.kaynak_id||0,v.baslik);
        html+='</div></div>';
      });
      html+='</div></div>';
      setContent(id, html);
    });
  }

  /* ════════════════════════════════════
   * CANLI TV
   * ════════════════════════════════════ */
  function vtvLoadCanli(id){
    showSpinner(id);
    $.post(AJAX,{action:'vtv_get_anasayfa'},function(r){
      if(!r.success) return;
      var canlilar=(r.data.kaynaklar||[]).filter(function(k){return k.tip==='canli';});

      if(!canlilar.length){
        setContent(id,'<div class="vtv-empty"><div style="font-size:48px">📡</div><div>Canlı yayın eklenmemiş.</div><div style="font-size:13px;margin-top:8px;color:var(--t3)">Admin → Kaynaklar → Tür: Canlı TV</div></div>');
        return;
      }

      var html='<div class="vtv-canli-wrap">';
      html+='<div class="vtv-canli-hdr"><span class="vtv-canli-live">● CANLI</span> <span>Canlı TV Yayınları</span></div>';

      // İlk kanalı otomatik oynat
      var first=canlilar[0];
      var firstEmbed='https://www.youtube-nocookie.com/embed/'+first.video_id+'?autoplay=1&rel=0&controls=1';
      html+='<div class="vtv-canli-player-wrap">';
      html+='<div class="vtv-canli-frame" id="'+id+'-canli-frame"><iframe id="'+id+'-canli-iframe" src="'+esc(firstEmbed)+'" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen frameborder="0"></iframe></div>';
      html+='<div class="vtv-canli-info" id="'+id+'-canli-info">';
      html+='<div class="vtv-canli-isim">'+esc(first.kanal_ismi_gercek||first.isim)+'</div>';
      html+='</div></div>';

      // Kanal listesi
      html+='<div class="vtv-canli-list">';
      canlilar.forEach(function(k){
        var logo=k.kanal_logo||'';
        var isim=k.kanal_ismi_gercek||k.isim;
        var init=isim.substr(0,2).toUpperCase();
        var active=(k.id===first.id)?'vtv-canli-item-on':'';
        html+='<div class="vtv-canli-item '+active+'" onclick="vtvPlayCanli(\''+id+'\',\''+jse(k.video_id)+'\',\''+jse(isim)+'\',\''+jse(logo)+'\')">';
        html+='<div class="vtv-canli-logo">';
        if(logo) html+='<img src="'+esc(logo)+'" alt="" onerror="this.style.display=\'none\'">';
        else html+='<span>'+esc(init)+'</span>';
        html+='</div>';
        html+='<div class="vtv-canli-item-info"><div class="vtv-canli-item-isim">'+esc(isim)+'</div><div class="vtv-canli-badge">● CANLI</div></div>';
        html+='</div>';
      });
      html+='</div></div>';
      setContent(id, html);
    });
  }

  window.vtvPlayCanli = function(id, videoId, isim, logo){
    var embedUrl='https://www.youtube-nocookie.com/embed/'+videoId+'?autoplay=1&rel=0&controls=1';
    $('#'+id+'-canli-iframe').attr('src', embedUrl);
    $('#'+id+'-canli-info').html('<div class="vtv-canli-isim">'+esc(isim)+'</div>');
    $('#'+id+' .vtv-canli-item').removeClass('vtv-canli-item-on');
    // Aktif olanı bul
    $('#'+id+' .vtv-canli-item').filter(function(){
      return $(this).find('.vtv-canli-item-isim').text()===isim;
    }).addClass('vtv-canli-item-on');
  };

  /* ════════════════════════════════════
   * KATEGORİ SAYFASI
   * ════════════════════════════════════ */
  function vtvLoadKategori(id, kat_id){
    showSpinner(id);
    $.post(AJAX,{action:'vtv_get_anasayfa'},function(r){
      if(!r.success) return;
      var kat=null;
      (r.data.kategoriler||[]).forEach(function(k){ if(parseInt(k.id)===parseInt(kat_id)) kat=k; });
      var kanallar=(r.data.kaynaklar||[]).filter(function(k){return parseInt(k.kategori_id)===parseInt(kat_id);});
      var html='<div class="vtv-kat-page">';
      if(kat){
        html+='<div class="vtv-kat-hero" style="border-color:'+esc(kat.renk)+'44">';
        html+='<span style="font-size:40px">'+esc(kat.ikon)+'</span>';
        html+='<div class="vtv-kat-title" style="color:'+esc(kat.renk)+'">'+esc(kat.isim)+'</div>';
        html+='</div>';
      }
      if(kanallar.length){
        html+='<div class="vtv-kat-sub-title">Kanallar ('+kanallar.length+')</div>';
        html+=renderKanalGrid(id, kanallar);
      }
      // Kategorinin videoları
      var vidler=[];
      (r.data.karma||[]).forEach(function(v){
        var k=null;
        (r.data.kaynaklar||[]).forEach(function(ks){ if(parseInt(ks.id)===parseInt(v.kaynak_id)) k=ks; });
        if(k&&parseInt(k.kategori_id)===parseInt(kat_id)) vidler.push(v);
      });
      if(vidler.length){
        html+='<div class="vtv-kat-sub-title" style="margin-top:24px">Videolar</div>';
        html+='<div class="vtv-grid">';
        vidler.forEach(function(v){ html+=vtvVCardHtml(id,v,''); });
        html+='</div>';
      }
      html+='</div>';
      setContent(id, html);
    });
  }

  /* ════════════════════════════════════
   * ÖNE ÇIKANLAR
   * ════════════════════════════════════ */
  function vtvLoadOneCikanlar(id){
    showSpinner(id);
    $.post(AJAX,{action:'vtv_get_anasayfa'},function(r){
      if(!r.success) return;
      var videos=r.data.one_cikanlar||[];
      var html='<div class="vtv-search-results">';
      html+='<div class="vtv-search-title">Öne Çıkan Videolar</div>';
      if(videos.length){
        html+='<div class="vtv-grid">';
        videos.forEach(function(v){ html+=vtvVCardHtml(id,v,''); });
        html+='</div>';
      } else {
        html+='<div class="vtv-empty">Öne çıkan video yok.</div>';
      }
      html+='</div>';
      setContent(id, html);
    });
  }

  /* ════════════════════════════════════
   * TÜM LİSTE
   * ════════════════════════════════════ */
  function vtvLoadTumListe(id){
    vtvLoadKanallar(id);
  }

  /* ════════════════════════════════════
   * ARAMA
   * ════════════════════════════════════ */
  window.vtvSearch = function(id){
    var q=$.trim($('#'+id+'-search').val());
    if(!q) return;
    showSpinner(id);
    $.post(AJAX,{action:'vtv_arama',q:q},function(r){
      if(!r.success) return;
      var d=r.data;
      var html='<div class="vtv-search-results">';
      html+='<div class="vtv-search-title">🔍 "'+esc(q)+'" için sonuçlar</div>';
      if(d.local&&d.local.length){
        html+='<div class="vtv-grid">';
        d.local.forEach(function(v){ html+=vtvVCardHtml(id,v,''); });
        html+='</div>';
      } else {
        html+='<div class="vtv-empty">Arşivde sonuç bulunamadı.</div>';
      }
      if(d.yt_url||d.dm_url){
        html+='<div class="vtv-search-ext">';
        html+='<div style="font-size:12px;font-weight:600;color:var(--t3);margin-bottom:10px">DIŞARIDA ARA:</div>';
        if(d.yt_url) html+='<a href="'+esc(d.yt_url)+'" target="_blank" class="vtv-ext-link" style="background:#FF0000">▶ YouTube\'da Ara</a>';
        if(d.dm_url) html+='<a href="'+esc(d.dm_url)+'" target="_blank" class="vtv-ext-link" style="background:#003CB4">▶ Dailymotion\'da Ara</a>';
        html+='</div>';
      }
      html+='</div>';
      setContent(id, html);
    });
  };

  /* ════════════════════════════════════
   * YARDIMCI HTML FONKSİYONLARI
   * ════════════════════════════════════ */
  function vtvVCardHtml(id, v, extraCls){
    var plat=v.platform||'youtube';
    var pc=(plat==='youtube')?'#FF0000':'#003CB4';
    var pt=(plat==='youtube')?'YT':'DM';
    var kid=v.kaynak_id||0;
    var fn="vtvPlay('"+jse(v.video_id)+"','"+jse(v.baslik)+"','"+jse(v.kanal_ismi||'')+"','"+jse(plat)+"','"+id+"',"+kid+")";
    var html='<div class="vtv-vcard '+extraCls+'" onclick="'+fn+'">';
    html+='<div class="vtv-vthumb">';
    html+='<img src="'+esc(v.thumbnail)+'" alt="" loading="lazy">';
    html+='<div class="vtv-vplay"><span>▶</span></div>';
    if(v.sure) html+='<span class="vtv-vdur">'+esc(v.sure)+'</span>';
    html+='<span class="vtv-vplat" style="background:'+pc+'">'+pt+'</span>';
    if(v.one_cikan&&parseInt(v.one_cikan)) html+='<span class="vtv-one-star">⭐</span>';
    html+='</div>';
    html+='<div class="vtv-vinfo">';
    html+='<div class="vtv-vtitle">'+esc(v.baslik)+'</div>';
    html+='<div class="vtv-vmeta">'+esc(v.kanal_ismi||v.kaynak_isim||'')+(v.yayin_tarihi?' · '+esc(v.yayin_tarihi):'')+'</div>';
    html+='</div></div>';
    return html;
  }

  function vtvHeroHtml(id, videos, kaynaklar){
    if(!videos||!videos.length) return '';
    var v=videos[0];
    var k=null;
    (kaynaklar||[]).forEach(function(ks){if(parseInt(ks.id)===parseInt(v.kaynak_id)) k=ks;});
    var bg=v.thumbnail||'';
    var html='<div class="vtv-hero" style="background-image:url('+esc(bg)+')">';
    html+='<div class="vtv-hero-grad"></div>';
    html+='<div class="vtv-hero-content">';
    html+='<div class="vtv-hero-cat">'+(k?(k.kanal_ismi_gercek||k.isim):'')+'</div>';
    html+='<div class="vtv-hero-title">'+esc(v.baslik)+'</div>';
    html+='<div class="vtv-hero-btns">';
    var kid=v.kaynak_id||0;
    html+='<button class="vtv-hero-play" onclick="vtvPlay(\''+jse(v.video_id)+'\',\''+jse(v.baslik)+'\',\''+jse(v.kanal_ismi||'')+'\',' +'\''+(v.platform||'youtube')+'\''+',\''+id+'\','+kid+')">▶ Oynat</button>';
    if(v.kaynak_id) html+='<button class="vtv-hero-info" onclick="vtvGo(\'kanal\',\''+id+'\','+v.kaynak_id+')">ℹ Daha Fazla</button>';
    html+='</div></div>';
    // Küçük slider göstergeleri
    if(videos.length>1){
      html+='<div class="vtv-hero-dots">';
      videos.forEach(function(vv,i){
        html+='<span class="vtv-hero-dot'+(i===0?' on':'')+'" onclick=""></span>';
      });
      html+='</div>';
    }
    html+='</div>';
    return html;
  }

  function vtvWelcomeSectionHtml(id, populer, kaynaklar, oneCikanlar){
    var cardKanallar=populer&&populer.length?populer:(kaynaklar?kaynaklar.slice(0,6):[]);
    var html='<div class="vtv-welcome-section">';
    html+='<div class="vtv-welcome-left">';
    html+='<div class="vtv-welcome-badge">VIDEO TV</div>';
    html+='<h2 class="vtv-welcome-title">HOŞGELDİNİZ</h2>';
    html+='<p class="vtv-welcome-sub">Kanallarınızı ve videolarınızı keşfetmeye başlayın.</p>';
    html+='<div class="vtv-welcome-stats">';
    html+='<div class="vtv-ws"><span>'+(kaynaklar?kaynaklar.length:0)+'</span><small>Kanal</small></div>';
    html+='<div class="vtv-ws"><span>'+(oneCikanlar?oneCikanlar.length:0)+'</span><small>Öne Çıkan</small></div>';
    html+='</div></div>';
    if(cardKanallar.length){
      html+='<div class="vtv-welcome-cards">';
      cardKanallar.slice(0,6).forEach(function(k){
        html+=vtvChannelShowcaseCard(id, k);
      });
      html+='</div>';
    }
    html+='</div>';
    return html;
  }

  function vtvChannelShowcaseCard(id, k){
    var isim=k.kanal_ismi_gercek||k.isim;
    var logo=k.kanal_logo||'';
    var banner=k.kanal_banner||'';
    var aciklama=k.kanal_aciklama||k.aciklama||'';
    var initials=isim?isim.substr(0,2).toUpperCase():'TV';
    var pc=(k.platform==='dailymotion')?'#003CB4':'#FF0000';
    var pt=(k.platform==='dailymotion')?'DM':'YT';
    var shortAcik=aciklama.length>90?aciklama.substr(0,90)+'...':aciklama;
    var html='<div class="vtv-showcase-card" onclick="vtvGo(\'kanal\',\''+id+'\','+k.id+')">';
    html+='<div class="vtv-sc-poster">';
    if(banner) html+='<img class="vtv-sc-banner" src="'+esc(banner)+'" alt="">';
    else if(logo) html+='<img class="vtv-sc-banner vtv-sc-banner-stretch" src="'+esc(logo)+'" alt="">';
    html+='<div class="vtv-sc-poster-grad"></div>';
    html+='<div class="vtv-sc-logo-wrap">';
    if(logo){
      html+='<img src="'+esc(logo)+'" class="vtv-sc-logo" alt="'+esc(isim)+'" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\'">';
      html+='<span class="vtv-sc-logo-fallback" style="display:none">'+esc(initials)+'</span>';
    } else {
      html+='<span class="vtv-sc-logo-fallback">'+esc(initials)+'</span>';
    }
    html+='</div>';
    html+='<span class="vtv-sc-plat" style="background:'+pc+'">'+pt+'</span>';
    html+='</div>';
    html+='<div class="vtv-sc-info">';
    html+='<div class="vtv-sc-name">'+esc(isim)+'</div>';
    if(shortAcik) html+='<div class="vtv-sc-desc">'+esc(shortAcik)+'</div>';
    if(k.abone_sayisi) html+='<div class="vtv-sc-meta">'+esc(k.abone_sayisi)+' abone</div>';
    html+='<div class="vtv-sc-btn">Kanala Git →</div>';
    html+='</div></div>';
    return html;
  }

  function vtvSectionHtml(id, title, key, videos, cardCls, moreText){
    var html='<div class="vtv-section">';
    html+='<div class="vtv-section-hdr"><div class="vtv-section-title">'+title+'</div>';
    if(moreText) html+='<span class="vtv-section-more" onclick="vtvGo(\''+key+'\',\''+id+'\')">'+moreText+' →</span>';
    html+='</div>';
    html+='<div class="vtv-row-wrap"><div class="vtv-row">';
    videos.forEach(function(v){ html+=vtvVCardHtml(id,v,cardCls); });
    html+='</div></div></div>';
    return html;
  }

  function vtvKatSatirHtml(id, kategoriler){
    var html='<div class="vtv-section"><div class="vtv-section-hdr"><div class="vtv-section-title">📂 Kategoriler</div></div>';
    html+='<div class="vtv-row-wrap"><div class="vtv-row">';
    kategoriler.forEach(function(k){
      html+='<div class="vtv-vcard vtv-vcard-sm" onclick="vtvGo(\'kategori\',\''+id+'\','+k.id+')" style="background:linear-gradient(135deg,'+esc(k.renk)+'22,'+esc(k.renk)+'44);border-color:'+esc(k.renk)+'55">';
      html+='<div class="vtv-kat-icon">'+esc(k.ikon)+'</div>';
      html+='<div class="vtv-kat-name">'+esc(k.isim)+'</div>';
      html+='</div>';
    });
    html+='</div></div></div>';
    return html;
  }

  /* ════════════════════════════════════
   * SIDEBAR
   * ════════════════════════════════════ */
  function vtvRenderSbPopuler(id, kanallar){
    var html='';
    (kanallar||[]).forEach(function(k){
      var isim=k.kanal_ismi_gercek||k.isim;
      var init=isim?isim.substr(0,2).toUpperCase():'TV';
      var logo=k.kanal_logo||'';
      html+='<a href="#" class="vtv-sb-link" data-key="kanal-'+k.id+'" onclick="vtvGo(\'kanal\',\''+id+'\','+k.id+');return false;">';
      if(logo){
        html+='<span class="vtv-sb-logo"><img src="'+esc(logo)+'" alt="" onerror="this.style.display=\'none\'"></span>';
      } else {
        html+='<span class="vtv-sb-init">'+esc(init)+'</span>';
      }
      html+=esc(isim)+'</a>';
    });
    if(!html) html='<div class="vtv-sb-loading" style="color:#5A5A78">Kanal yok</div>';
    $('#'+id+'-sb-populer').html('<div class="vtv-sb-head">Popüler</div>'+html);
  }

  function vtvRenderSbKategoriler(id, kategoriler){
    var html='';
    (kategoriler||[]).forEach(function(k){
      html+='<a href="#" class="vtv-sb-link" data-key="kat-'+k.id+'" onclick="vtvGo(\'kategori\',\''+id+'\','+k.id+');return false;">';
      html+='<span class="vtv-sb-kat-dot" style="background:'+esc(k.renk)+'"></span>';
      if(k.ikon) html+='<span style="font-size:14px">'+esc(k.ikon)+'</span> ';
      html+=esc(k.isim)+'</a>';
    });
    if(!html) html='<div class="vtv-sb-loading" style="color:#5A5A78">Kategori yok</div>';
    $('#'+id+'-sb-kategoriler').html('<div class="vtv-sb-head">Kategoriler</div>'+html);
  }

  /* ════════════════════════════════════
   * PAYLAŞ
   * ════════════════════════════════════ */
  function vtvShareHtml(vid, plat, kid, title){
    var url=buildVideoUrl(vid,plat,kid,title);
    var urlEnc=encodeURIComponent(url);
    var titleEnc=encodeURIComponent(title||'');
    var safeUrl=url.replace(/'/g,"\\'");
    var html='<div class="vtv-share-bar">';
    html+='<span class="vtv-share-label">🔄 Paylaş:</span>';
    html+='<a class="vtv-share-btn vtv-share-wa" href="https://wa.me/?text='+titleEnc+'%20'+urlEnc+'" target="_blank" rel="noopener">💬 WhatsApp</a>';
    html+='<a class="vtv-share-btn vtv-share-x" href="https://twitter.com/intent/tweet?text='+titleEnc+'&url='+urlEnc+'" target="_blank" rel="noopener">𝕏 Twitter</a>';
    html+='<a class="vtv-share-btn vtv-share-fb" href="https://www.facebook.com/sharer/sharer.php?u='+urlEnc+'" target="_blank" rel="noopener">📘 Facebook</a>';
    html+='<a class="vtv-share-btn vtv-share-tg" href="https://t.me/share/url?url='+urlEnc+'&text='+titleEnc+'" target="_blank" rel="noopener">✈️ Telegram</a>';
    html+='<button class="vtv-share-btn vtv-share-copy" onclick="vtvCopyLink(\''+safeUrl+'\',this)">📋 Kopyala</button>';
    html+='<div class="vtv-share-link-wrap"><input class="vtv-share-link-input" type="text" value="'+esc(url)+'" readonly onclick="this.select()"></div>';
    html+='</div>';
    return html;
  }

  window.vtvBuildVideoUrl = buildVideoUrl;

  window.vtvCopyLink = function(url, btn){
    if(navigator.clipboard){
      navigator.clipboard.writeText(url).then(function(){
        var orig=btn.innerHTML; btn.innerHTML='✓ Kopyalandı!'; btn.style.background='#10B981';
        setTimeout(function(){btn.innerHTML=orig;btn.style.background='';},2000);
      });
    } else {
      var ta=document.createElement('textarea'); ta.value=url;
      document.body.appendChild(ta); ta.select(); document.execCommand('copy');
      document.body.removeChild(ta);
      var orig=btn.innerHTML; btn.innerHTML='✓ Kopyalandı!';
      setTimeout(function(){btn.innerHTML=orig;},2000);
    }
  };

  /* ════════════════════════════════════
   * BAŞLANGIÇ + URL PARAMS
   * ════════════════════════════════════ */
  $(document).ready(function(){
    $('.vtv-app').each(function(){
      var id=$(this).attr('id');
      if(!id) return;

      var initVid   =(typeof VTV!=='undefined')?(VTV.init_video   ||''):'';
      var initPlat  =(typeof VTV!=='undefined')?(VTV.init_platform||'youtube'):'youtube';
      var initKanal =(typeof VTV!=='undefined')?(VTV.init_kaynak  ||0):0;

      if(initVid){
        // Ana sayfayı arka planda yükle (sidebar için)
        $.post(VTV.ajax,{action:'vtv_get_anasayfa'},function(r){
          if(r&&r.success){
            vtvRenderSbPopuler(id,r.data.populer_kanallar);
            vtvRenderSbKategoriler(id,r.data.kategoriler);
            var appData=[];
            (r.data.kaynaklar||[]).forEach(function(k){appData.push({id:k.id,isim:k.isim,tip:k.tip,videos:[]});});
            window[id+'_d']=appData;
          }
        });
        $.post(VTV.ajax,{action:'vtv_get_video_meta',video_id:initVid,platform:initPlat},function(r){
          if(r.success){
            var v=r.data;
            vtvPlay(v.video_id,v.baslik,v.kanal_ismi||'',v.platform||initPlat,id,v.kaynak_id||initKanal);
          } else {
            vtvPlay(initVid,'Video','',initPlat,id,initKanal);
          }
        });
      } else {
        vtvLoadHome(id);
      }

      // Geri tuşu
      $(window).on('popstate',function(e){
        var state=e.originalEvent.state;
        if(state&&state.vtv_video){
          $.post(VTV.ajax,{action:'vtv_get_video_meta',video_id:state.vtv_video,platform:state.vtv_platform},function(r){
            if(r.success) vtvPlay(r.data.video_id,r.data.baslik,r.data.kanal_ismi||'',r.data.platform||'youtube',id,r.data.kaynak_id||0);
          });
        } else if(state&&state.vtv_kanal){
          vtvLoadKanal(id,state.vtv_kanal);
        } else {
          vtvLoadHome(id);
        }
      });
    });
  });

})(jQuery);
