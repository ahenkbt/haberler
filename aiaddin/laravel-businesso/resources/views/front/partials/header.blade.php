<!--====== Start Header ======-->
<header class="header-area" data-aos="fade-down">
    <!-- Start mobile menu -->
    <div class="mobile-menu">
        <div class="container">
            <div class="mobile-menu-wrapper"></div>
        </div>
    </div>
    <!-- End mobile menu -->

    <div class="main-responsive-nav">
        <div class="container">
            <!-- Mobile Logo -->
            <div class="logo">

                <a href="{{ route('front.index') }}"><img src="{{ asset('assets/front/img/' . $bs->logo) }}"
                        class="img-fluid" alt=""></a>
            </div>
            <!-- Menu toggle button -->
            <button class="menu-toggler" type="button">
                <span></span>
                <span></span>
                <span></span>
            </button>
        </div>
    </div>

    <div class="main-navbar">
        <div class="container">
            <nav class="navbar navbar-expand-lg">
                <!-- Logo -->

                <a href="{{ route('front.index') }}"><img src="{{ asset('assets/front/img/' . $bs->logo) }}"
                        class=" navbar-brand img-fluid" alt=""></a>
                <!-- Navigation items -->
                <div class="collapse navbar-collapse">
                    <ul id="mainMenu" class="navbar-nav mobile-item">

                        @php
                            $links = json_decode($menus, true);
                        @endphp
                  
                      
                        @foreach ($links as $link)
                            @php
                                $href = getHref($link);
                            @endphp
  
                            @if (!array_key_exists('children', $link))
                                <li class="nav-item">
                                    <a class="nav-link" href="{{ $href }}"
                                        target="{{ $link['target'] }}">{{ $link['text'] }}</a>
                                </li>
                            @else
                                <li class="nav-item">
                                    <a class="nav-link toggle" href="{{ $href }}"
                                        target="{{ $link['target'] }}">{{ $link['text'] }} <i
                                            class="fal fa-plus"></i></a>
                                    <ul class="menu-dropdown">
                                        @foreach ($link['children'] as $level2)
                                            @php
                                                $l2Href = getHref($level2);
                                            @endphp
                                            <li class="nav-item">
                                                <a class="nav-link" href="{{ $l2Href }}"
                                                    target="{{ $level2['target'] }}">{{ $level2['text'] }}</a>
                                            </li>
                                        @endforeach
                                    </ul>
                                </li>
                            @endif
                        @endforeach

                    </ul>
                </div>
                <div class="more-option mobile-item">
                    <div class="item">
                        <div class="language">
                            @if (!empty($currentLang))
                                <select onchange="handleSelect(this)" class="select">
                                    @foreach ($langs as $key => $lang)
                                        <option value="{{ $lang->code }}"
                                            {{ $currentLang->code === $lang->code ? 'selected' : '' }}>
                                            {{ $lang->name }}
                                        </option>
                                    @endforeach
                                </select>
                            @endif
                        </div>
                    </div>

                    <div class="item">

                        @guest('web')
                            <a href="{{ route('user.login') }}" target="_blank" class="btn btn-md btn-primary"
                                title="Login">
                                {{ __('Login') }}</a>
                        @endguest
                        @auth('web')
                            <a href="{{ route('user-dashboard') }}" class="btn btn-md btn-primary" title="Dashboard">
                                {{ __('Dashboard') }}</a>
                        @endauth
                    </div>
                </div>
            </nav>
        </div>
    </div>
</header>
<!--====== End Header ======-->
