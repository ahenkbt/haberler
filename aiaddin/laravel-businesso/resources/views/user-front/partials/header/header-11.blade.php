@php
  $phone_numbers = !empty($userContact->contact_numbers) ? explode(',', $userContact->contact_numbers) : [];
  $emails = !empty($userContact->contact_mails) ? explode(',', $userContact->contact_mails) : [];

@endphp
<!-- header -->
<header class="header-area header_v1">
  <div class="top-header-area top-header-v1 black-bg">
    <div class="container">
      <div class="row align-items-center">
        <div class="col-md-6 wow fadeInLeft">
          <div class="top-header-left-links">
            @if (count($phone_numbers) > 0)
              @foreach ($phone_numbers as $phone_number)
                @if ($loop->last)
                  <a href="tel: {{ $phone_number }}"><i class="ti-headphone-alt"></i>
                    {{ $phone_number }}</a>
                @endif
              @endforeach
            @endif
            @if (count($emails) > 0)

              @foreach ($emails as $email)
                @if ($loop->last)
                  <a href="mailto: {{ $email }}"> <i class="ti-email"></i>
                    {{ $email }} </a>
                @endif
              @endforeach

            @endif

          </div>
        </div>
        @if (isset($social_medias))
          <div class="col-md-6 text-right">
            <div class="top-header-right-links d-flex justify-content-end align-items-center">

              @if (in_array('Ecommerce', $packagePermissions) ||
                      in_array('Hotel Booking', $packagePermissions) ||
                      in_array('Donation Management', $packagePermissions) ||
                      in_array('Course Management', $packagePermissions))
                @guest('customer')
                  <a href="{{ route('customer.login', getParam()) }}" class="top-btn"> <i class="fal fa-sign-in-alt">
                    </i> {{ $keywords['Login'] ?? __('Login') }}</a>


                  <a href="{{ route('customer.signup', getParam()) }}" class="top-btn active-btn"> <i
                      class="fal fa-user-plus">
                    </i> {{ $keywords['Signup'] ?? __('Signup') }}</a>
                @endguest
                @auth('customer')
                  <a href="{{ route('customer.dashboard', getParam()) }}" class="top-btn"> <i
                      class="far fa-tachometer-fast"></i>
                    {{ $keywords['Dashboard'] ?? __('Dashboard') }} </a>

                  <a href="{{ route('customer.logout', getParam()) }}" class="top-btn active-btn"><i
                      class="fal fa-sign-out-alt"></i>
                    {{ $keywords['Logout'] ?? __('Logout') }}</a>
                @endauth
              @endif



            </div>
          </div>
        @endif
      </div>
    </div>
  </div>
  <!-- bottom header here html code -->
  <div class="navigation-area">
    <div class="container">
      <div class="site_menu">
        <div class="row align-items-center">
          <div class="col-sm-4 col-lg-2">
            <div class="logo">
              <a href="{{ route('front.user.detail.view', getParam()) }}">
                <img class="img-fluid" src="{{ asset('assets/front/img/user/' . $userBs->logo) }}" alt="">
              </a>
            </div>
          </div>
          <div class="col-sm-8 col-lg-10">
            <div class="main-menu">
              <nav>
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
                            <li><a href="{{ $l2Href }}"
                                target="{{ $level2['target'] }}">{{ $level2['text'] }}</a>
                            </li>
                          @endforeach
                        </ul>

                      </li>
                    @endif
                  @endforeach

                </ul>
              </nav>

              <div class="icon_bar side-option-responsive">
                <a href="#" data-toggle="modal" data-target="#search-modal">
                  <i class="flaticon-search"></i>
                </a>
                <form action="{{ route('changeUserLanguage', getParam()) }}" id="userLangForms">
                  @csrf
                  <input type="hidden" name="username" value="{{ $user->username }}">

                  <select onchange="submit()" class="language-select" name="code" id="lang-code">
                    @foreach ($userLangs as $userLang)
                      <option {{ $userCurrentLang->id == $userLang->id ? 'selected' : '' }}
                        value="{{ $userLang->code }}">
                        {{ convertUtf8($userLang->name) }}</option>
                    @endforeach
                  </select>
                </form>

              </div>
            </div>
          </div>
          <div class="col-md-12">
            <div class="mobile_menu"></div>
          </div>
          <button type="button" class="side-option-button">
            <i class="far fa-ellipsis-h-alt"></i>
            <i class="far fa-times"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</header>
<!-- hero area html code -->

<div class="modal fade" id="search-modal" tabindex="-1" role="dialog" aria-modal="true">
  <div class="modal-dialog modal-dialog-centered" role="document">
    <div class="modal-content">
      <form method="get" action="{{ route('front.user.causes', getParam()) }}">
        <div class="form_group">
          <input type="text" class="form_control" name="search"
            placeholder=" {{ $keywords['Search_Here'] ?? __('search here') }}">
        </div>
      </form>
    </div>
  </div>
</div>
