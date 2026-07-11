<?php
/**
 * Premium UI Katmanı
 * Glassmorphism · Scroll Animasyonları · Micro-interactions · Modern Typography
 * Tüm projelerle uyumlu — tema renk değişkenlerini kullanır
 */
defined('ABSPATH') || exit;

if (!defined('TEMA_PREMIUM_UI') || !TEMA_PREMIUM_UI) return;

add_action('wp_head', 'tema_premium_css', 5);
function tema_premium_css() { ?>
<style id="tema-premium">
/* ════════════════════════════════════════════════════════════
   PREMIUM DESIGN TOKENS
════════════════════════════════════════════════════════════ */
:root {
  /* Gelişmiş gölge sistemi */
  --shadow-xs:  0 1px 2px rgba(0,0,0,.06);
  --shadow-sm:  0 2px 8px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04);
  --shadow-md:  0 4px 20px rgba(0,0,0,.10), 0 2px 6px rgba(0,0,0,.06);
  --shadow-lg:  0 8px 32px rgba(0,0,0,.12), 0 4px 12px rgba(0,0,0,.08);
  --shadow-xl:  0 16px 48px rgba(0,0,0,.16), 0 8px 24px rgba(0,0,0,.10);
  --shadow-glow:0 0 0 3px color-mix(in srgb, var(--cr) 20%, transparent);

  /* Animasyon easing */
  --ease-out-expo: cubic-bezier(.16,1,.3,1);
  --ease-in-out:   cubic-bezier(.4,0,.2,1);
  --ease-spring:   cubic-bezier(.34,1.56,.64,1);

  /* Geçiş hızları */
  --dur-fast:   120ms;
  --dur-normal: 220ms;
  --dur-slow:   380ms;

  /* Tipografi ölçeği */
  --text-xs:   11px;
  --text-sm:   13px;
  --text-base: 15px;
  --text-lg:   17px;
  --text-xl:   20px;
  --text-2xl:  24px;
  --text-3xl:  30px;
  --text-4xl:  36px;
  --text-hero: clamp(2rem, 5vw, 3.5rem);

  /* Border radius */
  --r-sm:  3px;
  --r-md:  6px;
  --r-lg:  12px;
  --r-xl:  20px;
  --r-full:9999px;

  /* Z-index katmanları */
  --z-base:    1;
  --z-dropdown:100;
  --z-sticky:  200;
  --z-overlay: 300;
  --z-modal:   400;
  --z-toast:   500;
}

/* ════════════════════════════════════════════════════════════
   GLOBAL POLISH
════════════════════════════════════════════════════════════ */
html { scroll-behavior: smooth; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
body { text-rendering: optimizeLegibility; }

/* Selection rengi */
::selection { background: var(--cr); color: #fff; }
::-moz-selection { background: var(--cr); color: #fff; }

/* Scrollbar (Chrome/Edge) */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--sin); border-radius: var(--r-full); }
::-webkit-scrollbar-thumb:hover { background: var(--cr); }

/* Focus görünürlüğü (erişilebilirlik) */
:focus-visible {
  outline: 2px solid var(--cr);
  outline-offset: 3px;
  border-radius: var(--r-sm);
}

/* ════════════════════════════════════════════════════════════
   SCROLL ANİMASYONLARI
════════════════════════════════════════════════════════════ */
[data-aos] {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity var(--dur-slow) var(--ease-out-expo),
              transform var(--dur-slow) var(--ease-out-expo);
}
[data-aos="fade-right"] { transform: translateX(-28px); }
[data-aos="fade-left"]  { transform: translateX(28px); }
[data-aos="zoom-in"]    { transform: scale(.94); }
[data-aos].aos-animate  { opacity: 1; transform: none; }

/* ════════════════════════════════════════════════════════════
   PREMIUM KART EFEKTLERİ
════════════════════════════════════════════════════════════ */
.tp-card {
  box-shadow: var(--shadow-xs);
  transition: transform var(--dur-normal) var(--ease-out-expo),
              box-shadow var(--dur-normal) var(--ease-out-expo),
              border-color var(--dur-fast) var(--ease-in-out);
  will-change: transform, box-shadow;
}
.tp-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}
.tp-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--cr) 6%, transparent) 0%, transparent 60%);
  opacity: 0;
  transition: opacity var(--dur-normal);
  pointer-events: none;
}
.tp-card:hover::after { opacity: 1; }

/* Blog kartları */
.tp-blog-card {
  box-shadow: var(--shadow-xs);
  transition: transform var(--dur-normal) var(--ease-out-expo),
              box-shadow var(--dur-normal) var(--ease-out-expo);
}
.tp-blog-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); }

