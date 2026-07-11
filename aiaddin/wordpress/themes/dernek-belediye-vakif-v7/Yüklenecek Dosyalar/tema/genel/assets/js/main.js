(function(window) {
    "use strict";

    var mainContainer = document.querySelector(".main-wrap"),
        openCtrl = document.getElementById("btn-search"),
        openCtrl2 = document.getElementById("btn-search2"),
        closeCtrl = document.getElementById("btn-search-close"),
        searchContainer = document.querySelector(".search"),
        inputSearch = searchContainer.querySelector(".search__input");

    function init() {
        initEvents();
    }

    function initEvents() {
        openCtrl.addEventListener("click", openSearch);
        openCtrl2.addEventListener("click", openSearch);
        closeCtrl.addEventListener("click", closeSearch);
        document.addEventListener("keyup", function(ev) {
            // escape key.
            if (ev.keyCode == 27) {
                closeSearch();
            }
        });
    }

    function openSearch() {
        mainContainer.classList.add("main-wrap--move");
        searchContainer.classList.add("search--open");
        setTimeout(function() {
            inputSearch.focus();
        }, 600);
    }

    function closeSearch() {
        mainContainer.classList.remove("main-wrap--move");
        searchContainer.classList.remove("search--open");
        inputSearch.blur();
        inputSearch.value = "";
    }

    init();
})(window);

$(function() {
    setTimeout(function() {
        $(".loader").addClass("hide");
        $("html").addClass("loaded");
    }, 500);
});

$(document).ready(function() {
    $(".hamburger-box>.icon").click(function() {
        $(".hamburger-box>.icon").toggleClass("active");
    });
});

$(document).ready(function() {
    $("#mobile-menu").mCustomScrollbar({
        theme: "minimal"
    });

    $("#dismiss, .overlay").on("click", function() {
        $("#mobile-menu").removeClass("active");
        $("#sidebarCollapse").removeClass("active");
        $(".overlay").removeClass("active");
    });

    $("#sidebarCollapse").on("click", function() {
        $("#mobile-menu").addClass("active");
        $(".overlay").addClass("active");
        $(".collapse.in").toggleClass("in");
        $("a[aria-expanded=true]").attr("aria-expanded", "false");
    });

    $(".drp-mobile-link").on("click", function() {
        $(this)
            .next(".drp-mobile")
            .toggleClass("active");
    });
});

$(document).ready(function() {
    $(".header-dropdown .tab-link").on("click", function() {
        var target = $(this).attr("datatarget");

        $(target)
            .parent()
            .children(".tab-panel")
            .removeClass("active");
        $(target).addClass("active");

        $(this)
            .parent()
            .children(".tab-link")
            .removeClass("active");
        $(this).addClass("active");
    });

    $(".tab-component .tab-head .tab-link").on("click", function() {
        var target = $(this).attr("datatarget");

        $(".tab-component .tab-body .tab-panel").removeClass("active");
        $(target).addClass("active");

        $(".tab-component .tab-body .tab-panel .do-nicescroll3").removeClass(
            "active"
        );
        $(target + " .do-nicescroll3").addClass("active");
        $(target).addClass("active");

        $(".tab-component .tab-head .tab-link").removeClass("active");
        $(this).addClass("active");
    });
	
	$(".bagis-component .tab-head .tab-link").on("click", function() {
        var target = $(this).attr("datatarget");

        $(".bagis-component .tab-body .tab-panel").removeClass("active");
        $(target).addClass("active");

        $(".bagis-component .tab-body .tab-panel .do-nicescroll3").removeClass(
            "active"
        );
        $(target + " .do-nicescroll3").addClass("active");
        $(target).addClass("active");

        $(".bagis-component .tab-head .tab-link").removeClass("active");
        $(this).addClass("active");
    });

    $(".do-nicescroll3").niceScroll({
        cursorwidth: 8,
        cursoropacitymin: 0.6,
        cursorcolor: "#3b557a",
        cursorborder: "none",
        cursorborderradius: 4,
        autohidemode: "leave",
        emulatetouch: true,
        background: "#dde3e8",
        railoffset: { top: 20, left: -20 },
        cursorfixedheight: 250,
        scrollbarid: "etkinlik-scroll"
    });

    $(".owl-carousel-etkinlik").owlCarousel({
        loop: true,
        nav: true,
        items: 1,
        navContainer: ".etkinlik-nav"
    });
    $(".owl-carousel-proje").owlCarousel({
        loop: true,
        nav: true,
        items: 1,
        responsiveClass: true,
        navSpeed: 500,
		navText:['<i class="fas fa-chevron-left"></i>','<i class="fas fa-chevron-right"></i>'],
        navContainer: ".projeler-nav",
        responsive: {
            0: {
                stagePadding: 0,
                margin: 20
            },
            768: {
                stagePadding: 0,
                margin: 20
            },
            992: {
                stagePadding: 100
            },
            1200: {
                stagePadding: 250
            },
            1400: {
                stagePadding: 250
            },
            1600: {
                stagePadding: 400
            }
        }
    });

    $(".owl-carousel-festival").owlCarousel({
        loop: false,
        nav: true,
        items: 1,
        navContainer: ".festival-nav",
        rewind: true
    });

    $(".owl-carousel-hizlimenu").owlCarousel({
        loop: true,
		nav: true,
		autoplay:true,
        items: 10,
        stagePadding: 30,
        margin: 15,
        navContainer: ".hizlimenu-nav",
        responsive: {
            0: {
                nav: true,
                items: 2
            },
            768: {
                nav: true,
                items: 4
            },
            992: {
                nav: true,
                items: 5
            },
            1200: {
                nav: true,
                items: 7
            },
            1450: {
                nav: true,
                items: 8
            },
            1700: {
                items: 10,
                nav: true
            }
        }
    });

    $(".owl-carousel-fotogaleri").owlCarousel({
        loop: true,
        nav: true,
        items: 3,
        navContainer: ".fotogaleri-nav",
        responsive: {
            0: {
                items: 1
            },
            768: {
                items: 1
            },
            992: {
                items: 2
            },
            1200: {
                items: 3
            },
            1400: {
                items: 3
            },
            1600: {
                items: 3
            }
        }
    });
	
	$(".owl-carousel-videogaleri").owlCarousel({
        loop: true,
        nav: true,
        items: 3,
        navContainer: ".videogaleri-nav",
        responsive: {
            0: {
                items: 1
            },
            768: {
                items: 1
            },
            992: {
                items: 2
            },
            1200: {
                items: 3
            },
            1400: {
                items: 3
            },
            1600: {
                items: 3
            }
        }
    });

    var btn = $("#page-up");

    $(window).scroll(function() {
        if ($(window).scrollTop() > 200) {
            btn.addClass("active");
        } else {
            btn.removeClass("active");
        }
    });

    btn.on("click", function(e) {
        e.preventDefault();
        $("html, body").animate({ scrollTop: 0 }, "300");
    });
});
