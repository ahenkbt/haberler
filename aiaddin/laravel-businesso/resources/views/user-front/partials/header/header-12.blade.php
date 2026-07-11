@php
  $user = getUser();
@endphp
<!--====== Start nav-toggle ======-->
<div class="nav-toggoler">
  <span></span>
  <span></span>
  <span></span>
</div>
<!--====== End nav-toggle ======-->

<!--====== Start Header Section ======-->
<header class="header-area">
  <div class="navigation-wrapper">
    <div class="user-box text-center">
      <div class="user-img">
        <a href="{{ route('front.user.detail.view', getParam()) }}" class="d-flex">
          <img class="lazy"
            data-src="{{ $user->photo ? asset('assets/front/img/user/' . $user->photo) : asset('assets/admin/img/noimage.jpg') }}"
            alt="">
        </a>
      </div>
      <h4>{{ $userBs->website_title }}</h4>
      <span class="position">{{ $user->username }}</span>
    </div>
    <div class="primary-menu">
      <nav class="main-menu">
        <ul>
          @php
            $links = json_decode($userMenus, true);
          @endphp
          {{-- @dd($links) --}}
          @foreach ($links as $link)
            @php
              $href = getUserHref($link);
            @endphp
            @if (!array_key_exists('children', $link))
              <li><a href="{{ $href }}">

                  @if (!empty($link['icon']) && $link['icon'] != 'empty')
                    <i class="{{ $link['icon'] }}"></i>
                  @endif
                  {{ $link['text'] }}
                </a>
              </li>
            @else
              <li class="menu-item menu-item-has-children">
                <a href="{{ $href }}" target="{{ $link['target'] }}">
                  @if (!empty($link['icon']) && $link['icon'] != 'empty')
                    <i class="{{ $link['icon'] }}"></i>
                  @endif
                  {{ $link['text'] }}
                </a>
                <ul class="sub-menu">
                  @foreach ($link['children'] as $level2)
                    @php
                      $l2Href = getUserHref($level2);
                    @endphp
                    <li>
                      <a href="{{ $l2Href }}" target="{{ $level2['target'] }}">{{ $level2['text'] }}</a>
                    </li>
                  @endforeach
                </ul>

              </li>
            @endif
          @endforeach
        </ul>
      </nav>
    </div>
    <div class="nav-social">
      <ul class="social-link">
        @if (isset($social_medias))
          @foreach ($social_medias as $social_media)
            <li>
              <a href="{{ $social_media->url }}" target="_blank">
                <i class="{{ $social_media->icon }}"></i>
              </a>
            </li>
          @endforeach
        @endif

      </ul>
    </div>
  </div>
  <div class="nav-right">
    {{-- <a href="#" class="main-btn filled-btn">Login</a> --}}
    @if (in_array('Ecommerce', $packagePermissions) ||
            in_array('Hotel Booking', $packagePermissions) ||
            in_array('Donation Management', $packagePermissions) ||
            in_array('Course Management', $packagePermissions))
      @guest('customer')
        <a href="{{ route('customer.login', getParam()) }}" class="main-btn filled-btn"> <i class="fal fa-sign-in-alt">
          </i> {{ $keywords['Login'] ?? __('Login') }}</a>


        <a href="{{ route('customer.signup', getParam()) }}" class="main-btn filled-btn"> <i class="fal fa-user-plus">
          </i> {{ $keywords['Signup'] ?? __('Signup') }}</a>
      @endguest
      @auth('customer')
        <a href="{{ route('customer.dashboard', getParam()) }}" class="main-btn filled-btn">
          <i class="far fa-tachometer-fast"></i>
          {{ $keywords['Dashboard'] ?? __('Dashboard') }} </a>

        <a href="{{ route('customer.logout', getParam()) }}" class="main-btn filled-btn"><i
            class="fal fa-sign-out-alt"></i>
          {{ $keywords['Logout'] ?? __('Logout') }}</a>
      @endauth
    @endif

    <div class="language-selector bordered-style d-flex">
      <form id="userLangForms" action="{{ route('changeUserLanguage', getParam()) }}">
        @csrf
        <input type="hidden" name="username" value="{{ $user->username }}">

        <select onchange="submit()" name="code" id="lang-code">
          @foreach ($userLangs as $userLang)
            <option {{ $userCurrentLang->id == $userLang->id ? 'selected' : '' }} value="{{ $userLang->code }}">
              {{ convertUtf8($userLang->name) }}</option>
          @endforeach
        </select>
      </form>
    </div>


  </div>
</header>
<!--====== End Header Section ======-->
