<script>
  "use strict";
  var mainurl = "{{ route('front.user.detail.view', getParam()) }}";
  var textPosition = "{{ $userBs->base_currency_text_position }}";
  var currSymbol = "{{ $userBs->base_currency_symbol }}";
  var position = "{{ $userBs->base_currency_symbol_position }}";
</script>
<!--====== jquery js ======-->
<script src="{{ asset('assets/front/user/js/vendor/modernizr-3.6.0.min.js') }}"></script>
<script src="{{ asset('assets/front/user/js/vendor/jquery-3.4.1.min.js') }}"></script>
<!--====== Bootstrap js ======-->
<script src="{{ asset('assets/front/user/js/bootstrap.min.js') }}"></script>
<script src="{{ asset('assets/front/user/js/popper.min.js') }}"></script>
<!--====== Slick js ======-->
<script src="{{ asset('assets/front/user/js/slick.min.js') }}"></script>
<!--====== Isotope js ======-->
<script src="{{ asset('assets/front/user/js/isotope.pkgd.min.js') }}"></script>
<!--====== Magnific Popup js ======-->
<script src="{{ asset('assets/front/user/js/jquery.magnific-popup.min.js') }}"></script>
<!--====== inview js ======-->
<script src="{{ asset('assets/front/user/js/jquery.inview.min.js') }}"></script>
<!--====== counterup js ======-->
<script src="{{ asset('assets/front/user/js/jquery.countTo.js') }}"></script>
<!--====== easy PieChart js ======-->
<script src="{{ asset('assets/front/user/js/jquery.easypiechart.min.js') }}"></script>
<!--====== Jquery Ui ======-->
<script src="{{ asset('assets/front/user/js/jquery-ui.min.js') }}"></script>

<!-- jQuery Timepicker -->
<script src="{{ asset('assets/front/js/jquery.timepicker.min.js') }}"></script>
<!--====== Wow JS ======-->
<script src="{{ asset('assets/front/user/js/wow.min.js') }}"></script>
<!--====== Lazy JS ======-->
<script src="{{ asset('assets/front/user/js/lazyload.min.js') }}"></script>
<!--====== Toastr JS ======-->
<script src="{{ asset('assets/front/js/toastr.min.js') }}"></script>
<script src="{{ asset('assets/front/user/js/owl.carousel.min.js') }}"></script>
<script src="{{ asset('assets/front/user/js/circle-progress.min.js') }}"></script>
<script src="{{ asset('assets/front/user/js/jquery.counterup.min.js') }}"></script>
<script src="{{ asset('assets/front/user/js/waypoints.min.js') }}"></script>
<!--====== Cart js ======-->
<script src="{{ asset('assets/front/user/js/cart.js') }}"></script>
{{-- whatsapp js --}}
<script src="{{ asset('assets/front/user/js/whatsapp.min.js') }}"></script>
<!-- datatables js -->
<script src="{{ asset('assets/front/user/js/datatables.min.js') }}"></script>
<script src="{{ asset('assets/front/user/js/dataTables.bootstrap4.js') }}"></script>
<script src="{{ asset('assets/front/user/js/theme10/jquery.nice-select.min.js') }}"></script>
<script src="{{ asset('assets/front/js/video.min.js') }}"></script>


{{-- whatsapp init code --}}
<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/2.3.6/purify.min.js"></script>

@php
  if (!empty($userBs->base_color)) {
      $baseColor = $userBs->base_color;
  } else {
      $baseColor = '';
  }
@endphp

<script>
  "use strict";
  var theme = '{{ $userBs->theme }}';
  var rtl = {{ $userCurrentLang->rtl }};
  var basecolor = '<?= '#' . $baseColor ?>';
</script>
{{-- version 4,5,6 --}}
<script src="{{ asset('assets/front/user/js/imagesloaded.pkgd.min.js') }}"></script>
@if ($userBs->theme === 'home_four' || $userBs->theme === 'home_five')
  <!--====== Main js ======-->
  <script src="{{ asset('assets/front/user/js/theme4-5.js') }}"></script>
