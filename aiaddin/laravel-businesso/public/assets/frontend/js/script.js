/*============================================
    Image to popupAnnouncement
============================================*/
function popupAnnouncement($this) {
    let closedPopups = [];
    if (sessionStorage.getItem('closedPopups')) {
        closedPopups = JSON.parse(sessionStorage.getItem('closedPopups'));
    }

    // if the popup is not in closedPopups Array
    if (closedPopups.indexOf($this.data('popup_id')) == -1) {
        $('#' + $this.attr('id')).show();
        let popupDelay = $this.data('popup_delay');

        setTimeout(function () {
            jQuery.magnificPopup.open({
                items: { src: '#' + $this.attr('id') },
                type: 'inline',
                callbacks: {
                    afterClose: function () {
                        // after the popup is closed, store it in the sessionStorage & show next popup
                        closedPopups.push($this.data('popup_id'));
                        sessionStorage.setItem('closedPopups', JSON.stringify(closedPopups));


                        if ($this.next('.popup-wrapper').length > 0) {
                            popupAnnouncement($this.next('.popup-wrapper'));
                        }
                    }
                }
            }, 0);
        }, popupDelay);
    } else {
        if ($this.next('.popup-wrapper').length > 0) {
            popupAnnouncement($this.next('.popup-wrapper'));
        }
    }
}
/*============================================
    Image to background image
============================================*/
var bgImage = $(".bg-img")
bgImage.each(function () {
    var el = $(this),
        src = el.attr("data-bg-image");

    el.css({
        "background-image": "url(" + src + ")",
        "display": "block",
        "background-repeat": "no-repeat"
    });
});
!(function ($) {
    "use strict";

    /*============================================
        Sticky header
    ============================================*/
    $(window).on("scroll", function () {
        var header = $(".header-area");
        // If window scroll down .is-sticky class will added to header
        if ($(window).scrollTop() >= 50) {
            header.addClass("is-sticky");
        } else {
            header.removeClass("is-sticky");
        }
    });


    /*============================================
        Image to background image
    ============================================*/
    var bgImage = $(".bg-img")
    bgImage.each(function () {
        var el = $(this),
            src = el.attr("data-bg-image");

        el.css({
            "background-image": "url(" + src + ")",
            "background-size": "cover",
            "background-position": "center",
            "display": "block"
        });
    });

    // subscribe functionality
    if ($(".subscribeForm").length > 0) {
        $(".subscribeForm").each(function () {
            let $this = $(this);

            $this.on('submit', function (e) {

                e.preventDefault();

                let formId = $this.attr('id');
                let fd = new FormData(document.getElementById(formId));

                $.ajax({
                    url: $this.attr('action'),
                    type: $this.attr('method'),
                    data: fd,
                    contentType: false,
                    processData: false,
                    success: function (data) {
                        if (data.g_recaptcha_response) {
                            $this.find(".err-g-recaptcha-response").html(data.g_recaptcha_response);
                        }
                        console.log(data.g_recaptcha_response);
                        if ((data.errors)) {
                            $this.find(".err-email").html(data.errors.email[0]);
                        } else {
                            toastr["success"]("You are subscribed successfully!");
                            $this.trigger('reset');
                            $this.find(".err-email").html('');
                        }
                    }
                });
            });
        });
    }

    /*============================================
        Mobile Menu
    ============================================*/
    var mobileMenu = function () {
        // Variables
        var body = $("body"),
            mainNavbar = $(".main-navbar"),
            mobileNavbar = $(".mobile-menu"),
            cloneInto = $(".mobile-menu-wrapper"),
            cloneItem = $(".mobile-item"),
            menuToggler = $(".menu-toggler"),
            offCanvasMenu = $("#offcanvasMenu")

        menuToggler.on("click", function () {
            $(this).toggleClass("active");
            body.toggleClass("mobile-menu-active")
        })

        mainNavbar.find(cloneItem).clone(!0).appendTo(cloneInto);

        if (offCanvasMenu) {
            body.find(offCanvasMenu).clone(!0).appendTo(cloneInto);
        }

        mobileNavbar.find("li").each(function (index) {
            var toggleBtn = $(this).children(".toggle")
            toggleBtn.on("click", function (e) {
                $(this)
                    .parent("li")
                    .children("ul")
                    .stop(true, true)
                    .slideToggle(350);
                $(this).parent("li").toggleClass("show");
            })
        })

        // check browser width in real-time
        var checkBreakpoint = function () {
            var winWidth = window.innerWidth;
            if (winWidth <= 1199) {
                mainNavbar.hide();
                mobileNavbar.show()
            } else {
                mainNavbar.show();
                mobileNavbar.hide()
            }
        }
        checkBreakpoint();

        $(window).on('resize', function () {
            checkBreakpoint();
        });
    }
    mobileMenu();


    /*============================================
        Navlink active class
    ============================================*/
    var a = $("#mainMenu .nav-link"),
        c = window.location;

    for (var i = 0; i < a.length; i++) {
        const el = a[i];

        if (el.href == c) {
            el.classList.add("active");
        }
    }

    /*============================================
        Swiper Slider
    ============================================*/
    var itemCount = $(".sponsor-slider .swiper-slide");
    var sponsorSlider = new Swiper(".sponsor-slider", {
        speed: 1200,
        loop: itemCount.length != 1 && itemCount.length != 2 && itemCount.length != 3,
        spaceBetween: 30,
        slidesPerView: 4,
        autoplay: {
            delay: 3000,
        },
        pagination: {
            el: ".swiper-pagination",
            clickable: true,
        },
        breakpoints: {
            320: {
                slidesPerView: 1
            },
            400: {
                slidesPerView: 2
            },
            768: {
                slidesPerView: 3
            },
            1200: {
                slidesPerView: 4
            }
        }
    });

    // User Slider
    var userSlider = new Swiper(".user-slider", {
        speed: 1200,
        loop: false,
        spaceBetween: 30,
        slidesPerView: 4,
        autoplay: {
            delay: 3000,
        },
        // Navigation arrows
        navigation: {
            nextEl: "#user-slider-next",
            prevEl: "#user-slider-prev",
        },
        breakpoints: {
            320: {
                slidesPerView: 1
            },
            768: {
                slidesPerView: 2
            },
            992: {
                slidesPerView: 3
            },
            1200: {
                slidesPerView: 4
            }
        }
    });

    // Testimonial Slider
    new Swiper(".testimonial-slider", {
        speed: 1200,
        spaceBetween: 15,
        slidesPerView: 1,
        loop: true,
        grabCursor: true,

        // Pagination bullets
        pagination: {
            el: "#testimonial-slider-pagination",
            clickable: true,
        },

        on: {
            init: function () {
                var pagination = $('#testimonial-slider-pagination'),
                    paginationLength = $('#testimonial-slider-pagination span'),
                    currentSlide = 1,
                    totalSlide = paginationLength.length.toString().padStart(2, '0')

                pagination.attr('data-min', '0' + currentSlide);
                pagination.attr('data-max', totalSlide);
            },
        }
    });

    // Screenshot Slider all
    $(".vcard-slider").each(function () {
        var slidePerView = $(this).data("slides-per-view");
        var itemCount = $(".vcard-slider .swiper-slide")

        var swiper = new Swiper(".vcard-slider", {
            watchOverflow: true,
            loop: itemCount.length != 1 && itemCount.length != 2 && itemCount.length != 3,
            centeredSlides: true,
            speed: 800,
            autoplay: {
                delay: 3000,
            },
            effect: 'coverflow',
            grabCursor: true,
            slidesPerView: slidePerView,
            pagination: true,
            coverflowEffect: {
                rotate: 0,
                depth: 200,
                slideShadows: false
            },

            pagination: {
                el: ".vcard-slider-pagination",
                clickable: true,
            },

            // Navigation arrows
            navigation: {
                nextEl: ".vcard-slider-next",
                prevEl: ".vcard-slider-prev",
            },

            breakpoints: {
                // when window width is >= 320px
                320: {
                    slidesPerView: 2,
                },
                // when window width is >= 576px
                576: {
                    slidesPerView: 3
                },
                // when window width is >= 768px
                992: {
                    slidesPerView: slidePerView
                },
            },
        })
    })


    /*============================================
        Popup
    ============================================*/
    $(".youtube-popup").magnificPopup({
        disableOn: 300,
        type: "iframe",
        mainClass: "mfp-fade",
        removalDelay: 160,
        preloader: false,
        fixedContentPos: false
    })


    /*============================================
        Go to Top
    ============================================*/
    $(window).on("scroll", function () {
        // If window scroll down .active class will added to go-top
        var goTop = $(".go-top");
        if ($(window).scrollTop() >= 200) {
            goTop.addClass("active");
        } else {
            goTop.removeClass("active")
        }
    })
    $(".go-top").on("click", function (e) {
        $("html, body").animate({
            scrollTop: 0,
        }, 0);
    });

    /*============================================
        Lazyload image
    ============================================*/
    function lazyLoad() {
        window.lazySizesConfig = window.lazySizesConfig || {};
        window.lazySizesConfig.loadMode = 2;
        lazySizesConfig.preloadAfterLoad = true;
    }


    /*============================================
        Pricing toggle
    ============================================*/
    $(".pricing-list").each(function (i) {
        var list = $(this).children();
        let more = $(this).data('more');
        let less = $(this).data('less');
        if (list.length > 4) {
            this.insertAdjacentHTML('afterEnd', '<span class="show-more">' + more + ' +</span>');
            const showLink = $(this).next(".show-more");
            list.slice(4).toggle(300);
            showLink.on("click", function () {
                list.slice(4).toggle(300);
                showLink.html(showLink.html() === less + " -" ? more + " +" : less + " -")
            })
        }
    })


    /*============================================
        Nice select
    ============================================*/
    $(".select").niceSelect();

    var selectList = $(".nice-select .list")
    $(".nice-select .list").each(function () {
        var list = $(this).children();
        if (list.length > 5) {
            $(this).css({
                "height": "160px",
                "overflow-y": "scroll"
            })
        }
    })


    /*============================================
        Magic Cursor
    ============================================*/
    var cursor = function () {
        // Variables Declaration
        var cursor = $('.cursor');
        if (window.innerWidth > 1199) {
            // Adding cursor effect
            $(window).on('mousemove', function (e) {
                cursor.css({
                    'transform': "translate(" + e.clientX + "px," + e.clientY + "px)"
                })
            })
            // Add hover class
            $('a, button, .cursor-pointer').on('mouseenter', function () {
                cursor.addClass('hover');
            })
            // Remove hover class
            $('a, button, .cursor-pointer').on('mouseleave', function () {
                cursor.removeClass('hover');
            })
        } else {
            cursor.remove();
        }
    }

    /******************************
    Tol Tip
    ********************************/
    $(document).ready(function () {
        $('[data-toggle="tooltip"]').tooltip();
    });


    $(document).ready(function () {
        // Desktop only (hover supported)
        if (window.matchMedia('(hover: hover)').matches) {
            $('.ai-hover-wrapper').hover(
                function () {
                    var $pages = $(this).next('.ai-hover-pages');

                    if ($pages.length) {
                        $pages.stop(true, true).slideToggle(500);
                    }
                },
            );
        }
    });

    // Mobile & all devices (click)
    $('.ai-hover-wrapper').on('click', function (e) {
        e.preventDefault();

        var $pages = $(this).next('.ai-hover-pages');

        if ($pages.length) {
            $pages.stop(true, true).slideToggle(500);
        }
    });



    /*============================================
        Footer date
    ============================================*/
    var date = new Date().getFullYear();
    $("#footerDate").text(date);

    $(document).ready(function () {
        lazyLoad()
        cursor()
    })

})(jQuery);
$(window).on("load", function () {
    const delay = 1000;
    /*============================================
        Preloader
    ============================================*/
    $("#preLoader").delay(delay).fadeOut();

    /*============================================
        Aos animation
    ============================================*/
    var aosAnimation = function () {
        AOS.init({
            easing: "ease",
            duration: 1200,
            once: true,
            offset: 60,
            disable: "mobile"
        });
    }
    if ($("#preLoader")) {
        setTimeout(() => {
            aosAnimation()
        }, delay);
    } else {
        aosAnimation();
    }
})

$(window).on('load', function (event) {
    if ($(".popup-wrapper").length > 0) {
        let $firstPopup = $(".popup-wrapper").eq(0);
        popupAnnouncement($firstPopup);
    }
    $('.preloader').fadeOut('500');
});
var lazyLoadInstance = new LazyLoad();

$('.offer-timer').each(function () {
    let $this = $(this);
    let d = new Date($this.data('end_date'));
    let ye = parseInt(new Intl.DateTimeFormat('en', { year: 'numeric' }).format(d));
    let mo = parseInt(new Intl.DateTimeFormat('en', { month: 'numeric' }).format(d));
    let da = parseInt(new Intl.DateTimeFormat('en', { day: '2-digit' }).format(d));
    let t = $this.data('end_time');
    let time = t.split(":");
    let hr = parseInt(time[0]);
    let min = parseInt(time[1]);
    $this.syotimer({
        year: ye,
        month: mo,
        day: da,
        hour: hr,
        minute: min,
    });
});

//added by rakib
document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
        new bootstrap.Tooltip(el, {
            container: 'body',
            boundary: 'window',
            trigger: 'hover focus'
        });
    });
});
