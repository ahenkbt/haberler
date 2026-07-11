<!--====== Favicon Icon ======-->
<link rel="shortcut icon" href="{{ !empty($userBs->favicon) ? asset('assets/front/img/user/' . $userBs->favicon) : '' }}"
  type="img/png" />
<!--====== Animate Css ======-->
<link rel="stylesheet" href="{{ asset('assets/front/user/css/animate.min.css') }}">
<!--====== Bootstrap css ======-->
<link rel="stylesheet" href="{{ asset('assets/front/user/css/bootstrap.min.css') }}" />
<!--====== Fontawesome css ======-->
<link rel="stylesheet" href="{{ asset('assets/front/user/css/font-awesome.min.css') }}" />
<!--====== Flaticon css ======-->
<link rel="stylesheet" href="{{ asset('assets/front/user/css/flaticon.css') }}" />
<!--====== Magnific Popup css ======-->
<link rel="stylesheet" href="{{ asset('assets/front/user/css/magnific-popup.css') }}" />
<!--====== Slick  css ======-->
<link rel="stylesheet" href="{{ asset('assets/front/user/css/slick.css') }}" />
<!--====== Toastr CSS ======-->
<link rel="stylesheet" href="{{ asset('assets/front/css/toastr.min.css') }}" />
<link rel="stylesheet" href="{{ asset('assets/front/user/css/owl.carousel.min.css') }}" />
<!--====== Whatsapp  css ======-->
<link rel="stylesheet" href="{{ asset('assets/front/user/css/whatsapp.min.css') }}" />
<!--====== Video  css ======-->
<link rel="stylesheet" href="{{ asset('assets/front/css/video.min.css') }}" />
<!--====== Jquery ui ======-->
<link rel="stylesheet" href="{{ asset('assets/front/user/css/jquery-ui.min.css') }}" />
<link rel="stylesheet" href="{{ asset('assets/admin/css/jquery.timepicker.min.css') }}">
<link rel="stylesheet" href="{{ asset('assets/front/css/cookie-alert.css') }}">
<link rel="stylesheet" href="{{ asset('assets/front/user/css/datatables.min.css') }}" />
<link rel="stylesheet" href="{{ asset('assets/front/user/css/dataTables.bootstrap4.css') }}" />
<link rel="stylesheet" href="{{ asset('assets/front/user/css/theme10/nice-select.css') }}" />
<!--====== Base color ======-->
@php
  if (!empty($userBs->base_color)) {
      $baseColor = $userBs->base_color;
  } else {
      $baseColor = 'ff5f00';
  }

  if (!empty($userBs->secondary_color)) {
      $hoverColor = $userBs->secondary_color;
  } else {
      $hoverColor = '302a27';
  }
  if ($userBs->theme == 'home_ten') {
      $footer_color = $userFooterData->footer_color ?? 'A1159C';
  } else {
      $footer_color = 'ff5f00';
  }
  $base_rgb = hex2rgb('#' . $baseColor);

@endphp
{{-- version 4,5,6 --}}
<link rel="stylesheet" href="{{ asset('assets/front/user/css/course.css') }}" />
<link rel="stylesheet" href="{{ asset('assets/front/user/css/common.css') }}" />
@if ($userBs->theme === 'home_four')
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/default.css') }}" />
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme45.css') }}" />
    <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme4-5/custom-dev.css') }}" />

  @if ($userCurrentLang->rtl == 1)
    <!--====== RTL-Commonn Css ======-->
    <link rel="stylesheet" href="{{ asset('assets/front/user/css/common-rtl.css') }}" />
    <!--====== RTL-Main Css ======-->
    <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme4-5/rtl-style.css') }}" />
    <!--====== RTL-Responsive CSS ======-->
    <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme4-5/rtl-responsive.css') }}" />
  @endif
