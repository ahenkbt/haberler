
(function ($) {
    "use strict";

    /*============================================
    // Preloader
    ============================================*/
    if ($('.preloader').length > 0) {

        window.onload = function () {
            const preloader = document.querySelector('.preloader');
            preloader.classList.add('hidden');
        };
    }

    // header-next
    var getHeaderHeight = function () {
        var headerNext = $(".header-next");
        var header = $(".header-area");
        var headerHeight = header.height();
        headerNext.css({
            "margin-top": headerHeight + "px"
        });
    }
    getHeaderHeight();

    $(window).on('resize', function () {
        getHeaderHeight();
    });

    /*============================================
    nice select
    ============================================*/
    $(document).ready(function () {
        $('.nice-select').niceSelect();
    });

    /*============================================
    Select2
    ============================================*/
    $('.select2').select2();

    /*============================================
        Youtube popup
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
    AOS js init
    ============================================*/
    AOS.init({
        easing: "ease",
        duration: 1200,
        once: true,
        offset: 60,
        disable: "mobile"
    });

    // =============  Dynamic Year ========= 
    if ($('.dynamic-year').length > 0) {
        const yearElement = document.querySelector('.dynamic-year');
        const currentYear = new Date().getFullYear();
        yearElement.innerHTML = currentYear;
    }

    /******************************
    Tol Tip
    ********************************/
    $(document).ready(function () {
        $('[data-toggle="tooltip"]').tooltip();
    });

    // Go to Top
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
    Toggle List
    ============================================*/
    $("[data-toggle-list]").each(function () {

        var show_more = "Show More +";
        var show_less = "Show Less -";

        var list = $(this).children();
        var listShow = $(this).data("toggle-show");
        var listShowBtn = $(this).next("[data-toggle-btn]");

        var showMoreText = show_more + '';
        var showLessText = show_less + '';

        if (list.length > listShow) {
            listShowBtn.show();
            list.slice(listShow).hide();
            listShowBtn.on("click", function () {
                var isExpanded = listShowBtn.text() === showLessText;
                list.slice(listShow).slideToggle(300);
                listShowBtn.text(isExpanded ? showMoreText : showLessText);
            });
        } else {
            listShowBtn.hide();
        }
    });

    /*============================================
        data att background image
    ============================================*/
    function lazyLoadBackground() {
        $(".bg-img").each(function () {
            var el = $(this);
            if (el.attr("data-bg-image") && el.is(":visible") && el.offset().top < $(window).scrollTop() + $(window).height()) {
                var src = el.attr("data-bg-image");
                el.css({
                    "background-image": "url(" + src + ")",
                }).removeAttr("data-bg-image");
            }
        });
    }
    lazyLoadBackground();
    $(window).on("scroll", lazyLoadBackground);


    /*============================================
    Image to background image
    ============================================*/
    $(".img-to-bg.blur-up").parent().addClass('blur-up lazyload');

    $(".img-to-bg").each(function () {
        var el = $(this), src = el.attr("src"), parent = el.parent();

        parent.css({
            "background-image": "url(" + src + ")",
            "background-size": "cover",
            "background-position": "center",
            "display": "block"
        });

        el.hide();
    });

    /*============================================
        Lazyload image
    ============================================*/
    var lazyLoad = function () {
        window.lazySizesConfig = window.lazySizesConfig || {};
        window.lazySizesConfig.loadMode = 2;
        lazySizesConfig.preloadAfterLoad = true;

        var lazyContainer = $(".lazy-container");

        if (lazyContainer.children(".lazyloaded")) {
            lazyContainer.addClass("lazy-active")
        } else {
            lazyContainer.removeClass("lazy-active")
        }
    }

    $(document).ready(function () {
        lazyLoad();
    })




    /*============================================
        product Slider
    ============================================*/
    $(".product-slider").each(function () {
        var web_slider = $(this);
        var id = web_slider.attr("id");
        var sliderId = "#" + id;

        var swiper = new Swiper(sliderId, {
            spaceBetween: web_slider.data("slidespace"),
            speed: 1000,
            rtl: $('html').attr('dir') === 'rtl',
            pagination: {
                el: sliderId + "-pagination",
                clickable: true,
            },

            navigation: {
                nextEl: sliderId + "-next",
                prevEl: sliderId + "-prev",
            },

            breakpoints: {
                0: {
                    slidesPerView: web_slider.data("xsmview"),
                },
                420: {
                    slidesPerView: web_slider.data("smview"),
                },
                768: {
                    slidesPerView: web_slider.data("mdview"),
                },
                992: {
                    slidesPerView: web_slider.data("lgview"),
                },
                1199: {
                    slidesPerView: web_slider.data("xlview"),
                }
            },
        });
    });


    /*------------------------------
    Product Slider (Slick)
    ----------------------------------*/
    $(".product-slider-slick").each(function () {
        var web_slider = $(this);
        var id = web_slider.attr("id");
        var sliderId = "#" + id;

        // Get data attributes
        var slideSpace = web_slider.data("slidespace") || 0;
        var xsmView = web_slider.data("xsmview") || 1;
        var smView = web_slider.data("smview") || 1;
        var mdView = web_slider.data("mdview") || 2;
        var lgView = web_slider.data("lgview") || 3;
        var xlView = web_slider.data("xlview") || 4;
        var slidesToScroll = web_slider.data("slidestoscroll") || 1;

        // Initialize Slick
        web_slider.slick({
            infinite: true,
            speed: 1000,
            slidesToShow: xlView,
            slidesToScroll: slidesToScroll,
            arrows: true,
            dots: true,
            nextArrow: $(sliderId + "-next"),
            prevArrow: $(sliderId + "-prev"),
            cssEase: "ease",
            rtl: $('html').attr('dir') === 'rtl',
            responsive: [
                {
                    breakpoint: 1200,
                    settings: {
                        slidesToShow: lgView,
                        slidesToScroll: slidesToScroll,
                    },
                },
                {
                    breakpoint: 992,
                    settings: {
                        slidesToShow: mdView,
                        slidesToScroll: slidesToScroll,
                    },
                },
                {
                    breakpoint: 768,
                    settings: {
                        slidesToShow: smView,
                        slidesToScroll: slidesToScroll,
                    },
                },
                {
                    breakpoint: 420,
                    settings: {
                        slidesToShow: xsmView,
                        slidesToScroll: slidesToScroll,
                    },
                },
            ],
        });
    });




    $(document).ready(function () {
        $(function () {
            // single updater function
            function updateCountdowns() {
                $('.product-countdown-2').each(function () {
                    try {
                        const $container = $(this);
                        const itemId = $container.data('item_id');

                        // parse start and end; require Blade change to include offset (see above)
                        const startDateRaw = $container.data('start_date');
                        const endDateRaw = $container.data('end_date');

                        const startDate = startDateRaw ? new Date(startDateRaw) : null;
                        const endDate = endDateRaw ? new Date(endDateRaw) : null;

                        const now = new Date();

                        // If either date is invalid, bail
                        if (!endDate || isNaN(endDate.getTime())) {
                            // optionally show an error state
                            $container.find('.count').hide();
                            if (!$container.find('.invalid-label').length) {
                                $container.append('<div class="invalid-label">Invalid date</div>');
                            }
                            return;
                        } else {
                            $container.find('.invalid-label').remove();
                        }

                        // Determine state: not started / running / expired
                        let secondsLeft;
                        let state;
                        if (startDate && now < startDate) {
                            secondsLeft = Math.floor((startDate.getTime() - now.getTime()) / 1000);
                            state = 'starts';
                        } else if (now >= endDate) {
                            secondsLeft = 0;
                            state = 'expired';
                        } else {
                            secondsLeft = Math.floor((endDate.getTime() - now.getTime()) / 1000);
                            state = 'running';
                        }

                        // expired state
                        if (state === 'expired') {
                            $container.find('.count').hide();
                            $container.find('.status-label').remove();
                            $container.append('<div class="status-label expired-label">Expired</div>');
                            return;
                        } else {
                            // remove expired label if present
                            $container.find('.expired-label').remove();
                            $container.find('.count').show();
                        }

                        // compute days, hours, minutes, seconds
                        const days = Math.floor(secondsLeft / 86400);
                        const hours = Math.floor((secondsLeft % 86400) / 3600);
                        const minutes = Math.floor((secondsLeft % 3600) / 60);
                        const seconds = Math.floor(secondsLeft % 60);

                        // pad hours, minutes, seconds to 2 digits
                        const pad = (n) => (n < 10 ? '0' + n : '' + n);

                        // update only inside this container (use .count-value elements)
                        $container.find('.days .count-value').text(days);
                        $container.find('.hours .count-value').text(pad(hours));
                        $container.find('.minutes .count-value').text(pad(minutes));
                        $container.find('.seconds .count-value').text(pad(seconds));

                        // show "Starts in" label when not yet running
                        $container.find('.status-label').remove();
                        if (state === 'starts') {
                            $container.append('<div class="status-label starts-label">Starts in</div>');
                        }

                    } catch (err) {
                        console.error('Countdown error for item', $(this).data('item_id'), err);
                    }
                });
            }

            // initial update, then every second
            updateCountdowns();
            setInterval(updateCountdowns, 1000);
        });

    });


})(jQuery);


