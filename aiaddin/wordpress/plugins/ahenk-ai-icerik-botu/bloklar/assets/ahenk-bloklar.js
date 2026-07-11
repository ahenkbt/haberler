(function(){
  function ready(fn){if(document.readyState!=='loading')fn();else document.addEventListener('DOMContentLoaded',fn);}
  ready(function(){

    /* ===== Hikaye baloncukları kaydırma ===== */
    document.querySelectorAll('.ahk-hikaye-wrap').forEach(function(w){
      var sc=w.querySelector('.ahk-hikaye-scroll');
      var p=w.querySelector('.ahk-hk-prev'),n=w.querySelector('.ahk-hk-next');
      if(p) p.addEventListener('click',function(){sc.scrollBy({left:-300,behavior:'smooth'})});
      if(n) n.addEventListener('click',function(){sc.scrollBy({left:300,behavior:'smooth'})});
    });

    /* ===== Kategori tabları ===== */
    document.querySelectorAll('.ahk-tab-wrap').forEach(function(w){
      var btns=w.querySelectorAll('.ahk-tab-btn');
      btns.forEach(function(b){
        b.addEventListener('click',function(){
          var t=b.getAttribute('data-tab');
          btns.forEach(function(x){x.classList.remove('aktif')});
          b.classList.add('aktif');
          w.querySelectorAll('.ahk-tab-panel').forEach(function(p){
            p.classList.toggle('aktif', p.getAttribute('data-panel')===t);
          });
        });
      });
    });

    /* ===== Manşet slider ===== */
    document.querySelectorAll('.ahk-manset-wrap').forEach(function(w){
      var slides=w.querySelectorAll('.ahk-manset-slide');
      var dots=w.querySelectorAll('.ahk-ms-dot');
      var prev=w.querySelector('.ahk-ms-prev'),next=w.querySelector('.ahk-ms-next');
      var n=slides.length, i=0, timer=null;
      var oto=parseInt(w.getAttribute('data-otomatik')||'0',10);
      var sure=parseInt(w.getAttribute('data-sure')||'5000',10);
      if(n<=1) return;

      function goto(x){
        i=(x+n)%n;
        slides.forEach(function(s,k){s.classList.toggle('aktif',k===i)});
        dots.forEach(function(d,k){d.classList.toggle('aktif',k===i)});
      }
      function start(){if(!oto)return;stop();timer=setInterval(function(){goto(i+1)},sure);}
      function stop(){if(timer){clearInterval(timer);timer=null}}

      if(prev) prev.addEventListener('click',function(e){e.preventDefault();goto(i-1);start()});
      if(next) next.addEventListener('click',function(e){e.preventDefault();goto(i+1);start()});
      dots.forEach(function(d){d.addEventListener('click',function(){goto(parseInt(d.getAttribute('data-i'),10));start()})});
      w.addEventListener('mouseenter',stop);
      w.addEventListener('mouseleave',start);

      /* Dokunmatik kaydırma */
      var sx=0,dx=0;
      w.addEventListener('touchstart',function(e){sx=e.touches[0].clientX;dx=0;stop()},{passive:true});
      w.addEventListener('touchmove',function(e){dx=e.touches[0].clientX-sx},{passive:true});
      w.addEventListener('touchend',function(){if(Math.abs(dx)>40)goto(i+(dx<0?1:-1));start()});

      start();
    });
  });
})();
