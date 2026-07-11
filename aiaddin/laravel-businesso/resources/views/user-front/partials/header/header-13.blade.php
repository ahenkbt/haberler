<header class="olima_header header_v1">
  <div class="top_header light_bg">
    <div class="container">
      <div class="row align-items-center">
        <div class="col-lg-6 col-md-6 col-sm-12">
          <!-- site logo -->
          <div class="brand_logo">
            <a href="{{ route('front.user.detail.view', getParam()) }}">
              <img data-src="{{ asset('assets/front/img/user/' . $userBs->logo) }}" class="img-fluid lazy"
                alt="website logo">
            </a>
          </div>
        </div>
        <div class="col-lg-6 col-md-12 col-sm-12">
          <div class="top-right">
            <div class="lang">
              <form action="{{ route('changeUserLanguage', getParam()) }}" id="userLangForms">
                @csrf
                <input type="hidden" name="username" value="{{ $user->username }}">
                <select onchange="submit()" class="olima_select" name="code" id="lang-code">
                  @foreach ($userLangs as $userLang)
                    <option {{ $userCurrentLang->id == $userLang->id ? 'selected' : '' }} value="{{ $userLang->code }}">
                      {{ convertUtf8($userLang->name) }}</option>
                  @endforeach
                </select>
              </form>
            </div>
            @guest('customer')
              <div class="info">
                <a href="{{ route('customer.login', getParam()) }}">{{ $keywords['Login'] ?? __('Login') }}</a>
                <a href="{{ route('customer.signup', getParam()) }}">{{ $keywords['Signup'] ?? __('Signup') }}</a>
              </div>
            @endguest
            @auth('customer')
              <div class="info">
                <a href="{{ route('customer.dashboard', getParam()) }}" class="top-btn"> <i
                    class="far fa-tachometer-fast"></i>
                  {{ $keywords['Dashboard'] ?? __('Dashboard') }} </a>

                <a href="{{ route('customer.logout', getParam()) }}" class="top-btn active-btn"><i
                    class="fal fa-sign-out-alt"></i>
                  {{ $keywords['Logout'] ?? __('Logout') }}</a>
              </div>
            @endauth
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="header_navigation">
    <div class="container">
      <div class="nav-container d-flex align-items-center justify-content-between">
        <!-- site logo -->
        <div class="brand_logo">
          <a href="{{ route('front.user.detail.view', getParam()) }}">
            <img data-src="{{ asset('assets/front/img/user/' . $userBs->logo) }}" class="img-fluid lazy"
              alt="website logo">
          </a>
        </div>
        <div class="nav-menu">
          <!-- Navbar Close Icon -->
          <div class="navbar-close">
            <div class="cross-wrap">
              <span class="top"></span>
              <span class="bottom"></span>
            </div>
          </div>
          <!-- nav-menu -->
          <nav class="main-menu">
            <ul>
              @php
                $links = json_decode($userMenus, true);
              @endphp
              @foreach ($links as $link)
                @php
                  $href = getUserHref($link);
                @endphp
                @if (!array_key_exists('children', $link))
                  <li><a href="{{ $href }}" target="{{ $link['target'] }}">{{ $link['text'] }}</a></li>
                @else
                  <li class="menu-item menu-item-has-children">
                    <a href="{{ $href }}" target="{{ $link['target'] }}">{{ $link['text'] }}</a>
                    <ul class="sub-menu">
                      @foreach ($link['children'] as $level2)
                        @php
                          $l2Href = getUserHref($level2);
                        @endphp
                        <li><a href="{{ $l2Href }}" target="{{ $level2['target'] }}">{{ $level2['text'] }}</a>
                        </li>
                      @endforeach
                    </ul>

                  </li>
                @endif
              @endforeach
            </ul>
          </nav>
          <!-- this search form will only show for small display -->
          <div class="nav-pushed-item">
            <div class="header_search">
              <form action="{{ route('front.user.blogs', [getParam()]) }}" method="get">
                <div class="form_group">
                  <input type="search" class="form_control"
                    placeholder="{{ $keywords['Search_your_keyword'] ?? 'Search your keyword' }}..." name="term"
                    value="{{ request()->input('term') }}">
                  <i class="fas fa-search"></i>
                </div>
              </form>
            </div>
          </div>
        </div>
        <div class="nav-push-item">
          <div class="header_search">
            <form action="{{ route('front.user.blogs', [getParam()]) }}" method="get">
              <div class="form_group">
                <input type="search" class="form_control"
                  placeholder="{{ $keywords['Search_your_keyword'] ?? 'Search your keyword' }}..." name="term"
                  value="{{ request()->input('term') }}">
                <i class="fas fa-search"></i>
              </div>
            </form>
          </div>
        </div>
        <!-- Navbar Toggler -->
        <div class="navbar-toggler">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  </div>
</header>
