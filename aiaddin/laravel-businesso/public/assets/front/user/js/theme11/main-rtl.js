(function ($) {
    "use strict";
        /*---------------------------------
            Preloader JS
        -----------------------------------*/ 
        var prealoaderOption = $(window);
        prealoaderOption.on("load", function () {
            var preloader = jQuery('.spinner');
            var preloaderArea = jQuery('#preloader');
            preloader.fadeOut();
            preloaderArea.delay(350).fadeOut('slow');
        });
        /*---------------------- 
            Scroll top js
        ------------------------*/
        $(window).on('scroll', function() {
          if ($(this).scrollTop() > 100) {
              $('#scroll_up').fadeIn();
          } else {
              $('#scroll_up').fadeOut();
          }
        });
        $('#scroll_up').on('click', function() {
            $("html, body").animate({
                scrollTop: 0
            }, 800);
            return false;
        });
        /*---------------------------------  
            mobilemenu JS
        -----------------------------------*/
        $('.main-menu nav').meanmenu({
          meanMenuContainer: '.mobile_menu',
          meanScreenWidth: "991"
        });
        /*---------------------------------  
            Slick slider JS
        -----------------------------------*/
        $('.event-slider').slick({
            infinite: true,
            arrows: true,
            autoplay: true,
            dots: false,
            slidesToShow: 2,
            slidesToScroll: 1,
            rtl: true,
            responsive: [
                {
                  breakpoint: 1024,
                  settings: {
                    slidesToShow: 1,
                    slidesToScroll: 1,
                    infinite: true,
                    dots: true
                  }
                },
                {
                  breakpoint: 600,
                  settings: {
                    slidesToShow: 1,
                    slidesToScroll: 1
                  }
                },
                {
                  breakpoint: 480,
                  settings: {
                    slidesToShow: 1,
                    slidesToScroll: 1
                  }
                }
            ]
        });
        $('.testimonial-carousel').slick({
            infinite: true,
            arrows: true,
            autoplay: true,
            dots: false,
            slidesToShow: 1,
            slidesToScroll: 1,
            rtl: true,
        });
        $('.brand-slider-1').slick({
            infinite: true,
            arrows: false,
            autoplay: true,
            dots: false,
            slidesToShow: 4,
            slidesToScroll: 1,
            rtl: true,
            responsive: [
                {
                  breakpoint: 1024,
                  settings: {
                    slidesToShow: 3,
                    slidesToScroll: 3,
                    infinite: true,
                    dots: true
                  }
                },
                {
                  breakpoint: 600,
                  settings: {
                    slidesToShow: 2,
                    slidesToScroll: 2
                  }
                },
                {
                  breakpoint: 480,
                  settings: {
                    slidesToShow: 1,
                    slidesToScroll: 1
                  }
                }
            ]
        });
        /*----------------------
            Counter js
        ------------------------*/
        $('.counter').counterUp({
            delay: 50,
            time: 2000
        });
        /*---------------------------------  
            mmagnific pop-up js
        -----------------------------------*/
        $('.video-icon').magnificPopup({
            type: 'iframe'
        });
    
        /*---------------------------------  
            WOW js
        -----------------------------------*/
        new WOW().init();
    
    
    })(window.jQuery); 