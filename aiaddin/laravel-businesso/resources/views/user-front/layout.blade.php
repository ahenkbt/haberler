<!DOCTYPE html>
<html lang="{{ $userCurrentLang->code }}" @if ($userCurrentLang->rtl == 1) dir="rtl" @endif>

<head>
  <!--====== Required meta tags ======-->
  <meta charset="utf-8" />
  <meta http-equiv="x-ua-compatible" content="ie=edge" />
  <meta name="description" content="" />
  <meta name="csrf-token" content="{{ csrf_token() }}" />
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
  <meta name="description" content="@yield('meta-description')">
  <meta name="keywords" content="@yield('meta-keywords')">

  @yield('og-meta')
  <!--====== Title ======-->
  <title> {{ convertUtf8($userBs->website_title) }} - @yield('tab-title') </title>
  @includeIf('user-front.partials.styles')
  @if ($userBs->whatsapp_status == 1)
    <style>
      .back-to-top {
        left: 10px;
      }
    </style>
  @endif

  @if (!is_null($userBs->adsense_publisher_id))
    <!------google adsense----------->
    <script async
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={{ $userBs->adsense_publisher_id }}"
      crossorigin="anonymous"></script>
    <!------google adsense----------->
  @endif
</head>

<body class="@if ($userBs->theme == 'home_five') dark-version @endif ">
  <!--[if lte IE 9]>
<p class="browserupgrade">You are using an <strong>outdated</strong> browser. Please <a href="https://browsehappy.com/">upgrade
    your browser</a> to improve your experience and security.</p>
