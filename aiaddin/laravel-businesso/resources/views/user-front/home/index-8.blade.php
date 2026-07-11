@extends('user-front.layout')
@section('tab-title')
  {{ $keywords['Home'] ?? 'Home' }}
@endsection
@php
  Config::set('app.timezone', $userBs->timezoneinfo->timezone ?? '');
@endphp
@section('meta-description', !empty($userSeo) ? $userSeo->home_meta_description : '')
@section('meta-keywords', !empty($userSeo) ? $userSeo->home_meta_keywords : '')
@section('content')
  <!--====== BANNER PART START ======-->

  <section class="banner-area pb-45">
    <div class="container">
      <div class="row">

        @if ($home_sections->category_section == 1)
          <div class="col-lg-3 col-md-5">
            <div class="categories_wrap mt-30">
              <button type="button" data-toggle="collapse" data-target="#navCatContent" aria-expanded="false"
                class="categories_btn">
                <i class="far fa-bars"></i><span>{{ $keywords['Category'] ?? 'Category' }} </span>
              </button>
              <div id="navCatContent" class="nav_cat navbar collapse">
                <ul class="accordion" id="accordionExample">
                  @foreach ($categories->take(6) as $category)
                    <li>
                      <div class="card">
                        <a class="card-header"
                          @if (empty($category->subcategories->count())) href="{{ route('front.user.shop', getParam()) . '?category=' . urlencode($category->slug) }}"
                                                @else
                                                data-toggle="collapse" data-target="#collapse{{ $category->id }}" @endif
                          aria-expanded="false">{{ $category->name }} </a>
                        <div id="collapse{{ $category->id }}" class="collapse" data-parent="#accordionExample">
                          @if ($category->subcategories->count())
                            <div class="card-body">
                              @foreach ($category->subcategories as $sub)
                                <a
                                  href="{{ route('front.user.shop', getParam()) . '?category=' . urlencode($category->slug) . '&subcategory=' . urlencode($sub->slug) }}">{{ ucfirst($sub->name) }}</a>
                              @endforeach
                            </div>
                          @endif
                        </div>
                      </div>
                    </li>
                  @endforeach
                  <li>
                    <ul class="more_slide_open">
                      @foreach ($categories->skip(6) as $cat)
                        <li>
                          <div class="card">
                            <a class="card-header"
                              @if (empty($cat->subcategories->count())) href="{{ route('front.user.shop', getParam()) . '?category=' . urlencode($cat->slug) }}"
                                                        @else
                                                        data-toggle="collapse" data-target="#collapse{{ $cat->id }}" @endif
                              aria-expanded="false">{{ $cat->name }}</a>
                            <div id="collapse{{ $cat->id }}" class="collapse" data-parent="#accordionExample">
                              @if ($cat->subcategories->count())
                                <div class="card-body">
                                  @foreach ($cat->subcategories as $subs)
                                    <a
                                      href="{{ route('front.user.shop', getParam()) . '?category=' . urlencode($cat->slug) . '&subcategory=' . urlencode($subs->slug) }}">{{ ucfirst($subs->name) }}</a>
                                  @endforeach
                                </div>
                              @endif
                            </div>
                          </div>
                        </li>
                      @endforeach
                    </ul>
                  </li>
                </ul>
                @if ($categories->count() > 6)
                  <div class="more_categories"><i class="fal fa-plus"></i>
                    <span>{{ $keywords['Show_More'] ?? 'Show more' }}</span>
                  </div>
                @endif
              </div>
            </div>
          </div>
        @endif

        <div
          class="col-lg-{{ isset($home_sections->category_section) && $home_sections->category_section ? '9' : '12' }}">

          @if (isset($home_sections->slider_section) && $home_sections->slider_section == 1)
            @if (count($sliders) > 0)
              <div class="banner-slide mt-30">
                @foreach ($sliders as $slider)
                  <div class="banner-item  bg_cover d-flex align-items-center lazy"
                    data-bg="{{ asset('assets/front/img/hero_slider/' . $slider->img) }}">
                    <div class="banner-content pl-100">
                      <h2 data-animation="fadeInLeft" data-delay=".7s" class="title">
                        {{ $slider->title }}
                      </h2>
                      <p data-animation="fadeInLeft" data-delay="1s"> {{ $slider->subtitle }}</p>
                      @if (!empty($slider->btn_url))
                        <a data-animation="fadeInLeft" target="_blank" data-delay="1.3s" class="main-btn"
                          href="{{ $slider->btn_url }}">{{ $slider->btn_name }}
                          +</a>
                      @endif
                    </div>
                  </div>
                @endforeach
              </div>
            @else
              <div class="banner-slide mt-30 ">
                <div class="banner-item  bg_cover d-flex align-items-center lazy"
                  data-bg="{{ asset('assets/front/img/hero_slider/845X465.png') }}">
                  <div class="banner-content pl-100">
                    <span data-animation="fadeInLeft" data-delay=".4s">{{ __('Heading') }} </span>
                    <h1 data-animation="fadeInLeft" data-delay=".7s" class="title">
                      {{ __('Title') }}
                    </h1>
                    <p data-animation="fadeInLeft" data-delay="1.s">{{ __('subtitle') }} </p>
                    <a data-animation="fadeInLeft" data-delay="1.3s" class="main-btn"
                      href="#">{{ __('Button') }}</a>
                  </div>
                </div>
              </div>
            @endif
          @endif

          <div class="banner-services pt-25">
            @if (isset($home_sections->featured_section) && $home_sections->featured_section == 1)
              <div class="row">
                @if (count($features) > 0)
                  @foreach ($features as $feature)
                    <div class="col-md-4">
                      <div class="banner-services-item mt-30">
                        <img data-src="{{ asset('assets/front/img/user/feature/' . $feature->icon) }}" class="lazy"
                          alt="services">
                        <div class="content">
                          <h4 class="title">{{ $feature->title }}</h4>
                          <p>{{ $feature->text }}</p>
                        </div>
                      </div>
                    </div>
                  @endforeach
                @endif
              </div>
            @endif
          </div>
        </div>
      </div>
  </section>

  <!--====== BANNER PART ENDS ======-->

  <!--====== SUB PART START ======-->
  @if ($home_sections->offer_banner_section == 1)
    <section class="sub-area">
      <div class="container">
        <div class="row justify-content-center">
          @if (count($topbanners) > 0)
            @foreach ($topbanners as $banner)
              <div class="col-lg-4 col-md-7">
                <div class="sub-item mt-30">
                  <a href="{{ $banner->url }}" target="_blank">
                    <img class="lazy" data-src="{{ asset('assets/front/img/user/offers/' . $banner->image) }}"
                      alt="sub">
                    <div class="sub-content">
                      <span>{{ $banner->text_1 }}</span><br>

                      <h3 class="title">{{ $banner->text_2 }}</h3>

                      <p>{{ $banner->text_3 }}</p>
                    </div>
                  </a>
                </div>
              </div>
            @endforeach
          @endif
        </div>
      </div>
    </section>
  @endif
  <!--====== SUB PART ENDS ======-->

  <!--====== ELECTRONICS PRODUCT PART START ======-->
  <section class="electronics-product-area">
    @if ($home_sections->featured_item_section == 1)

      <div class="container">
        <div class="row">
          <div class="col-lg-12">
            <div class="section-title">
              <div class="row">
                <div class="col-md-8">
                  <div class="electronics-title d-flex align-items-center mb-20">
                    <h3 class="title">
                      {{ $home_text->feature_item_title ?? ($keywords['Feature_Item'] ?? 'Feature Item') }}
                    </h3>
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="d-flex justify-content-md-end mb-20">
                    <div class="electronics-arrows"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        @if ($featured_items->count())
          <div class="row electronics-active">
            @foreach ($featured_items as $item)
              @php
                $variations = App\Models\User\UserItemVariation::where('item_id', $item->item_id)
                    ->where('language_id', $userCurrentLang->id)
                    ->get();
                $itemstock = $item->stock;
                if (count($variations) == 0) {
                    if ($itemstock > 0) {
                        $stock = true;
                    } else {
                        $stock = false;
                    }
                    $variations = null;
                } else {
                    $stock = true;
                    $tstock = '';
                    if (count($variations)) {
                        foreach ($variations as $varkey => $varvalue) {
                            $tstock = array_sum(json_decode($varvalue->option_stock));
                            if ($tstock == 0) {
                                $stock = false;
                            }
                        }
                    } else {
                        $stock = true;
                    }
                }
                $isFlash = App\Http\Helpers\CheckFlashItem::isFlashItem($item->item_id);
              @endphp
              <div class="electronics-product-item mt-30">
                <div class="electronics-product-thumb">
                  <a class="d-block"
                    href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}">
                    <img data-src="{{ asset('assets/front/img/user/items/thumbnail/' . $item->thumbnail) }}"
                      class="lazy" alt="electronics">
                  </a>
                  @if ($isFlash)
                    <span class="flash-badge"><i class="fas fa-bolt"></i>
                      -{{ $item->flash_percentage }}% </span>
                    @php
                      $n_price = $item->current_price - ($item->flash_percentage * $item->current_price) / 100;
                    @endphp
                  @else
                    @php
                      $n_price = $item->current_price;
                    @endphp
                  @endif

                  @php
                    $dt = Carbon\Carbon::parse($item->end_date);
                    $year = $dt->year;
                    $month = $dt->month;
                    $day = $dt->day;
                    $end_time = Carbon\Carbon::parse($item->end_time);
                    $hour = $end_time->hour;
                    $minute = $end_time->minute;
                    $now = str_replace('+00:00', '.000' . $userBs->timezoneinfo->gmt_offset . '00:00', gmdate('c'));
                  @endphp

                  @if ($isFlash)
                    <div class="product-countdown" data-year="{{ $year }}" data-month="{{ $month }}"
                      data-day="{{ $day }}" data-hour="{{ $hour }}"
                      data-minute="{{ $minute }}" data-timezone="{{ $userBs->timezoneinfo->gmt_offset }}"
                      data-now="{{ $now }} ">
                    </div>
                  @endif

                  @if ($item->type == 'physical')
                    @if ($stock == false)
                      <span class="stock-label">{{ $keywords['Out_of_Stock'] ?? 'Out of Stock' }}</span>
                    @endif
                  @endif
                </div>
                <div class="electronics-product-content text-center">
                  <a class="d-block"
                    href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}">
                    <h6 title="{{ $item->title }}">
                      {{ strlen($item->title) > 35 ? mb_substr($item->title, 0, 35, 'UTF-8') . '...' : $item->title }}
                    </h6>
                  </a>

                  <div class="review-price">
                    @if (!empty($userShopSetting) && $userShopSetting->item_rating_system)
                      <div class="rate mx-auto">
                        <div class="rating" style="width:{{ $item->rating * 20 }}%"></div>
                      </div>
                    @endif
                    <span class="price">
                      {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                      {{ formatNumber($n_price) }}
                      {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                    </span>
                    @if ($isFlash)
                      <span class="previous-price">
                        {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                        <span>{{ formatNumber($item->current_price) }}</span>
                        {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                      </span>
                    @elseif($item->previous_price > 0)
                      <span class="previous-price">
                        {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                        <span>{{ formatNumber($item->previous_price) }}</span>
                        {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                      </span>
                    @endif
                  </div>
                </div>

                <div class="product-buy-btn text-center">
                  <ul>
                    <li>
                      <a title="{{ $keywords['Details'] ?? 'Details' }}"
                        href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}"><i
                          class="fal fa-eye"></i></a>
                    </li>

                    <li>
                      @if (!empty($userShopSetting) && empty($userShopSetting->catalog_mode) && $userShopSetting->is_shop)
                        <a class=" main-btn cart-link cursor-pointer"
                          data-title="{{ strlen($item->title) > 30 ? mb_substr($item->title, 0, 30, 'UTF-8') . '...' : $item->title }}"
                          data-current_price="{{ $n_price }}" data-item_id="{{ $item->item_id }}"
                          data-flash_percentage="{{ $item->flash_percentage ?? 0 }}"
                          data-variations="{{ json_encode($variations) }}"
                          data-href="{{ route('front.user.add.cart', ['id' => $item->item_id, getParam()]) }}"
                          data-toggle="tooltip" data-placement="top"
                          title="{{ $keywords['Add_to_cart'] ?? 'Add to cart' }}"><i class="fal fa-shopping-cart "></i>
                          {{ $keywords['Add_to_cart'] ?? 'Add to cart' }}
                        </a>
                      @endif
                    </li>
                    <li>
                      <a class="add-to-wish cursor-pointer" data-toggle="tooltip" data-placement="top"
                        data-item_id="{{ $item->item_id }}"
                        data-href="{{ route('front.user.add.wishlist', ['id' => $item->item_id, getParam()]) }}">
                        @if (!empty($myWishlist) && in_array($item->item_id, $myWishlist))
                          <i class="fa fa-heart"></i>
                        @else
                          <i class="far fa-heart"></i>
                        @endif
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            @endforeach
          </div>
        @else
          {{ $keywords['No_Feature_Item_Found'] ?? 'No Feature Item Found!' }}
        @endif
      </div>
    @endif
  </section>

  <!--====== ELECTRONICS PRODUCT PART ENDS ======-->

  <!--====== SHOP HOME 1 PART START ======-->

  <section class="shop-home-1-area pb-60">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-lg-3 col-md-5 col-sm-7">
          <div class="shop-home-sidebar mt-30">
            @if ($home_sections->left_offer_banner_section == 1)
              @foreach ($leftbanners->take(1) as $lbanner)
                <div class="shop-introducing-item">
                  <img class="lazy" data-src="{{ asset('assets/front/img/user/offers/' . $lbanner->image) }}"
                    alt="">
                  <div class="shop-introducing-content">
                    <span>{{ $lbanner->text_1 }}</span>
                    <h3 class="title">{{ $lbanner->text_2 }}</h3>
                    <a class="main-btn" target="_blank"
                      href="{{ $lbanner->url }}">{{ $keywords['shop_now'] ?? __('Shop Now') }}</a>
                  </div>
                  <div class="shop-item">
                    <span>{{ $lbanner->text_3 }}</span>
                  </div>
                </div>
              @endforeach
            @endif
            @if ($home_sections->newsletter_section == 1)
              <div class="shop-lookbook-item newsletter mt-75 mb-50">
                <div class="shop-lookbook-title">
                  <h5 class="title">
                    {{ $home_text->newsletter_subtitle ?? ($keywords['newsletter'] ?? 'Newsletter') }}
                  </h5>
                </div>
                <h6 class="text-muted">
                  {{ $home_text->newsletter_title ?? ($keywords['Receive_Latest_Updates'] ?? 'Receive Latest Updates') }}
                </h6>
                <div class="newsletter-form mt-3">
                  <form action="{{ route('front.user.subscriber', getParam()) }}" method="post"
                    enctype="multipart/form-data">
                    @csrf
                    <div class="row">
                      <div class="col-lg-12">
                        <div class="form_group">
                          <input type="email" class="form_control"
                            placeholder="{{ $keywords['Email_Address'] ?? 'Email Address' }}" name="email" required>
                        </div>
                      </div>
                      <div class="col-lg-12">
                        <div class="form_group">
                          <button type="submit"
                            class="main-btn btn-block">{{ $keywords['Subscribe'] ?? 'Subscribe' }}</button>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            @endif
            @if ($home_sections->left_offer_banner_section == 1)
              @foreach ($leftbanners->skip(1) as $lbanner)
                <div class="shop-introducing-item mb-20">
                  <img class="lazy" data-src="{{ asset('assets/front/img/user/offers/' . $lbanner->image) }}"
                    alt="">
                  <div class="shop-introducing-content">
                    <span>{{ $lbanner->text_1 }}</span>
                    <h3 class="title">{{ $lbanner->text_2 }}</h3>
                    <a class="main-btn" target="_blank"
                      href="{{ $lbanner->url }}">{{ $keywords['shop_now'] ?? __('Shop Now') }}</a>
                  </div>
                  <div class="shop-item">
                    <span>{{ $lbanner->text_3 }}</span>
                  </div>
                </div>
              @endforeach
            @endif
          </div>
        </div>
        <div class="col-lg-9">
          <div class="shop-home-area mt-30">
            @if ($home_sections->new_item_section == 1)
              <div class="new-product-list">
                <div class="new-product-title">
                  <h3 class="title">
                    {{ $home_text->new_item_title ?? ($keywords['New_item'] ?? 'New Items') }}</h3>
                </div>
              </div>
              <div class="row electronics-active-2">
                @if (count($new_items) > 0)
                  @foreach ($new_items as $item)
                    @php
                      $variations = App\Models\User\UserItemVariation::where('item_id', $item->item_id)
                          ->where('language_id', $userCurrentLang->id)
                          ->get();
                      $itemstock = $item->stock;
                      if (count($variations) == 0) {
                          if ($itemstock > 0) {
                              $stock = true;
                          } else {
                              $stock = false;
                          }
                          $variations = null;
                      } else {
                          $stock = true;
                          $tstock = '';
                          if (count($variations)) {
                              foreach ($variations as $varkey => $varvalue) {
                                  $tstock = array_sum(json_decode($varvalue->option_stock));
                                  if ($tstock == 0) {
                                      $stock = false;
                                  }
                              }
                          } else {
                              $stock = true;
                          }
                      }
                      $isFlash = App\Http\Helpers\CheckFlashItem::isFlashItem($item->item_id);
                    @endphp
                    <div class="electronics-product-item mt-30">
                      <div class="electronics-product-thumb">
                        <a class="d-block"
                          href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}">
                          <img src="{{ asset('assets/front/img/user/items/thumbnail/' . $item->thumbnail) }}"
                            class="" alt="electronics">
                        </a>
                        @if ($isFlash)
                          <span class="flash-badge"><i class="fas fa-bolt"></i>
                            -{{ $item->flash_percentage }}%</span>
                          @php
                            $n_price = $item->current_price - ($item->flash_percentage * $item->current_price) / 100;
                          @endphp
                        @else
                          @php
                            $n_price = $item->current_price;
                          @endphp
                        @endif
                        @php
                          $dt = Carbon\Carbon::parse($item->end_date);
                          $year = $dt->year;
                          $month = $dt->month;
                          $day = $dt->day;
                          $end_time = Carbon\Carbon::parse($item->end_time);
                          $hour = $end_time->hour;
                          $minute = $end_time->minute;
                          $now = str_replace(
                              '+00:00',
                              '.000' . $userBs->timezoneinfo->gmt_offset . '00:00',
                              gmdate('c'),
                          );

                        @endphp
                        @if ($isFlash)
                          <div class="product-countdown" data-year="{{ $year }}"
                            data-month="{{ $month }}" data-day="{{ $day }}"
                            data-hour="{{ $hour }}" data-now="{{ $now }}"
                            data-timezone="{{ $userBs->timezoneinfo->gmt_offset }}"
                            data-minute="{{ $minute }} ">
                          </div>
                        @endif

                        @if ($item->type == 'physical')
                          @if ($stock == false)
                            <span class="stock-label">{{ $keywords['Out_of_Stock'] ?? 'Out of Stock' }}</span>
                          @endif
                        @endif
                      </div>
                      <div class="electronics-product-content text-center">

                        <a class="d-block"
                          href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}">
                          <h6 title="{{ $item->title }}">
                            {{ strlen($item->title) > 30 ? mb_substr($item->title, 0, 30, 'UTF-8') . '...' : $item->title }}
                          </h6>
                        </a>
                        <div class="review-price">
                          @if (!empty($userShopSetting) && $userShopSetting->item_rating_system)
                            <div class="rate mx-auto">
                              <div class="rating" style="width:{{ $item->rating * 20 }}%">
                              </div>
                            </div>
                          @endif
                          <span class="price">
                            {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                            {{ formatNumber($n_price) }}
                            {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                          </span>
                          @if ($isFlash)
                            <span class="previous-price">
                              {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                              <span>{{ formatNumber($item->current_price) }}</span>
                              {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                            </span>
                          @elseif($item->previous_price > 0)
                            <span class="previous-price">
                              {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                              <span>{{ formatNumber($item->previous_price) }} </span>
                              {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                            </span>
                          @endif
                        </div>
                      </div>
                      <div class="product-buy-btn text-center">
                        <ul>
                          <li><a title="{{ $keywords['Details'] ?? 'Details' }}"
                              href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}"><i
                                class="fal fa-eye"></i></a></li>
                          <li>
                            @if (!empty($userShopSetting) && empty($userShopSetting->catalog_mode) && $userShopSetting->is_shop)
                              <a class=" main-btn cart-link cursor-pointer"
                                data-title="{{ strlen($item->title) > 26 ? mb_substr($item->title, 0, 26, 'UTF-8') . '...' : $item->title }}"
                                data-current_price="{{ $n_price }}"
                                data-flash_percentage="{{ $item->flash_percentage ?? 0 }}"
                                data-item_id="{{ $item->item_id }}" data-variations="{{ json_encode($variations) }}"
                                data-href="{{ route('front.user.add.cart', ['id' => $item->item_id, getParam()]) }}"
                                data-toggle="tooltip" data-placement="top" title="{{ __('Add to Cart') }}"><i
                                  class="fal fa-shopping-cart "></i>
                                {{ $keywords['Add_to_cart'] ?? 'Add to cart' }}
                              </a>
                            @endif
                          </li>
                          <li>
                            <a class="add-to-wish cursor-pointer" data-toggle="tooltip" data-placement="top"
                              data-item_id="{{ $item->item_id }}"
                              data-href="{{ route('front.user.add.wishlist', ['id' => $item->item_id, getParam()]) }}"
                              href="#">
                              @if (!empty($myWishlist) && in_array($item->item_id, $myWishlist))
                                <i class="fa fa-heart"></i>
                              @else
                                <i class="far fa-heart"></i>
                              @endif
                            </a>
                          </li>
                        </ul>
                      </div>
                    </div>
                  @endforeach
                @else
                  {{ $keywords['No_Item_Found!'] ?? 'No  Item Found!' }}
                @endif
              </div>
            @endif
            <div class="row justify-content-center">
              @if ($home_sections->toprated_item_section == 1)
                <div class="col-lg-4 col-md-6 col-sm-7">
                  <div class="shop-home-sidebar mt-30">
                    <div class="shop-lookbook-item mt-75">
                      <div class="shop-lookbook-title">
                        <h5 class="title">
                          {{ $home_text->toprated_item_title ?? ($keywords['Top_Rated_Items'] ?? 'Top Rated Items') }}
                        </h5>
                      </div>
                      <div class="shop-lookbook-slider">
                        @foreach ($rating_items as $item)
                          @php
                            $variations = App\Models\User\UserItemVariation::where('item_id', $item->item_id)
                                ->where('language_id', $userCurrentLang->id)
                                ->get();
                            $itemstock = $item->stock;
                            if (count($variations) == 0) {
                                if ($itemstock > 0) {
                                    $stock = true;
                                } else {
                                    $stock = false;
                                }
                                $variations = null;
                            } else {
                                $stock = true;
                                $tstock = '';
                                if (count($variations)) {
                                    foreach ($variations as $varkey => $varvalue) {
                                        $tstock = array_sum(json_decode($varvalue->option_stock));
                                        if ($tstock == 0) {
                                            $stock = false;
                                        }
                                    }
                                } else {
                                    $stock = true;
                                }
                            }
                            $isFlash = App\Http\Helpers\CheckFlashItem::isFlashItem($item->item_id);
                          @endphp
                          <div class="item mt-20">
                            @if ($isFlash)
                              <div class="label badge">-{{ $item->flash_percentage }}%
                              </div>
                              <span class="flash-badge"><i class="fas fa-bolt"></i></span>
                              @php
                                $n_price =
                                    $item->current_price - ($item->flash_percentage * $item->current_price) / 100;
                              @endphp
                            @else
                              @php
                                $n_price = $item->current_price;
                              @endphp
                            @endif
                            @php
                              $dt = Carbon\Carbon::parse($item->end_date);
                              $year = $dt->year;
                              $month = $dt->month;
                              $day = $dt->day;
                              $end_time = Carbon\Carbon::parse($item->end_time);
                              $hour = $end_time->hour;
                              $minute = $end_time->minute;
                              $now = str_replace(
                                  '+00:00',
                                  '.000' . $userBs->timezoneinfo->gmt_offset . '00:00',
                                  gmdate('c'),
                              );
                            @endphp

                            @php
                              $dt = Carbon\Carbon::parse($item->end_date);
                              $year = $dt->year;
                              $month = $dt->month;
                              $day = $dt->day;
                              $end_time = Carbon\Carbon::parse($item->end_time);
                              $hour = $end_time->hour;
                              $minute = $end_time->minute;
                            @endphp

                            @if ($item->type == 'physical')
                              @if ($stock == false)
                                <span class="stock-label">{{ $keywords['Out_of_Stock'] ?? 'Out of Stock' }}</span>
                              @endif
                            @endif
                            <a class="d-block"
                              href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}">
                              <img src="{{ asset('assets/front/img/user/items/thumbnail/' . $item->thumbnail) }}"
                                class="lazy" alt="electronics">

                            </a>

                            <a href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}">
                              <h6 class="title" title="{{ $item->title }}">
                                {{ strlen($item->title) > 20 ? mb_substr($item->title, 0, 20, 'UTF-8') . '...' : $item->title }}
                              </h6>
                            </a>
                            <div class="review-price">
                              @if (!empty($userShopSetting) && $userShopSetting->item_rating_system)
                                <div class="rate max-auto">
                                  <div class="rating" style="width:{{ $item->rating * 20 }}%">
                                  </div>
                                </div>
                              @endif
                              <span class="price">
                                {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                                {{ formatNumber($n_price) }}
                                {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                              </span>
                              @if ($isFlash)
                                <span class="previous-price">
                                  {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                                  <span>{{ formatNumber($item->current_price) }}</span>
                                  {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                                </span>
                              @elseif($item->previous_price > 0)
                                <span class="previous-price">
                                  {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                                  <span>{{ formatNumber($item->previous_price) }}</span>
                                  {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                                </span>
                              @endif
                              <a class="add-to-wish cursor-pointer" href="javascript:void(0)" data-toggle="tooltip"
                                data-placement="top" data-item_id="{{ $item->item_id }}"
                                data-href="{{ route('front.user.add.wishlist', ['id' => $item->item_id, getParam()]) }}">
                                @if (!empty($myWishlist) && in_array($item->item_id, $myWishlist))
                                  <i class="fa fa-heart"></i>
                                @else
                                  <i class="far fa-heart"></i>
                                @endif
                              </a>
                            </div>
                            <div class="item-cart">
                              @if (!empty($userShopSetting) && empty($userShopSetting->catalog_mode) && $userShopSetting->is_shop)
                                <a class="  cart-link cursor-pointer"
                                  data-title="{{ strlen($item->title) > 26 ? mb_substr($item->title, 0, 26, 'UTF-8') . '...' : $item->title }}"
                                  data-current_price="{{ $n_price }}"
                                  data-flash_percentage="{{ $item->flash_percentage ?? 0 }}"
                                  data-item_id="{{ $item->item_id }}"
                                  data-variations="{{ json_encode($variations) }}"
                                  data-href="{{ route('front.user.add.cart', ['id' => $item->item_id, getParam()]) }}"
                                  data-toggle="tooltip" data-placement="top"
                                  title="{{ $keywords['Add_to_cart'] ?? 'Add to cart' }}"><i
                                    class="fal fa-shopping-cart"></i>
                                </a>
                              @endif
                            </div>
                          </div>
                        @endforeach
                      </div>
                    </div>
                  </div>
                </div>
              @endif
              @if ($home_sections->bestseller_item_section == 1)
                <div class="col-lg-4 col-md-6 col-sm-7">
                  <div class="shop-home-sidebar mt-30">
                    <div class="shop-lookbook-item mt-75">
                      <div class="shop-lookbook-title">
                        <h5 class="title">
                          {{ $home_text->bestseller_item_title ?? ($keywords['Best_sellers'] ?? 'Best sellers') }}
                        </h5>
                      </div>
                      <div class="shop-lookbook-slider">
                        @foreach ($best_seller_items as $item)
                          @php
                            $variations = App\Models\User\UserItemVariation::where('item_id', $item->item_id)
                                ->where('language_id', $userCurrentLang->id)
                                ->get();
                            $itemstock = $item->stock;
                            if (count($variations) == 0) {
                                if ($itemstock > 0) {
                                    $stock = true;
                                } else {
                                    $stock = false;
                                }
                                $variations = null;
                            } else {
                                $stock = true;
                                $tstock = '';
                                if (count($variations)) {
                                    foreach ($variations as $varkey => $varvalue) {
                                        $tstock = array_sum(json_decode($varvalue->option_stock));
                                        if ($tstock == 0) {
                                            $stock = false;
                                        }
                                    }
                                } else {
                                    $stock = true;
                                }
                            }
                            $isFlash = App\Http\Helpers\CheckFlashItem::isFlashItem($item->item_id);
                          @endphp
                          <div class="item mt-20">
                            @if ($isFlash)
                              <div class="label badge">-{{ $item->flash_percentage }}%
                              </div>
                              <span class="flash-badge"><i class="fas fa-bolt"></i></span>
                              @php
                                $n_price =
                                    $item->current_price - ($item->flash_percentage * $item->current_price) / 100;
                              @endphp
                            @else
                              @php
                                $n_price = $item->current_price;
                              @endphp
                            @endif
                            @php
                              $dt = Carbon\Carbon::parse($item->end_date);
                              $year = $dt->year;
                              $month = $dt->month;
                              $day = $dt->day;
                              $end_time = Carbon\Carbon::parse($item->end_time);
                              $hour = $end_time->hour;
                              $minute = $end_time->minute;
                            @endphp

                            @if ($item->type == 'physical')
                              @if ($stock == false)
                                <span class="stock-label">{{ $keywords['Out_of_Stock'] ?? 'Out of Stock' }}</span>
                              @endif
                            @endif
                            <a class="d-block"
                              href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}">
                              <img src="{{ asset('assets/front/img/user/items/thumbnail/' . $item->thumbnail) }}"
                                class="lazy" alt="electronics">
                            </a>

                            <a href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}">
                              <h6 class="title" title="{{ $item->title }}">
                                {{ strlen($item->title) > 20 ? mb_substr($item->title, 0, 20, 'UTF-8') . '...' : $item->title }}
                              </h6>
                            </a>
                            <div class="review-price">
                              @if (!empty($userShopSetting) && $userShopSetting->item_rating_system)
                                <div class="rate mx-auto">
                                  <div class="rating" style="width:{{ $item->rating * 20 }}%">
                                  </div>
                                </div>
                              @endif
                              <span class="price">
                                {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}

                                {{ formatNumber($n_price) }}
                                {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                              </span>
                              @if ($isFlash)
                                <span class="previous-price">
                                  {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                                  <span>{{ formatNumber($item->current_price) }}</span>
                                  {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                                </span>
                              @elseif($item->previous_price > 0)
                                <span class="previous-price">
                                  {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                                  <span>{{ formatNumber($item->previous_price) }}</span>
                                  {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                                </span>
                              @endif
                              <a class="add-to-wish cursor-pointer float-right mr-2" href="javascript:void(0)"
                                data-toggle="tooltip" data-placement="top" data-item_id="{{ $item->item_id }}"
                                data-href="{{ route('front.user.add.wishlist', ['id' => $item->item_id, getParam()]) }}">
                                @if (!empty($myWishlist) && in_array($item->item_id, $myWishlist))
                                  <i class="fa fa-heart"></i>
                                @else
                                  <i class="far fa-heart"></i>
                                @endif
                              </a>
                            </div>
                            <div class="item-cart">
                              @if (!empty($userShopSetting) && empty($userShopSetting->catalog_mode) && $userShopSetting->is_shop)
                                <a class="  cart-link cursor-pointer"
                                  data-title="{{ strlen($item->title) > 26 ? mb_substr($item->title, 0, 26, 'UTF-8') . '...' : $item->title }}"
                                  data-current_price="{{ $n_price }}"
                                  data-flash_percentage="{{ $item->flash_percentage ?? 0 }}"
                                  data-item_id="{{ $item->item_id }}"
                                  data-variations="{{ json_encode($variations) }}"
                                  data-href="{{ route('front.user.add.cart', ['id' => $item->item_id, getParam()]) }}"
                                  data-toggle="tooltip" data-placement="top"
                                  title="{{ $keywords['Add_to_cart'] ?? 'Add to cart' }}"><i
                                    class="fal fa-shopping-cart"></i>
                                </a>
                              @endif
                            </div>
                          </div>
                        @endforeach
                      </div>
                    </div>
                  </div>
                </div>
              @endif
              @if ($home_sections->special_item_section == 1)
                <div class="col-lg-4 col-md-6 col-sm-7">

                  <div class="shop-home-sidebar mt-30">
                    <div class="shop-lookbook-item mt-75">
                      <div class="shop-lookbook-title">
                        <h5 class="title">
                          {{ $home_text->special_item_title ?? ($keywords['Special_Items'] ?? 'Special Items') }}
                        </h5>
                      </div>
                      <div class="shop-lookbook-slider">
                        @foreach ($special_offer_items as $item)
                          @php
                            $variations = App\Models\User\UserItemVariation::where('item_id', $item->item_id)
                                ->where('language_id', $userCurrentLang->id)
                                ->get();
                            $itemstock = $item->stock;
                            if (count($variations) == 0) {
                                if ($itemstock > 0) {
                                    $stock = true;
                                } else {
                                    $stock = false;
                                }
                                $variations = null;
                            } else {
                                $stock = true;
                                $tstock = '';
                                if (count($variations)) {
                                    foreach ($variations as $varkey => $varvalue) {
                                        $tstock = array_sum(json_decode($varvalue->option_stock));
                                        if ($tstock == 0) {
                                            $stock = false;
                                        }
                                    }
                                } else {
                                    $stock = true;
                                }
                            }
                            $isFlash = App\Http\Helpers\CheckFlashItem::isFlashItem($item->item_id);
                          @endphp
                          <div class="item mt-20">
                            @if ($isFlash)
                              <div class="label badge">-{{ $item->flash_percentage }}%
                              </div>
                              <span class="flash-badge"><i class="fas fa-bolt"></i></span>
                              @php
                                $n_price =
                                    $item->current_price - ($item->flash_percentage * $item->current_price) / 100;
                              @endphp
                            @else
                              @php
                                $n_price = $item->current_price;
                              @endphp
                            @endif
                            @php
                              $dt = Carbon\Carbon::parse($item->end_date);
                              $year = $dt->year;
                              $month = $dt->month;
                              $day = $dt->day;
                              $end_time = Carbon\Carbon::parse($item->end_time);
                              $hour = $end_time->hour;
                              $minute = $end_time->minute;
                            @endphp

                            @if ($item->type == 'physical')
                              @if ($stock == false)
                                <span class="stock-label">{{ $keywords['Out_of_Stock'] ?? 'Out of Stock' }}</span>
                              @endif
                            @endif
                            <a class="d-block"
                              href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}">
                              <img src="{{ asset('assets/front/img/user/items/thumbnail/' . $item->thumbnail) }}"
                                class="lazy" alt="electronics">
                            </a>

                            <a href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}">
                              <h6 class="title" title="{{ $item->title }}">
                                {{ strlen($item->title) > 20 ? mb_substr($item->title, 0, 20, 'UTF-8') . '...' : $item->title }}
                              </h6>
                            </a>
                            <div class="review-price">
                              @if (!empty($userShopSetting) && $userShopSetting->item_rating_system)
                                <div class="rate mx-auto">
                                  <div class="rating" style="width:{{ $item->rating * 20 }}%">
                                  </div>
                                </div>
                              @endif
                              <span class="price">
                                {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                                {{ formatNumber($n_price) }}
                                {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                              </span>
                              @if ($isFlash)
                                <span class="previous-price">
                                  {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                                  <span>{{ formatNumber($item->current_price) }}</span>
                                  {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                                </span>
                              @elseif($item->previous_price > 0)
                                <span class="previous-price">
                                  {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                                  <span>{{ formatNumber($item->previous_price) }}</span>
                                  {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                                </span>
                              @endif
                              <a class="add-to-wish cursor-pointer float-right mr-2" href="javascript:void(0)"
                                data-toggle="tooltip" data-placement="top" data-item_id="{{ $item->item_id }}"
                                data-href="{{ route('front.user.add.wishlist', ['id' => $item->item_id, getParam()]) }}">
                                @if (!empty($myWishlist) && in_array($item->item_id, $myWishlist))
                                  <i class="fa fa-heart"></i>
                                @else
                                  <i class="far fa-heart"></i>
                                @endif
                              </a>
                            </div>
                            <div class="item-cart">
                              @if (!empty($userShopSetting) && empty($userShopSetting->catalog_mode) && $userShopSetting->is_shop)
                                <a class="  cart-link cursor-pointer"
                                  data-title="{{ strlen($item->title) > 26 ? mb_substr($item->title, 0, 26, 'UTF-8') . '...' : $item->title }}"
                                  data-current_price="{{ $n_price }}"
                                  data-flash_percentage="{{ $item->flash_percentage ?? 0 }}"
                                  data-item_id="{{ $item->item_id }}"
                                  data-variations="{{ json_encode($variations) }}"
                                  data-href="{{ route('front.user.add.cart', ['id' => $item->item_id, getParam()]) }}"
                                  data-toggle="tooltip" data-placement="top"
                                  title="{{ $keywords['Add_to_cart'] ?? 'Add to cart' }}"><i
                                    class="fal fa-shopping-cart"></i>
                                </a>
                              @endif
                            </div>
                          </div>
                        @endforeach
                      </div>
                    </div>
                  </div>

                </div>
              @endif
            </div>
            <div class="shop-product-banner mt-80">
              <div class="row">
                @if ($home_sections->bottom_offer_banner_section == 1)
                  @if (count($bottombanners) > 0)
                    @foreach ($bottombanners as $bannerb)
                      <div class="col-lg-6 col-md-6">
                        <div class="shop-product-banner-item-1">
                          <img data-src="{{ asset('assets/front/img/user/offers/' . $bannerb->image) }}"
                            alt="shop" class="lazy">
                          <div class="shop-product-content">
                            <h3 class="title">{{ $bannerb->text_1 }}</h3>
                            <span>{{ $bannerb->text_2 }}</span>
                            <a class="main-btn" target="_blank"
                              href="{{ $bannerb->url }}">{{ $bannerb->text_3 }}</a>
                          </div>
                        </div>
                      </div>
                    @endforeach
                  @endif
                @endif
              </div>
            </div>
            @if ($home_sections->flashsale_item_section == 1)
              @if ($flash_items->count() > 0)
                <div class="new-product-list">
                  <div class="new-product-title d-flex flex-wrap align-items-center justify-content-between">
                    <h3 class="title float-left">
                      {{ $home_text->flashsale_item_title ?? ($keywords['Flash_Sales'] ?? 'Flash Sales') }}
                    </h3>
                    <a href="{{ route('front.user.shop', getParam()) . '?sale=flash' }}"
                      class="main-btn">{{ $keywords['View_All'] ?? 'View All' }}</a>
                  </div>
                </div>
                <div class="row electronics-active-3">
                  @foreach ($flash_items as $item)
                    @php
                      $isFlash = App\Http\Helpers\CheckFlashItem::isFlashItem($item->item_id);

                      $variations = App\Models\User\UserItemVariation::where('item_id', $item->item_id)
                          ->where('language_id', $userCurrentLang->id)
                          ->get();
                      $itemstock = $item->stock;
                      if (count($variations) == 0) {
                          if ($itemstock > 0) {
                              $stock = true;
                          } else {
                              $stock = false;
                          }
                          $variations = null;
                      } else {
                          $stock = true;
                          $tstock = '';
                          if (count($variations)) {
                              foreach ($variations as $varkey => $varvalue) {
                                  $tstock = array_sum(json_decode($varvalue->option_stock));
                                  if ($tstock == 0) {
                                      $stock = false;
                                  }
                              }
                          } else {
                              $stock = true;
                          }
                      }

                    @endphp

                    <div>
                      <div class="electronics-product-item mt-30">
                        <div class="electronics-product-thumb">
                          <a class="d-block"
                            href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}">
                            <img src="{{ asset('assets/front/img/user/items/thumbnail/' . $item->thumbnail) }}"
                              class="lazy" alt="electronics">
                          </a>
                          <span class="flash-badge"><i class="fas fa-bolt"></i>
                            -{{ $item->flash_percentage }}%</span>
                          @php
                            $dt = Carbon\Carbon::parse($item->end_date);
                            $year = $dt->year;
                            $month = $dt->month;
                            $day = $dt->day;
                            $end_time = Carbon\Carbon::parse($item->end_time);
                            $hour = $end_time->hour;
                            $minute = $end_time->minute;
                            $now = str_replace(
                                '+00:00',
                                '.000' . $userBs->timezoneinfo->gmt_offset . '00:00',
                                gmdate('c'),
                            );
                          @endphp

                          <div class="product-countdown" data-year="{{ $year }}"
                            data-month="{{ $month }}" data-day="{{ $day }}"
                            data-hour="{{ $hour }}" data-now="{{ $now }}"
                            data-timezone="{{ $userBs->timezoneinfo->gmt_offset }}"
                            data-minute="{{ $minute }}">
                          </div>

                          @if ($item->type == 'physical')
                            @if ($stock == false)
                              <span class="stock-label">
                                {{ $keywords['Out_of_Stock'] ?? 'Out of Stock' }}
                              </span>
                            @endif
                          @endif
                        </div>
                        <div class="electronics-product-content text-center">

                          <a class="d-block"
                            href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}">
                            <h6 title="{{ $item->title }}">
                              {{ strlen($item->title) > 30 ? mb_substr($item->title, 0, 30, 'UTF-8') . '...' : $item->title }}
                            </h6>
                          </a>
                          <div class="review-price">
                            @if (!empty($userShopSetting) && $userShopSetting->item_rating_system)
                              <div class="rate mx-auto">
                                <div class="rating" style="width:{{ $item->rating * 20 }}%">
                                </div>
                              </div>
                            @endif
                            <span class="price">
                              {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                              @php
                                $n_price =
                                    $item->current_price - ($item->flash_percentage * $item->current_price) / 100;
                              @endphp
                              {{ $item->flash ? formatNumber($n_price) : formatNumber($item->current_price) }}
                              {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                            </span>
                            @if ($item->flash)
                              <span class="previous-price">
                                {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                                <span>{{ formatNumber($item->current_price) }}</span>
                                {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                              </span>
                            @elseif($item->previous_price > 0)
                              <span class="previous-price">
                                {{ $userBs->base_currency_symbol_position == 'left' ? $userBs->base_currency_symbol : '' }}
                                <span>{{ formatNumber($item->previous_price) }}</span>
                                {{ $userBs->base_currency_symbol_position == 'right' ? $userBs->base_currency_symbol : '' }}
                              </span>
                            @endif
                          </div>
                        </div>
                        <div class="product-buy-btn text-center">
                          <ul>
                            <li>
                              <a title="{{ $keywords['Details'] ?? 'Details' }}"
                                href="{{ route('front.user.item_details', ['slug' => $item->slug, getParam()]) }}"><i
                                  class="fal fa-eye"></i>
                              </a>
                            </li>
                            @if (!empty($userShopSetting) && empty($userShopSetting->catalog_mode) && $userShopSetting->is_shop)
                              <li>
                                <a class=" main-btn cart-link cursor-pointer"
                                  data-title="{{ strlen($item->title) > 26 ? mb_substr($item->title, 0, 26, 'UTF-8') . '...' : $item->title }}"
                                  data-current_price="{{ $item->flash ? formatNumber($n_price) : formatNumber($item->current_price) }}"
                                  data-item_id="{{ $item->item_id }}"
                                  data-flash_percentage="{{ $item->flash_percentage ?? 0 }}"
                                  data-variations="{{ json_encode($variations) }}"
                                  data-href="{{ route('front.user.add.cart', ['id' => $item->item_id, getParam()]) }}"
                                  data-toggle="tooltip" data-placement="top"
                                  title="{{ $keywords['Add_to_cart'] ?? 'Add to cart' }}"><i
                                    class="fal fa-shopping-cart"></i>{{ $keywords['Add_to_cart'] ?? 'Add to cart' }}
                                </a>
                              </li>
                            @endif
                            <li>
                              <a class="add-to-wish cursor-pointer" data-toggle="tooltip" data-placement="top"
                                data-item_id="{{ $item->item_id }}"
                                data-href="{{ route('front.user.add.wishlist', ['id' => $item->item_id, getParam()]) }}">
                                @if (!empty($myWishlist) && in_array($item->item_id, $myWishlist))
                                  <i class="fa fa-heart"></i>
                                @else
                                  <i class="far fa-heart"></i>
                                @endif
                              </a>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  @endforeach
                </div>
              @endif
            @endif
          </div>
        </div>
      </div>
    </div>
  </section>
  <!--====== SHOP HOME 1 PART ENDS ======-->
  <section>
    <!--====== BRAND PART START ======-->
    @if (isset($home_sections->brand_section) && $home_sections->brand_section == 1)
      @php
        $isBrandSectionEmpty = empty($brands) || count($brands) == 0;
      @endphp

      <div class="brand-area pb-80">
        <div class="container">
          @if ($isBrandSectionEmpty)
            <div class="text-center py-5">
              <h4>This is the brand section</h4>
            </div>
          @else
            <div class="brand-active">
              @foreach ($brands as $brand)
                <div class="brand-item">
                  <a href="{{ $brand->brand_url }}" class="client-img d-block text-center" target="_blank">
                    <img class="lazy" data-src="{{ asset('assets/front/img/user/brands/' . $brand->brand_img) }}"
                      alt="">
                  </a>
                </div>
              @endforeach
            </div>
          @endif
        </div>
      </div>
    @endif

  </section>
  <!--====== BRAND PART ENDS ======-->
  {{-- Variation Modal Starts --}}
  @includeIf('front.partials.variation-modal')
  {{-- Variation Modal Ends --}}
@endsection
