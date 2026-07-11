<!--====== Start Header ======-->
<header class="header-area-one">
    <!-- Header Logo Area -->
    <div class="header-logo-area">
        <div class="container">
            <div class="row">
                <div class="col-lg-4 col-md-3">
                    @if ($userBs->logo)
                        <div class="site-branding">
                            <a href="{{ route('front.user.detail.view', getParam()) }}" class="brand-logo">
                                <img data-src="{{ asset('assets/front/img/user/' . $userBs->logo) }}" class="lazy"
                                    alt="Lawgne"></a>
                        </div>
                    @endif
                </div>
                <div class="col-lg-8 col-md-9">
                    <div class="site-info">
                        @php
                            $phone_numbers = !empty($userContact->contact_numbers) ? explode(',', $userContact->contact_numbers) : [];
                            $emails = !empty($userContact->contact_mails) ? explode(',', $userContact->contact_mails) : [];
                            $addresses = !empty($userContact->contact_addresses) ? explode(PHP_EOL, $userContact->contact_addresses) : [];
                        @endphp
                        <ul class="info-list">
                            <li>
                                <div class="icon">
                                    <a href="tel:{{ !empty($phone_numbers) ? $phone_numbers[0] : '' }}"><i
                                            class="fal fa-mobile"></i></a>
                                </div>
                                <div class="info">
                                    <span class="title">{{ $keywords['Phone_Number'] ?? 'Phone Number' }}</span>
                                    <h5><a
                                            href="tel:{{ !empty($phone_numbers) ? $phone_numbers[0] : '' }}">{{ !empty($phone_numbers) ? $phone_numbers[0] : '' }}</a>
                                    </h5>
                                </div>
                            </li>
                            <li>
                                <div class="icon">
                                    <a href="mailto:{{ !empty($emails) ? $emails[0] : '' }}"><i
                                            class="fal fa-envelope"></i></a>
                                </div>
                                <div class="info">
                                    <span class="title">{{ $keywords['Email_Address'] ?? 'Email Address' }}</span>
                                    <h5><a
                                            href="mailto:{{ !empty($emails) ? $emails[0] : '' }}">{{ !empty($emails) ? $emails[0] : '' }}</a>
                                    </h5>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <!-- Header Navigation -->
    <div class="header-navigation mobile-rs-nav">
        <div class="container">
            <div class="navigation-wrapper">
                <div class="navbar-toggler">
                    <span></span><span></span><span></span>
                </div>
                <div class="row align-items-center">
                    <div class="col-lg-8 col-4">
                        <!-- Primary Menu -->
                        <div class="primary-menu">
                            <div class="nav-menu">
                                <div class="navbar-close"><i class="far fa-times"></i></div>

                                <!-- Pushed Item -->
                                <div class="nav-pushed-item"></div>

                                <nav class="main-menu">
                                    <ul>
                                        @php
                                            $links = json_decode($userMenus, true);
                                        @endphp
                                        @if ($links)
                                            @foreach ($links as $link)
                                                @php
                                                    $href = getUserHref($link);
                                                @endphp
                                                @if (!array_key_exists('children', $link))
                                                    <li class="menu-item"><a href="{{ $href }}"
                                                            target="{{ $link['target'] }}">{{ $link['text'] }}</a>
                                                    </li>
                                                @else
                                                    <li class="menu-item has-children">
                                                        <a href="{{ $href }}"
                                                            target="{{ $link['target'] }}">{{ $link['text'] }}</a>
                                                        <ul class="sub-menu">
                                                            @foreach ($link['children'] as $level2)
                                                                @php
                                                                    $l2Href = getUserHref($level2);
                                                                @endphp
                                                                <li class="menu-item"><a href="{{ $l2Href }}"
                                                                        target="{{ $level2['target'] }}">{{ $level2['text'] }}</a>
                                                                </li>
                                                            @endforeach
                                                        </ul>
                                                    </li>
                                                @endif
                                            @endforeach

                                            @if (in_array('Request a Quote', $packagePermissions))
                                                @if ($userBs->is_quote)
                                                    <li class="menu-item d-block d-xl-none"><a
                                                            href="{{ route('front.user.quote', getParam()) }}"
                                                            target="{{ $link['target'] }}">{{ $keywords['Request_A_Quote'] ?? 'Request A Quote' }}</a>
                                                    </li>
                                                @endif
                                            @endif
                                        @endif
                                    </ul>
                                </nav>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-4 col-8">
                        <!-- Header Nav -->
                        <div class="header-right-nav d-flex align-items-center">
                            <ul>
                                @if (in_array('Request a Quote', $packagePermissions))
                                    @if ($userBs->is_quote)
                                        <li class="d-xl-block d-none"><a
                                                href="{{ route('front.user.quote', getParam()) }}"
                                                class="main-btn float-right m-0">{{ $keywords['Request_A_Quote'] ?? 'Request A Quote' }}</a>
                                        </li>
                                    @endif
                                @endif
                                <li>
                                    <form action="{{ route('changeUserLanguage', getParam()) }}" id="userLangForms">
                                        @csrf
                                        <input type="hidden" name="username" value="{{ $user->username }}">
                                        <select onchange="submit()" name="code" id="lang-code"
                                            class="form-control from-control-sm">
                                            @foreach ($userLangs as $userLang)
                                                <option {{ $userCurrentLang->id == $userLang->id ? 'selected' : '' }}
                                                    value="{{ $userLang->code }}">
                                                    {{ convertUtf8($userLang->name) }}</option>
                                            @endforeach
                                        </select>
                                    </form>
                                </li>
                                <li>
                                    <div class="info nav-push-item">
                                        @if (in_array('Ecommerce', $packagePermissions) ||
                                                in_array('Hotel Booking', $packagePermissions) ||
                                                in_array('Course Management', $packagePermissions))
                                            @guest('customer')
                                                <a
                                                    href="{{ route('customer.login', getParam()) }}">{{ $keywords['Login'] ?? __('Login') }}</a>
                                                <a
                                                    href="{{ route('customer.signup', getParam()) }}">{{ $keywords['Signup'] ?? __('Signup') }}</a>
                                            @endguest
                                            @auth('customer')
                                                @php $authUserInfo = Auth::guard('customer')->user(); @endphp
                                                <a
                                                    href="{{ route('customer.dashboard', getParam()) }}">{{ $keywords['Dashboard'] ?? __('Dashboard') }}</a>
                                                <a
                                                    href="{{ route('customer.logout', getParam()) }}">{{ $keywords['Logout'] ?? __('Logout') }}</a>
                                            @endauth
                                        @endif
                                    </div>
                                </li>
                                <li class="d-xl-none off-nav-btn">
                                    <div class="off-menu">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</header>
<!--====== End Header ======-->