@elseif ($userBs->theme === 'home_six')
  <!--====== Main js ======-->
  <script src="{{ asset('assets/front/user/js/theme6.js') }}"></script>
@elseif ($userBs->theme === 'home_seven')
  <script>
    var dropdownIcon = "{{ asset('assets/front/img/theme7/arrow-down.svg') }}";
  </script>
  <script src="{{ asset('assets/front/user/js/theme7.js') }}"></script>
@elseif ($userBs->theme === 'home_eight')
  <script src="{{ asset('assets/front/user/js/theme8/jquery.syotimer.min.js') }}"></script>
  <script src="{{ asset('assets/front/user/js/theme8/main.js') }}"></script>
@elseif ($userBs->theme === 'home_nine')
  <script src="{{ asset('assets/front/user/js/theme9/plugins.min.js') }}"></script>
  <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyDC3Ip9iVC0nIxC6V14CKLQ1HZNF_65qEQ "></script>
  <script src="{{ asset('assets/front/user/js/theme9/main.js') }}"></script>
@elseif ($userBs->theme === 'home_ten')
  @if ($userCurrentLang->rtl == 1)
    <script src="{{ asset('assets/front/user/js/theme10/rtl-main.js') }}"></script>
  @else
    <script src="{{ asset('assets/front/user/js/theme10/main.js') }}"></script>
  @endif
@elseif ($userBs->theme === 'home_eleven')
  <script src="{{ asset('assets/front/user/js/theme11/imagesloaded.pkgd.min.js') }}"></script>
  <script src="{{ asset('assets/front/user/js/theme11/jquery.meanmenu.min.js') }}"></script>
  @if ($userCurrentLang->rtl == 1)
    <script src="{{ asset('assets/front/user/js/theme11/main-rtl.js') }}"></script>
  @else
    <script src="{{ asset('assets/front/user/js/theme11/main.js') }}"></script>
  @endif
@elseif ($userBs->theme === 'home_twelve')
  <script src="{{ asset('assets/front/user/js/theme12/plugin.min.js') }}"></script>
  @if ($userCurrentLang->rtl == 1)
    <script src="{{ asset('assets/front/user/js/theme12/rtl-main.js') }}"></script>
  @else
    <script src="{{ asset('assets/front/user/js/theme12/main.js') }}"></script>
  @endif
@elseif ($userBs->theme === 'home_thirteen')
  <script src="{{ asset('assets/front/user/js/isotope.pkgd.min.js') }}"></script>
  <script src="{{ asset('assets/front/user/js/theme13/misc.js') }}"></script>
  @if ($userCurrentLang->rtl == 1)
    <script src="{{ asset('assets/front/user/js/theme13/rtl-main.js') }}"></script>
  @else
    <script src="{{ asset('assets/front/user/js/theme13/main.js') }}"></script>
  @endif
@elseif ($userBs->theme === 'home_fourteen')
  <script src="https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.min.js"></script>
  <script src="{{ asset('assets/front/user/js/isotope.pkgd.min.js') }}"></script>

  <script src="{{ asset('assets/front/user/js/theme14/vendor/bootstrap.bundle.min.js') }}"></script>
  <script src="{{ asset('assets/front/user/js/theme14/vendor/select2.min.js') }}"></script>
  <script src="{{ asset('assets/front/user/js/theme14/vendor/aos.min.js') }}"></script>
  <script src="{{ asset('assets/front/user/js/theme14/vendor/jquery.nice-select.min.js') }}"></script>
  <script src="{{ asset('assets/front/user/js/theme14/vendor/lazy.image.js') }}"></script>
  <script src="{{ asset('assets/front/user/js/theme14/vendor/lazysizes.min.js') }}"></script>
  <script src="{{ asset('assets/front/user/js/theme14/vendor/mouse-hover-move.js') }}"></script>
  <script src="{{ asset('assets/front/user/js/theme14/vendor/swiper-bundle.min.js') }}"></script>


  {{-- <script src="{{ asset('assets/front/user/js/theme14/plugin.min.js') }}"></script> --}}
  <script src="{{ asset('assets/front/user/js/theme14/header-menu.js') }}"></script>
  <script src="{{ asset('assets/front/user/js/theme14/main.js') }}"></script>
