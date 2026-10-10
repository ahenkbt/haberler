(function () {
  document.querySelectorAll("[data-ys-slider]").forEach(function (root) {
    var slides = Array.prototype.slice.call(root.querySelectorAll(".ys-slide"));
    var buttons = Array.prototype.slice.call(root.querySelectorAll(".ys-pager button"));
    if (slides.length < 2) return;
    var index = 0;
    var timer = 0;
    function show(next) {
      index = (next + slides.length) % slides.length;
      slides.forEach(function (slide, i) {
        var on = i === index;
        slide.hidden = !on;
        slide.classList.toggle("is-on", on);
      });
      buttons.forEach(function (button, i) {
        if (i === index) button.setAttribute("aria-current", "true");
        else button.removeAttribute("aria-current");
      });
    }
    function arm() {
      window.clearInterval(timer);
      timer = window.setInterval(function () { show(index + 1); }, 7000);
    }
    buttons.forEach(function (button, i) {
      button.addEventListener("click", function (event) {
        event.preventDefault();
        show(i);
        arm();
      });
    });
    root.addEventListener("mouseenter", function () { window.clearInterval(timer); });
    root.addEventListener("mouseleave", arm);
    arm();
  });
})();
