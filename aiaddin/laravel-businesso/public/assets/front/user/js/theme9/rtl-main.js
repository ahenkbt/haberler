'use strict';

$(function () {
    // Sticky Menu
    $(window).on('scroll', function (event) {
        var scroll = $(window).scrollTop();
        if (scroll < 250) {
            $('.header-menu-area').removeClass('sticky');
        } else {
            $('.header-menu-area').addClass('sticky');
        }
    });
    // Mobile Menu
    $('header .main-menu').meanmenu({
        meanMenuContainer: '.mobilemenu',
        meanScreenWidth: '991',
        meanRevealPosition: 'none',
        meanMenuOpen: '<i class="far fa-bars"/>',
        meanMenuClose: '<i class="far fa-times"/>',
        meanMenuCloseSize: '25px'
    });
    // Counter UP InIt
    $('.counter-number').counterUp({
        delay: 100,
        time: 3000
    });
    // Latest Room Slider
    var roomArrow = $('.room-arrows');
    var $status = $('.page-Info');
    var roomSlider = $('#roomSliderActive');
    roomSlider.on('init reInit afterChange', function (event, slick, currentSlide, nextSlide) {
        if (!slick.$dots) {
            return;
        }
        var i = (currentSlide ? currentSlide : 0) + 1;
        var statusText = i > 10 ? i : '0' + i;
        $status.html(
            '<span class="big-num">' +
            statusText +
            '<span class="small">' +
            slick.$dots[0].children.length +
            '</span>' +
            '</span> '
        );
    });
    roomSlider.slick({
        dots: true,
        infinite: true,
        autoplay: false,
        autoplaySpeed: 3000,
        arrows: true,
        slidesToShow: 3,
        slidesToScroll: 1,
        rtl: true,
        appendArrows: roomArrow,
        prevArrow: '<span class="prev"><i class="fal fa-angle-left"></i></span>',
        nextArrow: '<span class="next"><i class="fal fa-angle-right"></i></span>',
        responsive: [{
            breakpoint: 1600,
            settings: {
                slidesToShow: 2
            }
        },
        {
            breakpoint: 700,
            settings: {
                slidesToShow: 1
            }
        }
        ]
    });
    // Feedback Slider One
    $('#feedbackSlideActive').slick({
        dots: true,
        infinite: true,
        autoplay: true,
        autoplaySpeed: 3000,
        arrows: true,
        speed: 1500,
        slidesToShow: 2,
        slidesToScroll: 2,
        rtl: true,
        prevArrow: '<span class="prev"><i class="fal fa-angle-double-left"></i></span>',
        nextArrow: '<span class="next"><i class="fal fa-angle-double-right"></i></span>',
        responsive: [{
            breakpoint: 1599,
            settings: {
                arrows: false
            }
        },
        {
            breakpoint: 991,
            settings: {
                slidesToShow: 1,
                arrows: false
            }
        },
        {
            breakpoint: 767,
            settings: {
                slidesToShow: 1,
                arrows: false
            }
        }
        ]
    });
    // Brand Slider Active
    $('#brandsSlideActive').slick({
        dots: false,
        infinite: true,
        autoplay: true,
        autoplaySpeed: 3000,
        arrows: false,
        speed: 1500,
        slidesToShow: 6,
        slidesToScroll: 1,
        rtl: true,
        responsive: [{
            breakpoint: 1201,
            settings: {
                slidesToShow: 6
            }
        },
        {
            breakpoint: 992,
            settings: {
                slidesToShow: 4
            }
        },
        {
            breakpoint: 768,
            settings: {
                slidesToShow: 3
            }
        },
        {
            breakpoint: 576,
            settings: {
                slidesToShow: 2
            }
        }
        ]
    });
    // Wow JS And Nice-Select Initialize
    $('select.nice-select').niceSelect();
    new WOW().init();
    $('.video-popup').magnificPopup({
        type: 'iframe'
    });
    // Package Details Slider Image Popup
    $('.gallery-single').magnificPopup({
        type: 'image',
        gallery: {
            enabled: true
        }
    });
    // Show or Hide The 'Back To Top' Button
    $(window).on('scroll', function () {
        if ($(this).scrollTop() > 600) {
            $('.back-to-top').fadeIn(700);
        } else {
            $('.back-to-top').fadeOut(700);
        }
    });
    // Animate The 'Back To Top'
    $('.back-to-top').on('click', function (event) {
        event.preventDefault();
        $('html, body').animate({
            scrollTop: 0
        }, 1500);
    });
    // Room Details Slider
    $('.main-slider').slick({
        dots: false,
        infinite: false,
        autoplay: false,
        autoplaySpeed: 3000,
        arrows: true,
        slidesToShow: 1,
        slidesToScroll: 1,
        rtl: true,
        asNavFor: '.dots-slider',
        prevArrow: '<span class="prev"><i class="fal fa-angle-double-left"></i></span>',
        nextArrow: '<span class="next"><i class="fal fa-angle-double-right"></i></span>'
    });
    $('.dots-slider').slick({
        infinite: false,
        autoplay: false,
        autoplaySpeed: 3000,
        arrows: false,
        slidesToShow: 6,
        slidesToScroll: 1,
        asNavFor: '.main-slider',
        dots: false,
        focusOnSelect: true,
        rtl: true,
        responsive: [{
            breakpoint: 576,
            settings: {
                slidesToShow: 3
            }
        }]
    });
    // Room Details Slider Image Popup
    $('.main-slider').each(function () {
        // the containers for all your galleries
        var additionalImages = $('.single-img a.main-img').not(
            '.slick-slide.slick-cloned a.main-img'
        );
        additionalImages.magnificPopup({
            type: 'image',
            gallery: {
                enabled: true
            },
            mainClass: 'mfp-fade'
        });
    });
    // Slider One
    function sliderOne() {
        var slider = $('#heroSlideActive');
        slider.on('init', function (e, slick) {
            var $firstAnimatingElements = $(
                '.single-hero-slide:first-child'
            ).find('[data-animation]');
            doAnimations($firstAnimatingElements);
        });
        slider.on('beforeChange', function (e, slick, currentSlide, nextSlide) {
            var $animatingElements = $('.single-hero-slide[data-slick-index="' + nextSlide + '"]').find('[data-animation]');
            doAnimations($animatingElements);
        });
        slider.slick({
            autoplay: true,
            autoplaySpeed: 4000,
            dots: false,
            fade: true,
            arrows: true,
            infinite: true,
            speed: 1500,
            rtl: true,
            prevArrow: '<span class="prev"><i class="fal fa-angle-double-left"></i></span>',
            nextArrow: '<span class="next"><i class="fal fa-angle-double-right"></i></span>',
            responsive: [{
                breakpoint: 768,
                settings: {
                    arrows: false
                }
            }]
        });

        function doAnimations(elements) {
            var animationEndEvents =
                'webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend';
            elements.each(function () {
                var $this = $(this);
                var $animationDelay = $this.data('delay');
                var $animationType = 'animated ' + $this.data('animation');
                $this.css({
                    'animation-delay': $animationDelay,
                    '-webkit-animation-delay': $animationDelay
                });
                $this
                    .addClass($animationType)
                    .one(animationEndEvents, function () {
                        $this.removeClass($animationType);
                    });
            });
        }
    }
    sliderOne();
    $(".more-ammenities a").on('click', function (e) {
        e.preventDefault();
        $(".checkboxes .show-more").removeClass('d-none');
        $(".checkboxes .show-more").addClass('d-block');
        $(this).hide();
    });
    // lazyload init
    new LazyLoad();

    // initialize date range picker
    $('#date-range').daterangepicker({
        opens: 'left',
        autoUpdateInput: false,
        locale: {
            format: 'YYYY-MM-DD'
        }
    });
    // show the dates in input field when user select a date range
    $('#date-range').on('apply.daterangepicker', function (event, picker) {
        $(this).val(picker.startDate.format('YYYY-MM-DD') + ' - ' + picker.endDate.format('YYYY-MM-DD'));
    });
    // remove the dates when user click on cancel button
    $('#date-range').on('cancel.daterangepicker', function (event, picker) {
        $(this).val('');
    });

    var currency_info = {
        "base_currency_symbol": "$",
        "base_currency_symbol_position": "left",
        "base_currency_text": "USD",
        "base_currency_text_position": "left",
        "base_currency_rate": "1.00"
    };
    var minprice = 20.00;
    var maxprice = 120.00;
    var priceValues = [20.00, 120.00];
    var position = currency_info.base_currency_symbol_position;
    var symbol = currency_info.base_currency_symbol;
    // price range slider
    $('#price-range-slider').slider({
        range: true,
        min: minprice,
        max: maxprice,
        values: priceValues,
        slide: function (event, ui) {
            //while the slider moves, then this function will show that range value
            $('#amount').val((position == 'left' ? symbol : '') + ui.values[0] + (position == 'right' ? symbol : '') + ' - ' + (position == 'left' ? symbol : '') + ui.values[1] + (position == 'right' ? symbol : ''));
        }
    });
    // initially this is showing the price range value
    $('#amount').val((position == 'left' ? symbol : '') + $('#price-range-slider').slider('values', 0) + (position == 'right' ? symbol : '') + ' - ' + (position == 'left' ? symbol : '') + $('#price-range-slider').slider('values', 1) + (position == 'right' ? symbol : ''));
});
// Preloader
$(window).on('load', function (event) {
    $('#preLoader').fadeOut(500);
});
