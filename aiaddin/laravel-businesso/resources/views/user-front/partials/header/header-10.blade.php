    <!--====== HEADER PART START ======-->
    <header class="header-area header-area-one">
        <div class="header-top">
            <div class="container-fluid">
                <div class="row">
                    <div class="col-lg-6 col-md-7 col-sm-5">
                        <div
                            class="header-logo d-flex align-items-center justify-content-center justify-content-sm-start">
                            <div class="logo "><a href="{{ route('front.user.detail.view', getParam()) }}">
                                    @if (!empty($userBs->logo))
                                        <img src="{{ asset('assets/front/img/user/' . $userBs->logo) }}" alt="logo">
                                    @endif
                                </a>
                            </div>

                            <form class="d-none d-md-inline-block"
                                action="{{ route('front.user.courses', getParam()) }}" method="GET">
                                <div class="input-box">
                                    <i class="fal fa-search"></i>
                                    <input type="text"
                                        placeholder="{{ $keywords['Search_your_keyword'] ?? __('Search Your keyword') }}"
                                        name="keyword">
                                </div>
                            </form>
                        </div>
                    </div>
                    <div class="col-lg-6 col-md-5 col-sm-7">
                        <div
                            class="header-btns d-flex align-items-center justify-content-center justify-content-sm-end">
                            <ul>
                                @if (in_array('Ecommerce', $packagePermissions) ||
                                        in_array('Hotel Booking', $packagePermissions) ||
                                        in_array('Course Management', $packagePermissions) ||
                                        in_array('Donation Management', $packagePermissions) )
                                    @guest('customer')
                                        <li>
                                            <a href="{{ route('customer.login', getParam()) }}"> <i
                                                    class="fal fa-sign-in-alt">
                                                </i> {{ $keywords['Login'] ?? __('Login') }}</a>
                                        </li>

                                        <li> <a href="{{ route('customer.signup', getParam()) }}"> <i
                                                    class="fal fa-user-plus">
                                                </i> {{ $keywords['Signup'] ?? __('Signup') }}</a>
                                        </li>
                                    @endguest
                                    @auth('customer')
                                        <li><a href="{{ route('customer.dashboard', getParam()) }}">
                                                <i class="far fa-tachometer-fast"></i>
                                                {{ $keywords['Dashboard'] ?? __('Dashboard') }} </a></li>

                                        <li><a href="{{ route('customer.logout', getParam()) }}"><i
                                                    class="fal fa-sign-out-alt"></i>
                                                {{ $keywords['Logout'] ?? __('Logout') }}</a></li>
                                    @endauth
                                @endif
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="header-navigation">
            <div class="container-fluid">
                <div class="site-menu d-flex align-items-center justify-content-between">
                    <div class="primary-menu">
                        <div class="nav-menu">
                            <!-- Navbar Close Icon -->
                            <div class="navbar-close">
                                <div class="cross-wrap"><i class="far fa-times"></i></div>
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
                                            <li><a href="{{ $href }}"
                                                    target="{{ $link['target'] }}">{{ $link['text'] }}</a></li>
                                        @else
                                            <li class="menu-item menu-item-has-children">
                                                <a href="{{ $href }}"
                                                    target="{{ $link['target'] }}">{{ $link['text'] }}</a>
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
                                                <span class="dd-trigger"><i class="far fa-angle-down"></i></span>
                                            </li>
                                        @endif
                                    @endforeach


                                </ul>
                            </nav>
                        </div>
                        <!-- Navbar Toggler -->
                        <div id="navbarToggler">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                    <div class="navbar-item d-flex align-items-center justify-content-end">
                        <div class="menu-dropdown">
                            <form action="{{ route('changeUserLanguage', getParam()) }}" id="userLangForms">
                                @csrf
                                <input type="hidden" name="username" value="{{ $user->username }}">

                                <select onchange="submit()" name="code" id="lang-code">
                                    @foreach ($userLangs as $userLang)
                                        <option {{ $userCurrentLang->id == $userLang->id ? 'selected' : '' }}
                                            value="{{ $userLang->code }}">
                                            {{ convertUtf8($userLang->name) }}</option>
                                    @endforeach
                                </select>
                            </form>

                        </div>
                        <div class="menu-icon mobile-hide">
                            <ul>
                                @if (isset($social_medias))
                                    @foreach ($social_medias as $social_media)
                                        <li><a href="{{ $social_media->url }}"><i
                                                    class="{{ $social_media->icon }}"></i></a></li>
                                    @endforeach

                                @endif
                            </ul>
                        </div>
                    </div>
                </div> <!-- row -->
            </div> <!-- container -->
        </div>
    </header>
    <!--====== HEADER PART ENDS ======-->