/* ════════════════════════════════════════════════════════════
   GLASSMORPHİSM PANEL
════════════════════════════════════════════════════════════ */
.glass {
  background: rgba(255,255,255,.72);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255,255,255,.4);
  box-shadow: 0 8px 32px rgba(0,0,0,.08);
}
.glass-dark {
  background: rgba(13,11,11,.7);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255,255,255,.08);
}

/* ════════════════════════════════════════════════════════════
   PREMIUM TİPOGRAFİ
════════════════════════════════════════════════════════════ */
.tp-h1 {
  letter-spacing: -.02em;
  text-shadow: 0 2px 20px rgba(0,0,0,.4);
}
.tp-sec-title {
  letter-spacing: -.01em;
  background: linear-gradient(135deg, var(--dk) 0%, color-mix(in srgb, var(--dk) 60%, var(--cr)) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
/* Güvenlik: `color-mix` desteklemeyenlerde fallback */
@supports not (color: color-mix(in srgb, red 50%, blue)) {
  .tp-sec-title {
    background: none;
    -webkit-text-fill-color: var(--dk);
    color: var(--dk);
  }
}

/* ════════════════════════════════════════════════════════════
   HERO PREMIUM KATMAN
════════════════════════════════════════════════════════════ */
.tp-hero {
  background: linear-gradient(150deg, var(--dk) 0%, var(--dk2) 55%, color-mix(in srgb, var(--dk) 80%, var(--cr)) 100%);
}
/* Noise texture efekti */
.tp-hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events: none;
  mix-blend-mode: overlay;
  opacity: .4;
}

/* ════════════════════════════════════════════════════════════
   PREMIUM BUTON STİLLERİ
════════════════════════════════════════════════════════════ */
.tp-btn {
  position: relative;
  overflow: hidden;
  transition: transform var(--dur-fast) var(--ease-spring),
              box-shadow var(--dur-normal) var(--ease-out-expo),
              background var(--dur-normal);
}
.tp-btn::before {
  content: '';
  position: absolute;
  top: 50%; left: 50%;
  width: 0; height: 0;
  background: rgba(255,255,255,.12);
  border-radius: var(--r-full);
  transform: translate(-50%,-50%);
  transition: width .5s var(--ease-out-expo), height .5s var(--ease-out-expo);
}
.tp-btn:hover { transform: translateY(-1px); box-shadow: var(--shadow-md); }
.tp-btn:active { transform: translateY(0); }
.tp-btn:hover::before { width: 300%; height: 300%; }

/* ════════════════════════════════════════════════════════════
   LOADING SKELETON
════════════════════════════════════════════════════════════ */
.skeleton {
  background: linear-gradient(90deg, var(--bg) 25%, color-mix(in srgb, var(--sin) 40%, white) 50%, var(--bg) 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
  border-radius: var(--r-sm);
}
@keyframes skeleton-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ════════════════════════════════════════════════════════════
   PREMIUM NE BADGE / TAG
════════════════════════════════════════════════════════════ */
.tp-badge {
  font-size: 9px;
  letter-spacing: 1.8px;
  transition: all var(--dur-fast);
}
.tp-badge.tq {
  background: linear-gradient(135deg, color-mix(in srgb, var(--cr) 10%, transparent), color-mix(in srgb, var(--cr) 5%, transparent));
}

/* ════════════════════════════════════════════════════════════
   NAVBAR PREMIUM (scroll'da gölge)
════════════════════════════════════════════════════════════ */
.site-hdr { transition: box-shadow var(--dur-normal); }
.site-hdr.scrolled { box-shadow: 0 4px 24px rgba(0,0,0,.18); }

/* ════════════════════════════════════════════════════════════
   SAYFA GEÇİŞ ANİMASYONU
════════════════════════════════════════════════════════════ */
@keyframes page-fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: none; }
}
main, .tp-hero, .vkv-hero {
  animation: page-fade-in var(--dur-slow) var(--ease-out-expo) both;
}

/* ════════════════════════════════════════════════════════════
   TIMELINE PREMIUM
════════════════════════════════════════════════════════════ */
.tp-tl-dot {
  box-shadow: 0 0 0 0 color-mix(in srgb, var(--cr) 40%, transparent);
  transition: box-shadow var(--dur-normal);
}
.tp-tl-item:hover .tp-tl-dot {
  box-shadow: 0 0 0 8px color-mix(in srgb, var(--cr) 15%, transparent);
}

/* ════════════════════════════════════════════════════════════
   FORM ELEMENTLERİ
════════════════════════════════════════════════════════════ */
input[type="text"], input[type="email"], input[type="url"],
input[type="search"], textarea, select {
  transition: border-color var(--dur-fast), box-shadow var(--dur-fast);
}
input[type="text"]:focus, input[type="email"]:focus, textarea:focus {
  box-shadow: var(--shadow-glow);
}

