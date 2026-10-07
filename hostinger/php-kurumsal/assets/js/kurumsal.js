(function () {
  var btn = document.querySelector("[data-hk-nav-toggle]");
  var nav = document.querySelector(".hk-nav");
  if (!btn || !nav) return;
  btn.addEventListener("click", function () {
    nav.classList.toggle("is-open");
  });
})();
