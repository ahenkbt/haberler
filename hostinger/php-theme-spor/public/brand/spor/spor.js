/* spor 2026-10-10 */
(function () {
  var burger = document.querySelector('[data-spor-burger]');
  var nav = document.querySelector('[data-spor-nav]');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  var root = document.querySelector('[data-spor-slider]');
  if (!root) return;
  var track = root.querySelector('[data-spor-track]');
  var slides = Array.prototype.slice.call(root.querySelectorAll('[data-spor-slide]'));
  if (!track || slides.length < 2) return;
  var i = 0;
  var timer = null;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var dots = Array.prototype.slice.call(root.querySelectorAll('[data-spor-dot]'));
  function go(n) {
    i = (n + slides.length) % slides.length;
    track.style.transform = 'translateX(' + (-i * 100) + '%)';
    dots.forEach(function (d, k) {
      if (k === i) d.setAttribute('aria-current', 'true');
      else d.removeAttribute('aria-current');
    });
  }
  function arm() {
    if (reduce) return;
    window.clearInterval(timer);
    timer = window.setInterval(function () { go(i + 1); }, 6500);
  }
  var prev = root.querySelector('[data-spor-prev]');
  var next = root.querySelector('[data-spor-next]');
  if (prev) prev.addEventListener('click', function () { go(i - 1); arm(); });
  if (next) next.addEventListener('click', function () { go(i + 1); arm(); });
  dots.forEach(function (d, k) {
    d.addEventListener('click', function () { go(k); arm(); });
  });
  root.addEventListener('mouseenter', function () { window.clearInterval(timer); });
  root.addEventListener('mouseleave', arm);
  root.addEventListener('focusin', function () { window.clearInterval(timer); });
  root.addEventListener('focusout', arm);
  var x0 = null;
  root.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  root.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 42) go(i + (dx < 0 ? 1 : -1));
    x0 = null;
    arm();
  });
  arm();
})();