/* ════════════════════════════════════════════════════════════
   KAHRAMAN BANT — GRADIENT BORDER
════════════════════════════════════════════════════════════ */
.vkv-hero-band {
  position: relative;
}
.vkv-hero-band::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--altin), var(--altin2), var(--altin), transparent);
}

/* ════════════════════════════════════════════════════════════
   HABERLER GRID — PREMIUM IMAGE OVERLAY
════════════════════════════════════════════════════════════ */
.vkv-news-main-card {
  transition: transform var(--dur-normal) var(--ease-out-expo);
}
.vkv-news-main-card:hover { transform: scale(1.005); }

/* ════════════════════════════════════════════════════════════
   BREADCRUMB AYIRIcı
════════════════════════════════════════════════════════════ */
.tp-bc-w .sep { font-size: 8px; opacity: .5; }

/* ════════════════════════════════════════════════════════════
   FOOTER — GELİŞMİŞ BÖLÜCÜ
════════════════════════════════════════════════════════════ */
.site-ftr::before {
  content: '';
  display: block;
  height: 3px;
  background: linear-gradient(90deg, transparent, var(--cr), var(--altin), var(--cr3), var(--altin), transparent);
}

/* ════════════════════════════════════════════════════════════
   RESPON­SİF YARDIMCILAR
════════════════════════════════════════════════════════════ */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    transition-duration: .01ms !important;
  }
  [data-aos] { opacity: 1 !important; transform: none !important; }
}
@media (max-width: 768px) {
  .tp-card:hover { transform: none; }
}
</style>
<?php }

/* ════════════════════════════════════════════════════════════
   PREMIUM JAVASCRIPT
════════════════════════════════════════════════════════════ */
add_action('wp_footer', 'tema_premium_js');
function tema_premium_js() { ?>
<script id="tema-premium-js">
(function() {
  'use strict';

  /* ── Scroll AOS (IntersectionObserver tabanlı) ── */
  if (window.IntersectionObserver) {
    var aosEls = document.querySelectorAll('[data-aos]');
    var delays = { 'delay-100':100,'delay-200':200,'delay-300':300,'delay-400':400,'delay-500':500 };

    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          var delay = 0;
          el.classList.forEach(function(c) { if (delays[c]) delay = delays[c]; });
          setTimeout(function() { el.classList.add('aos-animate'); }, delay);
          io.unobserve(el);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    aosEls.forEach(function(el) { io.observe(el); });
  } else {
    // Fallback: hepsini görünür yap
    document.querySelectorAll('[data-aos]').forEach(function(el) { el.classList.add('aos-animate'); });
  }

  /* ── Navbar scroll gölgesi ── */
  var hdr = document.querySelector('.site-hdr');
  if (hdr) {
    window.addEventListener('scroll', function() {
      hdr.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }

  /* ── Smooth anchor scroll ── */
  document.querySelectorAll('a[href^="#"]').forEach(function(a) {
    a.addEventListener('click', function(e) {
      var target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ── Kart ripple efekti ── */
  document.querySelectorAll('.tp-btn, .vkv-slide-btn, .tp-more-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      var rect   = btn.getBoundingClientRect();
      var ripple = document.createElement('span');
      var size   = Math.max(rect.width, rect.height) * 2;
      ripple.style.cssText = 'position:absolute;border-radius:50%;pointer-events:none;'
        + 'width:' + size + 'px;height:' + size + 'px;'
        + 'left:' + (e.clientX - rect.left - size/2) + 'px;'
        + 'top:' + (e.clientY - rect.top - size/2) + 'px;'
        + 'background:rgba(255,255,255,.2);transform:scale(0);'
        + 'animation:tema-ripple .5s ease-out;';
      var style = document.createElement('style');
      style.textContent = '@keyframes tema-ripple{to{transform:scale(1);opacity:0;}}';
      if (!document.getElementById('tema-ripple-style')) {
        style.id = 'tema-ripple-style';
        document.head.appendChild(style);
      }
      btn.style.position = 'relative';
      btn.style.overflow = 'hidden';
      btn.appendChild(ripple);
      ripple.addEventListener('animationend', function() { ripple.remove(); });
    });
  });

  /* ── Görsellerin lazy load ile yüklenmesi ── */
  if ('loading' in HTMLImageElement.prototype) {
    document.querySelectorAll('img:not([loading])').forEach(function(img) {
      img.setAttribute('loading', 'lazy');
    });
  }

  /* ── Tablo scroll hint (mobil) ── */
  document.querySelectorAll('table').forEach(function(t) {
    if (!t.parentElement.classList.contains('table-wrap')) {
      var wrap = document.createElement('div');
      wrap.style.cssText = 'overflow-x:auto;-webkit-overflow-scrolling:touch;';
      t.parentNode.insertBefore(wrap, t);
      wrap.appendChild(t);
    }
  });

})();
</script>
<?php }
