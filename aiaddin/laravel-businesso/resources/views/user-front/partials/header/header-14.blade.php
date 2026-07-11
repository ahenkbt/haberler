<!--========= Start Header =========-->
@php
  $phone_numbers = !empty($userContact->contact_numbers) ? explode(',', $userContact->contact_numbers) : [];
  $emails = !empty($userContact->contact_mails) ? explode(',', $userContact->contact_mails) : [];
@endphp
<header class="header-area header-14">

  <!-- header-top -->
  <div class="header-top">
    <div class="container">
      <div class="row">
        <div class="col-lg-6">
          <div class="header-top-left">
            <ul class="reset-ul">
              @if (count($emails) > 0)
                <li class="mail">
                  <i class="fa-thin fa-envelope"></i>
                  @foreach ($emails as $email)
                    @if ($loop->last)
                      <a href="mailto: {{ $email }}"> {{ $email }}</a>
                    @endif
                  @endforeach
                </li>
              @endif
              @if (isset($social_medias))
                <li>
                  <div class="header-top-socials">
                    @foreach ($social_medias as $social_media)
                      <a target="_blank" href="{{ $social_media->url }}"><i class="{{ $social_media->icon }}"></i></a>
                    @endforeach
                  </div>
                </li>
              @endif
            </ul>
          </div>
        </div>

        <div class="col-lg-6">
          <div class="header-top-right">
            <div class="language">
              <form action="{{ route('changeUserLanguage', getParam()) }}" id="userLangForms">
                @csrf
                <input type="hidden" name="username" value="{{ $user->username }}">
                <i class="fa-solid fa-globe"></i>
                <select class="niceselect nice-select" onchange="submit()" name="code" id="lang-code">
                  @foreach ($userLangs as $userLang)
                    <option {{ $userCurrentLang->id == $userLang->id ? 'selected' : '' }} value="{{ $userLang->code }}">
                      {{ convertUtf8($userLang->name) }}</option>
                  @endforeach
                </select>
              </form>
            </div>
            <div class="dropdown user-btn">
              @guest('customer')
                <button class="btn dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                  <i class="fa-light fa-user-group"></i> {{ $keywords['Login'] ?? __('Login') }}
                </button>
                <ul class="dropdown-menu">
                  <li><a class="dropdown-item"
                      href="{{ route('customer.login', getParam()) }}">{{ $keywords['Login'] ?? __('Login') }}</a></li>
                  <li><a class="dropdown-item"
                      href="{{ route('customer.signup', getParam()) }}">{{ $keywords['Signup'] ?? __('Signup') }}</a>
                  </li>
                </ul>
              @endguest
              @auth('customer')
                <button class="btn dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                  <i class="fa-light fa-user-group"></i> {{ $keywords['Dashboard'] ?? __('Dashboard') }}
                </button>
                <ul class="dropdown-menu">
                  <li><a class="dropdown-item"
                      href="{{ route('customer.dashboard', getParam()) }}">{{ $keywords['Dashboard'] ?? __('Dashboard') }}</a>
                  </li>
                  <li><a class="dropdown-item"
                      href="{{ route('customer.logout', getParam()) }}">{{ $keywords['Signout'] ?? __('Sign out') }}</a>
                  </li>
                </ul>
              @endauth
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <!-- header-midle -->
  <div class="header-midle">
    <div class="container">
      <!-- Logo -->
      <a class="navbar-brand m-0" href="{{ route('front.user.detail.view', getParam()) }}">
        <img class="lazyload blur-up" src="{{ asset('assets/front/img/user/' . $userBs->logo) }}" alt="logo">
      </a>
      <div class="header-serch">
        <form class="header-search-form" id="searchForm" action="{{ route('front.user.shop', getParam()) }}"
          method="get">
          <select class="niceselect nice-select">
            <option value="">{{ $keywords['All'] ?? __('All') }}</option>
            @foreach ($categories as $category)
              <option {{ request('category') == urlencode($category->slug) ? 'selected' : '' }}
                value="{{ urlencode($category->slug) }}">{{ $category->name }}
              </option>
            @endforeach
          </select>
          <div class="search-input">
            <input type="text" class="form-control"
              value="{{ request()->input('search') ? request()->input('search') : '' }}"
              placeholder="{{ $keywords['Search_your_keyword'] ?? __('Search your keyword') }} ....." name="search">
          </div>
          <button class="btn btn-icon" type="submit" id="search-button">
            <i class="fal fa-search"></i>
          </button>
        </form>
      </div>
      <div class="header-right">
        <ul class="menu reset-ul header-right-14-inner">
          @php
            $customer = Auth::guard('customer')->user();
            $customer_id = $customer ? $customer->id : null;

            $wishlistCount = $customer_id
                ? \App\Models\User\CustomerWishList::where('customer_id', $customer_id)->count()
                : 0;
          @endphp

          <li class="menu-item menu-wishlist" id="wishlistIconWrapper">
            <a href="{{ route('customer.wishlist', getParam()) }}" class="menu-link">
              <i class="fal fa-heart">
                <span class="badge wishlist-count">{{ $wishlistCount }}</span>
              </i>
              {{ $keywords['Wishlist'] ?? __('Wishlist') }}
            </a>
          </li>
          @php
            $crt = Session::get('cart');
            $crtTotal = 0;
            $countitem = 0;

            if ($crt) {
                foreach ($crt as $p) {
                    $crtTotal += $p['total'];
                    $countitem += $p['qty'];
                }
            }
          @endphp
          @if (!empty($userShopSetting) && empty($userShopSetting->catalog_mode))
            <li class="menu-item main-header-icon" id="cartIconWrapper">
              <a href="javascript:void(0)" class="menu-link">
                <i class="fal fa-shopping-cart">
                  <span class="badge cart-dropdown-count">{{ $crt ? $countitem : 0 }}</span>
                </i>
                {{ $keywords['Cart'] ?? 'Cart' }}
              </a>
              <div class="mini-cart-item">
                @if ($crt)
                  <div class="cart-item-wrapper">
                    @foreach ($crt as $key => $item)
                      @php
                        $id = $item['id'];
                        $product = App\Models\User\UserItem::findOrFail($item['id']);
                      @endphp
                      <div class="cart-item">
                        <div class="cart-img">
                          <a href="{{ route('front.user.item_details', ['slug' => $item['slug'], getParam()]) }}">
                            <img src="{{ asset('assets/front/img/user/items/thumbnail/' . $product->thumbnail) }}"
                              class="" alt="Microwear Watch">
                          </a>
                        </div>

                        <div class="cart-info">
                          <a href="{{ route('front.user.item_details', ['slug' => $item['slug'], getParam()]) }}"
                            class="title">{{ strlen($item['name']) > 20 ? mb_substr($item['name'], 0, 20, 'UTF-8') . '...' : $item['name'] }}</a>

                          (<span class="price_quantity">
                            {{ $kewords['qty'] ?? __('Qty') }} :
                            {{ $item['qty'] }}
                            ,
                            <span>
                              {{ $kewords['total'] ?? __('Total') }} :
                              {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                              {{ $item['total'] }}
                              {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                            </span></span>)
                          @if (!empty($item['variations']))
                            @foreach ($item['variations'] as $k => $itm)
                              <table class="variation-table">
                                <tr>
                                  <td class="">
                                    <strong>{{ $k }}
                                      &nbsp;
                                  </td>
                                  <td>{{ $itm['name'] }} &nbsp; +
                                  </td>
                                  <td>&nbsp;
                                    {{ $be->base_currency_symbol_position == 'left' ? $be->base_currency_symbol : '' }}
                                    {{ $itm['price'] * $item['qty'] }}
                                    ;
                                    {{ $be->base_currency_symbol_position == 'right' ? $be->base_currency_symbol : '' }}
                                  </td>
                                </tr>
                              </table>
                            @endforeach
                          @endif
                        </div>

                        <div class="cart-remove remove">
                          <div class="checkbox">
                            <a class="fas d-block fa-times cursor-pointer item-remove" rel="{{ $id }}"
                              data-href="{{ route('front.cart.item.remove', ['uid' => $key, getParam()]) }}"></a>
                          </div>
                        </div>
                      </div>
                    @endforeach
                  </div>

                  <div class="cart-total d-flex justify-content-between pb-10">
                    <span><b>{{ $keywords['total'] ?? __('Total') }}</b></span>
                    <span
                      class="price"><b>{{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                        {{ $crtTotal }}
                        {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}</b></span>
                  </div>

                  <div class="cart-button">
                    <a href="{{ route('front.user.cart', getParam()) }}"
                      class="btn btn-md thm-btn main-btn">{{ $keywords['view_cart'] ?? __('View Cart') }}</a>
                    <a href="{{ route('front.user.checkout', getParam()) }}"
                      class="btn btn-md thm-btn main-btn">{{ $keywords['Checkout'] ?? __('Checkout') }}</a>
                  </div>
                @else
                  {{ $keywords['cart_empty'] ?? __('your cart is empty !') }}
                @endif
              </div>
            </li>
          @endif
        </ul>
      </div>
    </div>
  </div>
  <!-- header-bottom -->
  <div class="header-bottom">
    <nav class="navbar navbar-expand-xl hover-menu">
      <div class="container">
        <!-- Logo -->
        <div class="d-block d-xl-none">
          <a class="navbar-brand m-0" href="{{ route('front.user.detail.view', getParam()) }}">
            <img src="{{ asset('assets/front/img/user/' . $userBs->logo) }}" alt="logo">
          </a>
        </div>
        <button class="menu-toggler d-block d-xl-none" type="button" data-bs-toggle="offcanvas"
          data-bs-target="#mobilemenu-offcanvas" aria-controls="mobilemenu-offcanvas">
          <span></span>
          <span></span>
          <span></span>
        </button>
        <div class="collapse navbar-collapse d-xl-block d-none" id="main_nav">
          <!-- Header menu -->
          <ul id="mainMenu" class="navbar-nav justify-content-center gap-24">

            {{-- <ul> --}}
            @php
              $links = json_decode($userMenus, true);
            @endphp
            @foreach ($links as $link)
              @php
                $href = getUserHref($link);
              @endphp
              @if (!array_key_exists('children', $link))
                <li class="nav-item"><a class="nav-link" href="{{ $href }}"
                    target="{{ $link['target'] }}">{{ $link['text'] }}</a></li>
              @else
                <li class="nav-item dropdown">
                  <a href="{{ $href }}" class="nav-link dropdown-toggle" data-bs-toggle="dropdown"
                    target="{{ $link['target'] }}">{{ $link['text'] }}</a>
                  <ul class="dropdown-menu shadow">
                    @foreach ($link['children'] as $level2)
                      @php
                        $l2Href = getUserHref($level2);
                      @endphp
                      <li><a class="dropdown-item" href="{{ $l2Href }}"
                          target="{{ $level2['target'] }}">{{ $level2['text'] }}</a>
                      </li>
                    @endforeach
                  </ul>
                </li>
              @endif
            @endforeach
          </ul>
          <!-- Header Buttons -->
          <div class="header-right ms-auto">
            <div class="header-right-14-inner">
              <ul class="menu reset-ul">
                @php
                  $customer = Auth::guard('customer')->user();
                  $customer_id = $customer ? $customer->id : null;

                  $wishlistCount = $customer_id
                      ? \App\Models\User\CustomerWishList::where('customer_id', $customer_id)->count()
                      : 0;
                @endphp

                <li class="menu-item menu-wishlist" id="wishlistIconWrapper">
                  <a href="{{ route('customer.wishlist', getParam()) }}" class="menu-link">
                    <i class="fal fa-heart">
                      <span class="badge wishlist-count">{{ $wishlistCount }}</span>
                    </i>
                    {{ $keywords['Wishlist'] ?? __('Wishlist') }}
                  </a>
                </li>
                @php
                  $crt = Session::get('cart');
                  $crtTotal = 0;
                  $countitem = 0;

                  if ($crt) {
                      foreach ($crt as $p) {
                          $crtTotal += $p['total'];
                          $countitem += $p['qty'];
                      }
                  }
                @endphp
                @if (!empty($userShopSetting) && empty($userShopSetting->catalog_mode))
                  <li class="menu-item main-header-icon" id="cartIconWrapper">
                    <a href="javascript:void(0)" class="menu-link">
                      <i class="fal fa-shopping-cart">
                        <span class="badge cart-dropdown-count">{{ $crt ? $countitem : 0 }}</span>
                      </i>
                      {{ $keywords['Cart'] ?? 'Cart' }}
                    </a>
                    <div class="mini-cart-item">
                      @if ($crt)
                        <div class="cart-item-wrapper">
                          @foreach ($crt as $key => $item)
                            @php
                              $id = $item['id'];
                              $product = App\Models\User\UserItem::findOrFail($item['id']);
                            @endphp
                            <div class="cart-item">
                              <div class="cart-img">
                                <a
                                  href="{{ route('front.user.item_details', ['slug' => $item['slug'], getParam()]) }}">
                                  <img
                                    src="{{ asset('assets/front/img/user/items/thumbnail/' . $product->thumbnail) }}"
                                    class="" alt="Microwear Watch">
                                </a>
                              </div>

                              <div class="cart-info">
                                <a href="{{ route('front.user.item_details', ['slug' => $item['slug'], getParam()]) }}"
                                  class="title">{{ strlen($item['name']) > 20 ? mb_substr($item['name'], 0, 20, 'UTF-8') . '...' : $item['name'] }}</a>

                                (<span class="price_quantity">
                                  {{ $kewords['qty'] ?? __('Qty') }} :
                                  {{ $item['qty'] }}
                                  ,
                                  <span>
                                    {{ $kewords['total'] ?? __('Total') }} :
                                    {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                                    {{ $item['total'] }}
                                    {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                                  </span></span>)
                                @if (!empty($item['variations']))
                                  @foreach ($item['variations'] as $k => $itm)
                                    <table class="variation-table">
                                      <tr>
                                        <td class="">
                                          <strong>{{ $k }}
                                            &nbsp;
                                        </td>
                                        <td>{{ $itm['name'] }} &nbsp; +
                                        </td>
                                        <td>&nbsp;
                                          {{ $be->base_currency_symbol_position == 'left' ? $be->base_currency_symbol : '' }}
                                          {{ $itm['price'] * $item['qty'] }}
                                          ;
                                          {{ $be->base_currency_symbol_position == 'right' ? $be->base_currency_symbol : '' }}
                                        </td>
                                      </tr>
                                    </table>
                                  @endforeach
                                @endif
                              </div>

                              <div class="cart-remove remove">
                                <div class="checkbox">
                                  <a class="fas d-block fa-times cursor-pointer item-remove"
                                    rel="{{ $id }}"
                                    data-href="{{ route('front.cart.item.remove', ['uid' => $key, getParam()]) }}"></a>
                                </div>
                              </div>
                            </div>
                          @endforeach
                        </div>

                        <div class="cart-total d-flex justify-content-between pb-10">
                          <span><b>{{ $keywords['total'] ?? __('Total') }}</b></span>
                          <span
                            class="price"><b>{{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                              {{ $crtTotal }}
                              {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}</b></span>
                        </div>

                        <div class="cart-button">
                          <a href="{{ route('front.user.cart', getParam()) }}"
                            class="btn btn-md thm-btn main-btn">{{ $keywords['view_cart'] ?? __('View Cart') }}</a>
                          <a href="{{ route('front.user.checkout', getParam()) }}"
                            class="btn btn-md thm-btn main-btn">{{ $keywords['Checkout'] ?? __('Checkout') }}</a>
                        </div>
                      @else
                        {{ $keywords['cart_empty'] ?? __('your cart is empty !') }}
                      @endif
                    </div>
                  </li>
                @endif
              </ul>
            </div>
          </div>
        </div> <!-- navbar-collapse.// -->
      </div> <!-- container.// -->
    </nav>
  </div>
</header>
<!--========= End Header ==========-->

<!-- Start Mobile-menu -->   
<div class="offcanvas mobilemenuoffcanvas offcanvas-start" data-bs-scroll="true" data-bs-backdrop="true"
  tabindex="-1" id="mobilemenu-offcanvas">
  <div class="offcanvas-header align-items-center justify-content-between px-20 pt-20">
    <a class="navbar-brand" href="{{ route('front.user.detail.view', getParam()) }}">
      <img width="150" class="lazyload blur-up" src="{{ asset('assets/front/img/user/' . $userBs->logo) }}"
        alt="logo">
    </a>
    <a href="#" class="menu-close" data-bs-dismiss="offcanvas" aria-label="Close">
      <i class="fa-light fa-xmark"></i>
    </a>
  </div>
  <div class="offcanvas-body">

    <div class="mobile-search">
      <form class="search-form" action="#">
        <div class="search-input">
          <input type="text" class="form-control" value="" placeholder="I'm searching for..."
            name="keyword">
        </div>
        <button class="btn btn-icon" type="submit">
          <i class="fal fa-search"></i>
        </button>
      </form>
    </div>

    <!-- mobile-menu clone -->
    <nav id="mobileMenu" class="mobile-menu mb-40">

    </nav>
    <!-- menu-action-item-wrapper -->
    <div class="menu-action-item-wrapper">
      <div class="menu-action-item">
        @php
          $currentLang = $userCurrentLang ?? null; 
        @endphp

        <a href="javascript:void(0)">
          <span class="icon">
            <i class="fal fa-globe"></i>
          </span>
          {{ $currentLang ? convertUtf8($currentLang->name) : 'Language' }}
          <span class="plus-icon"><i class="fal fa-plus"></i></span>
        </a>

        <ul class="setting-dropdown">
          @foreach ($userLangs as $userLang)
            <li>
              <a class="menu-link" href="javascript:void(0)" onclick="changeUserLang('{{ $userLang->code }}')">
                {{ convertUtf8($userLang->name) }}
              </a>
            </li>
          @endforeach
        </ul>

        <form id="userLangFormsDynamic" action="{{ route('change.User.Language', getParam()) }}" method="POST"
          style="display:none">
          @csrf
          <input type="hidden" name="username" value="{{ $user->username }}">
          <input type="hidden" name="code" id="dynamic-lang-code">
        </form>
      </div>
      <div class="menu-action-item">
        @guest('customer')
          <a href="javascript:void(0)">
            <span class="icon">
              <i class="fa-light fa-user-circle"></i>
            </span>
            {{ $keywords['Login'] ?? __('Login') }}
            <span class="plus-icon"><i class="fal fa-plus"></i></span>
          </a>
          <ul class="setting-dropdown">
            <li>
              <a class="menu-link"
                href="{{ route('customer.login', getParam()) }}">{{ $keywords['Login'] ?? __('Login') }}</a>
            </li>
            <li><a class="menu-link"
                href="{{ route('customer.signup', getParam()) }}">{{ $keywords['Signup'] ?? __('Signup') }}</a>
            </li>
          </ul>
        @endguest
        @auth('customer')
          <a href="javascript:void(0)">
            <span class="icon">
              <i class="fa-light fa-user-circle"></i>
            </span>
            {{ $keywords['Dashboard'] ?? __('Dashboard') }}
            <span class="plus-icon"><i class="fal fa-plus"></i></span>
          </a>
          <ul class="setting-dropdown">
            <li>
              <a class="menu-link"
                href="{{ route('customer.dashboard', getParam()) }}">{{ $keywords['Dashboard'] ?? __('Dashboard') }}</a>
            </li>
            <li>
              <a class="menu-link"
                href="{{ route('customer.logout', getParam()) }}">{{ $keywords['Signout'] ?? __('Sign out') }}</a>
            </li>
          </ul>
        @endauth
      </div>
    </div>
  </div>
</div>
<!-- End Mobile-menu -->

{{-- Responsive Bottom Toolbar --}}
@php
  $customer = Auth::guard('customer')->user();
  $customer_id = $customer ? $customer->id : null;

  $wishlistCount = $customer_id
      ? \App\Models\User\CustomerWishList::where('customer_id', $customer_id)->count()
      : 0;

  $crt = Session::get('cart');
  $countitem = 0;

  if ($crt) {
      foreach ($crt as $p) {
          $countitem += $p['qty'];
      }
  }
@endphp

<div class="mobile-bottom-toolbar d-block d-xl-none">
  <div class="container">
    <nav class="toolbar" id="nav">
      <ul class="toolbar-nav">

        {{-- Home --}}
        <li class="tolbar-item">
          <a class="{{ request()->routeIs('front.user.detail.view') ? 'active' : '' }}"
             href="{{ route('front.user.detail.view', getParam()) }}" target="_self">
            <i class="fal fa-home"></i>
            <span>{{ $keywords['Home'] ?? __('Home') }}</span>
          </a>
        </li>

        {{-- Cart --}}
        <li class="tolbar-item">
          <a class="{{ request()->routeIs('front.user.cart') ? 'active' : '' }}"
             href="{{ route('front.user.cart', getParam()) }}" target="_self">
            <i class="fal fa-shopping-bag"></i>
            <span>{{ $keywords['Cart'] ?? __('Cart') }}</span>
            <span class="badge cart-dropdown-count">{{ $crt ? $countitem : 0 }}</span>
          </a>
        </li>

        {{-- Wishlist --}}
        <li class="tolbar-item">
          <a class="{{ request()->routeIs('customer.wishlist') ? 'active' : '' }}"
             href="{{ route('customer.wishlist', getParam()) }}" target="_self">
            <i class="fal fa-heart"></i>
            <span>{{ $keywords['Wishlist'] ?? __('Wishlist') }}</span>
            <span class="badge wishlist-count">{{ $wishlistCount }}</span>
          </a>
        </li>

        {{-- Account / Login --}}
        <li class="tolbar-item">
          @auth('customer')
            <a class="{{ request()->routeIs('customer.dashboard') ? 'active' : '' }}"
               href="{{ route('customer.dashboard', getParam()) }}" target="_self">
              <i class="fal fa-user"></i>
              <span>{{ $keywords['Dashboard'] ?? __('Dashboard') }}</span>
            </a>
          @endauth

          @guest('customer')
            <a class="{{ request()->routeIs('customer.login') ? 'active' : '' }}"
               href="{{ route('customer.login', getParam()) }}" target="_self">
              <i class="fal fa-user"></i>
              <span>{{ $keywords['Login'] ?? __('Login') }}</span>
            </a>
          @endguest
        </li>
      </ul>
    </nav>
  </div>
</div>

