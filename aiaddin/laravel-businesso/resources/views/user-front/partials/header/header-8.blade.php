  <!--====== OFFCANVAS MENU PART START ======-->
  @php
    $phone_numbers = !empty($userContact->contact_numbers) ? explode(',', $userContact->contact_numbers) : [];
    $emails = !empty($userContact->contact_mails) ? explode(',', $userContact->contact_mails) : [];
  @endphp

  <div class="off_canvars_overlay">
  </div>
  <div class="offcanvas_menu">
    <div class="container-fluid">
      <div class="row">
        <div class="col-12">
          <div class="offcanvas_menu_wrapper">
            <div class="canvas_close">
              <a href="javascript:void(0)"><i class="fal fa-times"></i></a>
            </div>
            @if (isset($social_medias))
              <div class="header-social">
                <ul class="text-center">
                  @foreach ($social_medias as $social_media)
                    <li><a href="{{ $social_media->url }}"><i class="{{ $social_media->icon }}"></i></a></li>
                  @endforeach
                </ul>
              </div>
            @endif

            <div class="header-top-btns pt-10 pb-10 d-flex justify-content-center">
              <div class="language-btn">
                <form action="{{ route('changeUserLanguage', getParam()) }}" id="userLangForms">
                  @csrf
                  <input type="hidden" name="username" value="{{ $user->username }}">
                  <select onchange="submit()" name="code" id="lang-code" class="form-control btn-sm">
                    @foreach ($userLangs as $userLang)
                      <option {{ $userCurrentLang->id == $userLang->id ? 'selected' : '' }}
                        value="{{ $userLang->code }}">
                        {{ convertUtf8($userLang->name) }}</option>
                    @endforeach
                  </select>
                </form>
              </div>
            </div>
            <div class="header-btn d-flex justify-content-center">
              @guest('customer')
                <a class="main-btn"
                  href="{{ route('customer.login', getParam()) }}">{{ $keywords['Login'] ?? __('Login') }}</a>
              @endguest
              @auth('customer')
                <a class="main-btn"
                  href="{{ route('customer.dashboard', getParam()) }}">{{ $keywords['Dashboard'] ?? __('Dashboard') }}</a>
              @endauth
            </div>
            <div id="menu" class="text-left ">
              <ul class="offcanvas_main_menu">
                @php
                  $links = json_decode($userMenus, true);
                @endphp
                @foreach ($links as $link)
                  @php
                    $href = getUserHref($link);
                  @endphp
                  @if (!array_key_exists('children', $link))
                    <li><a target="{{ $link['target'] }}" href="{{ $href }}">
                        {{ $link['text'] }}</a></li>
                  @else
                    <li class="menu-item-has-children active">
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
            </div>
            @if (count($emails) > 0)
              <div class="offcanvas_footer">
                <span>
                  @foreach ($emails as $email)
                    @if ($loop->last)
                      <a href="mailto: {{ $email }}"><i class="fa fa-envelope-o"></i>
                        {{ $email }}</a>
                    @endif
                  @endforeach
                </span>
              </div>
            @endif
          </div>
        </div>
      </div>
    </div>
  </div>

  <!--====== OFFCANVAS MENU PART ENDS ======-->

  <!--====== HEADER PART START ======-->

  <header class="header-area">
    <div class="header-top d-none d-lg-block">
      <div class="container">
        <div class="row">
          <div class="col-lg-12">
            <div class="header-top-item d-flex justify-content-between align-items-center">
              @if (isset($social_medias))
                <div class="header-social">
                  <ul class="">
                    @foreach ($social_medias as $social_media)
                      <li><a href="{{ $social_media->url }}"><i class="{{ $social_media->icon }}"></i></a></li>
                    @endforeach
                  </ul>
                </div>
              @endif
              <div class="header-top-btns d-flex">
                <div class="language-btn">
                  <form action="{{ route('changeUserLanguage', getParam()) }}" id="userLangForms">
                    @csrf
                    <input type="hidden" name="username" value="{{ $user->username }}">
                    <span class="language-icon"><i class="fal fa-globe"></i></span>
                    <select onchange="submit()" name="code" id="lang-code" class="form-control btn-sm">
                      @foreach ($userLangs as $userLang)
                        <option {{ $userCurrentLang->id == $userLang->id ? 'selected' : '' }}
                          value="{{ $userLang->code }}">
                          {{ convertUtf8($userLang->name) }}</option>
                      @endforeach
                    </select>
                  </form>
                </div>
              </div>
              <div class="header-top-help">
                @if (count($phone_numbers) > 0)
                  @foreach ($phone_numbers as $phone_number)
                    @if ($loop->last)
                      <p>{{ $keywords['Need_help'] ?? __('Need help?') }} <a href="tel: {{ $phone_number }}">
                          {{ $keywords['Talk_to_an_expert'] ?? __('Talk to an expert') }}:
                          {{ $phone_number }}</a>
                      </p>
                    @endif
                  @endforeach
                @endif
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="main-header">
      <div class="container">
        <div class="row">
          <div class="col-lg-12">
            <div class="main-header-item d-flex justify-content-between align-items-center">
              <div class="canvas_open d-block d-lg-none">
                <a href="javascript:void(0)"><i class="fal fa-bars"></i></a>
              </div>
              <div class="header-logo">
                @if (!empty($userBs->logo))
                  <a href="{{ route('front.user.detail.view', getParam()) }}">
                    <img class="lazy" data-src="{{ asset('assets/front/img/user/' . $userBs->logo) }}"
                      alt="Logo">
                  </a> <!-- logo -->
                @endif
              </div>
              {{-- {{ route('front.user.shop', getParam()) . '?category=' . urlencode($category->slug) }} --}}
              <div class="main-header-search d-none d-lg-block">
                <form id="searchForm" action="{{ route('front.user.shop', getParam()) }}" method="get"
                  action="#">
                  <div class="input-box d-flex align-items-center">
                    <select name="category">
                      <option value="">{{ $keywords['All'] ?? __('All') }}</option>
                      @foreach ($categories as $category)
                        <option {{ request('category') == urlencode($category->slug) ? 'selected' : '' }}
                          value="{{ urlencode($category->slug) }}">{{ $category->name }}
                        </option>
                      @endforeach
                    </select>
                    <input type="text" name="search"
                      value="{{ request()->input('search') ? request()->input('search') : '' }}"
                      placeholder="{{ $keywords['Search_your_keyword'] ?? __('Search your keyword') }} .....">
                    <button id="search-button" type="submit"><i class="fal fa-search"></i></button>
                  </div>
                </form>
              </div>
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
              <div class="main-header-icon">
                <ul>
                  @if (!empty($userShopSetting) && empty($userShopSetting->catalog_mode))
                    <li class="cart-item" id="cartIconWrapper">
                      <a href="#">
                        <i class="fal fa-shopping-cart"></i>
                        <span class="badge badge-light">{{ $crt ? $countitem : 0 }}</span>
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
                                    href="{{ route('front.user.item_details', ['slug' => $item['slug'], getParam()]) }}"><img
                                      src="{{ asset('assets/front/img/user/items/thumbnail/' . $product->thumbnail) }}"
                                      class="" alt=""></a>
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
                          <div class="cart-button ">
                            <a href="{{ route('front.user.cart', getParam()) }}"
                              class="main-btn">{{ $keywords['view_cart'] ?? __('View Cart') }}</a>
                            <a href="{{ route('front.user.checkout', getParam()) }}"
                              class="main-btn">{{ $keywords['Checkout'] ?? __('Checkout') }}</a>
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
        </div>
      </div>
    </div>

    <div class="header_bottom header-sticky">
      <div class="container">
        <div class="row">
          <div class="col-lg-12">
            <!--main menu start-->
            <div
              class="main_menu menu_two d-flex justify-content-lg-between justify-content-center align-items-center">
              <div class="main-header-search d-block d-lg-none">
                <form id="searchForm" action="{{ route('front.user.shop', getParam()) }}" method="get"
                  action="#">
                  <div class="input-box d-flex align-items-center">
                    <select name="category_id">
                      <option value=" ">{{ $keywords['All'] ?? __('All') }}</option>
                      @foreach ($categories as $category)
                        <option value="{{ $category->id }}">{{ $category->name }}</option>
                      @endforeach
                    </select>
                    <input type="text" name="search" placeholder="Enter your keywords.....">
                    <button id="search-button" type="submit"><i class="fal fa-search"></i></button>
                  </div>
                </form>
              </div>
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
                      <li>
                        <a class="{{ url()->current() == $href ? 'active' : '' }}" target="{{ $link['target'] }}"
                          href="{{ $href }}">
                          {{ $link['text'] }}</a>
                      </li>
                    @else
                      <li class="">
                        <a class="{{ url()->current() == $href ? 'active' : '' }}" target="{{ $link['target'] }}"
                          href="{{ $href }}">{{ $link['text'] }} <i class="fal fa-angle-down"></i></a>
                        <ul class="sub_menu">
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
              <div class="header-btn d-none d-lg-block">
                @if (in_array('Ecommerce', $packagePermissions) ||
                        in_array('Hotel Booking', $packagePermissions) ||
                        in_array('Course Management', $packagePermissions))
                  @guest('customer')
                    <a class="main-btn"
                      href="{{ route('customer.login', getParam()) }}">{{ $keywords['Login'] ?? __('Login') }}</a>
                  @endguest
                  @auth('customer')
                    <a class="main-btn"
                      href="{{ route('customer.dashboard', getParam()) }}">{{ $keywords['Dashboard'] ?? __('Dashboard') }}</a>
                  @endauth
                @endif
              </div>
            </div>
            <!--main menu end-->
          </div>
        </div>
      </div>
    </div>
  </header>

  <!--====== HEADER PART ENDS ======-->
