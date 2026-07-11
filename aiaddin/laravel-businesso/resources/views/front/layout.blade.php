<!DOCTYPE html>
<html lang="en" @if ($rtl == 1) dir="rtl" @endif>
<head>
    <!--====== Required meta tags ======-->
    <meta charset="utf-8">
    <meta http-equiv="x-ua-compatible" content="ie=edge">
    <meta name="description" content="">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <meta name="description" content="@yield('meta-description')">
    <meta name="keywords" content="@yield('meta-keywords')">
    <meta name="csrf-token" content="{{ csrf_token() }}" />
    @yield('og-meta')
    <!--====== Title ======-->
    <title>{{ $bs->website_title }} @yield('pagename')</title>
    <!--====== Favicon Icon ======-->
    <link rel="shortcut icon" href="{{ asset('assets/front/img/' . $bs->favicon) }}" type="image/png">
    <link rel="stylesheet" href="{{ asset('assets/front/css/plugin.min.css') }}">
    {{-- <!--====== Bootstrap css ======-->
    <!--====== Default css ======-->
    <link rel="stylesheet" href="{{asset('assets/front/css/default.css')}}">
    <!--====== Style css ======-->
    <link rel="stylesheet" href="{{asset('assets/front/css/style.css')}}">
    <link rel="stylesheet" href="{{asset('assets/front/css/cookie-alert.css')}}">
    @if ($rtl == 1)
        <link rel="stylesheet" href="{{asset('assets/front/css/rtl-style.css')}}">
    @endif --}}
    <!-- base color change -->
    {{-- <link href="{{ asset('assets/front/css/style-base-color.php') . '?color=' . $bs->base_color }}" rel="stylesheet"> --}}
    <!-- Bootstrap CSS -->
    <link rel="stylesheet" href="{{ asset('assets/frontend/css/bootstrap.min.css') }}">
    <!-- Fontawesome Icon CSS -->
    <link rel="stylesheet" href="{{ asset('assets/frontend/fonts/fontawesome/css/all.min.css') }}">
        <!-- Swiper Slider -->
    <link rel="stylesheet" href="{{ asset('assets/frontend/css/swiper-bundle.min.css') }}">
    <!-- Kreativ Icon -->
    <link rel="stylesheet" href="{{ asset('assets/frontend/fonts/icomoon/style.css') }}">
    {{-- Toastr css  --}}
    <link rel="stylesheet" href="{{ asset('assets/frontend/css/toastr.min.css') }}">
    <!-- Magnific Popup CSS -->
    <link rel="stylesheet" href="{{ asset('assets/frontend/css/magnific-popup.min.css') }}">
    <!-- AOS Animation CSS -->
    <link rel="stylesheet" href="{{ asset('assets/frontend/css/aos.min.css') }}">
    <!-- Nice Select -->
    <link rel="stylesheet" href="{{ asset('assets/frontend/css/nice-select.css') }}">
    <!-- Main Style CSS -->
    <link rel="stylesheet" href="{{ asset('assets/frontend/css/style.css') }}">
    <!-- summernote Style CSS -->
    <link rel="stylesheet" href="{{ asset('assets/frontend/css/summernote-content.css') }}">
    <!-- Responsive CSS -->
    <link rel="stylesheet" href="{{ asset('assets/frontend/css/responsive.css') }}">
    @if ($rtl == 1)
        <link rel="stylesheet" href="{{ asset('assets/frontend/css/rtl.css') }}">
    @endif
    <!-- base color change -->
    {{-- <link href="{{ asset('assets/frontend/css/style-base-color.php') . '?color=' . $bs->base_color }}"
        rel="stylesheet"> --}}

    @yield('styles')

    @if ($bs->is_whatsapp == 0 && $bs->is_tawkto == 0)
        <style>
            .back-to-top {
                left: auto;
                right: 30px;
            }
        </style>
    @endif
    <style>
        {!! $be->custom_css !!}
    </style>
    @php
        $primaryRgbColor = hex2rgb($bs->base_color ?? '2563eb');
        if ($primaryRgbColor === false) {
            $primaryRgbColor = ['red' => 37, 'green' => 99, 'blue' => 235];
        }
    @endphp
    <style>
        :root {
            --color-primary: #{{ $bs->base_color }};
            --color-primary-shade: #{{ $bs->base_color2 }};
            --bg-light: #{{ $bs->base_color2 }}14;
            --color-primary-rgb: {{ $primaryRgbColor['red'] . ',' . $primaryRgbColor['green'] . ',' . $primaryRgbColor['blue'] }};

        }
    </style>


    @if(!is_null($bs->adsense_publisher_id))
    <!------google adsense----------->
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={{$bs->adsense_publisher_id}}" crossorigin="anonymous"></script>
    <!------google adsense----------->
    @endif