@endif
<!--====== Main js ======-->
<script src="{{ asset('assets/front/user/js/main.js') }}"></script>
<!--====== Custom js ======-->
<script src="{{ asset('assets/front/user/js/custom.js') }}"></script>

@if ($userBs->theme === 'home_fourteen')
  <script>
    function changeUserLang(code) {
      document.getElementById('dynamic-lang-code').value = code;
      document.getElementById('userLangFormsDynamic').submit();
    }
  </script>
@endif


@yield('scripts')

@if (session()->has('success'))
  <script>
    "use strict";
    toastr['success']("{{ __(session('success')) }}");
  </script>
@endif

@if (session()->has('error'))
  <script>
    "use strict";
    toastr['error']("{{ __(session('error')) }}");
  </script>
@endif

@if (session()->has('warning'))
  <script>
    "use strict";
    toastr['warning']("{{ __(session('warning')) }}");
  </script>
@endif

@if (in_array('Plugins', $packagePermissions))

  @if ($userBs->analytics_status == 1)
    <!-- Global site tag (gtag.js) - Google Analytics -->
    <script async src="//www.googletagmanager.com/gtag/js?id={{ $userBs->measurement_id }}"></script>
    <script>
      "use strict";
      window.dataLayer = window.dataLayer || [];

      function gtag() {
        dataLayer.push(arguments);
      }
      gtag('js', new Date());

      gtag('config', '{{ $userBs->measurement_id }}');
    </script>
  @endif
  @if ($userBs->pixel_status == 1)
    <!-- Meta Pixel Code -->
    <script>
      ! function(f, b, e, v, n, t, s) {
        if (f.fbq) return;
        n = f.fbq = function() {
          n.callMethod ?
            n.callMethod.apply(n, arguments) : n.queue.push(arguments)
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = !0;
        n.version = '2.0';
        n.queue = [];
        t = b.createElement(e);
        t.async = !0;
        t.src = v;
        s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s)
      }(window, document, 'script',
        'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '{{ $userBs->pixel_id }}');
      fbq('track', 'PageView');
    </script>
    <noscript><img height="1" width="1" style="display:none"
        src="https://www.facebook.com/tr?id={{ $userBs->pixel_id }}&ev=PageView&noscript=1" /></noscript>
    <!-- End Meta Pixel Code -->
  @endif
  @if ($userBs->tawkto_status == 1)
    @php
      $directLink = str_replace('tawk.to', 'embed.tawk.to', $userBs->tawkto_direct_chat_link);
      $directLink = str_replace('chat/', '', $directLink);
    @endphp
    <!--Start of Tawk.to Script-->
    <script type="text/javascript">
      "use strict";
      let directLink = '{{ $directLink }}';
      var Tawk_API = Tawk_API || {},
        Tawk_LoadStart = new Date();
      (function() {
        var s1 = document.createElement("script"),
          s0 = document.getElementsByTagName("script")[0];
        s1.async = true;
        s1.src = directLink;
        s1.charset = 'UTF-8';
        s1.setAttribute('crossorigin', '*');
        s0.parentNode.insertBefore(s1, s0);
      })();
    </script>
    <!--End of Tawk.to Script-->
  @endif

  @if ($userBs->whatsapp_status == 1)
    <script type="text/javascript">
      var whatsapp_popup = {{ $userBs->whatsapp_popup_status }};
      var whatsappImg = "{{ asset('assets/front/img/user/whatsapp.svg') }}";
      $(function() {
        $('#WAButton').floatingWhatsApp({
          phone: "{{ $userBs->whatsapp_number }}", //WhatsApp Business phone number
          headerTitle: "{{ $userBs->whatsapp_header_title }}", //Popup Title
          popupMessage: `{!! nl2br($userBs->whatsapp_popup_message) !!}`, //Popup Message
          showPopup: whatsapp_popup == 1 ? true : false, //Enables popup display
          buttonImage: '<img src="' + whatsappImg + '" />', //Button Image
          position: "right"
        });
      });
    </script>
  @endif
@endif