<![endif]-->

  <!--====== Preloader ======-->
  <!-- LOADER -->
  @if (!empty($userBs->preloader))
    <div id="preloader">
      <div class="loader-cubes">
        <img src="{{ asset('assets/front/img/user/' . $userBs->preloader) }}" alt="" class="img-fluid">
      </div>
    </div>
  @endif
  <!-- END LOADER -->
  {{-- user-front.partials.header.header-.header- --}}
  @if ($userBs->theme === 'home_two')
    @includeIf('user-front.partials.header.header-2')
  @elseif($userBs->theme === 'home_three')
    @includeIf('user-front.partials.header.header-3')
  @elseif($userBs->theme === 'home_four')
    @includeIf('user-front.partials.header.header-4')
  @elseif($userBs->theme === 'home_five')
    @includeIf('user-front.partials.header.header-5')
  @elseif($userBs->theme === 'home_six')
    @includeIf('user-front.partials.header.header-6')
  @elseif($userBs->theme === 'home_seven')
    @includeIf('user-front.partials.header.header-7')
  @elseif($userBs->theme === 'home_eight')
    @includeIf('user-front.partials.header.header-8')
  @elseif($userBs->theme === 'home_nine')
    @includeIf('user-front.partials.header.header-9')
  @elseif($userBs->theme === 'home_ten')
    @includeIf('user-front.partials.header.header-10')
  @elseif($userBs->theme === 'home_eleven')
    @includeIf('user-front.partials.header.header-11')
  @elseif($userBs->theme === 'home_twelve')
    @includeIf('user-front.partials.header.header-12')
  @elseif($userBs->theme === 'home_thirteen')
    @includeIf('user-front.partials.header.header-13')
  @elseif($userBs->theme === 'home_fourteen')
    @includeIf('user-front.partials.header.header-14')
  @else
    @includeIf('user-front.partials.header.header-1')
  @endif
  @if (!request()->routeIs('front.user.detail.view') && !request()->routeIs('front.user.course.details'))
    @php
      $brBg = $userBs->breadcrumb ?? 'breadcrumb.jpg';
    @endphp
    <!--====== Breadcrumb part Start ======-->
    <section
      class="breadcrumb-section header-next bg-img-c lazy @if ($userBs->theme === 'home_fourteen') breadcrumb-14 @endif
    @if ($userBs->theme === 'home_three') breadcrumb-3 @endif"
      data-bg="{{ asset('assets/front/img/user/' . $brBg) }}">
      <div class="container">
        <div class="breadcrumb-text">
          <h4 class="page-title">@yield('page-name')</h4>
          <ul>
            <li>
              <a href="{{ route('front.user.detail.view', getParam()) }}">{{ $keywords['Home'] ?? 'Home' }}</a>
            </li>
            <li>@yield('br-name')</li>
          </ul>
        </div>
      </div>
      <div class="breadcrumb-shapes">
        <div class="one"></div>
        <div class="two"></div>
      </div>
    </section>
    <!--====== Breadcrumb part End ======-->
  @endif
  @yield('content')
  @if ($userBs->theme == 'home_two')
    @includeIf('user-front.partials.footer.footer-2')
  @elseif($userBs->theme == 'home_three')
    @includeIf('user-front.partials.footer.footer-3')
  @elseif($userBs->theme == 'home_four')
    @includeIf('user-front.partials.footer.footer-4')
  @elseif($userBs->theme == 'home_five')
    @includeIf('user-front.partials.footer.footer-5')
  @elseif($userBs->theme == 'home_six')
    @includeIf('user-front.partials.footer.footer-6')
  @elseif($userBs->theme == 'home_seven')
    @includeIf('user-front.partials.footer.footer-7')
  @elseif($userBs->theme == 'home_eight')
    @includeIf('user-front.partials.footer.footer-8')
  @elseif($userBs->theme == 'home_nine')
    @includeIf('user-front.partials.footer.footer-9')
  @elseif($userBs->theme == 'home_ten')
    @includeIf('user-front.partials.footer.footer-10')
  @elseif($userBs->theme == 'home_eleven')
    @includeIf('user-front.partials.footer.footer-11')
  @elseif($userBs->theme == 'home_twelve')
    @includeIf('user-front.partials.footer.footer-12')
  @elseif($userBs->theme == 'home_thirteen')
    @includeIf('user-front.partials.footer.footer-13')
  @elseif($userBs->theme == 'home_fourteen')
    @includeIf('user-front.partials.footer.footer-14')
  @else
    @includeIf('user-front.partials.footer.footer-1')
  @endif
  @php
    $userShop = App\Models\User\UserShopSetting::where('user_id', $user->id)->first();
    $permissions = \App\Http\Helpers\UserPermissionHelper::packagePermission($user->id);
    $permissions = json_decode($permissions, true);
  @endphp
  @if (!empty($permissions) && in_array('Ecommerce', $permissions))
    @if (!empty($userShop))
      @if ($userBs->theme != 'home_eight' && $userBs->theme != 'home_fourteen')
        @if ($userShop->is_shop == 1 && $userBs->catalog_mode == 0)
          <div id="cartIconWrapper">
            <a class="d-block" id="cartIcon" href="{{ route('front.user.cart', getParam()) }}">
              <div class="cart-length">
                <i class="fal fa-shopping-bag"></i>
                <span class="length">{{ cartLength() }}
                  {{ cartLength() > 1 ? $keywords['ITEMS'] ?? 'ITEMS' : $keywords['ITEM'] ?? 'ITEM' }}</span>
              </div>
              <div class="cart-total">
                {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                {{ cartTotal() }}
                {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
              </div>
            </a>
          </div>
        @endif
      @endif
    @endif
  @endif


  @if ($userBs->cookie_alert_status == 1)
    {{-- Cookie alert dialog start --}}
    <div class="cookie">
      @include('cookie-consent::index')
    </div>
    {{-- Cookie alert dialog end --}}
  @endif
  @if ($userBs->whatsapp_status == 1)
    {{-- WhatsApp Chat Button --}}
    <div id="WAButton"></div>
  @endif
  @includeIf('user-front.partials.scripts')
  {{-- Loader --}}
  <div class="request-loader">
    <img src="{{ asset('assets/front/img/loader.svg') }}" alt="Loader GIF" title="A Loader GIF Image">
  </div>
  {{-- Loader --}}
  <script>
    //  image (id) preview js/
    $(document).on('change', '#image', function(event) {
      var file = event.target.files[0];
      var reader = new FileReader();
      reader.onload = function(e) {
        $('.showImage img').attr('src', e.target.result);
      };
      reader.readAsDataURL(file);
    })
  </script>
</body>

</html>