</head>

<body>

    @if ($bs->preloader_status == 1)
        <!--====== Start Preloader ======-->

        <div id="preLoader">
            <div class="loader">
                <img src="{{ asset('assets/front/img/' . $bs->preloader) }}" alt="Loader">
            </div>
        </div>

        <!--====== End Preloader ======-->
    @endif

    @if (!request()->routeIs('user.login'))
        @includeIf('front.partials.header')
    @endif

    @if (!request()->routeIs('front.index') && !request()->routeIs('user.login'))
        <div class="page-title-area bg-primary-light">
            <div class="container">
                <div class="content text-center">
                    <h2>@yield('breadcrumb-title')</h2>
                    <nav aria-label="breadcrumb">
                        <ol class="breadcrumb">
                            <li class="breadcrumb-item"><a href="{{ route('front.index') }}">{{ __('Home') }}</a>
                            </li>
                            <li class="breadcrumb-item active" aria-current="page">@yield('breadcrumb-link')</li>
                        </ol>
                    </nav>
                </div>
            </div>
            <!-- Bg Overlay -->
            <img class="lazyload bg-overlay-1" data-src="{{ asset('assets/frontend/images/shadow-1.png') }}"
                alt="Bg">
            <img class="lazyload bg-overlay-2" data-src="{{ asset('assets/frontend/images/shadow-2.png') }}"
                alt="Bg">

            <!-- Bg Shape -->
            <div class="shape">
                <img class="shape-1" src="{{ asset('assets/frontend/images/shape/shape-4.png') }}" alt="Shape">
                <img class="shape-2" src="{{ asset('assets/frontend/images/shape/shape-5.png') }}" alt="Shape">
                <img class="shape-3" src="{{ asset('assets/frontend/images/shape/shape-6.png') }}" alt="Shape">
                <img class="shape-4" src="{{ asset('assets/frontend/images/shape/shape-7.png') }}" alt="Shape">
                <img class="shape-5" src="{{ asset('assets/frontend/images/shape/shape-8.png') }}" alt="Shape">
                <img class="shape-6" src="{{ asset('assets/frontend/images/shape/shape-9.png') }}" alt="Shape">
            </div>
        </div>
        <!--====== End Breadcrumbs-section ======-->
    @endif

    @yield('content')

    {{-- footer section --}}
    @if (!request()->routeIs('user.login'))
        @includeIf('front.partials.footer')
    @endif
    <!-- Go to Top -->
    <div class="go-top"><i class="fal fa-angle-double-up"></i></div>
    <!-- Go to Top -->

    <!-- Magic Cursor -->
    <div class="cursor"></div>
    <!-- Magic Cursor -->

    @if ($be->cookie_alert_status == 1)
        <div class="cookie">
            @include('cookie-consent::index')
        </div>
    @endif

    {{-- Popups start --}}
    @includeIf('front.partials.popups')
    {{-- Popups end --}}

    {{-- WhatsApp Chat Button --}}
    <div id="WAButton"></div>

    {{-- <!--====== Jquery js ======-->
    <script src="{{ asset('assets/front/js/vendor/modernizr-3.6.0.min.js') }}"></script>
    <script src="{{ asset('assets/front/js/vendor/jquery-3.4.1.min.js') }}"></script>
    <!--====== Bootstrap js ======-->
    --}}

    <!-- Jquery JS -->
    <script src="{{ asset('assets/frontend/js/jquery.min.js') }}"></script>
    <script src="{{ asset('assets/front/js/plugin.min.js') }}"></script>
    <!-- Bootstrap JS -->
    <script src="{{ asset('assets/frontend/js/bootstrap.min.js') }}"></script>
    <!-- Nice Select JS -->
    <script src="{{ asset('assets/frontend/js/jquery.nice-select.min.js') }}"></script>
    <!-- Magnific Popup JS -->
    <script src="{{ asset('assets/frontend/js/jquery.magnific-popup.min.js') }}"></script>
    <!-- Swiper Slider JS -->
    <script src="{{ asset('assets/frontend/js/swiper-bundle.min.js') }}"></script>
 
    <!-- Lazysizes -->
    <script src="{{ asset('assets/frontend/js/lazysizes.min.js') }}"></script>
    <!-- SVG loader -->
    <script src="{{ asset('assets/frontend/js/svg-loader.min.js') }}"></script>
    <!-- AOS JS -->
    <script src="{{ asset('assets/frontend/js/aos.min.js') }}"></script>
    <script src="{{ asset('assets/frontend/js/toastr.min.js') }}"></script>


    <script>
        "use strict";
        var rtl = {{ $rtl }};
    </script>
    <!--====== Main js ======-->
    {{-- <script src="{{ asset('assets/front/js/main.js') }}"></script> --}}

    <!-- Main script JS -->
    <script src="{{ asset('assets/frontend/js/script.js') }}"></script>

    @yield('scripts')

    @yield('vuescripts')
    <script>
        {!! $be->custom_js !!}
    </script>

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
    <script>
        "use strict";

        function handleSelect(elm) {
            window.location.href = "{{ route('changeLanguage', '') }}" + "/" + elm.value;
        }
    </script>

    {{-- whatsapp init code --}}
    @if ($bs->is_whatsapp == 1)
        <script type="text/javascript">
            "use strict";
            var whatsapp_popup = {{ $bs->whatsapp_popup }};
            var whatsappImg = "{{ asset('assets/front/img/whatsapp.svg') }}";
            $(function() {
                $('#WAButton').floatingWhatsApp({
                    phone: "{{ $bs->whatsapp_number }}", //WhatsApp Business phone number
                    headerTitle: "{{ $bs->whatsapp_header_title }}", //Popup Title
                    popupMessage: `{!! !empty($bs->whatsapp_popup_message) ? nl2br($bs->whatsapp_popup_message) : '' !!}`, //Popup Message
                    showPopup: whatsapp_popup == 1 ? true : false, //Enables popup display
                    buttonImage: '<img src="' + whatsappImg + '" />', //Button Image
                    position: "right" //Position: left | right

                });
            });
        </script>
    @endif

    @if ($bs->is_tawkto == 1)
        @php
            $directLink = str_replace('tawk.to', 'embed.tawk.to', $bs->tawkto_property_id);
            $directLink = str_replace('chat/', '', $directLink);
        @endphp
        <!--Start of Tawk.to Script-->
        <script type="text/javascript">
            "use strict";
            var Tawk_API = Tawk_API || {},
                Tawk_LoadStart = new Date();
            (function() {
                var s1 = document.createElement("script"),
                    s0 = document.getElementsByTagName("script")[0];
                s1.async = true;
                s1.src = '{{ $directLink }}';
                s1.charset = 'UTF-8';
                s1.setAttribute('crossorigin', '*');
                s0.parentNode.insertBefore(s1, s0);
            })();
        </script>
        <!--End of Tawk.to Script-->
    @endif



    
</body>

</html>
