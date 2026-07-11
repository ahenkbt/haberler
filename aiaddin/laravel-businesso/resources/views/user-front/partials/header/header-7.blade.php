    <!--====== HEADER PART START ======-->
    <header class="header-area header-area-4">
        @php
            $phone_numbers = !empty($userContact->contact_numbers) ? explode(',', $userContact->contact_numbers) : [];
            $emails = !empty($userContact->contact_mails) ? explode(',', $userContact->contact_mails) : [];
        @endphp


        <div class="header-top">
            <div class="container-fluid">
                <div class="row">
                    <div class="col-lg-12">
                        <div class="header-top-item d-flex justify-content-between">
                            <div class="header-top-ltd">
                                @if (isset($social_medias))
                                    <div class="socials d-none d-md-block">
                                        <ul>
                                            @foreach ($social_medias as $social_media)
                                                <li class="float-left">
                                                    <a href="{{ $social_media->url }}">
                                                        <i class="{{ $social_media->icon }}"></i>
                                                    </a>
                                                </li>
                                            @endforeach
                                        </ul>
                                    </div>
                                @endif
                            </div>
                            <div class="header-top-info d-block">
                                <ul>
                                    @if (count($emails) > 0)
                                        <li class="d-none d-lg-inline-block">
                                            <a href="mailTo: {{ $emails[0] }}"><i
                                                    class="far fa-envelope"></i><span>{{ $emails[0] }}</span></a>
                                        </li>
                                    @endif
                                    @if (count($phone_numbers) > 0)
                                        <li class="d-none d-lg-inline-block">
                                            <a href="tel:{{ $phone_numbers[0] }}"><i
                                                    class="far fa-phone"></i><span>{{ $phone_numbers[0] }}</span></a>
                                        </li>
                                    @endif
                                    <li class="mt-lg-0 mt-2 pb-md-0 pb-3">
                                        <form action="{{ route('changeUserLanguage', getParam()) }}" id="userLangForms">
                                            @csrf
                                            <input type="hidden" name="username" value="{{ $user->username }}">
                                            <select onchange="submit()" name="code" id="lang-code"
                                                class="form-control btn-sm">
                                                @foreach ($userLangs as $userLang)
                                                    <option
                                                        {{ $userCurrentLang->id == $userLang->id ? 'selected' : '' }}
                                                        value="{{ $userLang->code }}">
                                                        {{ convertUtf8($userLang->name) }}</option>
                                                @endforeach
                                            </select>
                                        </form>
                                    </li>
                                    <li>
                                        <div class="info">
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
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {{-- <style>
                .navigation {
                    top: 0px;
                }

                .banner-area.banner-area-4 {
                    margin-top: 0px;
                }
            </style> --}}


        <div class="navigation navigation-2">
            <div class="container-fluid">
                <div class="row">
                    <div class="col-lg-12">
                        <nav class="navbar navbar-expand-lg">
                            <a class="navbar-brand" href="{{ route('front.user.detail.view', getParam()) }}">
                                <img class="lazy" data-src="{{ asset('assets/front/img/user/' . $userBs->logo) }}"
                                    alt="Logo">
                            </a> <!-- logo -->
                            <button class="navbar-toggler" type="button" data-toggle="collapse"
                                data-target="#navbarFive" aria-controls="navbarFive" aria-expanded="false"
                                aria-label="Toggle navigation">
                                <span class="toggler-icon"></span>
                                <span class="toggler-icon"></span>
                                <span class="toggler-icon"></span>
                            </button> <!-- navbar toggler -->
                            <div class="collapse navbar-collapse sub-menu-bar" id="navbarFive">
                                <ul class="navbar-nav ml-auto">
                                    @php
                                        $links = json_decode($userMenus, true);
                                    @endphp
                                    @foreach ($links as $link)
                                        @php
                                            $href = getUserHref($link);
                                        @endphp
                                        @if (!array_key_exists('children', $link))
                                            <li class="nav-item">
                                                <a class="page-scroll" target="{{ $link['target'] }}"
                                                    href="{{ $href }}">{{ $link['text'] }}</a>
                                            </li>
                                        @else
                                            <li class="nav-item">
                                                <a class="page-scroll" target="{{ $link['target'] }}"
                                                    href="{{ $href }}">{{ $link['text'] }} <i
                                                        class="far fa-angle-down"></i></a>
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
                            </div>
                        </nav> <!-- navbar -->
                    </div>
                </div> <!-- row -->
            </div> <!-- container -->
        </div>
    </header>

    <!--====== HEADER PART ENDS ======-->