@elseif ($userBs->theme === 'home_five')
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/default.css') }}" />
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme45.css') }}" />

  @if ($userCurrentLang->rtl == 1)
    <!--====== RTL-Commonn Css ======-->
    <link rel="stylesheet" href="{{ asset('assets/front/user/css/common-rtl.css') }}" />
    <!--====== RTL-Main Css ======-->
    <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme4-5/rtl-style.css') }}" />
    <!--====== RTL-Responsive CSS ======-->
    <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme4-5/rtl-responsive.css') }}" />
  @endif
  {{-- <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme4-5/base-color.php?color=' . $baseColor) }}"> --}}
@elseif($userBs->theme === 'home_six')
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/default.css') }}" />
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme6.css') }}" />
  @if ($userCurrentLang->rtl == 1)
    <!--====== RTL-Commonn Css ======-->
    <link rel="stylesheet" href="{{ asset('assets/front/user/css/common-rtl.css') }}" />
    <!--====== RTL-Main Css ======-->
    <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme6/rtl-style.css') }}" />
    <!--====== RTL-Responsive CSS ======-->
    <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme6/rtl-responsive.css') }}" />
  @endif
  {{-- <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme6/base-color.php?color=' . $baseColor) }}"> --}}
@elseif($userBs->theme === 'home_seven')
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/default.css') }}" />
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme7.css') }}" />
  @if ($userCurrentLang->rtl == 1)
    <!--====== RTL-Commonn Css ======-->
    <link rel="stylesheet" href="{{ asset('assets/front/user/css/common-rtl.css') }}" />
    <!--====== RTL-Main Css ======-->
    <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme7/rtl-style.css') }}" />
    <!--====== RTL-Responsive CSS ======-->
    <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme7/rtl-responsive.css') }}" />
  @endif
  {{-- <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme7/base-color.php?color=' . $baseColor) }}"> --}}
@elseif($userBs->theme === 'home_eight')
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/default.css') }}" />
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme8/home_eight.css') }}" />
  @if ($userCurrentLang->rtl == 1)
    <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme8/rtl-style.css') }}" />
    <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme8/rtl-responsive.css') }}" />
  @endif
@elseif($userBs->theme === 'home_nine')
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme9/plugins.min.css') }}" />
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme9/default.css') }}" />
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme9/main.css') }}" />
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme9/responsive.css') }}" />
  @if ($userCurrentLang->rtl == 1)
    <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme9/rtl.css') }}" />
    <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme9/rtl-responsive.css') }}" />
  @endif
  {{-- <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme8/base-color.php?color=' . $baseColor) }}"> --}}
@elseif($userBs->theme === 'home_ten')
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme10/default.css') }}" />
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme10/style.css') }}" />
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme10/responsive.css') }}" />
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme10/megamenu.css') }}" />
  @if ($userCurrentLang->rtl == 1)
    <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme10/rtl-style.css') }}" />
    <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme10/rtl-responsive.css') }}" />
  @endif
@elseif($userBs->theme === 'home_eleven')
  <link rel="stylesheet" href="{{ asset('assets/front/user/fonts/themify-icon/themify-icons.css') }}" />
  <link rel="stylesheet" href="{{ asset('assets/front/user/fonts/flaticon/flaticon.css') }}" />
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme11/owl.carousel.min.css') }}" />
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme11/meanmenu.css') }}" />
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme11/default.css') }}" />
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme11/style.css') }}" />
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme11/responsive.css') }}" />
  @if ($userCurrentLang->rtl == 1)
    <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme11/rtl.css') }}" />
  @endif
@elseif($userBs->theme === 'home_twelve')
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme12/plugin.min.css') }}" />
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme12/default.css') }}" />
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme12/style.css') }}" />
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme12/responsive.css') }}" />
  @if ($userCurrentLang->rtl == 1)
    <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme12/rtl.css') }}" />
  @endif
@elseif($userBs->theme === 'home_thirteen')
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme13/plugin.min.css') }}" />
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme13/default.css') }}" />
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme13/style.css') }}" />
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme13/responsive.css') }}" />
  @if ($userCurrentLang->rtl == 1)
    <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme13/rtl.css') }}" />
  @endif
@elseif($userBs->theme === 'home_fourteen')
  <!-- Font Awesome CSS -->
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme14/vendor/all.min.css') }}" />
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme14/vendor/fontawesome.min.css') }}" />

  <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme14/plugin.min.css') }}" />
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme14/vendor/select2.min.css') }}" />
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme14/vendor/aos.min.css') }}" />
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme14/vendor/nice-select.css') }}" />
  <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme14/vendor/swiper-bundle.min.css') }}" />

  <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme14/style.css') }}" />
  {{-- <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme14/responsive.css') }}" /> --}}
  @if ($userCurrentLang->rtl == 1)
    <link rel="stylesheet" href="{{ asset('assets/front/user/css/theme14/rtl.css') }}" />
  @endif
@else
  <link rel="stylesheet" href=" {{ asset('assets/front/user/css/style.css') }}" />
  @if ($userCurrentLang->rtl == 1)
    <link rel="stylesheet" href=" {{ asset('assets/front/user/css/rtl-style.css') }}" />
    <link rel="stylesheet" href=" {{ asset('assets/front/user/css/rtl-responsive.css') }}" />
  @endif
@endif

@if (request()->routeIs('customer.my_course.curriculum'))
  <link rel="stylesheet" href="{{ asset('assets/tenant/css/monokai-sublime.css') }}">
  <link rel="stylesheet" href=" {{ asset('assets/front/user/css/course-curriculum.css') }}" />
@endif

<style>
  :root {
    --main-color: <?php echo htmlspecialchars('#' . $baseColor); ?>;
    --hover-color: <?php echo htmlspecialchars('#' . $hoverColor); ?>;

    --footer-color: <?php echo htmlspecialchars('#' . $footer_color); ?>;
    --main-color-shade: <?php echo htmlspecialchars('#' . $baseColor . 'E6'); ?>;
    --main-color-rgb: rgb(<?php echo $base_rgb['red'] . ',' . $base_rgb['green'] . ',' . $base_rgb['blue']; ?>);
  }
</style>

<!--====== Style css ======-->
{{-- <link rel="stylesheet" href="{{ asset('assets/front/user/css/common-base-color.php?color=' . $baseColor) }}"> --}}

@if ($userBs->tawkto_status == 1)
  <style>
    div#WAButton {
      bottom: 130px;
    }
  </style>
@endif

@yield('styles')
@if ($userCurrentLang->rtl == 1)
  <link rel="stylesheet" href=" {{ asset('assets/front/user/css/rtl-common.css') }}" />
@endif
<style>
  {!! $userBs->custom_css !!}
</style>
